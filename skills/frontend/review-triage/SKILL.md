---
name: frontend-review-triage
description: Use when starting a frontend review engagement or when the user asks for an initial assessment ("triage", "day 0", "what's the state of this repo"). Reads package.json, README, gh issues, and produces a scorecard covering lockfiles, TypeScript strictness, testing, CI, and known issues.
---

# Frontend Review — Triage

You are performing Day 0 triage for a frontend consulting engagement. Your job is to produce a short, honest scorecard of the repository's current state, not to recommend fixes. Recommendations come later from the other `frontend-review-*` skills.

## Procedure

0. **Classify the app** first — it sets which checks are P0 vs P1.
   - Ask the user (or infer from README / package.json) which app type applies:
     `admin` / `toc` (to-consumer) / `btob-saas` / `ec` / `fintech` / `healthcare` / `iot-ops` / `media`
   - Note any regulatory context (GDPR, PCI DSS, HIPAA, …) and authentication requirements.
   - Derive the priority profile from the type. Rule of thumb:
     - **fintech / healthcare / ec** → security (auth, token storage, env exposure) and dependency-CVE checks are P0; accessibility and perf P1.
     - **toc / media** → performance (LCP/CLS/INP, bundle size) is P0; SEO/a11y P0–P1; auth surface usually smaller.
     - **admin / btob-saas / iot-ops** → TypeScript strictness, state-management correctness, and authz boundaries are P0; raw perf often P1.
   - Save the classification + per-area P0/P1 to `<client-repo>/.frontend-review/kpi/app-classification.json` (create the dir if needed).
1. **Collect the scorecard data** with the bundled script:
   ```bash
   node scripts/audit-triage.mjs --repo <client-repo>
   ```
   It auto-detects the package manager (from the lockfile), reads `package.json`,
   `tsconfig*.json` (strict flags), test config presence, `.github/workflows/`, and
   open `gh` issues, writing `<client-repo>/.frontend-review/report/latest/raw/triage.json`.
2. Read `triage.json`. Also skim `README.md` (is it current?) and `tsconfig` for
   `@ts-nocheck` / `@ts-ignore` escape hatches the script does not count. Summarize
   into the scorecard table (see Output) — the markdown scorecard is the deliverable.

## Output

Write a Markdown report to `<client-repo>/.frontend-review/report/latest/md/triage-scorecard.md` with:

- **App classification** — type ID and key domain notes (1–3 lines)
- **Priority overrides** — which P0 security/perf checks apply to this app type
- **Scorecard table** (one row per area: package manager / TS strictness / testing / CI / deps / known issues — rate each)
- **Top 3 risks** — what would you fix first? Flag whether each risk is P0 or P1 per the classification above.
- **Open questions** for the client (things you can't tell from the code)
- **Next phase** — which domain `frontend-review-*` skills the Week 1 plan should run first, ordered by the classification priority

Keep the entire report under 400 lines. If you find yourself writing more, you're analyzing instead of triaging.

## Boundaries

- Do NOT propose fixes beyond a short "top 3 risks" section. Each risk is one sentence.
- Do NOT dive into domain-specific analysis — leave that for the domain skills (`frontend-review-ci` / `-hygiene` / `-deps` / `-testing` / `-security` / `-state` / `-performance`).
- Do NOT modify any files outside `<client-repo>/.frontend-review/`.
- Do NOT push commits or create PRs in the client repo.

## Related

- Domain skills to run after triage: `frontend-review-ci`, `frontend-review-hygiene`, `frontend-review-deps`, `frontend-review-testing`, `frontend-review-security`, `frontend-review-state`, `frontend-review-performance`
- Orchestrator: `frontend-review-weekly`

## Agent compatibility

- Claude と Codex のどちらでも使える。データ収集は同梱の `scripts/audit-triage.mjs`(zero-dep Node、パッケージマネージャ自動検出)で決定的に行う。
- `node` が前提。`gh` が無ければ open issues の収集だけ `available: false` になる。`<client-repo>/.frontend-review/` は出力規約で任意の作業ディレクトリに読み替えてよい。
