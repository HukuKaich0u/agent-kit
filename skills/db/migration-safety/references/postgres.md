# Postgres DDL classification

Version matters — rules below assume PG 12+; notes where later versions changed things.

## Safe (metadata-only or brief lock)

- `ADD COLUMN` nullable, no default — instant
- `ADD COLUMN ... DEFAULT <constant>` — instant on PG 11+ (stored as metadata). Volatile defaults (`now()`, `gen_random_uuid()`) still rewrite the table → **rewriting**
- `DROP COLUMN` — metadata-only (space reclaimed later), but **breaking** for old app code
- `ALTER COLUMN SET DEFAULT` / `DROP DEFAULT` — instant (affects new rows only)
- widening `varchar(n)` → `varchar(m>n)` or `varchar` → `text` — metadata-only
- `CREATE INDEX CONCURRENTLY` — safe; see caveats below

## Locking (takes ACCESS EXCLUSIVE or blocks writes for table-scan duration)

- `CREATE INDEX` (non-concurrent) — blocks writes for the whole build. Use `CONCURRENTLY`. Caveats: cannot run inside a transaction (tell the migration tool: `disable_ddl_transaction!` / `atomic = False` / raw), roughly 2× build time, and on failure leaves an `INVALID` index that must be dropped and retried
- `ALTER COLUMN SET NOT NULL` — full table scan under ACCESS EXCLUSIVE. Safe recipe: `ADD CONSTRAINT ... CHECK (col IS NOT NULL) NOT VALID` → `VALIDATE CONSTRAINT` (takes only SHARE UPDATE EXCLUSIVE) → PG 12+: `SET NOT NULL` is then instant because the validated CHECK proves it → drop the CHECK
- `ADD CONSTRAINT` FK / CHECK — validation scans under lock. Safe recipe: add `NOT VALID`, then `VALIDATE CONSTRAINT` separately
- `ADD PRIMARY KEY` — builds a unique index under lock. Safe recipe: `CREATE UNIQUE INDEX CONCURRENTLY` first, then `ADD CONSTRAINT ... PRIMARY KEY USING INDEX`
- `VALIDATE CONSTRAINT`, `ANALYZE` — weaker locks, generally fine but still queue-aware

## Rewriting (full table copy)

- `ALTER COLUMN TYPE` — almost always a rewrite + ACCESS EXCLUSIVE. Exceptions that are metadata-only: `varchar` widening (above), `varchar(n)`→`text`, and some binary-compatible casts. `int`→`bigint` **rewrites** — for big tables use the new-column + backfill + swap dance
- `ADD COLUMN` with volatile default
- `CLUSTER`, `VACUUM FULL`

## Operational rules

- **Always set lock timeouts** at the top of every migration session so DDL fails fast instead of queueing (and making every later query queue behind it):
  ```sql
  SET lock_timeout = '5s';
  SET statement_timeout = '60s';  -- generous for the DDL itself; not for backfills
  ```
  A blocked ACCESS EXCLUSIVE request blocks all *subsequent* readers too — the DDL waiting is itself the outage.
- Retry loop around lock-timeout failures beats one long wait.
- Long-running transactions (including the migration tool's own wrapping tx) hold back `CREATE INDEX CONCURRENTLY` and vacuum — keep migration transactions short, one DDL per migration where possible.
- Renaming a table/column is instant lock-wise but always **breaking** — expand–contract regardless.
