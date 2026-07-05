#!/usr/bin/env node
// Postgres EXPLAIN runner for sqlc-style query catalogs. Sibling of
// explain-runner.mjs (SQLite) — same catalog format, same output/baseline
// contract, engine-specific plan collection.
//
// - Connects via `psql` (zero npm deps) to --db-url.
// - Creates a throwaway database (unless --reuse-db), loads the schema,
//   optionally loads --fixtures, then runs ANALYZE.
// - For each query: PREPARE with plan_cache_mode=force_generic_plan and
//   EXPLAIN (FORMAT JSON) EXECUTE with NULL binds — the generic plan is
//   independent of bind values, matching the SQLite runner's semantics.
// - Emits the same stable text / JSON dump and baseline diff.
//
// IMPORTANT: Postgres plans are cost-based. Against empty tables the planner
// picks Seq Scan for (almost) everything, so a schema-only run is noise.
// Load representative --fixtures (row counts matter more than values) or the
// scan report is meaningless. See SKILL.md.
//
// CLI: explain-runner-pg.mjs --db-url <postgres://…> --schema <path>
//        --queries <path> [--fixtures <path>] [--reuse-db] [--out <path>]
//        [--baseline <path>] [--format json|text] [--fail-on regress|scan|none]

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

function parseArgs(argv) {
  const args = {
    dbUrl: null,
    schema: null,
    queries: null,
    fixtures: null,
    reuseDb: false,
    out: null,
    baseline: null,
    format: "text",
    failOn: "regress",
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--db-url") args.dbUrl = argv[++i];
    else if (k === "--schema") args.schema = argv[++i];
    else if (k === "--queries") args.queries = argv[++i];
    else if (k === "--fixtures") args.fixtures = argv[++i];
    else if (k === "--reuse-db") args.reuseDb = true;
    else if (k === "--out") args.out = argv[++i];
    else if (k === "--baseline") args.baseline = argv[++i];
    else if (k === "--format") args.format = argv[++i];
    else if (k === "--fail-on") args.failOn = argv[++i];
    else if (k === "--help" || k === "-h") {
      console.error(
        "explain-runner-pg.mjs --db-url <url> --schema <path> --queries <path> " +
          "[--fixtures <path>] [--reuse-db] [--out <path>] [--baseline <path>] " +
          "[--format json|text] [--fail-on regress|scan|none]",
      );
      process.exit(0);
    }
  }
  if (!args.dbUrl || !args.schema || !args.queries) {
    console.error("--db-url, --schema and --queries are required");
    process.exit(2);
  }
  return args;
}

// Same catalog parser as the SQLite runner.
function parseQueryCatalog(text) {
  const queries = [];
  let current = null;
  for (const line of text.split("\n")) {
    const header = line.match(/^--\s*name:\s*(\S+)\s*:(\S+)\s*$/);
    if (header) {
      if (current) queries.push(current);
      current = { name: header[1], type: header[2], sqlLines: [] };
      continue;
    }
    if (line.startsWith("--")) continue;
    if (current) current.sqlLines.push(line);
  }
  if (current) queries.push(current);
  return queries
    .map((q) => ({
      name: q.name,
      type: q.type,
      sql: q.sqlLines.join("\n").trim().replace(/;\s*$/, ""),
    }))
    .filter((q) => q.sql.length > 0);
}

// Rewrite sqlc.arg / sqlc.narg / sqlc.slice to fresh $N params (appended
// after any existing $N), so PREPARE sees only positional parameters.
// Returns { sql, paramCount }.
function rewritePlaceholders(sql) {
  let max = 0;
  for (const m of sql.matchAll(/\$(\d+)/g)) max = Math.max(max, Number(m[1]));
  const rewritten = sql.replace(
    /sqlc\.(arg|narg|slice)\(['"][^'"]+['"]\)/g,
    () => `$${++max}`,
  );
  return { sql: rewritten, paramCount: max };
}

function psql(url, sqlScript) {
  const res = spawnSync(
    "psql",
    [url, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-t", "-A", "-f", "-"],
    { input: sqlScript, encoding: "utf8" },
  );
  if (res.error) {
    console.error(`failed to spawn psql: ${res.error.message}`);
    process.exit(2);
  }
  return res;
}

function explainPlan(url, q) {
  const { sql, paramCount } = rewritePlaceholders(q.sql);
  const nulls = Array.from({ length: paramCount }, () => "NULL").join(", ");
  const script = [
    "SET plan_cache_mode = force_generic_plan;",
    `PREPARE plan_audit_q AS ${sql};`,
    paramCount > 0
      ? `EXPLAIN (FORMAT JSON) EXECUTE plan_audit_q(${nulls});`
      : "EXPLAIN (FORMAT JSON) EXECUTE plan_audit_q;",
  ].join("\n");
  const res = psql(url, script);
  if (res.status !== 0) {
    return { error: res.stderr.trim().split("\n").slice(0, 3).join(" ") };
  }
  try {
    return { json: JSON.parse(res.stdout)[0].Plan };
  } catch {
    return { error: `unparseable EXPLAIN output: ${res.stdout.slice(0, 200)}` };
  }
}

// Flatten the plan tree into detail lines, mirroring the SQLite runner's
// { detail } rows so the diff/severity machinery stays shared in shape.
function flattenPlan(node, depth = 0, out = []) {
  let detail = node["Node Type"];
  if (node["Relation Name"]) detail += ` on ${node["Relation Name"]}`;
  if (node["Index Name"]) detail += ` using ${node["Index Name"]}`;
  if (node["Sort Key"]) detail += ` (key: ${node["Sort Key"].join(", ")})`;
  out.push({ id: out.length, parent: depth, detail });
  for (const child of node.Plans || []) flattenPlan(child, depth + 1, out);
  return out;
}

function planSeverity(detail) {
  const d = String(detail);
  if (/^Seq Scan\b/.test(d)) return "scan";
  if (/^(Sort|Incremental Sort)\b/.test(d)) return "temp-btree"; // sort w/o index
  if (/^(Index Scan|Index Only Scan|Bitmap Index Scan)\b/.test(d))
    return "search";
  return "info";
}

function formatTextReport(results) {
  const lines = [];
  for (const r of results) {
    lines.push(`-- ${r.name} :${r.type}`);
    if (r.error) {
      lines.push(`  ERROR: ${r.error}`);
      lines.push("");
      continue;
    }
    for (const p of r.plan) {
      const sev = planSeverity(p.detail);
      const marker = sev === "scan" ? "!" : sev === "temp-btree" ? "?" : " ";
      lines.push(`  ${marker} ${p.detail}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function summarize(results) {
  const summary = { total: 0, scan: 0, tempBtree: 0, errors: 0 };
  for (const r of results) {
    summary.total += 1;
    if (r.error) {
      summary.errors += 1;
      continue;
    }
    for (const p of r.plan) {
      const sev = planSeverity(p.detail);
      if (sev === "scan") summary.scan += 1;
      else if (sev === "temp-btree") summary.tempBtree += 1;
    }
  }
  return summary;
}

function diffBaseline(prev, current) {
  const regressions = [];
  for (const r of current) {
    const before = prev[r.name];
    if (!before) continue;
    const flagged = (p) =>
      planSeverity(p.detail) === "scan" || planSeverity(p.detail) === "temp-btree";
    const beforeFlagged = (before.plan || []).filter(flagged).map((p) => p.detail).sort();
    const afterFlagged = (r.plan || []).filter(flagged).map((p) => p.detail).sort();
    if (afterFlagged.length > beforeFlagged.length) {
      regressions.push({ name: r.name, before: beforeFlagged, after: afterFlagged });
    }
  }
  return regressions;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const schema = readFileSync(resolve(args.schema), "utf8");
  const catalog = parseQueryCatalog(readFileSync(resolve(args.queries), "utf8"));

  // Pick the working database: throwaway by default, --reuse-db to target
  // the URL's own database (must be a scratch DB the caller owns).
  let workUrl = args.dbUrl;
  let tempDb = null;
  if (!args.reuseDb) {
    tempDb = `plan_audit_${process.pid}_${randomBytes(4).toString("hex")}`;
    const create = psql(args.dbUrl, `CREATE DATABASE ${tempDb};`);
    if (create.status !== 0) {
      console.error(
        `could not create throwaway database (use --reuse-db against a scratch DB instead):\n${create.stderr.trim()}`,
      );
      process.exit(2);
    }
    const u = new URL(args.dbUrl);
    u.pathname = `/${tempDb}`;
    workUrl = u.toString();
  }

  let exit = 0;
  try {
    const load = psql(
      workUrl,
      schema + (args.fixtures ? "\n" + readFileSync(resolve(args.fixtures), "utf8") : "") + "\nANALYZE;",
    );
    if (load.status !== 0) {
      console.error(`schema/fixtures failed to load:\n${load.stderr.trim()}`);
      process.exit(2);
    }
    if (!args.fixtures) {
      console.error(
        "warning: no --fixtures given — Postgres plans against empty tables " +
          "prefer Seq Scan; scan findings below are likely noise.",
      );
    }

    const results = [];
    for (const q of catalog) {
      const r = explainPlan(workUrl, q);
      if (r.error) results.push({ name: q.name, type: q.type, plan: [], error: r.error });
      else results.push({ name: q.name, type: q.type, plan: flattenPlan(r.json) });
    }

    const summary = summarize(results);
    const payload = { summary, queries: results };
    const output =
      args.format === "json"
        ? JSON.stringify(payload, null, 2) + "\n"
        : formatTextReport(results) +
          `\n-- summary: ${summary.total} queries, ${summary.scan} Seq Scan, ` +
          `${summary.tempBtree} Sort, ${summary.errors} errors\n`;

    if (args.out) writeFileSync(resolve(args.out), output);
    else process.stdout.write(output);

    if (args.baseline && existsSync(resolve(args.baseline))) {
      const prev = JSON.parse(readFileSync(resolve(args.baseline), "utf8"));
      const prevByName = Object.fromEntries((prev.queries || []).map((q) => [q.name, q]));
      const regressions = diffBaseline(prevByName, results);
      if (regressions.length > 0) {
        console.error(
          `query plan regressions (${regressions.length}):\n` +
            regressions
              .map(
                (r) =>
                  `  ${r.name}: +${r.after.length - r.before.length} unindexed access\n` +
                  `    before: ${JSON.stringify(r.before)}\n` +
                  `    after:  ${JSON.stringify(r.after)}`,
              )
              .join("\n"),
        );
        if (args.failOn === "regress" || args.failOn === "scan") exit = 1;
      }
    } else if (args.failOn === "scan" && summary.scan > 0) {
      console.error(`fail-on=scan: ${summary.scan} Seq Scan entries`);
      exit = 1;
    }
  } finally {
    if (tempDb) {
      const drop = psql(args.dbUrl, `DROP DATABASE IF EXISTS ${tempDb} WITH (FORCE);`);
      if (drop.status !== 0)
        console.error(`warning: failed to drop ${tempDb}: ${drop.stderr.trim()}`);
    }
  }
  process.exit(exit);
}

main();
