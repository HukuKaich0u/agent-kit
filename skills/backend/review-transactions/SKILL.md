---
name: backend-review-transactions
description: Use when reviewing transactional correctness of a backend — multi-write operations without a transaction, read-modify-write races, lost updates, isolation-level assumptions, locking, deadlock ordering, dual-writes (DB + message queue), and idempotency of retried operations. Engine-generic with a Postgres/SQLite difference table. Highest-value on money, inventory, quota, and state-machine code.
---

# Backend Review — Transactions & Consistency

You are reviewing a backend for transactional correctness. This is where silent data corruption lives: code that passes every test on an idle dev DB and corrupts state under two concurrent requests. Prioritize code touching money, inventory, quotas, counters, and state machines.

The most common AI-generated problems are: multiple dependent writes with no transaction, `SELECT` → check in app code → `UPDATE` races, external I/O inside a transaction, and publishing an event for a write that later rolls back.

## Procedure

1. **Inventory invariants.** List operations where two or more writes must succeed or fail together (transfer = debit + credit; order = order row + stock decrement + payment record; signup = user + membership + audit log). For each, find the code path and check it is wrapped in one transaction.
2. **Read-modify-write races.** Grep for the fetch–check–write shape and read each hit:
   - balance / stock / quota checks: `if (balance >= amount)` then a later `UPDATE ... SET balance = <app-computed value>` — lost update under concurrency.
   - Correct forms, in preference order: atomic conditional write (`UPDATE ... SET balance = balance - ? WHERE id = ? AND balance >= ?` + check affected rows), `SELECT ... FOR UPDATE` inside the tx, or optimistic locking (version column). Serializable isolation is the last resort, not the default fix.
   - uniqueness via check-then-insert (`findFirst` → `create`) — race; must be a unique constraint + handle the violation.
3. **Transaction scope — too wide.** Inside any transaction, flag: HTTP/gRPC calls, queue publishes, email sends, sleeps, file I/O, and per-item loops over unbounded input. These hold locks/connections for the duration and turn a slow dependency into a DB outage. External calls move outside; see dual-write below for the ones that "must" be inside.
4. **Transaction scope — illusory.** ORM-specific traps where the code looks transactional but isn't:
   - queries inside a "transaction" that don't use the tx handle (Prisma: using `prisma.x` instead of the `tx` callback arg; Knex/TypeORM: missing `transacting`/manager; SQLAlchemy: second session).
   - nested transaction helpers that silently join the outer tx (ActiveRecord nested `transaction` without `requires_new`, and even then rollback via savepoint semantics).
   - transactions opened per-statement by autocommit when the author assumed a wrapping tx.
5. **Isolation assumptions.** Identify what the code implicitly assumes and check it against the engine default:

| Engine | Default isolation | Trap |
|---|---|---|
| Postgres | Read Committed | each statement sees a fresh snapshot; two reads in one tx can differ; RMW races are NOT prevented |
| SQLite | Serializable (single writer) | no concurrency bugs, but long write tx = `SQLITE_BUSY` for everyone; keep writes short, use `BEGIN IMMEDIATE` for RMW |

   Code assuming "repeatable read within a tx" on Postgres, or "my SELECT locked the row" on any engine without `FOR UPDATE`, is a finding.
6. **Deadlock ordering.** Where multiple rows/tables are locked (explicitly or by writes), check every code path acquires them in one consistent order (e.g. always lock accounts by ascending id). Flag pairs of endpoints that write the same two tables in opposite orders.
7. **Dual-write (DB + queue/event).** Find every place a DB write and a message publish must both happen. Publishing inside the tx (the publish is not rolled back with the tx → ghost event for a write that never happened) and publishing after commit (crash between commit and publish → event lost) are BOTH broken under failure. Durable fix: outbox table written in the same tx + relay, or CDC. Flag each dual-write and state which failure window it currently has; recommend outbox only where the business impact justifies it.
8. **Retries × idempotency.** For every handler that can be retried (queue consumers are at-least-once by default; HTTP clients with retry middleware; webhooks), check the effect of running it twice: double-charge, double-send, duplicate rows? Require an idempotency key / unique constraint / upsert, or an explicit statement of why duplication is tolerable.

## Output

Write `<repo>/.backend-review/report/latest/md/transactions-review.md` with:

- **Invariant table** — operation → writes involved → tx present? → verdict
- **Race conditions** — file:line, interleaving that corrupts state (write it as "request A does X, request B does Y"), and the atomic fix
- **Scope problems** — external I/O inside tx / illusory tx, with file:line
- **Isolation & locking notes** — assumptions that don't hold on the actual engine
- **Dual-writes** — each with its failure window and whether outbox is warranted
- **Idempotency gaps** — retryable handler → effect of a duplicate run

Order findings by blast radius (money > user data > logs). Keep under 250 lines. A race finding without a concrete interleaving is a guess — mark it "unconfirmed" or drop it.

## Boundaries

- Do NOT recommend raising isolation to Serializable as a first fix — prefer atomic writes and explicit locks; Serializable trades throughput and adds retry-on-serialization-failure obligations.
- Do NOT recommend outbox/CDC for low-stakes events — name the failure window and let severity decide.
- Do NOT modify source files.
- Query shape/performance is `backend-review-data-access`; schema changes are `db-migration-safety`.

## Related

- `backend-review-data-access` — query efficiency
- `backend-review-concurrency` — races in application memory (this skill covers races through the database)
- `db-migration-safety` — adding the unique constraints / version columns this review demands

## Agent compatibility

- Claude と Codex のどちらでも使える。読解ベースで harness 非依存。並行実行での再現テストは提案として書き、実行はユーザーに委ねる。
