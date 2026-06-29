#!/usr/bin/env node
// audit-ci.mjs — collect CI timing + workflow inventory for frontend-review-ci.
//
// Zero-dependency. Reads `gh run list` history (if `gh` is available and
// authenticated) and the `.github/workflows/` directory, then writes a raw
// JSON report. The SKILL.md does the analysis; this script only gathers facts.
//
//   node audit-ci.mjs --repo /abs/path/to/client-repo [--limit 50] [--json]
//
// Output: <repo>/.frontend-review/report/latest/raw/ci.json
// Also prints the same JSON to stdout when --json is passed.
//
// Exit codes: 0 always (a missing `gh` or no Actions history is a finding,
// not a script error). Hard I/O errors exit 1.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// --- arg parsing -----------------------------------------------------------

function parseArgs(argv) {
  const args = { repo: process.cwd(), limit: 50, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo") args.repo = argv[++i];
    else if (a.startsWith("--repo=")) args.repo = a.slice(7);
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a.startsWith("--limit=")) args.limit = Number(a.slice(8));
    else if (a === "--json") args.json = true;
  }
  args.repo = resolve(args.repo);
  return args;
}

// --- helpers ---------------------------------------------------------------

// Run a command, capturing stdout. Returns null on any failure (missing
// binary, non-zero exit) so callers can treat "tool absent" as a finding.
function tryExec(cmd, cmdArgs, opts = {}) {
  try {
    return execFileSync(cmd, cmdArgs, {
      cwd: opts.cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function median(nums) {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

// --- collectors ------------------------------------------------------------

function collectRunTiming(repo, limit) {
  const out = tryExec(
    "gh",
    [
      "run", "list",
      "--limit", String(limit),
      "--json", "databaseId,name,conclusion,createdAt,updatedAt,workflowName",
    ],
    { cwd: repo },
  );
  if (out == null) {
    return { available: false, reason: "`gh` not found, not authenticated, or no Actions history", workflows: [] };
  }
  let runs;
  try {
    runs = JSON.parse(out);
  } catch {
    return { available: false, reason: "could not parse `gh run list` output", workflows: [] };
  }
  // group by workflow, compute duration in seconds
  const byWf = new Map();
  for (const r of runs) {
    const start = Date.parse(r.createdAt);
    const end = Date.parse(r.updatedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    const durSec = Math.round((end - start) / 1000);
    const key = r.workflowName || r.name || "(unknown)";
    if (!byWf.has(key)) byWf.set(key, []);
    byWf.get(key).push(durSec);
  }
  const workflows = [...byWf.entries()].map(([name, durs]) => ({
    workflow: name,
    runs: durs.length,
    median_sec: median(durs),
    max_sec: Math.max(...durs),
  })).sort((a, b) => (b.median_sec ?? 0) - (a.median_sec ?? 0));
  return { available: true, sampled_runs: runs.length, workflows };
}

function collectWorkflowInventory(repo) {
  const dir = join(repo, ".github", "workflows");
  if (!existsSync(dir)) return { present: false, files: [] };
  const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
  const inventory = files.map((f) => {
    const text = readFileSync(join(dir, f), "utf8");
    return {
      file: f,
      has_concurrency: /^\s*concurrency\s*:/m.test(text),
      uses_setup_node_cache: /setup-node[\s\S]*?cache\s*:/m.test(text),
      uses_actions_cache: /uses:\s*actions\/cache@/m.test(text),
      caches_playwright: /ms-playwright/.test(text),
      mentions_shard: /shard/i.test(text),
      uses_needs: /^\s*needs\s*:/m.test(text),
    };
  });
  return { present: true, files: inventory };
}

// --- main ------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.repo)) {
    process.stderr.write(`repo path does not exist: ${args.repo}\n`);
    process.exit(1);
  }

  const report = {
    skill: "frontend-review-ci",
    repo: args.repo,
    timing: collectRunTiming(args.repo, args.limit),
    workflow_inventory: collectWorkflowInventory(args.repo),
  };

  const outDir = join(args.repo, ".frontend-review", "report", "latest", "raw");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "ci.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");

  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(`wrote ${outPath}\n`);
}

main();
