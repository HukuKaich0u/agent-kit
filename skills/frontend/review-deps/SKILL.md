---
name: frontend-review-deps
description: Use when auditing dependency health — outdated packages, CVE triage with attack-vector weighting, deprecated/declining library detection (trend-watch). Runs `pnpm outdated` / `pnpm audit` (or npm/yarn) via a bundled audit script. Pairs with `frontend-review-security` for the full security picture.
---

# Frontend Review — Dependencies

You are auditing the dependency health of a frontend project. This covers three areas:

1. **Freshness** — outdated packages and breaking update procedures
2. **CVE triage** — vulnerabilities weighted by actual attack vector, not just CVSS score
3. **Trend watch** — deprecated, abandoned, or superseded libraries that should be migrated

## Procedure

0. If `<repo>/.frontend-review/kpi/app-classification.json` exists (written by `frontend-review-triage`), read it and weight findings by its P0/P1 profile for this app type.
1. **Collect freshness + CVE data** with the bundled script:
   ```bash
   node scripts/audit-deps.mjs --repo <repo>
   ```
   It auto-detects the package manager and runs its `outdated` + `audit` in JSON
   mode, writing `<repo>/.frontend-review/report/latest/raw/deps.json`.
2. Read `deps.json`. For **trend watch** (the judgment step the script can't do),
   check each significant library against its repo activity / deprecation status
   (npm `deprecated` flag, last-publish date, successor libraries). Then run the
   CVE matrix and Tier classification below over the collected findings.
3. For each CVE finding, apply the attack-vector triage matrix below before assigning priority.
4. For each trend-watch finding (Tier 1/2/3), confirm the installed version and assess migration cost.

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

1. Run `pnpm audit --prod` to exclude devDeps from output.
2. Focus on Prototype Pollution / ReDoS / XSS — other types are low-risk for browser-only SPAs.
3. For each remaining finding, check whether user-controlled input can reach the vulnerable code path. If not, downgrade to P2.
4. For SSR / Edge Functions, treat RCE / Path Traversal / SSRF as P0.
5. Document every ignored CVE in `kpi/ignored-cves.md` with the reason.

```bash
# Runtime-only CVEs (excludes devDeps)
pnpm audit --prod --audit-level=moderate --json | jq '
  .vulnerabilities | to_entries[] |
  { name: .key, severity: .value.severity,
    via: [.value.via[] | select(type=="object") | .title] }'

# Prototype Pollution / ReDoS only
pnpm audit --prod --json 2>/dev/null | jq -r '
  .vulnerabilities | to_entries[] |
  .value.via[] | select(type=="object") |
  select(.title | test("prototype|pollution|redos|regex denial"; "i")) |
  "\(.severity) \(.title) in \(.name)"' | sort -u
```

## Trend Watch — Library Tiers

See the `tech-trend-watch` skill for library tier classification:

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
| Date / time | moment, date-fns, dayjs | `Temporal` (polyfill; verify runtime support first — Temporal especially is not yet universally available), or `Date` for simple cases |
| Array / object utilities | lodash, ramda | `Array.prototype.{flatMap,findLast,groupBy}`, `Object.{entries,fromEntries,groupBy}`, `structuredClone()` (verify runtime support first — Temporal especially is not yet universally available) |
| HTTP requests | axios, request | `fetch` + `AbortController` |
| UUID generation | uuid, nanoid | `crypto.randomUUID()` |
| URL / query params | qs, query-string | `URL`, `URLSearchParams` |
| Number / date formatting | numeral.js | `Intl.NumberFormat`, `Intl.DateTimeFormat` |

2. **Tree-shakable?** Only what is imported should end up in the bundle.
3. **Actively maintained?** Release within the last 6 months.
4. **Bundle impact < 5 kb gzip?** Verify with `pnpm build` and a bundle analyser.

## Breaking Update Procedure

1. Propose as a **standalone PR** — never bundle with feature or refactor work.
2. Read the changelog for removed APIs; grep / ast-grep the codebase for usages.
3. Require `typecheck && lint && test:ci && e2e` to pass before merge.
4. If VRT snapshots exist, regenerate them in a Linux container after the upgrade.

## Output

Write `<repo>/.frontend-review/report/latest/md/deps-review.md` with:

- **Outdated packages** table (name, current, latest, breaking?)
- **CVE findings** after attack-vector triage (priority, package, type, reason for priority)
- **Trend watch** findings by tier (Tier 1: migration now, Tier 2: plan, Tier 3: monitor)
- **Ignored CVEs** with justification (for `kpi/ignored-cves.md`)
- **Recommended PRs**: update batches + migration starting points

Keep the report under 250 lines.

## Boundaries

- Do NOT assess TypeScript / lint / dead code — that's `frontend-review-hygiene`.
- Do NOT run the AI pentest or check HTML sinks — that's `frontend-review-security`.
- Do NOT touch source files in the repo.
- Every finding must cite file:line (or a config key). Findings not verified by reading the actual code/config must be marked "unconfirmed" or dropped.

## Related

- `frontend-review-security` — auth / env / HTML-sink review (pairs with this for the full security picture)
- `tooling/dep-lib-review` — the general (non-frontend) dependency review flow
- `tooling/tech-trend-watch` — the annual State-of-JS / Tech-Radar trend review
- `frontend-review-weekly` — orchestrator

## Agent compatibility

- Claude と Codex のどちらでも使える。データ収集は同梱の `scripts/audit-deps.mjs`(zero-dep Node、パッケージマネージャ自動検出)で行う。CVE 優先度づけと trend 判定は本文のマトリクスに従う(script が出した raw を入力にする)。
