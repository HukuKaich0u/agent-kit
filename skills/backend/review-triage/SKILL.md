---
name: backend-review-triage
description: Use when starting a backend review or when the user asks "review this backend / server / API" without naming a specific concern. Classifies the service (API / worker / batch / event-driven), detects the stack (language, framework, DB, queue), and decides which backend-review-* lenses to run in what order. Entry point for the backend-review family — do NOT use for a review scoped to one named concern (go straight to that lens skill).
---

# Backend Review — Triage

You are starting a backend review. Your job is to classify the service, detect the stack, and produce a short review plan that names which `backend-review-*` lens skills apply and in what order. You do NOT perform the domain reviews here.

## Procedure

1. **Detect the stack.** Read whichever exist: `package.json`, `go.mod`, `pyproject.toml` / `requirements.txt`, `Gemfile`, `pom.xml` / `build.gradle`, `Cargo.toml`. Record: language, web framework, ORM / DB client, queue / messaging client, cache client.
2. **Classify the service type(s).** A repo can be more than one:
   - `api` — HTTP/gRPC request handlers exist (routes, controllers, resolvers)
   - `worker` — queue/stream consumers (SQS, RabbitMQ, Kafka, BullMQ, Sidekiq, Celery, …)
   - `batch` — cron entries, scheduled jobs, one-shot CLI jobs over datasets
   - `event-driven` — pub/sub handlers, webhooks, outbox/CDC
3. **Find the data layer.** Locate schema/migration files (`migrations/`, `prisma/schema.prisma`, `db/schema.rb`, `*.sql`) and where queries are issued (repository layer? inline in handlers?). Note the engine(s): Postgres / MySQL / SQLite / other.
4. **Size the surface.** Rough counts: number of routes/handlers, number of tables, number of background jobs. `grep -c` is enough; do not read every file.
5. **Derive the lens plan** from the classification:

| Signal | Lens | Priority |
|---|---|---|
| Any DB access | `backend-review-data-access` | P0 for `api`, P1 otherwise |
| Multi-write operations, money/inventory/state machines | `backend-review-transactions` | P0 |
| `worker` / `batch` type, or heavy async code | `backend-review-concurrency` | P0 for worker/batch, P1 for api |
| Repo > ~20 modules or user says "maintainability / architecture" | `backend-review-architecture` | P1 (P0 only if user asked) |
| Pending schema changes in the diff | `db-migration-safety` | P0 |

## Output

Write `<repo>/.backend-review/report/latest/md/triage.md` with:

- **Service classification** — type(s), one line each on the evidence
- **Stack table** — language / framework / ORM / DB engine(s) / queue / cache
- **Surface size** — routes, tables, jobs (rough counts)
- **Lens plan** — ordered list of `backend-review-*` skills to run, each with priority and a one-line reason
- **Open questions** — things you cannot tell from the code (traffic volume, SLOs, deployment model)

Keep it under 150 lines. If you are writing findings about N+1s or transactions here, stop — that belongs to the lens skills.

## Boundaries

- Do NOT report domain findings; only classify and plan.
- Do NOT modify any files outside `<repo>/.backend-review/`.
- If the user already named a concern ("check for N+1"), skip triage and invoke that lens directly.

## Related

- Lenses: `backend-review-data-access`, `backend-review-transactions`, `backend-review-concurrency`, `backend-review-architecture`
- Schema changes: `db-migration-safety`
- Frontend counterpart: `frontend-review-triage`

## Agent compatibility

- Claude と Codex のどちらでも使える。検出は manifest 読解と `grep` のみで、harness 固有機能に依存しない。
- `<repo>/.backend-review/` は出力規約で、任意の作業ディレクトリに読み替えてよい。
