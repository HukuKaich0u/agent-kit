---
name: frontend-review-hygiene
description: Use when assessing code quality hygiene — TypeScript error count, lint violations, and dead code. Runs `tsc` / `eslint` (or biome) / `knip` via a bundled audit script. Does NOT cover dependency freshness or CVE audit — use `frontend-review-deps` for that.
---

# Frontend Review — Hygiene

You are assessing the baseline code quality hygiene of a frontend project: types, lint, and dead code. These are the KPIs that will be ratcheted each week.

## Procedure

0. If `<repo>/.frontend-review/kpi/app-classification.json` exists (written by `frontend-review-triage`), read it and weight findings by its P0/P1 profile for this app type.
1. **Collect hygiene metrics** with the bundled script:
   ```bash
   node scripts/audit-hygiene.mjs --repo <repo>
   ```
   It auto-detects the package manager and runs TypeScript (`tsc --noEmit` error
   count), the linter (eslint or biome, auto-detected), and dead-code (`knip`),
   writing `<repo>/.frontend-review/report/latest/raw/hygiene.json`. Each
   tool is best-effort — a missing one is recorded as `available: false`.
2. Read `hygiene.json`. For escape hatches the script does not count, also
   `grep -rn "@ts-\(nocheck\|ignore\|expect-error\)" src`. Record the counts as this run's KPIs.
3. Compare with the previous run if `<repo>/.frontend-review/kpi/baseline.json` exists.

## Output

Write `<repo>/.frontend-review/report/latest/md/hygiene-summary.md` with:

- **KPI table** covering: TypeScript error count, lint errors/warnings (or biome clean/dirty status), dead-code (knip) report line count, plus the `@ts-ignore`/`@ts-nocheck`/`@ts-expect-error` grep count from step 2
- **Delta vs baseline** (mark regressions in bold; improvements with ✅)
- **Remediation batches** grouped by impact — which items make sense to fix in one PR
- **Do NOT include** per-file findings (those stay in the raw JSON). The report is for decisions, not code review.
- Keep the report under 250 lines.

If the repo has no baseline yet, create one: copy the current JSON to `<repo>/.frontend-review/kpi/baseline.json` and state this in the report.

## Toolchain Role Separation

When assessing the linting / formatting stack, check for clear role boundaries:

| Tool | Intended role |
|---|---|
| TypeScript | Type correctness only |
| ESLint / Biome / oxlint | AST-level bug patterns, import rules |
| Prettier / Biome / oxfmt | Formatting only — no overlap with linting |
| ast-grep / custom rules | Project-specific structural rules |
| vitest / jest | Behaviour |

Overlapping responsibilities (e.g., ESLint also handling formatting) cause conflicts and slower CI. Flag and recommend separation.

Auto-generated files (lock files, generated schemas, tool artefacts) must be excluded from formatting runs. Repeatedly formatting and reverting a generated file is a signal they are missing from `.prettierignore` / `.biomeignore` / equivalent.

## Boundaries

- Do NOT assess dependency freshness or CVEs — that's `frontend-review-deps`.
- Do NOT touch source files in the repo.
- Do NOT do security analysis — that's `frontend-review-security`'s job.
- Every finding must cite file:line (or a config key). Findings not verified by reading the actual code/config must be marked "unconfirmed" or dropped.

## Related

- `frontend-review-deps` (dependency health), `frontend-review-security` (CVEs + auth + env)
- `frontend-review-weekly` — orchestrator

## Agent compatibility

- Claude と Codex のどちらでも使える。計測は同梱の `scripts/audit-hygiene.mjs`(zero-dep Node、パッケージマネージャ自動検出)で行う。
- `node` が前提。tsc/eslint/biome/knip のうち未インストールのものは `available: false` として記録され、欠けた軸は「未計測」になる。
