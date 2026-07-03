---
name: backend-review-data-access
description: 'Use when reviewing how a backend talks to its database — N+1 queries, queries inside loops, missing eager loading, overfetching, missing pagination, and index/WHERE mismatches. ORM-aware (Prisma, Drizzle, TypeORM, ActiveRecord, Django ORM, SQLAlchemy, GORM) and engine-generic. Evidence-first: findings must be confirmed by reading the actual query path, not pattern-matching alone.'
---

# Backend Review — Data Access

You are reviewing the data-access layer of a backend. The most common AI-generated problems are: an awaited query inside a loop (N+1), lazy-loaded relations accessed in a render/serialize loop, fetching whole tables to filter in application code, and list endpoints without pagination.

The failure mode to avoid in YOUR review: reporting a "possible N+1" from a grep hit without reading the code path. Every finding must cite file:line and explain the actual per-item query.

## Procedure

1. **Locate query issue sites.** Find where queries run: repository layer, ORM model calls, or raw SQL in handlers.
2. **Hunt N+1 — query-in-loop.** Grep for loop constructs near query calls, then READ each hit:
   ```bash
   # JS/TS: awaited call inside for/map — each hit needs manual confirmation
   grep -rn "for (\|for await\|\.map(\|\.forEach(" src/ --include='*.ts' -A 3 | grep -n "await.*\(find\|query\|select\|findUnique\|findFirst\|exec\)"
   # Ruby: .each blocks touching associations
   grep -rn "\.each do\|\.map do" app/ -A 3 | grep "\.\(user\|.*_id\|find\|where\)"
   # Python / Go: loops containing session.query / db.Query / .filter(
   ```
   A hit is a finding only if the queried key varies per iteration. A loop that queries a constant is a different (caching) issue.
3. **Hunt N+1 — lazy relation access.** This is the ORM-specific variant: the loop looks innocent because the query hides behind attribute access.

| ORM | Lazy trap | Eager fix |
|---|---|---|
| Prisma | separate `findMany` per parent (Prisma has no lazy loading — N+1 appears as explicit loops) | `include` / `select` with relation |
| Drizzle | per-row follow-up `db.select` | relational queries `with:` or explicit join |
| TypeORM | `lazy: true` relations awaited in loop | `relations: []` / QueryBuilder `leftJoinAndSelect` |
| ActiveRecord | `post.user` inside `.each` | `includes(:user)` (+ `strict_loading` to enforce) |
| Django ORM | `obj.fk` / `obj.set.all()` in template/loop | `select_related` / `prefetch_related` |
| SQLAlchemy | default lazy relationship in loop | `selectinload` / `joinedload` |
| GORM | per-row `Association` / follow-up `Find` | `Preload` |

4. **Overfetch and missing pagination.**
   - `SELECT *` / no `select:` on wide tables when only 2–3 columns are used.
   - List endpoints with no `LIMIT` / `take` / `page` parameter — flag every unbounded `findMany`/`all()` reachable from an HTTP handler.
   - Fetch-then-filter: `.filter()` / `select { ... }` in application code on a result set the DB could have filtered with a WHERE.
5. **Index / WHERE mismatch (static signal only).** Collect the WHERE/ORDER BY columns of the hottest queries and diff against the schema's indexes. Report as "no index found for this predicate — verify with the engine's plan tool"; do not claim slowness without a plan.
6. **Connection handling.** One pool per process (not per request); transactions/connections released on error paths; pool size not defaulted to 1 or unbounded.

## Measure-First Principle

Static reading finds candidates; query logs confirm them. For each N+1 finding, include the one-line way to prove it in this stack (Prisma `log: ['query']`, ActiveRecord log + `bullet` gem, Django `connection.queries` / debug toolbar, SQLAlchemy `echo=True`, GORM `Logger`). Recommendations that would add complexity (denormalization, caching) require measured evidence first; plain eager-loading fixes do not.

## Output

Write `<repo>/.backend-review/report/latest/md/data-access-review.md` with:

- **Confirmed N+1s** — file:line, the per-item query, the eager-loading fix, how to verify by log
- **Unbounded queries** — endpoint → query, suggested pagination shape
- **Overfetch** — fetch-then-filter and `SELECT *` sites worth fixing (skip trivial ones)
- **Index candidates** — predicate → missing index, marked "verify with EXPLAIN"
- **Connection handling** — pass/fail notes
- Each fix as its own suggested PR; one concern per PR

Keep under 200 lines. No finding without file:line.

## Boundaries

- Do NOT report grep hits you have not read — false N+1 reports destroy trust in the whole review.
- Do NOT recommend caching or denormalization as the first fix for an N+1; eager loading or a join comes first.
- Do NOT run EXPLAIN or modify source files; plan analysis belongs to `sql-plan-audit` (SQLite/D1) or the engine's own tooling.
- Transaction boundaries and locking are covered by `backend-review-transactions`.

## Related

- `backend-review-transactions` — correctness of multi-statement operations
- `sql-plan-audit`, `sql-schema-audit` — SQLite/D1 plan and schema tooling
- `db-migration-safety` — when the fix requires adding an index in production

## Agent compatibility

- Claude と Codex のどちらでも使える。grep + 読解ベースで harness 非依存。検証手順(query log の有効化)はレポートに書くだけで、実行はユーザー環境に委ねる。
