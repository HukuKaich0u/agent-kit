---
name: frontend-review-deps
description: Use when auditing dependency health or running a periodic dependency update — outdated packages, CVE triage with attack-vector weighting, deprecated/declining library detection, and an approval-gated update workflow (patch/minor batching, major one-at-a-time). Uses the project's own package manager audit tooling (npm/pnpm/yarn/bun/cargo). Pairs with `frontend-review-security` for the full security picture.
---

# Review — Dependencies

You are reviewing the dependency health of a project. The skill lives in the frontend review suite but the workflow applies to any stack whose manager ships audit tooling (npm / pnpm / yarn / bun, cargo).

Two modes:

- **Audit (default)** — a read-only desk review: freshness, CVE triage, trend watch. No files touched.
- **Update execution (opt-in)** — only when the user asks for updates to be applied. Every install/update command and every commit is proposed first and run after approval.

## When to run

- Monthly maintenance cadence, or before a major release / branch freeze
- The manager's audit command reports a vulnerability in CI
- A major ecosystem library (React, Vite, TypeScript, tokio, …) drops a new major version

Before doing anything: check for `renovate.json` / `.github/renovate.json` / `.github/dependabot.yml`. If a bot is configured, review its open PRs first — don't duplicate its work.

## Procedure (audit)

1. Detect the package manager(s) in use (npm / pnpm / yarn / bun, plus Cargo.toml if there's a Rust component) from lockfiles.
2. Run the native audit and outdated-package commands for that manager, e.g.:
   - pnpm: `pnpm audit --prod --json`, `pnpm outdated`
   - npm: `npm audit --omit=dev --json`, `npm outdated`
   - yarn: `yarn npm audit --environment production`, `yarn outdated`
   - bun: `bun audit`, `bun outdated`
   - Rust: `cargo audit`, `cargo outdated`
3. Categorize each outdated package as patch / minor / major / deprecated — this drives the update batching strategy below.
4. For each CVE finding, apply the attack-vector triage matrix below before assigning priority.
5. For trend-watch, read the manifest (and lockfile versions) directly and judge each notable dependency against the tiers below — there is no bundled config file listing tracked libraries; use your own knowledge of the ecosystem plus a web search if uncertain about a library's current maintenance status.

## CVE Triage — Attack Vector Matrix

Do not use CVSS score alone. A CVSS 9.8 RCE in a devDependency has zero production impact for a browser-only SPA.

| CVE Type | devDep only | Runtime (SPA) | Runtime (SSR/Edge/server) |
|---|---|---|---|
| RCE | ignore | **ignore** | **P0** |
| Prototype Pollution | ignore | **P1** (check input path) | **P0** |
| ReDoS | ignore | **P1** (check user input reach) | **P0** |
| Path Traversal | ignore | **ignore** | **P0** |
| XSS via library | ignore | **P0** (HTML-generating libs) | **P0** |
| SSRF | ignore | **ignore** | **P0** |
| Supply Chain (postinstall malware) | CI **P0** | CI **P0** | **P0** |

**Triage procedure:**

1. Run the manager's audit command scoped to production deps only (e.g. `pnpm audit --prod`, `npm audit --omit=dev`) to exclude devDeps from output.
2. Focus on Prototype Pollution / ReDoS / XSS — other types are low-risk for browser-only SPAs.
3. For each remaining finding, check whether user-controlled input can reach the vulnerable code path. If not, downgrade to P2.
4. For SSR / Edge Functions / servers, treat RCE / Path Traversal / SSRF as P0.
5. Document every ignored CVE with the reason in the report's "Ignored CVEs" section (see Output below).

```bash
# pnpm — runtime-only CVEs (excludes devDeps)
pnpm audit --prod --audit-level=moderate --json | jq '
  .vulnerabilities | to_entries[] |
  { name: .key, severity: .value.severity,
    via: [.value.via[] | select(type=="object") | .title] }'

# npm — runtime-only CVEs (npm's JSON shape differs from pnpm's)
npm audit --omit=dev --json | jq '
  .vulnerabilities | to_entries[] |
  { name: .key, severity: .value.severity,
    via: [.value.via[] | select(type=="object") | .title] }'

# Rust — cargo-audit (rustsec advisory DB)
cargo audit --json | jq '
  .vulnerabilities.list[] |
  { crate: .package.name, id: .advisory.id, title: .advisory.title }'
```

Adapt the `jq` filter shape to whatever JSON the detected manager's audit command emits (yarn's and bun's differ again; fall back to the plain-text output when the JSON schema is unclear).

## Trend Watch — Library Tiers

This is a one-off snapshot judgment based on the manifest and your own knowledge (plus a web search for anything uncertain) — there is no bundled config file listing tracked libraries. For ongoing/longitudinal tracking across runs, defer to the `tech-trend-watch` skill.

- **Tier 1 (migrate now)**: Deprecated / abandoned / superseded — no rational reason to continue. Includes libraries where migration cost is low and a mature alternative exists, even if not officially deprecated (`jest` → vitest, `axios` → ky/fetch, `cypress` → Playwright).
- **Tier 2 (plan migration)**: Maintenance mode / satisfaction declining / RSC-incompatible.
- **Tier 3 (watch)**: EOL versions exist / satisfaction trending down.

Cheap wins to check while you're in the manifest:

- **Deprecated `@types/<pkg>`** — the base package likely ships its own types now. Verify: `cat node_modules/<pkg>/package.json | jq '.types, .typings'`. If non-null, the `@types/<pkg>` devDep can be dropped — zero migration cost.
- **CJS-only packages in an ESM project** — check the `exports` field in their `package.json`.

For each Tier 1 finding: propose a concrete migration path and estimate effort (hours/days).
For each Tier 2 finding: recommend scheduling a migration in the next 1–3 months.
For each Tier 3 finding: add to the ongoing monitoring list.

## Library Selection — Web Standards First

Before recommending a new dependency as a replacement, apply this order:

1. **Can a Web Platform / ECMAScript standard API cover this?**

| Use case | Avoid | Use instead |
|---|---|---|
| Date / time | moment, date-fns, dayjs | `Temporal` (polyfill), or `Date` for simple cases |
| Array / object utilities | lodash, ramda | `Array.prototype.{flatMap,findLast}`, `Object.{entries,fromEntries,groupBy}`, `Map.groupBy`, `structuredClone()` |
| HTTP requests | axios, request | `fetch` + `AbortController` |
| UUID generation | uuid, nanoid | `crypto.randomUUID()` |
| URL / query params | qs, query-string | `URL`, `URLSearchParams` |
| Number / date formatting | numeral.js | `Intl.NumberFormat`, `Intl.DateTimeFormat` |

2. **Tree-shakable?** Only what is imported should end up in the bundle.
3. **Actively maintained?** Recent release activity — check the registry page or repo, adjusted for how critical/high-churn the library is.
4. **Bundle impact reasonable?** Verify with the project's build command and a bundle analyser; a few kb gzip is a rough sanity check, not a hard limit.

## Update execution (opt-in, approval-gated)

Only enter this mode when the user asks for updates to be applied. Present each batch (what changes, why, the exact commands) and run after approval. Commits and PRs follow the same rule — propose the split and message, commit on approval.

### Batch strategy

| Update type | Strategy |
|---|---|
| **Patch** (1.2.3 → 1.2.4) | Batch all in one PR. No changelog read needed. |
| **Minor** (1.2.x → 1.3.x) | Check changelog for deprecations. Batch non-breaking ones. |
| **Major** (1.x → 2.x) | One PR per package. Read migration guide. Never batch with other changes. |

### Patch + safe minor batch

Run the manager's update command for the wanted semver range (`pnpm update`, `npm update`, `bun update`, `cargo update`), then validate with the project's own toolchain (typecheck / lint / test, and E2E if present). One PR for the whole batch.

### Major version update (one package at a time)

1. Update the single package to latest with the manager's add/upgrade command.
2. Read the official migration guide / CHANGELOG for breaking changes.
3. Check whether an official **codemod** exists (e.g. `@tailwindcss/upgrade`, React codemods). Run it first — it handles ~80-90% of mechanical changes.
   - After a codemod, audit the manifest for misplacements: some codemods add build-time packages to `dependencies` instead of `devDependencies`.
   - Codemods may not fully migrate complex plugin setups — check the output log for "could not be automatically migrated" warnings and handle manually.
4. Grep / ast-grep the codebase for removed or deprecated APIs; fix breakage.
5. Validate with the project's toolchain; if VRT snapshots exist, regenerate them in a Linux container after UI-touching upgrades.
6. Standalone PR: `chore: upgrade <package> to v<N>`.

pnpm-specific recovery: `ERR_PNPM_MISSING_TIME` → `pnpm store prune` and retry; `ERR_PNPM_NO_MATCHING_VERSION` for a package that exists → delete `pnpm-lock.yaml` and reinstall for a fresh resolution, committing the new lockfile with the manifest change in the same PR.

### Validation checklist (before marking a PR ready)

- [ ] typecheck / lint / test pass with the project's own commands
- [ ] build succeeds (no bundle-size regression > 5% where applicable)
- [ ] E2E smoke test passes (if applicable)
- [ ] the audit command returns zero high/critical findings, or all remaining are triaged with reasons

## Output

Report the findings in the conversation by default. If the user wants a file, write a Markdown report at a path they choose (or `docs/reviews/deps-review.md`) with:

- **Outdated packages** table (name, current, latest, patch/minor/major, breaking?)
- **CVE findings** after attack-vector triage (priority, package, type, reason for priority)
- **Trend watch** findings by tier (Tier 1: migration now, Tier 2: plan, Tier 3: monitor)
- **Ignored CVEs** with justification
- **Recommended PRs**: update batches + migration starting points
- After update execution, add: **Updated** (batch + majors with PR refs) and **Deferred** (update postponed, with reason and schedule)

## Anti-patterns

- Bundling major upgrades together — one regression makes the entire batch untestable
- Accepting `audit fix --force`-style auto-fixes blindly — they can jump major versions silently
- Ignoring CVEs without documenting the triage reason
- Updating `@types/*` packages separately from their runtime counterpart — always co-update

## Boundaries

- Do NOT assess TypeScript / lint / dead code — that's `frontend-review-hygiene`.
- Do NOT run the AI pentest or check HTML sinks — that's `frontend-review-security`.
- In audit mode, do NOT touch any files. Update execution only starts on the user's explicit ask, and every command/commit is proposed → approved.
- The attack-vector matrix and library tiers above are judgement aids, not absolute rules — weigh them against the actual runtime target (SPA vs SSR/Edge vs server) and how the specific library is used before assigning priority.
- Long-running trend tracking across repeated audits is `tech-trend-watch`'s job, not this skill's.
- When the fix needs to come from patching the dependency itself, hand over to `upstream-fix-and-pin`.
