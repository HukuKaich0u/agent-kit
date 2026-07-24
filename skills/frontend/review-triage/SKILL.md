---
name: frontend-review-triage
description: Use when starting a frontend review engagement or when the user asks for an initial assessment ("triage", "day 0", "what's the state of this repo"). Reads package.json, README, and gh issues, classifies the app type, and produces a scorecard covering lockfiles, TypeScript strictness, testing, CI, and known issues. Read-only desk review; run it manually per repo. This is the entry point for the other `frontend-review-*` skills.
---

# Frontend Review — Triage

You are performing Day 0 triage for a frontend consulting engagement. This is a **read-only desk review** you run manually against a repo — there is no batch runner, scheduled cadence, or bundled audit script. Your job is to produce a short, honest scorecard of the repository's current state, not to recommend fixes. Deeper recommendations come from the other `frontend-review-*` skills (`review-ci`, `review-deps`, `review-hygiene`, `review-performance`, `review-security`, `review-state`, `review-testing`) — point the user at the relevant ones once triage surfaces an area worth digging into.

## Procedure

0. **Classify the app.**
   - Ask the user (or infer from README / package.json / routing structure) which shape the app is closest to:
     `admin` / `internal tool` / `b2b SaaS` / `e-commerce` / `fintech` / `healthcare` / `iot / ops dashboard` / `media / content site` — and separately, its rendering model (SPA / SSR / SSG / hybrid).
   - Note any regulatory context (GDPR, PCI DSS, HIPAA, …) and authentication requirements — these change which findings below are P0 vs P1. There is no fixed classification matrix to consult; use judgement based on what the app actually does (e.g. a fintech app handling payments treats auth/session findings as P0 even if a generic checklist wouldn't).
1. **Detect the stack.** Read `package.json` (dependencies, scripts, `engines`, `packageManager`) and the lockfile present (`package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` / `bun.lock`) to identify package manager, framework, and major libraries.
2. Skim:
   - `README.md` — is it up-to-date, does it describe how to run things
   - `tsconfig.json` — strictness flags (`strict`, `noImplicitAny`, etc.)
   - `.github/workflows/` (or other CI config) — which workflows exist, do they run lint/typecheck/test
   - Test setup — presence of a test runner, rough test count (see `frontend-review-testing` for depth)
   - `gh issue list --state open --limit 20 --json number,title,labels` (if `gh` is available and the repo has issues enabled) — what's already flagged as known problems
3. Collect "known issues" by combining the open-issues skim above with anything self-evident from the code (TODO/FIXME density, obviously stale dependencies, disabled tests) — there is no separate known-issues checklist to cross-reference.

## Output

Report the findings in the conversation by default. If the user wants a file, write a Markdown report at a path they choose (or `docs/reviews/triage-scorecard.md`) with:

- **App classification** — shape, rendering model, and key domain notes (1–3 lines)
- **Priority notes** — which findings are P0 vs P1 given the app's domain, and why
- **Scorecard table** — lockfile hygiene, TypeScript strictness, test setup, CI coverage, known issues, each with a short verdict
- **Top 3 risks** — what would you fix first? One sentence each.
- **Open questions** for the client (things you can't tell from the code)
- **Suggested next skills** — which `frontend-review-*` skills to run next given what triage found, roughly ordered by priority

Keep the entire report under 400 lines. If you find yourself writing more, you're analyzing instead of triaging — hand that depth off to the relevant domain-specific skill instead.

## Boundaries

- Do NOT propose fixes beyond a short "top 3 risks" section. Each risk is one sentence.
- Do NOT perform the deep-dive work of the domain-specific skills yourself — flag the area and point to `review-ci` / `review-deps` / `review-hygiene` / `review-performance` / `review-security` / `review-state` / `review-testing` as appropriate.
- Do NOT modify any files in the client repo.
- Do NOT push commits or create PRs in the client repo.
