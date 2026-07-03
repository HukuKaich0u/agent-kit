---
name: db-migration-safety
description: Use when writing or reviewing a database schema migration that will run against a live system — classifies each DDL as safe / locking / data-rewriting for the actual engine, enforces expand-contract for breaking changes, and requires a backfill and rollback plan. Engine-generic workflow with Postgres and SQLite lock-behavior references (add a reference file per additional engine). Do NOT use for greenfield schemas with no live traffic (just write the DDL).
---

# DB Migration Safety

You are writing or reviewing a schema migration for a database with live traffic. The question is never "is this DDL correct" — it is "what happens to in-flight queries, the old application version, and the table's locks while this runs". Migrations that are instant on a dev DB take table locks for minutes at production size.

If there is no live traffic (greenfield, pre-launch), say so and stop — this workflow is overhead there.

## Procedure

1. **Identify the engine and deployment reality.** Postgres / SQLite (which version — safety rules changed across versions), table sizes of the affected tables (row count order of magnitude), and whether deploys are rolling (old and new app code run simultaneously — assume yes).
2. **Classify every DDL statement** using the engine reference file:
   - [references/postgres.md](references/postgres.md)
   - [references/sqlite.md](references/sqlite.md)

   Classes:
   - **safe** — metadata-only or brief lock; ship it
   - **locking** — blocks reads/writes for a duration proportional to table size; needs the engine-specific safe variant or a maintenance window
   - **rewriting** — copies the table; needs the online strategy from the reference
   - **breaking** — old app code fails against the new schema (drop/rename column or table, type narrowing, new NOT NULL); needs expand–contract
3. **Expand–contract for every breaking change.** Never rename or drop in one deploy while old code runs:
   1. *Expand*: add the new column/table (nullable / with default), deploy code that writes both and reads new-with-fallback
   2. *Backfill*: copy old → new (step 4)
   3. *Contract*: after the old readers are gone and verified (a full deploy cycle later, as a separate migration), drop the old column
   A rename is a drop plus an add — it gets the full treatment.
4. **Backfill plan, if any data moves.** Backfills run as batched application-level jobs, never as one `UPDATE table SET ...` inside the migration:
   - batch by primary-key ranges (keyset, not OFFSET), commit per batch, sleep/throttle between batches
   - idempotent (`WHERE new_col IS NULL`-guarded) so it can crash and rerun
   - the migration itself must not depend on the backfill being complete
5. **Rollback plan.** For each migration, write down: can it be rolled back by a down-migration, or only rolled forward? Data-destroying steps (drops, type narrowing) have no rollback — that is exactly why they live in the *contract* phase, weeks after the data stopped being read. If the honest answer is "restore from backup", say that explicitly.
6. **Pre-flight checklist** (goes in the migration PR description):
   - [ ] engine + version + affected table sizes stated
   - [ ] every statement classified (safe / locking / rewriting / breaking) with the reference rule cited
   - [ ] lock timeout set so the migration fails fast instead of queueing behind traffic (see engine reference)
   - [ ] old app version tested against new schema (or expand-contract stated)
   - [ ] backfill batched + idempotent, or "no data movement"
   - [ ] rollback: down-migration / roll-forward-only / restore — stated

## Output

For a **review**: a table of statements × classification × verdict, plus the checklist above filled in, written to the PR or `<repo>/.backend-review/report/latest/md/migration-review.md`. For **writing** a migration: the migration files themselves, structured as expand/backfill/contract, with the checklist in the PR description.

## Boundaries

- Do NOT combine expand and contract in one migration file, even "because we deploy fast".
- Do NOT put batched backfills inside the schema-migration transaction.
- Do NOT approve a migration whose lock class you could not determine — "unknown" is a finding, and the fix is to test it against a production-sized copy.
- Query performance of the resulting schema is `backend-review-data-access` / `sql-plan-audit` territory.

## Related

- `backend-review-transactions` — the constraints (unique, version columns) that reviews demand get added via this skill
- `sql-schema-audit` — static schema quality (SQLite/D1)
- References: [postgres.md](references/postgres.md), [sqlite.md](references/sqlite.md) — add a file per additional engine

## Agent compatibility

- Claude と Codex のどちらでも使える。分類は references の表と読解のみで harness 非依存。本番サイズでのリハーサルは提案として書き、実行はユーザーに委ねる。
