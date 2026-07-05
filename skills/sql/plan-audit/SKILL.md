---
name: sql-plan-audit
description: 'Run EXPLAIN against every query in a sqlc-style catalog and diff the plans against a baseline. Detects new full-table scans and un-indexed sorts introduced by PRs. Two runners: SQLite/D1 (in-memory, zero setup) and Postgres/RDS (via psql against a throwaway DB; fixtures required for meaningful plans).'
version: 0.1.0
metadata:
  hermes:
    tags: [sql, sqlite, d1, dba, performance, sqlc]
    related_skills: [sql-lint, sql-schema-audit, sql-security]
    engines: [sqlite, postgres]
---

# SQL Plan Audit

Use this when a project has a sqlc-style query catalog (or any file with `-- name: X :type` markers) and wants to keep query plans visible in code review.

## Why

`sqlc` enforces SQL syntax at codegen, but it doesn't watch the execution plan. A column rename, a removed index, or a small WHERE-clause addition can flip a query from `SEARCH USING INDEX` to `SCAN TABLE` silently. On Cloudflare D1 / SQLite without `EXPLAIN ANALYZE`, the planner output is the only static signal. This skill freezes that output as a reviewable artifact.

## When to invoke

- Schema or query catalog changed in a PR.
- A new index was added and you want to confirm queries pick it up.
- Quarterly audit of an existing query catalog.

## Workflow

1. Identify the schema file and the query catalog file. Typical layout:
   ```
   <project>/db/schema.sql
   <project>/db/queries.sql   (or db/sqlite/query.sql for sqlc projects)
   ```
2. Run the runner:
   ```bash
   node scripts/explain-runner.mjs \
     --schema your-project/db/schema.sql \
     --queries your-project/db/queries.sql \
     --out your-project/.linters/query-plans.txt
   ```
3. Commit the output. The text format is line-stable across runs; diffs surface plan changes.
4. To enforce in CI, regenerate to JSON and diff against a committed baseline:
   ```bash
   node scripts/explain-runner.mjs \
     --schema your-project/db/schema.sql \
     --queries your-project/db/queries.sql \
     --baseline your-project/.linters/query-plans.json \
     --format json --fail-on regress
   ```
5. When intentional regressions land (e.g. an index was retired on purpose), regenerate the baseline in the same PR.

## What success and failure look like

The runner is **deliberately silent** on success. Knowing where output lands matters when wiring it into CI:

| Invocation | stdout | stderr | Exit |
|---|---|---|---|
| `--out <path>` (regen) | nothing | only Node's `node:sqlite` experimental warning | 0 |
| no `--out` (regen) | full text/JSON report | only the experimental warning | 0 |
| `--baseline <path> --fail-on regress` (CI check), clean | full text/JSON report (or nothing if `--out` is set) | only the experimental warning | 0 |
| `--baseline <path> --fail-on regress` (CI check), regression | full text/JSON report | **per-query regression detail** (before vs after plans) | 1 |
| any path, internal error (e.g. schema fails to load) | nothing or partial | Node stack trace | 1 |

Read this as: **stderr is where pass/fail diagnostics live**. In CI, capture stderr explicitly (`2>&1`, `2>artifact.log`, or separate streams) — piping only stdout to a parser will lose every regression message. If a regen run "prints nothing", check `$?` and `ls <out path>` to confirm; that is the documented happy-path.

## How the runner handles placeholders

`sqlc.arg('x')` and `sqlc.slice('x')` are rewritten to `NULL` before EXPLAIN runs. The plan does not depend on bind values, only on the SQL shape, so this is safe. `?` positional placeholders are left as-is — SQLite accepts them inside EXPLAIN.

## Severity markers

- `!` SCAN — full-table scan. Usually a missing index or a query intentionally touching every row.
- `?` TEMP B-TREE — `USE TEMP B-TREE FOR ORDER BY / GROUP BY / DISTINCT`. Sort happens in memory because no index covers the ordering.
- `  ` SEARCH — index hit. Normal.

A plan with one SCAN on a small table (e.g. `users` with <1k rows) is often fine; the marker is a flag, not a verdict.

## CI integration

Add a step that runs the JSON variant and fails on regression. A typical `justfile`:

```just
sql-plan-audit:
    node scripts/explain-runner.mjs \
      --schema db/schema.sql \
      --queries db/queries.sql \
      --out .linters/query-plans.txt
    node scripts/explain-runner.mjs \
      --schema db/schema.sql \
      --queries db/queries.sql \
      --format json --out .linters/query-plans.json

sql-plan-audit-check:
    node scripts/explain-runner.mjs \
      --schema db/schema.sql \
      --queries db/queries.sql \
      --baseline .linters/query-plans.json \
      --format json --fail-on regress
```

Pre-push (pkfire / lefthook / pre-commit) is the right boundary — running this on every commit is slow and noisy.

## Limitations

- SQLite EXPLAIN does not report estimated row counts, so the runner cannot rank "bad SCAN of 10M rows" vs "fine SCAN of 50 rows". Combine with manual review.
- FTS5 virtual tables show as `SCAN VIRTUAL TABLE`. Treated as info, not flagged.
- Functions like `datetime('now')` are evaluated at plan time. Side effects (writes) are not run because the in-memory DB has the same schema but no rows.
- Subqueries and CTEs may produce extra rows in the plan; the diff treats them stably.

## Postgres / RDS

`scripts/explain-runner-pg.mjs` is the Postgres sibling — same catalog format, same output/baseline contract, same CI wiring. Differences that matter:

1. **It needs a live Postgres and `psql`.** It never touches your data: by default it creates a throwaway database on the given `--db-url`, loads the schema (+fixtures), and drops it afterwards. A disposable local instance is the standard setup:
   ```bash
   docker run --rm -d --name plan-audit-pg -e POSTGRES_HOST_AUTH_METHOD=trust -p 54329:5432 postgres:17
   node scripts/explain-runner-pg.mjs \
     --db-url postgres://postgres@localhost:54329/postgres \
     --schema db/schema.sql --queries db/queries.sql --fixtures db/fixtures.sql \
     --out .linters/query-plans-pg.txt
   docker rm -f plan-audit-pg
   ```
   Never point `--db-url` at a production/RDS instance — match the engine major version locally instead (plans can differ across versions). `--reuse-db` targets the URL's own database directly for environments where `CREATE DATABASE` is not allowed; only use it against a scratch DB.
2. **Fixtures are required for meaningful results.** Postgres plans are cost-based: against empty tables the planner prefers Seq Scan for almost everything, so a schema-only run is noise (the runner warns). Load representative row *counts* (values don't matter) via `--fixtures` — `generate_series` inserts are enough — and the runner executes `ANALYZE` after loading. Keep the fixtures file committed next to the schema so baselines are reproducible.
3. **Binds are handled via generic plans.** Each query runs as `PREPARE` + `EXPLAIN EXECUTE` with `plan_cache_mode = force_generic_plan` and NULL binds, so the plan is independent of bind values (same semantics as the SQLite runner). `$1`-style params and `sqlc.arg/narg/slice(...)` are supported. If Postgres cannot infer a parameter's type ("could not determine data type of parameter"), the query is reported as a per-query ERROR — add an explicit cast (`$1::bigint`) in the catalog.
4. **Severity mapping**: `!` = `Seq Scan`, `?` = `Sort` / `Incremental Sort` (no index covers the ordering), unmarked = index access. The same small-table caveat applies — a Seq Scan on a 50-row lookup table is often the *correct* plan; the marker is a flag, not a verdict.

## Requirements

- Node 22 or newer (SQLite runner uses the built-in `node:sqlite` module).
- Postgres runner: `psql` on PATH and a disposable Postgres to connect to (docker one-liner above).
- A sqlc-style query catalog (`-- name: X :type` markers). Other named-query formats can be supported by adjusting `parseQueryCatalog` in the runner.

## Files

- `scripts/explain-runner.mjs` — SQLite/D1 runner, no dependencies.
- `scripts/explain-runner-pg.mjs` — Postgres runner, no npm dependencies (shells out to `psql`).

## Agent compatibility

- Claude と Codex のどちらでも使える。同梱の Node スクリプトを実行するだけで harness 非依存。Node 22+ が前提。Postgres runner は追加で `psql` と使い捨て Postgres(docker)が必要。
