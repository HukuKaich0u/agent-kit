# DynamoDB change classification

DynamoDB has no DDL, but the same failure classes exist under different names: backfills consume table capacity instead of holding locks, and key changes force a table rebuild instead of a rewrite. "Migration" here means: index changes, item-shape changes, and key/table redesign.

## Safe (online, no backfill)

- **New attributes on items** — schema-less, nothing to run. But the expand–contract discipline still applies to the *item shape*: old app code must tolerate the attribute's absence AND presence; see item-shape migration below.
- Enabling TTL, PITR, streams; capacity-mode switch on-demand ↔ provisioned (limit: switchable roughly once per 24h per table — plan the direction).
- Creating a new table.

## Online but backfilling (the `CREATE INDEX` equivalent)

- **Adding a GSI** — backfills online while the table serves traffic. Traps:
  - On provisioned tables the backfill consumes the **GSI's** write capacity; and an under-provisioned GSI **throttles base-table writes** (every base write must propagate to the GSI). Provision the GSI generously for the backfill, then dial down.
  - Only one GSI create/delete per `UpdateTable` call, and index builds queue — a multi-index rollout is sequential and can take hours on large tables.
  - GSIs are **eventually consistent** — code must not read-its-own-write through a fresh GSI; a new access path is usable only after `IndexStatus: ACTIVE` *and* the application tolerates staleness.
- **LSIs cannot be added at all** after table creation — an LSI change is a table rebuild (below).

## Rebuild (the expand–contract of DynamoDB)

Changing the partition/sort key, adding an LSI, or restructuring a single-table design cannot be done in place. The sequence is the same expand–contract shape as a relational rename:

1. Create the new table (new keys/design).
2. **Dual-write** from the application (write both tables; new table is authoritative for writes only after backfill completes).
3. **Backfill** old → new with a parallel `Scan` (use `Segment`/`TotalSegments`), rate-limited well below table capacity, checkpointing `LastEvaluatedKey` per segment so a crash resumes instead of restarting. Writes must be idempotent (`PutItem` keyed by the same primary key is naturally so).
4. Verify (item counts per segment + spot-check hashes), cut reads over, stop old writes a full deploy cycle later, delete the old table after the bake period.

## Item-shape migration (no engine to enforce anything)

There is no `NOT NULL` to protect you — the application is the schema. For any change to item structure:

- Keep a **version attribute** (e.g. `_v`) on items; readers branch on it.
- Prefer **lazy migration** (upgrade item on read, write back) plus a background sweep for the long tail; the sweep is a rate-limited, checkpointed Scan like the backfill above.
- Contract (dropping old-shape support) only after the sweep reports zero old-version items.

## Operational rules

- Hot partitions: a backfill or sweep iterating in key order can concentrate load; parallel segments spread it.
- 400KB item limit — a "migration" that enriches items can hit it; check max item size before, not during.
- Rollback honesty: PITR restores to a **new table** (different name) — rollback is a config/endpoint cutover plus reconciling writes made since the restore point, not an in-place undo. Say so in the plan.
- Transactional writes during dual-write: `TransactWriteItems` spanning both tables keeps the dual-write atomic, within its 100-item / 4MB limits.
