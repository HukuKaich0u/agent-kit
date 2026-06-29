#!/usr/bin/env node
// audit-coverage.mjs — test/coverage posture for frontend-review-testing.
//
// Zero-dependency. Inspects test config presence and, if a coverage summary
// already exists, reads it; otherwise reports that coverage is unconfigured
// (a finding in itself). Does NOT run the full test suite by default — that
// can be slow and have side effects; pass --run to opt in.
//
//   node audit-coverage.mjs --repo /abs/path/to/client-repo [--run] [--json]
//
// Output: <repo>/.frontend-review/report/latest/raw/coverage.json

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

function parseArgs(argv) {
  const args = { repo: process.cwd(), run: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo") args.repo = argv[++i];
    else if (a.startsWith("--repo=")) args.repo = a.slice(7);
    else if (a === "--run") args.run = true;
    else if (a === "--json") args.json = true;
  }
  args.repo = resolve(args.repo);
  return args;
}

function detectPackageManager(repo) {
  if (existsSync(join(repo, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(repo, "yarn.lock"))) return "yarn";
  if (existsSync(join(repo, "package-lock.json"))) return "npm";
  if (existsSync(join(repo, "bun.lockb")) || existsSync(join(repo, "bun.lock"))) return "bun";
  return "npm";
}

function execPrefix(pm) {
  switch (pm) {
    case "pnpm": return ["pnpm", ["exec"]];
    case "yarn": return ["yarn", []];
    case "bun": return ["bunx", []];
    default: return ["npx", ["--no-install"]];
  }
}

function readJson(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

function configPresence(repo) {
  const has = (f) => existsSync(join(repo, f));
  return {
    vitest: has("vitest.config.ts") || has("vitest.config.js") || has("vitest.config.mjs"),
    playwright: has("playwright.config.ts") || has("playwright.config.js"),
    jest: has("jest.config.ts") || has("jest.config.js") || has("jest.config.mjs"),
  };
}

function summarizeCoverage(repo) {
  // common location for v8/istanbul summary
  for (const rel of ["coverage/coverage-summary.json", "coverage/coverage-final.json"]) {
    const p = join(repo, rel);
    if (!existsSync(p)) continue;
    const data = readJson(p);
    if (!data) continue;
    const total = data.total ?? null;
    return { present: true, file: rel, total };
  }
  return { present: false };
}

function maybeRunCoverage(repo, pm) {
  const [bin, pre] = execPrefix(pm);
  try {
    execFileSync(bin, [...pre, "vitest", "run", "--coverage"], {
      cwd: repo, encoding: "utf8", stdio: ["ignore", "ignore", "ignore"], maxBuffer: 64 * 1024 * 1024,
    });
    return { ran: true };
  } catch (e) {
    return { ran: true, exit: typeof e?.status === "number" ? e.status : null };
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.repo)) {
    process.stderr.write(`repo path does not exist: ${args.repo}\n`);
    process.exit(1);
  }
  const pm = detectPackageManager(args.repo);
  let runInfo = { ran: false, note: "pass --run to execute the coverage suite" };
  if (args.run) runInfo = maybeRunCoverage(args.repo, pm);

  const report = {
    skill: "frontend-review-testing",
    repo: args.repo,
    package_manager: pm,
    config: configPresence(args.repo),
    coverage: summarizeCoverage(args.repo),
    run: runInfo,
  };
  const outDir = join(args.repo, ".frontend-review", "report", "latest", "raw");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "coverage.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(`wrote ${outPath}\n`);
}

main();
