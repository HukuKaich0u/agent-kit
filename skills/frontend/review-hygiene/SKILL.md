---
name: frontend-review-hygiene
description: Use when assessing code quality hygiene — TypeScript strictness, lint violations, dead code, and duplication. Runs `tsc` / `eslint` (or biome) / `knip` / similarity detection directly. Does NOT cover dependency freshness or CVE audit — use `frontend-review-deps` for that.
---

# Frontend Review — Hygiene

You are assessing the baseline code quality hygiene of a frontend project: types, lint, dead code, and duplication. These are the KPIs that will be ratcheted each week.

## Procedure

1. **Collect hygiene metrics directly** (no external script needed). Run, in the client repo:
   - **TypeScript**: `npx tsc --noEmit` (count errors); inspect `tsconfig*.json` for `strict`, `noUncheckedIndexedAccess`, and `@ts-nocheck` / `@ts-ignore` escape hatches (`grep -rn "@ts-\(nocheck\|ignore\|expect-error\)" src`).
   - **Lint**: run the project's linter with a machine-readable formatter — `npx eslint . -f json` or `npx biome check --reporter=json` — and count violations by severity.
   - **Dead code**: `npx knip` (or `npx ts-prune`) for unused exports / files / deps.
   - **Duplication**: `npx similarity-ts .` if available, else `npx jscpd src` for copy-paste detection.
2. Record the counts as this run's KPIs.
3. Compare with the previous run if `<client-repo>/.frontend-review/kpi/baseline.json` exists.

## Output

Write `<client-repo>/.frontend-review/report/latest/md/hygiene-summary.md` with:

- **KPI table** covering: `any` count, `@ts-ignore` count, lint errors/warnings, knip unused files/exports/deps, similarity duplicate pairs
- **Delta vs baseline** (mark regressions in bold; improvements with ✅)
- **Remediation batches** grouped by impact — which items make sense to fix in one PR
- **Do NOT include** per-file findings (those stay in the raw JSON). The report is for decisions, not code review.

If the client has no baseline yet, create one: copy the current JSON to `<client-repo>/.frontend-review/kpi/baseline.json` and state this in the report.

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
- Do NOT propose code-level fixes. That's for the 5 perspective skills.
- Do NOT touch source files in the client repo.
- Do NOT do security analysis — that's `frontend-review-security`'s job.

## Related

- `frontend-review-deps` (dependency health), `frontend-review-security` (CVEs + auth + env)
- `frontend-review-weekly` — orchestrator

## Agent compatibility

- Claude と Codex のどちらでも使える。計測は agent が `tsc` / `eslint`(or `biome`) / `knip` / `similarity-ts` を直接叩く self-contained 構成。
- これらのツールが無ければ可能なものだけ実行し、欠けた軸は「未計測」と明記する。
