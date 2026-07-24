---
name: backend-review-architecture
description: Use when reviewing backend structure and maintainability — dependency direction, boundary leaks (ORM entities in API responses, HTTP concerns in domain logic), god modules, circular imports, and testability seams. Explicitly anti-dogma - findings must name a concrete failure, and layer-introduction is only recommended when the codebase has already hit the pain it solves. Do NOT use to "apply clean architecture" to a small codebase.
---

# Backend Review — Architecture & Maintainability

You are reviewing the structure of a backend for maintainability. The dominant failure mode of AI architecture reviews is **dogma**: demanding hexagonal layers, repositories, and DTOs everywhere because a book says so. That review is worse than no review — it generates churn, indirection, and five files per feature in a codebase that needed none of it.

Rules of this review:

1. Every finding must name a **concrete failure or cost** it prevents ("swapping the mailer requires editing 14 call sites", "domain logic can't be tested without booting Fastify"). "Violates clean architecture" is not a finding.
2. Recommendations must be **proportional to current pain**, not anticipated pain. Structure is introduced when the second consumer appears, not before.
3. Consistency beats purity: a consistently "impure" codebase is more maintainable than a half-migrated pure one. Prefer recommendations that finish or align, over ones that start a new style.

## Procedure

1. **Map the actual dependency graph.** Identify the modules/packages and who imports whom. For anything non-trivial use a tool rather than eyeballing. Prefer tools already present in the repo/toolchain; introducing a new tool (including anything fetched over the network, e.g. `npx madge`) needs the human's approval first — if unavailable or unapproved, fall back to reading imports (see below) and note the precision tradeoff in the report.
   - Rust: `cargo modules generate graph` (if `cargo-modules` is installed) or `cargo tree` for crate-level deps; otherwise grep `^use crate::\|^use super::\|^mod ` per crate
   - TS/JS: `npx madge --circular src/` (also `madge --summary`) — only with approval per the network-tool rule above
   - Go: `go list -deps`, import cycles fail the build already — look at package granularity instead
   - Python: `grep -rn "^from \|^import "` per package, or `pydeps`
   Record: entry points, the direction of imports, and any cycles. If no tool is available or approved, read imports directly and say so in the report.
2. **Dependency direction.** The one structural rule worth enforcing everywhere, at any size: **core business logic must not import delivery or infrastructure details.** Findings:
   - domain/service code importing the web framework (types from express/fastify/gin/rails controllers, or a Rust web crate like axum/actix-web) — logic becomes untestable without the framework and unusable from the worker/CLI
   - business rules living inside route handlers/controllers when the same rule is (or will be, evidenced by a second caller) needed elsewhere
   - circular imports between feature modules — always a finding; they make change ripple unpredictable (Rust workspaces: a cycle between crates fails the build, but cycles between modules within one crate do not and are still worth flagging)
3. **Boundary leaks.** Data shapes crossing layers they shouldn't:
   - ORM entities/rows serialized directly as API responses — every schema change becomes a silent API change; accidental exposure of new columns (this is also a security finding). Check: does adding a column to the DB change any HTTP response body?
   - raw request objects passed deep into services (`req` as a parameter three calls down)
   - env access (`process.env` / `os.environ`) scattered through business code instead of read once at the edge into a config value
4. **Concentration.** Find the god modules: largest files, most-imported modules, `utils.ts`-style dumping grounds. A big file is a finding only when it has **multiple change reasons** (payment logic + notification logic + CSV export in one service) — size alone is not.
5. **Testability seams.** Pick the 2–3 most business-critical functions and answer: can each be tested without a real DB, network, or clock? If not, what is the *minimal* seam (pass the dependency as a parameter, extract the pure calculation)? Minimal means: no interface + factory + DI container for a single implementation.
6. **Consistency audit.** Note where the codebase disagrees with itself (two error-handling styles, three ways to run a query, mixed naming). Recommend converging on the majority style; do not relitigate which style is best.

## Proportionality guide

| Codebase | Enforce | Do NOT recommend |
|---|---|---|
| Small (≲ 20 modules, 1–2 devs) | dependency direction, no cycles, config at the edge | repositories, DTO layers, DI containers, "domain/infra/application" folders |
| Medium | + module boundaries per feature, ORM types stopped at the handler layer | ports/adapters for single-implementation deps |
| Large / multi-team | + explicit public interfaces between modules, enforced by lint (`eslint-plugin-boundaries`, `import-linter`, ArchUnit-style tests) | big-bang restructures — recommend strangler-style migration with a lint ratchet |

## Output

Report the findings in the conversation by default. If the user wants a file, write a Markdown report at a path they choose (or `docs/reviews/architecture-review.md`) with:

- **Dependency map summary** — modules, direction, cycles (paste tool output for cycles)
- **Findings** — each as: location → concrete cost/failure → minimal fix → effort (S/M/L)
- **Consistency notes** — divergences and the majority style to converge on
- **What is fine as-is** — explicitly list structures you considered and decided NOT to change, with one line why. This section is mandatory; it is what keeps the review honest.
- **Sequencing** — if any M/L fix is recommended, the incremental path (what lint rule ratchets it)

Keep under 250 lines. If every finding says "extract a layer", restart the review — you are pattern-matching, not reading.

## Boundaries

- Do NOT recommend introducing an abstraction with exactly one implementation and no second one in evidence.
- Do NOT recommend renames/moves that change no dependency edge — pure churn.
- Do NOT modify source files.
- Performance is `backend-review-data-access` / `backend-review-concurrency`; this review is about change cost.

## Related

- `backend-review-triage` — decides whether this lens is worth running at all
- `lang/rust`, `lang/go`, `lang/python`, `lang/typescript` — language-level idioms
- `meta/retrospective-codify` — turning repeated review findings into project rules

## Agent compatibility

- Claude と Codex のどちらでも使える。依存グラフの取得に `cargo-modules`/`madge`/`pydeps` 等の既存ツールを使うが、未導入・未承認の場合は import 文の読解で代替可能(その場合レポートに精度の注記を入れる)。新規ツール導入(特にネットワーク越しの取得)は承認制。
