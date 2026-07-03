---
name: frontend-review-weekly
description: Use for the weekly AI review. Orchestrates all frontend-review-* skills in order, synthesizes their domain reports into a single prioritized weekly report, diffs against last week's KPIs, and feeds the ratchet.
---

# Frontend Review — Weekly Orchestrator

You are running the weekly AI review. Your job is NOT to make new judgments — it's to:

1. Re-run every `frontend-review-*` skill in the correct order.
2. Synthesize their domain reports into a single prioritized weekly report.
3. Diff the KPIs against last week's baseline.
4. File GitHub issues for repeat findings.
5. Propose static-rule promotions for patterns that appear 3+ weeks in a row.

## Procedure

### Phase 1: raw data collection

Run, in this order:

1. `frontend-review-triage`
2. `frontend-review-ci`
3. `frontend-review-hygiene`
4. `frontend-review-deps`
5. `frontend-review-testing`
6. `frontend-review-security`

Each of these writes to `<repo>/.frontend-review/report/latest/`.

### Phase 1.5: architecture review (run when findings are suspected)

Run these on-demand, or always for the first weekly review of a repo:

7. `frontend-review-state`
8. `frontend-review-performance`

These write to `<repo>/.frontend-review/report/latest/md/`.

### Phase 2: synthesis

There is no perspective sub-skill layer — you (the orchestrating model) perform the synthesis directly:

1. Read every domain report under `<repo>/.frontend-review/report/latest/md/` (e.g. `triage-scorecard.md`, `ci-analysis.md`, `hygiene-summary.md`, `deps-review.md`, `testing-review.md`, `security-review.md`, and `state-review.md` / `performance-review.md` if Phase 1.5 ran).
2. Read `<repo>/.frontend-review/kpi/app-classification.json` (written by `frontend-review-triage`) to get the app type's P0/P1 profile.
3. Cross-reference findings across reports — the same root cause often surfaces in more than one domain (e.g. a missing input-validation layer showing up in both `security-review.md` and `hygiene-summary.md`'s lint findings). Merge these into one finding with all contributing domains cited.
4. If a previous week's report exists (`report/weekly-*.md`), diff this week's findings against it to compute deltas (new / resolved / persisting).
5. Produce **one prioritized list of top risks**, ranked by the app-classification P0/P1 profile — P0 risks first, regardless of which domain skill surfaced them.
6. Write a **one-line status per domain** (triage, CI, hygiene, deps, testing, security, and state/performance if run): healthy / needs attention / regressed.

### Phase 3: KPI diff and ratchet

Compare `<repo>/.frontend-review/report/latest/raw/*.json` against `<repo>/.frontend-review/kpi/baseline.json`. Flag:

- Any **regression** (bad) — these must be fixed before the next weekly
- Any **improvement** (good) — these update the baseline (ratchet tightens)

### Phase 4: repeat-finding detection

Compare this week's findings with the previous 2 `report/weekly-*.md` files. Any finding that appears in all three weeks is a candidate for **static rule promotion**: propose an eslint/biome custom rule, a codemod, or a CI gate that would make the check automatic. Write these proposals to `<repo>/eslint-rules/proposals/<rule-name>.md` (create the directory if needed) but do NOT implement them — that's a separate engineering task.

### Phase 5: report

Write `<repo>/.frontend-review/report/weekly-$(date +%Y-w%V).md` with:

- **Top risks** (from Phase 2 synthesis), ranked by the app-classification P0/P1 profile, each citing the contributing domain report(s)
- **Per-domain status** (1 line per domain from Phase 2 step 6)
- **KPI delta table** (per category, from Phase 3)
- **Regressions** (must fix)
- **Improvements** (ratchet updates)
- **Deltas vs previous week** (new / resolved / persisting findings, if a previous report exists)
- **Static rule promotions** (pointer to proposals)
- **Issues filed** (`gh issue create` output)

## Trend Monitoring

Alongside KPI diffing, check the following external signals once per weekly cycle to detect ecosystem drift early.

### Monitoring sources

| Source | Cadence | What to look for |
|---|---|---|
| **Configured ecosystem news source(s)** (e.g. jser.info) | Depends on source | Major releases, RFCs, breaking changes, security advisories affecting the project's dependencies |
| **State of JS** (yearly, ~Dec) | Annual | Usage/satisfaction trends; two consecutive years of satisfaction decline is a switch-trigger |
| **State of CSS** (yearly) | Annual | CSS adoption trends, Tailwind / CSS-in-JS sentiment |
| **JavaScript Rising Stars** (yearly, ~Jan) | Annual | GitHub star growth; early signal for emerging tools |
| **Official release blogs** | On release | Track the project's direct dependencies (framework, bundler, test runner, linter, TypeScript) for major releases |

If the repo owner has configured ecosystem news source(s) (e.g. `jser.info`, a framework blog, a changelog feed), WebFetch them for the weekly run and scan for any mention of packages listed in `package.json`. If no source is configured, skip this step. Flag anything relevant under an **Ecosystem Signals** heading.

### Switch triggers

Recommend investigating a tool replacement when **any two** of these conditions are met:

1. Satisfaction score has declined for **2 consecutive years** in State of JS / State of CSS.
2. **No major release in the past 6 months** and GitHub issue accumulation is trending up.
3. A **maintainer departure or deprecation notice** was reported.
4. A **clear superior alternative** exists: feature parity + significant performance or DX improvement + realistic migration path.

## AI / Human Responsibility Split

**AI can act on (without human pre-approval):**
- Auto-fixable lint / typecheck errors
- Expanding test coverage for existing patterns
- Dependency version bumps (after lint + test pass)

**Human must decide:**
- Test failure triage: is the spec wrong, the implementation wrong, or the test wrong?
- New library additions or removals
- Architecture boundary changes (new state layer, new routing pattern, new async boundary)
- Any change that modifies what the app does, not just how it does it

Flag any AI-generated PRs in the weekly report that appear to cross into the human-decision zone.

## Boundaries

- Do NOT skip any of the Phase 1 domain skills, even if time is short.
- Do NOT modify source code in the repo.
- Do NOT silently update `kpi/baseline.json` on a regression. Only update on improvement.

## Reference

- Related skills: all `frontend-review-*` domain skills (`triage`, `ci`, `hygiene`, `deps`, `testing`, `security`, `state`, `performance`)

## Agent compatibility

- Claude と Codex のどちらでも使える。orchestration ロジック自体は harness 非依存。
- Phase 2 の synthesis は subagent の並列 dispatch を前提にしない — orchestrating model 自身が domain report を読んで統合するため、追加の外部 skill は不要。
- `gh issue create` を使う Phase 5 は `gh` CLI 前提。無ければ issue 起票を省き、レポートに finding を列挙するに留める。
