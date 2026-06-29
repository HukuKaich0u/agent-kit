#!/usr/bin/env node
// audit-hygiene.mjs — code-quality hygiene metrics for frontend-review-hygiene.
//
// Zero-dependency. Runs TypeScript (`tsc --noEmit`), the project's linter
// (eslint or biome, auto-detected), dead-code (knip if available), and a
// duplication signal, then writes a raw JSON report. Each tool is best-effort:
// a missing tool is recorded as `available: false`, not a crash.
//
//   node audit-hygiene.mjs --repo /abs/path/to/client-repo [--json]
//
// Output: <repo>/.frontend-review/report/latest/raw/hygiene.json

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
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

// Run a command; return {ok, stdout, status}. Never throws.
function run(cmd, cmdArgs, cwd) {
  try {
    const stdout = execFileSync(cmd, cmdArgs, {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024,
    });
    return { ok: true, stdout, status: 0 };
  } catch (e) {
    // non-zero exit still gives us stdout (linters exit 1 when they find issues)
    if (e && typeof e.status === "number") {
      return { ok: false, stdout: e.stdout?.toString() ?? "", status: e.status, ran: true };
    }
    return { ok: false, stdout: "", status: null, ran: false }; // binary missing
  }
}

function detectPackageManager(repo) {
  if (existsSync(join(repo, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(repo, "yarn.lock"))) return "yarn";
  if (existsSync(join(repo, "package-lock.json"))) return "npm";
  if (existsSync(join(repo, "bun.lockb")) || existsSync(join(repo, "bun.lock"))) return "bun";
  return "npm"; // fallback for `npx`-style exec
}

// `<pm> exec` runner prefix. All four support an exec form.
function execPrefix(pm) {
  switch (pm) {
    case "pnpm": return ["pnpm", ["exec"]];
    case "yarn": return ["yarn", []]; // yarn <bin>
    case "bun": return ["bunx", []];
    default: return ["npx", ["--no-install"]];
  }
}

function readPkg(repo) {
  try { return JSON.parse(readFileSync(join(repo, "package.json"), "utf8")); } catch { return {}; }
}

function auditTypescript(repo, pm) {
  if (!existsSync(join(repo, "tsconfig.json"))) return { available: false, reason: "no tsconfig.json" };
  const [bin, pre] = execPrefix(pm);
  const r = run(bin, [...pre, "tsc", "--noEmit", "--pretty", "false"], repo);
  if (!r.ran && !r.ok && r.status === null) return { available: false, reason: "tsc not runnable" };
  // tsc prints "file(line,col): error TSxxxx" lines
  const errors = (r.stdout.match(/error TS\d+/g) ?? []).length;
  return { available: true, errors, clean: errors === 0 };
}

function auditLint(repo, pm) {
  const [bin, pre] = execPrefix(pm);
  const hasBiome = existsSync(join(repo, "biome.json")) || existsSync(join(repo, "biome.jsonc"));
  if (hasBiome) {
    const r = run(bin, [...pre, "biome", "check", "--reporter=summary", "."], repo);
    if (!r.ran && r.status === null) return { tool: "biome", available: false };
    return { tool: "biome", available: true, exit: r.status, clean: r.status === 0 };
  }
  // eslint flat or legacy
  const r = run(bin, [...pre, "eslint", ".", "-f", "json"], repo);
  if (!r.ran && r.status === null) return { tool: "eslint", available: false };
  let problems = null;
  try {
    const results = JSON.parse(r.stdout);
    problems = results.reduce((n, f) => n + (f.errorCount ?? 0) + (f.warningCount ?? 0), 0);
  } catch { /* leave null */ }
  return { tool: "eslint", available: true, problems, clean: problems === 0 };
}

function auditDeadCode(repo, pm) {
  const [bin, pre] = execPrefix(pm);
  const r = run(bin, [...pre, "knip", "--no-progress"], repo);
  if (!r.ran && r.status === null) return { tool: "knip", available: false };
  // knip exits non-zero when it finds issues; expose raw line count as a signal
  const lines = r.stdout.split("\n").filter((l) => l.trim()).length;
  return { tool: "knip", available: true, exit: r.status, report_lines: lines, clean: r.status === 0 };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.repo)) {
    process.stderr.write(`repo path does not exist: ${args.repo}\n`);
    process.exit(1);
  }
  const pm = detectPackageManager(args.repo);
  readPkg(args.repo); // (reserved for future script-name introspection)
  const report = {
    skill: "frontend-review-hygiene",
    repo: args.repo,
    package_manager: pm,
    typescript: auditTypescript(args.repo, pm),
    lint: auditLint(args.repo, pm),
    dead_code: auditDeadCode(args.repo, pm),
  };
  const outDir = join(args.repo, ".frontend-review", "report", "latest", "raw");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "hygiene.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(`wrote ${outPath}\n`);
}

main();
