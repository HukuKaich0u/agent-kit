---
name: frontend-review-deps
description: Use when auditing dependency health — outdated packages, CVE triage with attack-vector weighting, deprecated/declining library detection. Read-only desk review using the project's own package manager audit tooling (npm/pnpm/yarn/bun/cargo). Pairs with `frontend-review-security` for the full security picture.
---

# Frontend Review — Dependencies

You are auditing the dependency health of a frontend project. This is a **read-only desk review** you run manually against a repo — there is no bundled audit script; it uses whatever audit tooling ships with the project's own package manager. This covers three areas:

1. **Freshness** — outdated packages and breaking update procedures
2. **CVE triage** — vulnerabilities weighted by actual attack vector, not just CVSS score
3. **Trend watch** — deprecated, abandoned, or superseded libraries that should be migrated (a one-off snapshot here; ongoing/longitudinal trend tracking belongs to `tech-trend-watch`)

## Procedure

1. Detect the package manager(s) in use (npm / pnpm / yarn / bun, plus Cargo.toml if there's a Rust component) from lockfiles.
2. Run the native audit and outdated-package commands for that manager, e.g.:
   - pnpm: `pnpm audit --prod --json`, `pnpm outdated`
   - npm: `npm audit --omit=dev --json`, `npm outdated`
   - yarn: `yarn npm audit --environment production`, `yarn outdated`
   - bun: `bun audit`, `bun outdated`
   - Rust: `cargo audit`, `cargo outdated`
3. For each CVE finding, apply the attack-vector triage matrix below before assigning priority.
4. For trend-watch, read `package.json` (and lockfile versions) directly and judge each notable dependency against the tiers below — there is no bundled config file listing tracked libraries; use your own knowledge of the ecosystem plus a web search if uncertain about a library's current maintenance status.

## CVE Triage — Attack Vector Matrix

Do not use CVSS score alone. A CVSS 9.8 RCE in a devDependency has zero production impact for a browser-only SPA.

| CVE Type | devDep only | Runtime (SPA) | Runtime (SSR/Edge) |
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
4. For SSR / Edge Functions, treat RCE / Path Traversal / SSRF as P0.
5. Document every ignored CVE with the reason in the report's "Ignored CVEs" section (see Output below).

```bash
# Example: pnpm — runtime-only CVEs (excludes devDeps)
pnpm audit --prod --audit-level=moderate --json | jq '
  .vulnerabilities | to_entries[] |
  { name: .key, severity: .value.severity,
    via: [.value.via[] | select(type=="object") | .title] }'

# Example: pnpm — Prototype Pollution / ReDoS only
pnpm audit --prod --json 2>/dev/null | jq -r '
  .vulnerabilities | to_entries[] |
  .value.via[] | select(type=="object") |
  select(.title | test("prototype|pollution|redos|regex denial"; "i")) |
  "\(.severity) \(.title) in \(.name)"' | sort -u
```

Adapt the `jq` filter shape to whatever JSON the detected manager's audit command emits (npm's `audit --json` and yarn's differ from pnpm's).

## Trend Watch — Library Tiers

This is a one-off snapshot judgment based on `package.json` and your own knowledge (plus a web search for anything uncertain) — there is no bundled config file listing tracked libraries. For ongoing/longitudinal tracking across runs, defer to the `tech-trend-watch` skill.

- **Tier 1 (migrate now)**: Deprecated / abandoned / superseded — no rational reason to continue. Includes libraries where migration cost is low and a mature alternative exists, even if not officially deprecated (`jest` → vitest, `axios` → ky/fetch, `cypress` → Playwright).
- **Tier 2 (plan migration)**: Maintenance mode / satisfaction declining / RSC-incompatible.
- **Tier 3 (watch)**: EOL versions exist / satisfaction trending down.

For each Tier 1 finding: propose a concrete migration path and estimate effort (hours/days).
For each Tier 2 finding: recommend scheduling a migration in the next 1–3 months.
For each Tier 3 finding: add to the ongoing monitoring list.

## Library Selection — Web Standards First

Before recommending a new dependency as a replacement, apply this order:

1. **Can a Web Platform / ECMAScript standard API cover this?**

| Use case | Avoid | Use instead |
|---|---|---|
| Date / time | moment, date-fns, dayjs | `Temporal` (polyfill), or `Date` for simple cases |
| Array / object utilities | lodash, ramda | `Array.prototype.{flatMap,findLast,groupBy}`, `Object.{entries,fromEntries,groupBy}`, `structuredClone()` |
| HTTP requests | axios, request | `fetch` + `AbortController` |
| UUID generation | uuid, nanoid | `crypto.randomUUID()` |
| URL / query params | qs, query-string | `URL`, `URLSearchParams` |
| Number / date formatting | numeral.js | `Intl.NumberFormat`, `Intl.DateTimeFormat` |

2. **Tree-shakable?** Only what is imported should end up in the bundle.
3. **Actively maintained?** Recent release activity — check the registry page or repo, adjusted for how critical/high-churn the library is.
4. **Bundle impact reasonable?** Verify with the project's build command and a bundle analyser; a few kb gzip is a rough sanity check, not a hard limit.

## Breaking Update Procedure

1. Propose as a **standalone PR** — never bundle with feature or refactor work.
2. Read the changelog for removed APIs; grep / ast-grep the codebase for usages.
3. Require `typecheck && lint && test:ci && e2e` to pass before merge.
4. If VRT snapshots exist, regenerate them in a Linux container after the upgrade.

## Output

Report the findings in the conversation by default. If the user wants a file, write a Markdown report at a path they choose (or `docs/reviews/deps-review.md`) with:

- **Outdated packages** table (name, current, latest, breaking?)
- **CVE findings** after attack-vector triage (priority, package, type, reason for priority)
- **Trend watch** findings by tier (Tier 1: migration now, Tier 2: plan, Tier 3: monitor)
- **Ignored CVEs** with justification
- **Recommended PRs**: update batches + migration starting points

## Boundaries

- Do NOT assess TypeScript / lint / dead code — that's `frontend-review-hygiene`.
- Do NOT run the AI pentest or check HTML sinks — that's `frontend-review-security`.
- Do NOT touch source files in the client repo.
- The attack-vector matrix and library tiers above are judgement aids, not absolute rules — weigh them against the actual runtime target (SPA vs SSR/Edge) and how the specific library is used before assigning priority.
- Long-running trend tracking across repeated audits is `tech-trend-watch`'s job, not this skill's.
