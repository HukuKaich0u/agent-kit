#!/usr/bin/env node
// audit-deps.mjs — dependency freshness + CVE collection for frontend-review-deps.
//
// Zero-dependency. Auto-detects the package manager from the lockfile and runs
// its `outdated` and `audit` commands in JSON mode, writing a raw report. The
// SKILL.md applies the attack-vector triage matrix and trend-watch judgment.
//
//   node audit-deps.mjs --repo /abs/path/to/client-repo [--json]
//
// Output: <repo>/.frontend-review/report/latest/raw/deps.json

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function parseArgs(argv) {
  const args = { repo: process.cwd(), json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo") args.repo = argv[++i];
    else if (a.startsWith("--repo=")) args.repo = a.slice(7);
    else if (a === "--json") args.json = true;
  }
  args.repo = resolve(args.repo);
  return args;
}

// Returns stdout regardless of exit code (outdated/audit exit non-zero when
// they find something). null only if the binary is missing.
function runCapture(cmd, cmdArgs, cwd) {
  try {
    return execFileSync(cmd, cmdArgs, {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    if (e && typeof e.status === "number") return e.stdout?.toString() ?? "";
    return null; // binary missing
  }
}

function detectPackageManager(repo) {
  if (existsSync(join(repo, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(repo, "yarn.lock"))) return "yarn";
  if (existsSync(join(repo, "package-lock.json"))) return "npm";
  if (existsSync(join(repo, "bun.lockb")) || existsSync(join(repo, "bun.lock"))) return "bun";
  return "npm";
}

function parseJsonLoose(s) {
  if (s == null) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function collectOutdated(pm, repo) {
  const cmds = {
    pnpm: ["pnpm", ["outdated", "--format", "json"]],
    npm: ["npm", ["outdated", "--json"]],
    yarn: ["yarn", ["outdated", "--json"]],
    bun: ["bun", ["outdated"]], // bun has no stable json; capture text
  };
  const [bin, a] = cmds[pm] ?? cmds.npm;
  const out = runCapture(bin, a, repo);
  if (out == null) return { available: false };
  const parsed = parseJsonLoose(out);
  if (parsed && typeof parsed === "object") {
    return { available: true, format: "json", outdated_count: Object.keys(parsed).length, data: parsed };
  }
  return { available: true, format: "text", raw: out.slice(0, 20000) };
}

function collectAudit(pm, repo) {
  const cmds = {
    pnpm: ["pnpm", ["audit", "--json"]],
    npm: ["npm", ["audit", "--json"]],
    yarn: ["yarn", ["npm", "audit", "--json"]],
    bun: ["bun", ["audit", "--json"]],
  };
  const [bin, a] = cmds[pm] ?? cmds.npm;
  const out = runCapture(bin, a, repo);
  if (out == null) return { available: false };
  const parsed = parseJsonLoose(out);
  if (!parsed) return { available: true, format: "text", raw: out.slice(0, 20000) };
  // npm/pnpm shape: metadata.vulnerabilities = {info,low,moderate,high,critical}
  const vuln = parsed.metadata?.vulnerabilities ?? parsed.vulnerabilities ?? null;
  return { available: true, format: "json", vulnerabilities: vuln };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.repo)) {
    process.stderr.write(`repo path does not exist: ${args.repo}\n`);
    process.exit(1);
  }
  const pm = detectPackageManager(args.repo);
  const report = {
    skill: "frontend-review-deps",
    repo: args.repo,
    package_manager: pm,
    outdated: collectOutdated(pm, args.repo),
    audit: collectAudit(pm, args.repo),
  };
  const outDir = join(args.repo, ".frontend-review", "report", "latest", "raw");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "deps.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(`wrote ${outPath}\n`);
}

main();
