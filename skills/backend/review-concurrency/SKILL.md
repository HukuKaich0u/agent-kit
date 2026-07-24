---
name: backend-review-concurrency
description: Use when reviewing async, concurrent, parallel, or batch processing in a backend — event-loop blocking, unbounded fan-out, fire-and-forget promises/tasks, missing timeouts/cancellation, goroutine/task leaks, shared-state races in process memory, and batch jobs without chunking or resumability. Language-aware (Rust/Tokio, Go, Python, TypeScript/Node) with a decision rule for concurrency vs parallelism.
---

# Backend Review — Concurrency & Batch

You are reviewing how a backend handles concurrent, asynchronous, and batch work. The most common AI-generated problems are: `Promise.all` over an unbounded user-supplied array, blocking calls on the event loop, fire-and-forget async work with no error handling, no timeout on any outbound call, and batch jobs that load everything into memory and cannot resume.

Races that go **through the database** belong to `backend-review-transactions`. This skill covers races and failures in **process memory and task orchestration**.

## Concurrency vs Parallelism — the decision rule

Before recommending anything, classify the workload; the wrong model is a common AI mistake:

- **I/O-bound** (DB, HTTP, queue) → async / cooperative concurrency with a **bounded** pool. Threads/processes add nothing but overhead.
- **CPU-bound** (parsing, image/crypto/compression, big JSON) → real parallelism: Rust `rayon` or `tokio::task::spawn_blocking` onto a blocking pool (Tokio tasks are cooperative — a CPU-heavy `async fn` starves the executor same as Node/Python), Node `worker_threads`, Python `multiprocessing` (the GIL voids threads for CPU work; note free-threaded builds exist but are not the default assumption), Go goroutines across cores.
- **Mixed batch** → pipeline: bounded async I/O feeding a small worker pool.

Flag: worker threads spun up for I/O waits; `asyncio` used for CPU-heavy loops; "parallelized" code whose steps share one connection and serialize anyway.

## Procedure

1. **Unbounded fan-out.** Every concurrent map over a collection whose size the caller controls:
   - Rust: `tokio::spawn` inside a loop with no bound — each spawn is an unbounded task, and the `JoinHandle`s are often dropped so failures go unnoticed. Fix: `JoinSet` with a size check, or `futures::stream::iter(items).map(...).buffer_unordered(n)` for a bounded concurrent stream.
   - Node: `Promise.all(items.map(async …))` — fine for ≤ ~10 fixed items, a finding when `items` is user/DB-sized. Fix: `p-limit`, chunking, or a queue. Also prefer `Promise.allSettled` when partial failure must not abort the batch.
   - Python: `asyncio.gather(*[...])` without a `Semaphore`.
   - Go: `go func()` inside a loop with no `errgroup.WithContext` / worker pool / semaphore.
2. **Event-loop / worker blocking (Rust async, Node, Python asyncio).**
   ```bash
   grep -rn "readFileSync\|execSync\|pbkdf2Sync\|randomBytesSync\|gzipSync\|JSON.parse" src/ --include='*.ts'
   ```
   A sync call at startup/config time is fine; the same call inside a request handler or message consumer is a finding. Python: `requests.`, `time.sleep`, blocking DB drivers inside `async def` (fix: async client or `run_in_executor`). Rust: any `std::fs`/`std::thread::sleep`/synchronous DB driver call or CPU-heavy loop directly inside an `async fn` blocks the Tokio worker thread and stalls every other task scheduled on it — fix: `tokio::task::spawn_blocking` (see `lang/rust` §6 for the same pattern from the writing side).
3. **Fire-and-forget.** Async work started without awaiting or attaching error handling: Rust `tokio::spawn` whose `JoinHandle` is dropped — a panic inside the task is swallowed silently (the task aborts but nothing observes it) and there is no backpressure; Node un-awaited promises (crash on unhandled rejection, silent loss of the work, no backpressure), Python `create_task` with no reference/callback (task can be GC'd mid-flight), Go goroutines that outlive the request with no panic recovery. Intentional background work must go through something owned: a queue, a supervisor, at minimum a stored `JoinHandle`/`.catch` + metric.
4. **Timeouts and cancellation.** Every outbound call (HTTP, DB, queue, gRPC) needs a timeout; the default of most clients is none or minutes. Check: Rust `tokio::time::timeout(dur, fut)` wrapping the call, and whether long-running loops accept a `CancellationToken` (`tokio_util::sync::CancellationToken`) rather than running unconditionally to completion; Node `AbortSignal.timeout` / client-level timeout; Go `context.Context` actually plumbed into DB/HTTP calls (accepting `ctx` and ignoring it is the classic miss); Python `asyncio.timeout` / client timeout. Also check cancellation propagates: when the caller gives up, does the work stop, or does it keep holding a DB connection? For Rust specifically, check `tokio::select!` loops for cancellation-safety (see `lang/rust` §6) — a branch whose future isn't cancellation-safe silently drops in-progress state on every loop iteration where another branch wins.
5. **Shared mutable state.** Module-level / singleton mutable objects touched by concurrent requests: request-scoped data cached on a shared object, non-atomic check-then-set on an in-memory map, Go maps written from multiple goroutines (run `go build -race` candidates), Rust `Arc<Mutex<T>>` (or `RwLock`) where the guard is held across an `.await` point — blocks every other task waiting on the lock for the duration of the async call, and with `std::sync::Mutex` specifically can deadlock the runtime (see `lang/rust` §6; fix is to shrink the lock scope to end before the `.await`, or switch to `tokio::sync::Mutex` if the critical section genuinely must span an await). In-memory caches: fine for immutable config; a finding when used for per-user data or as the only rate-limiter across multiple processes.
6. **Batch jobs.** For each cron/CLI/scheduled job:
   - **Chunking**: streams or paginates (`cursor`, keyset) instead of `findAll()` into memory.
   - **Resumability**: crash at item 50k of 100k — rerun from checkpoint, or from zero? Is rerunning safe (idempotent) at all?
   - **Progress & failure budget**: logs progress, counts failures, and distinguishes "one item failed" from "the job failed".
   - **Overlap**: what happens when the next scheduled run starts while the previous is still running (lock, skip, or double-processing)?
7. **Queue consumers.** Concurrency/prefetch bounded and sized against the DB pool (prefetch 50 × pool 10 = starvation); visibility timeout / ack deadline longer than real processing time; poison messages go to a DLQ instead of blocking the queue forever. Duplicate-delivery handling is `backend-review-transactions` territory — cross-reference, don't duplicate.

## Output

Report the findings in the conversation by default. If the user wants a file, write a Markdown report at a path they choose (or `docs/reviews/concurrency-review.md`) with:

- **Workload classification** — I/O vs CPU per hot path, and any wrong-model findings
- **Unbounded fan-out** — file:line, what bounds the input, suggested limit mechanism
- **Blocking / fire-and-forget / timeout gaps** — file:line each, with the failure it causes ("one slow upstream call holds all 10 pool connections → total outage")
- **Shared-state races** — the interleaving, written as two concrete requests
- **Batch & consumer table** — job → chunked? resumable? overlap-safe? bounded?

Keep under 250 lines. Every finding needs the concrete failure it causes, not "this is bad practice".

## Boundaries

- Do NOT recommend adding concurrency to code that is fast enough sequentially — concurrency is a complexity budget, spend it on measured bottlenecks.
- Do NOT flag sync calls outside hot paths (startup, CLI, tests).
- Races through the DB (lost updates, check-then-insert) → `backend-review-transactions`.
- Do NOT modify source files.

## Related

- `backend-review-transactions` — DB-level races, idempotency of retried consumers
- `backend-review-data-access` — connection pool sizing interacts with fan-out bounds
- `devops/otel-node` — instrumenting to measure before optimizing
- `lang/rust` — Tokio async pitfalls (blocking, `Send`, `select!` cancellation-safety) referenced throughout this review

## Agent compatibility

- Claude と Codex のどちらでも使える。grep + 読解ベースで harness 非依存。`go build -race` / `cargo clippy`(async 関連 lint)などの検証コマンドは提案として書き、実行はユーザー環境に委ねる。
