# MySQL / InnoDB DDL classification

Assumes MySQL 8.0+ / InnoDB. The mechanism is different from Postgres: most DDL goes through online DDL with `ALGORITHM=INSTANT | INPLACE | COPY`. **Always state the algorithm explicitly** — if the requested algorithm is unsupported the statement errors instead of silently degrading to a table copy:

```sql
ALTER TABLE t ADD COLUMN c INT, ALGORITHM=INSTANT;
-- errors if INSTANT is not possible → you find out in review, not in prod
```

## INSTANT (metadata-only; 8.0.12+, more ops 8.0.29+)

- `ADD COLUMN` (8.0.12+: only as last column; 8.0.29+: any position) — including with default (defaults are metadata in InnoDB)
- `DROP COLUMN` (8.0.29+) — instant, but **breaking** for old app code
- `SET/DROP DEFAULT`, rename column (8.0.28+) — rename is still **breaking**; expand–contract
- widening `VARCHAR` within the same length-byte class (≤255 stays ≤255, or >255 stays >255) — crossing the 255 boundary is COPY

## INPLACE (no table copy, but builds/scans; writes allowed, brief locks at start/end)

- `ADD INDEX` / `DROP INDEX` — online, but replicas replay DDL serially → replica lag for the build duration
- `ADD FOREIGN KEY` with `foreign_key_checks=OFF` (otherwise COPY); validate data yourself first
- `SET NOT NULL` / adding `CHECK` — INPLACE with data validation scan

Caveat for all INPLACE: needs a brief exclusive metadata lock at start and end — a long-running query on the table blocks the DDL, and the waiting DDL blocks everything behind it. Same fail-fast rule as Postgres: set `lock_wait_timeout` low for the migration session.

## COPY (full table rebuild — plan an online strategy)

- `ALTER COLUMN TYPE` (including `INT`→`BIGINT`, charset changes, crossing the varchar 255-byte boundary)
- `ADD PRIMARY KEY` / changing the PK (rebuilds the clustered index — everything)
- Anything on a table with `ROW_FORMAT` change, most partitioning changes

For COPY-class changes on large tables, use an online schema-change tool rather than raw DDL: `gh-ost` (binlog-based, no triggers, throttleable) or `pt-online-schema-change` (trigger-based). Both need: disk headroom for a full copy, a cut-over plan, and FK caveats (gh-ost does not support FKs on the target table).

## Operational rules

- `SET SESSION lock_wait_timeout = 5;` at the top of migration sessions.
- Replication: even INPLACE DDL replays serially on replicas — a 30-min index build = 30 min replica lag unless the tool throttles for it (gh-ost does).
- No transactional DDL: a multi-statement MySQL migration that fails midway leaves the schema half-applied. One DDL per migration file; make each rerunnable (`IF NOT EXISTS` where supported).
- 8.0 metadata is crash-safe, but `ALGORITHM=INSTANT` has a row-version limit (64 instant ADDs before a rebuild is forced) — occasional table rebuilds via pt-osc/gh-ost reset it.
