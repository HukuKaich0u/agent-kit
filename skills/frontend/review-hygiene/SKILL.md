---
name: frontend-review-hygiene
description: Use when assessing code quality hygiene — TypeScript strictness, lint violations, dead code, and duplication. Read-only desk review using the project's own package manager and existing scripts (tsc, eslint/biome, knip, jscpd, etc). Does NOT cover dependency freshness or CVE audit — use `frontend-review-deps` for that.
---

# Frontend Review — Hygiene

You are assessing the baseline code quality hygiene of a frontend project: types, lint, dead code, and duplication. This is a **read-only desk review** you run manually against a repo — there is no bundled audit script. Use the project's own tooling.

## Procedure

1. Detect the package manager (npm / pnpm / yarn / bun) from the lockfile, and check `package.json` scripts for existing `typecheck`, `lint`, and similar commands — prefer running those over inventing your own invocation.
2. Run type / lint checks, e.g.:
   - TypeScript: `tsc --noEmit` (or the project's `typecheck` script)
   - Lint: the project's `lint` script (ESLint / Biome / oxlint), or `eslint . --format json` / `biome check --reporter=json` directly
3. Dead code / unused exports: if `knip` (or similar) is already a devDependency or has a config file, run it via the package manager (e.g. `pnpm dlx knip`, `npx knip`); otherwise note that dead-code detection needs `knip` (or an equivalent) added, and fall back to `rg` for obviously unused exports if the user wants a lighter check.
4. Duplication: if a similarity tool (`jscpd`, `sonar`, etc.) is configured, run it; otherwise do a lighter manual scan of suspiciously similar files/functions, or suggest `jscpd` as a one-off (`npx jscpd src/`).
5. If the user has a previous report/summary to compare against, diff against it; otherwise this run establishes the baseline.

## Output

Report the findings in the conversation by default. If the user wants a file, write a Markdown report at a path they choose (or `docs/reviews/hygiene-review.md`) with:

- **KPI table** covering: `any` count, `@ts-ignore` count, lint errors/warnings, unused files/exports/deps, duplicate pairs
- **Delta vs previous report**, if one was supplied (mark regressions in bold; improvements with ✅)
- **Remediation batches** grouped by impact — which items make sense to fix in one PR
- **Do NOT include** exhaustive per-file findings in the summary — link/attach the raw tool output instead. The report is for decisions, not code review.

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
- Do NOT propose sweeping code-level rewrites yourself; surface findings and remediation batches for the human/team to act on.
- Do NOT touch source files in the client repo.
- Do NOT run security-focused checks (HTML sinks, auth, env exposure) — that's `frontend-review-security`.
- The toolchain role-separation table and KPI categories above are common patterns, not universal rules — a small project may reasonably not need all of them; weigh against actual project size and stack.
