#!/usr/bin/env node
// audit-security.mjs — static risky-pattern scan for frontend-review-security.
//
// Zero-dependency. Walks the repo source tree (skipping node_modules, build
// output, etc.) and flags HTML-injection sinks, client-side env exposure, and
// eval-family calls. Line-based — a clean scan is NOT proof of safety; every
// hit needs manual review. The SKILL.md does the auth/env/AI-pentest judgment.
//
//   node audit-security.mjs --repo /abs/path/to/client-repo [--json]
//
// Output: <repo>/.frontend-review/report/latest/raw/security.json

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

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

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out", ".next", ".nuxt",
  "coverage", ".turbo", ".cache", "target", "_build", ".frontend-review",
]);
const SCAN_EXT = /\.(tsx?|jsx?|mjs|cjs|vue|svelte|astro)$/;

const PATTERNS = [
  { id: "html_injection", re: /dangerouslySetInnerHTML|v-html|\.innerHTML\s*=|insertAdjacentHTML/ },
  { id: "client_env_exposure", re: /process\.env\.|import\.meta\.env\./ },
  { id: "eval_family", re: /\beval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*["'`]/ },
];

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) yield* walk(full);
    else if (st.isFile() && SCAN_EXT.test(name)) yield full;
  }
}

function scan(repo) {
  const hits = { html_injection: [], client_env_exposure: [], eval_family: [] };
  let filesScanned = 0;
  for (const file of walk(repo)) {
    filesScanned++;
    let lines;
    try { lines = readFileSync(file, "utf8").split("\n"); } catch { continue; }
    const rel = relative(repo, file);
    lines.forEach((line, idx) => {
      for (const p of PATTERNS) {
        if (p.re.test(line)) {
          hits[p.id].push({ file: rel, line: idx + 1, text: line.trim().slice(0, 200) });
        }
      }
    });
  }
  return { filesScanned, hits };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.repo)) {
    process.stderr.write(`repo path does not exist: ${args.repo}\n`);
    process.exit(1);
  }
  const { filesScanned, hits } = scan(args.repo);
  const report = {
    skill: "frontend-review-security",
    repo: args.repo,
    files_scanned: filesScanned,
    counts: {
      html_injection: hits.html_injection.length,
      client_env_exposure: hits.client_env_exposure.length,
      eval_family: hits.eval_family.length,
    },
    hits,
    note: "Line-based scan; a clean result is not proof of safety. Every hit needs manual review.",
  };
  const outDir = join(args.repo, ".frontend-review", "report", "latest", "raw");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "security.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(`wrote ${outPath} (scanned ${filesScanned} files)\n`);
}

main();
