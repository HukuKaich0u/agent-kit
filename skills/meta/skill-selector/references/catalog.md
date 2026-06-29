# Curated skill catalog (Phase 1)

Reference list for `skill-selector` Phase 1. Every row points at a skill that actually lives in this repo (`HukuKaich0u/agent-kit`). Group by project signal so the matching step is mechanical: detect the signal, propose the matching rows.

If a skill belongs to multiple axes, list it under its primary one.

Install strings are written for global scope (`apm install -g <string>`). For project scope, drop the `-g` and add the same string under `dependencies.apm` in `apm.yml`.

The "Install" column may also be a row whose description names a specific platform (CI provider, runtime, cloud). When the project's platform differs, the core capability may still apply — read the underlying `SKILL.md` before deciding whether to adopt.

## Tier legend

| Tier | Policy |
|---|---|
| **T0** | Always want. Suggest proactively for every repo regardless of signals. |
| **T1** | Applicable. Suggest when the section's signals are present. |
| **T2** | Instructed. Only when the user explicitly asks ("do a security review", "run waxa", etc.). Never auto-suggest. |
| **T3** | Occasionally effective. Mention in prose if the situation closely matches; do not include in the default proposal. |
| **T4** | Superseded or not recommended. Effective only in specific legacy/edge cases; note the preferred alternative instead. |

---

## Languages / runtimes

### Node.js / TypeScript
**Signals**: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `node_modules/`

| T | Skill | Install | Use when |
|---|---|---|---|
| T1 | node-sqlite-vec | `HukuKaich0u/agent-kit/skills/node/sqlite-vec` | Project uses Node 24+ `node:sqlite` with `sqlite-vec` extension for vectors / RAG |
| T1 | pi-coding-agent | `HukuKaich0u/agent-kit/skills/node/pi-coding-agent` | Embedding `@mariozechner/pi-coding-agent` as a coding-agent runtime in Node scripts |
| T1 | dotenvx | `HukuKaich0u/agent-kit/skills/tooling/dotenvx` | Repo uses or considers `dotenvx` for env-var encryption / multi-env |
| T1 | opentelemetry | `HukuKaich0u/agent-kit/skills/devops/opentelemetry` | Signal design (traces/metrics/logs), span naming, context propagation, sampling strategy, OTLP exporter config — read before writing any OTel code |
| T1 | otel-node | `HukuKaich0u/agent-kit/skills/devops/otel-node` | Node.js OTel SDK setup; esbuild ESM bundle silently drops `instrumentation-*` auto-instrumentation — use when spans don't arrive after bundling |

### Rust
**Signals**: `Cargo.toml`, `Cargo.lock`, `src/main.rs` / `src/lib.rs`, `.rs` files

| T | Skill | Install | Use when |
|---|---|---|---|
| T1 | rust-best-practices | `HukuKaich0u/agent-kit/skills/lang/rust` | Writing or reviewing Rust code — general best-practices guideline |

---

## Tooling / Infra

### Build / task running
**Signals**: `justfile`, `devbox.json`, `flake.nix`, `Taskfile.yml`

| T | Skill | Install | Use when |
|---|---|---|---|
| T1 | nix-setup | `HukuKaich0u/agent-kit/skills/tooling/nix-setup` | Reproducible dev environment via devbox (Nix-backed, default) or pure Nix flakes (cutting-edge customization). Includes per-language flake templates and a devbox.json template |
| T1 | justfile | `HukuKaich0u/agent-kit/skills/tooling/justfile` | Repo uses `just` — justfile syntax, GitHub Actions integration |

### Static analysis / lint
**Signals**: `sgconfig.yml`, ad-hoc lint requirements that ESLint/biome can't express

| T | Skill | Install | Use when |
|---|---|---|---|
| T1 | ast-grep-practice | `HukuKaich0u/agent-kit/skills/tooling/ast-grep-practice` | Operating ast-grep as a project lint tool (rules, fix, CI) |

### CI / GitHub Actions
**Signals**: `.github/workflows/`, failing PR checks

| T | Skill | Install | Use when |
|---|---|---|---|
| T1 | gh-fix-ci | `HukuKaich0u/agent-kit/skills/devops/gh-fix-ci` | Debugging or fixing failing GitHub Actions PR checks via `gh` |
| T1 | actions-ci-tuning | `HukuKaich0u/agent-kit/skills/devops/actions-ci-tuning` | Auditing or improving GitHub Actions workflows — cache setup, job parallelism, runner sizing |
| T2 | flaker-storage-cache-on-ci | `HukuKaich0u/agent-kit/skills/devops/flaker-storage-cache-on-ci` | Persisting flaker's DuckDB storage across GitHub Actions runs via `actions/cache@v4`; debugging "history vanished every run"; adding a new ingest source |

### Cloudflare
**Signals**: `wrangler.toml`, Cloudflare account, Workers / Pages deploy

| T | Skill | Install | Use when |
|---|---|---|---|
| T1 | cloudflare-deploy | `HukuKaich0u/agent-kit/skills/cloudflare/deploy` | Deploying to Cloudflare Workers / Pages — wrangler commands, secrets, custom domains |
| T1 | cloudflare-workers-cd-rollback | `HukuKaich0u/agent-kit/skills/devops/workers-cd-rollback` | Adding push-to-deploy + automatic rollback on smoke failure to a Workers GitHub Actions pipeline |
| T1 | cloudflare-workers-otel-utels | `HukuKaich0u/agent-kit/skills/cloudflare/workers-otel-utels` | Adding OTLP tracing / metrics / logs and utels error tracking to a Worker without touching handler code |
| T3 | cloudflare-access-app-setup | `HukuKaich0u/agent-kit/skills/cloudflare/access-app-setup` | Gating a Worker behind Cloudflare Access via API in one shot — app + email allowlist + service token |
| T3 | utels-project-bootstrap | `HukuKaich0u/agent-kit/skills/tooling/utels-project-bootstrap` | Registering a new utels.dev project and writing the returned ingest token into a wrangler secret in one shot |

### AWS
**Signals**: ECS / Fargate service, GitHub Actions → AWS OIDC, aws-vault MFA error

| T | Skill | Install | Use when |
|---|---|---|---|
| T1 | aws-github-oidc-scoped-role | `HukuKaich0u/agent-kit/skills/aws/github-oidc-scoped-role` | Wiring GitHub Actions to AWS via OIDC — `job_workflow_ref` scoping, Bedrock cross-region ARNs, `aws-marketplace` permissions, ReadOnlyAccess + Deny for AI agent roles |
| T3 | aws-ecs-service-connect-ipv6 | `HukuKaich0u/agent-kit/skills/aws/ecs-service-connect-ipv6` | ECS Service Connect alias resolves to IPv6 in IPv4-only Fargate task; `network is unreachable` |
| T3 | aws-vault-mfa-iam | `HukuKaich0u/agent-kit/skills/aws/vault-mfa-iam` | aws-vault session blocked by IAM MFA-required policy; `iam:*` rejected with `InvalidClientTokenId` |
| T4 | aws-ecs-codedeploy-blue-green | `HukuKaich0u/agent-kit/skills/aws/ecs-codedeploy-blue-green` | Existing CodeDeploy blue/green setup that cannot be migrated — prefer ALB-native weighted routing for new setups |

### Kubernetes
**Signals**: `k8s/`, CRD YAML, zod/TypeBox/Valibot schema to CRD conversion

| T | Skill | Install | Use when |
|---|---|---|---|
| T3 | k8s-crd-from-typed-schema | `HukuKaich0u/agent-kit/skills/k8s/crd-from-typed-schema` | Generating CRDs from a typed schema source (zod / TypeBox / Valibot) — Structural Schema dialect restrictions, `/status` subresource trap, metadata-prohibition rule |

### Release / changelog
**Signals**: `CHANGELOG.md`, release-please config, `.changeset/`, version-tag-driven release

| T | Skill | Install | Use when |
|---|---|---|---|
| T1 | conventional-changelog | `HukuKaich0u/agent-kit/skills/tooling/conventional-changelog` | Setting up or unifying a release flow with Conventional Commits + auto changelog |
| T3 | upstream-fix-and-pin | `HukuKaich0u/agent-kit/skills/tooling/upstream-fix-and-pin` | A dependency has a bug or missing feature; you need to pin a fork while waiting for upstream merge |

### Dependency management
**Signals**: `pnpm outdated` results, security alert, major ecosystem release, annual maintenance

| T | Skill | Install | Use when |
|---|---|---|---|
| T1 | dep-lib-review | `HukuKaich0u/agent-kit/skills/tooling/dep-lib-review` | Auditing and updating library dependencies — patch/minor/major batching, CVE attack-vector triage, deprecated package detection, validation checklist |
| T3 | tech-trend-watch | `HukuKaich0u/agent-kit/skills/tooling/tech-trend-watch` | Annual tech-stack review using State of JS/CSS + Thoughtworks Tech Radar — satisfaction×usage matrix, ADOPT/TRIAL/ASSESS/HOLD mapping, migration roadmap |

### SQL / Database
**Signals**: `sqlc.yaml`, `*.sql` query catalog, SQLite / D1 schema

| T | Skill | Install | Use when |
|---|---|---|---|
| T1 | sql-lint | `HukuKaich0u/agent-kit/skills/sql/lint` | Static lint pass on a sqlc-style SQL catalog — duplicate query names, missing semicolons, `SELECT *`, double-wildcard `LIKE` |
| T1 | sql-plan-audit | `HukuKaich0u/agent-kit/skills/sql/plan-audit` | `EXPLAIN QUERY PLAN` baseline diff on a sqlc catalog — detect new full-table SCANs or `TEMP B-TREE` sorts introduced by a PR |
| T1 | sql-schema-audit | `HukuKaich0u/agent-kit/skills/sql/schema-audit` | Index coverage + N+1 review for a SQLite/D1 schema — unused indexes, unindexed scans, `for`-loop query calls |
| T1 | sql-security | `HukuKaich0u/agent-kit/skills/sql/security` | SQL injection screening in TS / Rust host code — flags template-literal / string-concat SQL builders |

---

## Testing / Browser

**Signals**: `playwright.config.*`, `e2e/`, image-diff requirements

| T | Skill | Install | Use when |
|---|---|---|---|
| T1 | playwright-test | `HukuKaich0u/agent-kit/skills/testing/playwright-test` | **Primary** for any Playwright project. Writing / reviewing E2E tests — no fixed waits, network triggers |
| T1 | playwright-cli | `HukuKaich0u/agent-kit/skills/testing/playwright-cli` | **Secondary** — add only when CI sharding, codegen, or one-off `screenshot/pdf` matters. Skip when test authoring is the only concern |
| T2 | review-image | `HukuKaich0u/agent-kit/skills/ai/review-image` | Reviewing screenshots / generated images via OpenRouter vision models, VRT prechecks |
| T2 | vlmkit | `HukuKaich0u/agent-kit/skills/ai/vlmkit` | `@mizchi/vlmkit` VLM-driven frontend kit — visual regression (snapshot / diff / regression), a11y semantic verification |

### Frontend review (suite)
**Signals**: a frontend project where someone wants a structured review pass (CI / hygiene / deps / testing / security / state / performance / weekly cadence)

| T | Skill | Install | Use when |
|---|---|---|---|
| T1 | frontend-review-weekly | `HukuKaich0u/agent-kit/skills/frontend/review-weekly` | **Orchestrator** for the weekly AI review — dispatches all 8 domain skills and the 5 perspective sub-skills |
| T1 | frontend-review-triage | `HukuKaich0u/agent-kit/skills/frontend/review-triage` | Initial frontend-review assessment ("triage", day-1) — scorecard, top-3 risks, app classification |
| T1 | frontend-review-ci | `HukuKaich0u/agent-kit/skills/frontend/review-ci` | CI is slow (>10 min), flaky, or you want to optimize GitHub Actions for a frontend project |
| T1 | frontend-review-hygiene | `HukuKaich0u/agent-kit/skills/frontend/review-hygiene` | Code-hygiene audit — TypeScript strictness, lint, dead code, duplication |
| T1 | frontend-review-deps | `HukuKaich0u/agent-kit/skills/frontend/review-deps` | Dependency health — freshness, CVE triage with attack-vector weighting, Tier 1/2/3 library detection |
| T1 | frontend-review-testing | `HukuKaich0u/agent-kit/skills/frontend/review-testing` | Test-infrastructure audit — vitest coverage, playwright config, Testing Library usage, VRT setup |
| T1 | frontend-review-security | `HukuKaich0u/agent-kit/skills/frontend/review-security` | Frontend security review — HTML sinks, auth/token storage, route guards, env var exposure, AI self-pentest |
| T1 | frontend-review-state | `HukuKaich0u/agent-kit/skills/frontend/review-state` | State management architecture review — server/URL/form/UI classification, Jotai/Zustand/Redux anti-patterns |
| T1 | frontend-review-performance | `HukuKaich0u/agent-kit/skills/frontend/review-performance` | Rendering performance review — profiler-first, memo correctness, virtual scroll, `useTransition` |
| T2 | frontend-expert | `HukuKaich0u/agent-kit/skills/frontend/review-perspectives/frontend-expert` | Frontend-architect perspective sub-skill (component design, state, DOM usage) |
| T2 | frontend-ops-expert | `HukuKaich0u/agent-kit/skills/frontend/review-perspectives/frontend-ops-expert` | Frontend-Ops perspective sub-skill (CI/CD, scheduler, KPI ratchet, release process) |
| T2 | performance-expert | `HukuKaich0u/agent-kit/skills/frontend/review-perspectives/performance-expert` | Performance perspective sub-skill (bundle size, LCP / CLS / INP, avoidable work) |
| T2 | react-expert | `HukuKaich0u/agent-kit/skills/frontend/review-perspectives/react-expert` | React-specialist perspective sub-skill (hooks, re-rendering, Suspense / RSC) |
| T2 | security-expert | `HukuKaich0u/agent-kit/skills/frontend/review-perspectives/security-expert` | Security-specialist perspective sub-skill (XSS / CSRF, authz boundaries, input validation) |

---

## Diagrams

**Signals**: user asks for architecture / flowchart / ER / UML / sequence diagrams

| T | Skill | Install | Use when |
|---|---|---|---|
| T2 | drawio-skill | `HukuKaich0u/agent-kit/skills/tooling/drawio` | Creating diagrams (flowchart, architecture, ER, UML / sequence / class, network) as draw.io / diagrams.net files |

---

## Process / Meta

### Skill / prompt authoring

| T | Skill | Install | Use when |
|---|---|---|---|
| T0 | apm-usage | `HukuKaich0u/agent-kit/skills/tooling/apm-usage` | Adding / removing / updating skills via APM (always pair with `skill-selector`) |
| T2 | skill-finder | `HukuKaich0u/agent-kit/skills/meta/skill-finder` | Cross-source survey + waxa eval gate when the catalog has no fit (Phase 2 of the selection flow) |
| T2 | waxa-eval | `HukuKaich0u/agent-kit/skills/meta/waxa-eval` | Iterating on a skill's prompt with the waxa CLI — scenarios, graders, ledger, convergence |
| T2 | optimizing-descriptions | `HukuKaich0u/agent-kit/skills/meta/optimizing-descriptions` | Audit + rewrite SKILL.md `description` fields per the agentskills.io framework + two-track (Meta / Project) trigger policy |
| T2 | empirical-prompt-tuning | `HukuKaich0u/agent-kit/skills/meta/empirical-prompt-tuning` | Iteratively improving an agent-facing instruction via subagent execution |
| T2 | retrospective-codify | `HukuKaich0u/agent-kit/skills/meta/retrospective-codify` | Converting trial-and-error lessons into ast-grep rules / skills / CLAUDE.md rules |
| T2 | extract-glossary | `HukuKaich0u/agent-kit/skills/meta/extract-glossary` | Extracting domain-specific terms / repo implementation maps / onboarding Mermaid diagrams from one or more repos / GitHub orgs |

### Migration / porting

| T | Skill | Install | Use when |
|---|---|---|---|
| T3 | translate-programming-language | `HukuKaich0u/agent-kit/skills/lang/translate-programming-language` | Porting modules / services / APIs between programming languages with behavior parity |

---

## Deliberately not in catalog

Some axes have no catalog row by design. Do **not** escalate to Phase 2 for these — they are one-off setup tasks, not recurring skill-shaped needs. Solve inline with framework docs.

| Axis | Reason no skill |
|---|---|
| Vite / React / Next.js / Solid frontend scaffolding | One-off setup; framework docs are sufficient. Recurring patterns (E2E, build, CI) are covered by other catalog rows. |
| Single-shot config conversions (e.g., webpack → Vite, Jest → Vitest) | One-off migration; AI-aided porting handles this inline. |
| Ad-hoc data migrations / one-time backfills | One-off; doesn't recur. |
| ORMs / DB clients in general | Too project-specific; only listed when a concrete operational pain has been encoded (e.g., `node-sqlite-vec`). |

If you find yourself wanting a skill on one of these axes, that's a Phase 2 escalation candidate — but verify the need is recurring across multiple sessions before searching.

## When the catalog has no fit

If no row matches and the need is recurring, escalate via the `skill-finder` skill. It codifies the source priority (Anthropic official → claude-skill-registry → VoltAgent/awesome-agent-skills → ComposioHQ → obra/superpowers → GitHub topic) and gates adoption through a mandatory waxa eval. Do not run a GitHub topic search inline.

## Catalog hygiene

- A row here means the skill exists in this repo and has pulled its weight on a real project.
- Every Install string points at `HukuKaich0u/agent-kit/skills/<path>`. When a skill is added to the repo, add its row here only after the first real use in a project.
- When a skill is removed from the repo, drop its row in the same edit.
- Skills sourced through `skill-finder` are promoted here only after a passing waxa eval AND use in 2+ projects.
- If you find yourself frequently citing a Phase-2 result, that's the trigger to promote it: open a PR adding it to this file with the project signal that triggered the match.
