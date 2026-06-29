#!/usr/bin/env node
// audit-triage.mjs — Day 0 scorecard data collection for frontend-review-triage.
//
// Zero-dependency. Gathers package manager, lockfile, TypeScript strictness,
// test/CI setup, and open issues into a raw JSON report. The SKILL.md applies
// the app-classification priority and writes the human scorecard.
//
//   node audit-triage.mjs --repo /abs/path/to/client-repo [--json]
//
// Output: <repo>/.frontend-review/report/latest/raw/triage.json

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
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

function tryExec(cmd, cmdArgs, cwd) {
  try {
    return execFileSync(cmd, cmdArgs, {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 16 * 1024 * 1024,
    });
  } catch { return null; }
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

// lockfile → package manager
function detectPackageManager(repo) {
  if (existsSync(join(repo, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(repo, "yarn.lock"))) return "yarn";
  if (existsSync(join(repo, "package-lock.json"))) return "npm";
  if (existsSync(join(repo, "bun.lockb")) || existsSync(join(repo, "bun.lock"))) return "bun";
  return null;
}

function collectPackageJson(repo) {
  const pkg = readJson(join(repo, "package.json"));
  if (!pkg) return { present: false };
  return {
    present: true,
    name: pkg.name ?? null,
    packageManager: pkg.packageManager ?? null,
    engines: pkg.engines ?? null,
    scripts: Object.keys(pkg.scripts ?? {}),
    dep_count: Object.keys(pkg.dependencies ?? {}).length,
    devdep_count: Object.keys(pkg.devDependencies ?? {}).length,
  };
}

function collectTsConfig(repo) {
  // shallow read of the root tsconfig (does not resolve `extends`)
  for (const name of ["tsconfig.json", "tsconfig.base.json"]) {
    const p = join(repo, name);
    if (!existsSync(p)) continue;
    let text = readFileSync(p, "utf8");
    // strip // and /* */ comments so JSON.parse tolerates tsconfig-with-comments
    text = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    let cfg;
    try { cfg = JSON.parse(text); } catch { return { present: true, file: name, parse_error: true }; }
    const co = cfg.compilerOptions ?? {};
    return {
      present: true,
      file: name,
      extends: cfg.extends ?? null,
      strict: co.strict ?? false,
      noUncheckedIndexedAccess: co.noUncheckedIndexedAccess ?? false,
      noImplicitAny: co.noImplicitAny ?? null,
    };
  }
  return { present: false };
}

function collectTestSetup(repo) {
  const has = (f) => existsSync(join(repo, f));
  return {
    vitest: has("vitest.config.ts") || has("vitest.config.js") || has("vitest.config.mjs"),
    playwright: has("playwright.config.ts") || has("playwright.config.js"),
    jest: has("jest.config.ts") || has("jest.config.js") || has("jest.config.mjs"),
  };
}

function collectWorkflows(repo) {
  const dir = join(repo, ".github", "workflows");
  if (!existsSync(dir)) return { present: false, files: [] };
  try {
    return { present: true, files: readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)) };
  } catch { return { present: true, files: [] }; }
}

function collectOpenIssues(repo) {
  const out = tryExec("gh", ["issue", "list", "--state", "open", "--limit", "20",
    "--json", "number,title,labels"], repo);
  if (out == null) return { available: false };
  try { return { available: true, issues: JSON.parse(out) }; }
  catch { return { available: false }; }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.repo)) {
    process.stderr.write(`repo path does not exist: ${args.repo}\n`);
    process.exit(1);
  }
  const report = {
    skill: "frontend-review-triage",
    repo: args.repo,
    package_manager: detectPackageManager(args.repo),
    package_json: collectPackageJson(args.repo),
    tsconfig: collectTsConfig(args.repo),
    test_setup: collectTestSetup(args.repo),
    workflows: collectWorkflows(args.repo),
    open_issues: collectOpenIssues(args.repo),
  };
  const outDir = join(args.repo, ".frontend-review", "report", "latest", "raw");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "triage.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(`wrote ${outPath}\n`);
}

main();
