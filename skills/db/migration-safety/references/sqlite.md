# SQLite / D1 DDL classification

SQLite's concurrency model changes the question: there is one writer at a time (WAL: readers proceed, writers serialize). DDL doesn't "lock the table" — it locks the **database** for its duration. Small DBs: everything is fast. Large DBs / D1: duration = availability impact for all writes.

## Instant (schema metadata only)

- `ADD COLUMN` — with constraints: default must be constant; cannot add `NOT NULL` without default; cannot add PK/UNIQUE column
- `RENAME TABLE` / `RENAME COLUMN` (3.25+) — instant, but **breaking** for old app code → expand–contract still applies
- `DROP COLUMN` (3.35+) — fails if the column is referenced by an index/view/constraint

## Proportional to table size (holds the write lock throughout)

- `CREATE INDEX` — full scan + build; no CONCURRENTLY equivalent. On D1 or a big embedded DB, this is a write outage for the duration. Mitigate: build during low traffic; keep `busy_timeout` set on app connections so writers queue instead of erroring
- `VACUUM`, `REINDEX`

## The 12-step rebuild (everything else)

SQLite has no `ALTER COLUMN` at all — type changes, adding constraints to existing columns, reordering, most FK changes require the documented rebuild:

1. `PRAGMA foreign_keys=OFF`
2. `BEGIN`
3. `CREATE TABLE new_t(...)` with the desired schema
4. `INSERT INTO new_t SELECT ... FROM t`
5. `DROP TABLE t`
6. `ALTER TABLE new_t RENAME TO t`
7. recreate indexes, triggers, views
8. `PRAGMA foreign_key_check`
9. `COMMIT`; `PRAGMA foreign_keys=ON`

Notes: do NOT instead mutate `sqlite_schema` tricks; the transaction makes the swap atomic for readers; write lock is held for the whole copy.

## Operational rules

- `PRAGMA busy_timeout = 5000` on every app connection — during migrations, writers then queue briefly instead of throwing `SQLITE_BUSY`.
- WAL mode (`PRAGMA journal_mode=WAL`) keeps readers unblocked during the whole migration; verify it's on before running anything proportional.
- D1 specifics: migrations run via `wrangler d1 migrations`; no long-lived sessions, so batch backfills as separate statements/requests, keyset-paginated, and remember D1 has request duration limits — a rebuild of a big table may need the copy done in batches into the new table before the swap.
- Turso / libSQL specifics:
  - Same SQLite DDL semantics (including the 12-step rebuild), same single-writer model — but every write transaction now holds the write lock **across network latency**, so an interactive migration transaction is far more expensive than embedded SQLite. Prefer `batch()` / single-round-trip statements; keep the rebuild transaction tight.
  - Embedded replicas serve stale reads until they sync — after a schema change, app instances on unsynced replicas briefly see the pre-migration schema. Deploy order: migrate primary → force replica sync / restart readers → ship code that needs the new schema.
  - Whether a multi-statement migration file runs atomically depends on the client/protocol version — verify against current Turso docs before relying on it; when unsure, wrap the rebuild in an explicit transaction and confirm it is executed as one.
- Down-migrations that "restore" a dropped column cannot restore its data — SQLite rollback plans are roll-forward or restore-from-backup more often than not; say so.
