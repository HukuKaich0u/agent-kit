---
name: frontend-review-ci
description: Use when CI is slow, flaky, or the user asks to optimize GitHub Actions for a frontend project. Read-only desk review — inspects `.github/workflows/` and `gh run list` history, identifies bottleneck steps, proposes sharding / cache / concurrency improvements.
---

# Frontend Review — CI Optimization

You are optimizing GitHub Actions CI for a frontend project. This is a **read-only desk review** you run manually against a repo — there is no bundled audit script. Faster CI means developers trust it; trust is what makes the ratchet work.

Detect the package manager (npm / pnpm / yarn / bun) and test runners in use first — the checks below assume a common Node.js stack but the specific flags and cache paths depend on the actual tooling.

## Procedure

1. Inventory current workflows: `rg . .github/workflows/` or read each file directly.
2. Pull recent run history and step-level timing for the slowest runs:
   ```bash
   gh run list --limit 20
   gh run view <run-id> --log | grep -E '^\d{4}-' | head -200
   ```
3. Against the inventory, check:
   - Does **every job** (lint, build, test, coverage, etc.) use a package-manager store cache? A common miss: `test.yml` has cache but `lint.yml` and `pages.yml` do not.
   - Does `actions/setup-node` use `cache: pnpm` / `cache: npm` / `cache: yarn`, or is there a manual `actions/cache` block for the store? Either is fine; the key must include `hashFiles()` on the lockfile.
   - Does `actions/cache` cache the Playwright browser store (`~/.cache/ms-playwright`) if E2E runs?
   - Is there a `concurrency:` block?
   - Are vitest / playwright sharded?
   - Are jobs serialized via `needs:` unnecessarily?
   - Are `lint` and `typecheck` in the same serial job? They have no dependency on each other and should be separate parallel jobs.

## Output

Report the findings in the conversation by default. If the user wants a file, write a Markdown report at a path they choose (or `docs/reviews/ci-review.md`) with:

- Current median / max duration (from `gh run list` / `gh run view`)
- Slowest 3 steps in a representative failing + passing run
- Concrete recommendations, each mapped to a line in a YAML patch (not full rewrite)
- Estimated wins per recommendation

If the user wants a PR, produce a draft PR description they can copy into `gh pr create` — do not create the PR yourself.

## Development Iteration Timing Targets

These are **reference starting points**, not fixed thresholds — calibrate against the project's own history (recent `gh run list` durations) and stack before flagging a regression. A stage exceeding roughly 2× its own recent baseline is a stronger signal than an absolute number below.

| Stage | Target | How to measure |
|---|---|---|
| HMR (edit → screen) | < 500 ms | Vite `--debug` output |
| Unit test — single file | < 1 s | vitest / jest output |
| `test:ci` — full suite | < 1 min | CI step duration |
| `typecheck` | < 30 s | CI step duration |
| `lint` | < 30 s | CI step duration |
| E2E — one shard | < 50 s | CI step duration |
| **PR CI total (parallel)** | **< 5 min** | GitHub Actions wall-clock |
| `install` (cache hit) | < 15 s | CI step duration |
| `build` | < 30 s | CI step duration |

The **PR CI total** is the most user-visible number — as it grows past ~5 minutes, developers tend to context-switch away and stop trusting/watching CI, though the exact tolerance varies by team.

## Bottleneck Identification Procedure

1. From the step-level timing pulled above, identify the **single slowest job** in the DAG — only the longest path in a parallel graph determines wall-clock time.
2. Within that job, identify the slowest step.
3. Propose **one change per PR** — bundling multiple optimisations makes regression attribution impossible.
4. Measure wall-clock before/after on the same branch to verify the win.

## Typical Optimisation Patterns

| Area | Common fix |
|---|---|
| `install` | pnpm / npm store cache key, `--frozen-lockfile`, narrow `onlyBuiltDependencies`. **Audit every workflow file** — partial cache (only some jobs cached) is the most common oversight; `install` without cache is ~20-25 s, with cache hit it drops to ~2-3 s |
| `lint + typecheck` | Split into two parallel jobs (no mutual dependency). On a project with ~170 TS files, this alone cuts the lint-job wall-clock in half |
| `typecheck` | Project References split, `skipLibCheck: true`, resolve circular type imports |
| `lint` | lint-staged for PR (changed files only), enable linter's own incremental cache |
| `vitest` | `isolate: false`, tune `--pool` thread count, exclude test fixtures from coverage |
| Playwright | Tune shard count to test volume, `page.route()` to mock external APIs, move flaky tests to daily-only tag |
| Runner size | Larger runner (4-core+) only as a last resort after exhausting the above |

## Boundaries

- Do NOT actually create the PR or push the branch — just draft the description.
- Do NOT modify workflow YAML in the client repo; the user does that after reviewing your proposal.
- The timing targets and "typical fix" table above are common patterns, not universal rules — weigh each against the project's actual stack, runner tier, and test volume before recommending it.
