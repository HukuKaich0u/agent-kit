---
name: skill-finder
description: 'Use ONLY when the user explicitly asks to discover or evaluate a skill from OUTSIDE the curated catalog — e.g., "find a Stripe skill", "is there a skill for X?", "evaluate this candidate before adopting". Meta-skill, complementary to ask-koki: do NOT auto-invoke on routine apm-management, project-init, or catalog-resident requests. Cross-source survey across vetted registries (Anthropic official, claude-skill-registry, VoltAgent/awesome-agent-skills, ComposioHQ, Superpowers, GitHub topic) with a mandatory waxa-eval adoption gate.'
---

# Skill Finder

Adopting a skill found outside the curated catalog has two failure modes the in-catalog flow does not carry:

1. **Low-quality content** — registries vary wildly in vetting; some are SEO scrapes.
2. **Registry blindness** — Tier-1 official sources can already cover the need; jumping to GitHub `grep` first wastes effort and lands in noisier listings.

This skill exists to make the cross-source search deliberate and to refuse adoption of anything that has not passed a `waxa` eval.

## When to invoke

Explicit user request only. Triggering phrases:

- "find a `<X>` skill"
- "is there a skill for `<X>`?"
- "evaluate `<owner/repo>` as a skill before adopting"
- "search the registries for `<X>`"

When NOT to use:

- The catalog already has a fit → **stop immediately** and tell the user to use `ask-koki` (Phase 1) instead. Do NOT continue into Tier 1-4 search, do NOT propose install steps, do NOT survey other sources. Even if the catalog skill is plausibly improvable by something external, the existing fit is the answer; respect Phase 1.
- One-off task with no recurrence → solve inline; do not adopt a skill you will trigger once.
- The user did not ask for discovery → as a meta-skill, this never auto-fires (cf. user-level CLAUDE.md "Skill 利用方針").

### Pre-flight check (mandatory first step)

Before doing anything else, scan the `ask-koki/references/catalog.md` rows against the user's stated need. If any row matches:

1. State the matching catalog row to the user.
2. Recommend they invoke `ask-koki` (Phase 1) for the install.
3. **Stop.** Do not run the workflow below. Do not survey Tier 1+ sources.

Only proceed past this check when the catalog scan finds no row matching within roughly 30 seconds of reading.

## Sources

Priority tiers. Always start at the top and only escalate when the tier above has no fit.

| Tier | Source | Form | Notes |
|------|--------|------|-------|
| 1 | `anthropics/skills` | GitHub repo, ~30 first-party skills | Highest trust. Install: `apm install anthropics/skills/skills/<name>` (the repo nests under `skills/`). |
| 1 | `anthropics/claude-plugins-official` | Plugin marketplace | Official plugins (frontend-design / mcp-server-dev / code-review / ralph-loop / external_plugins/...). |
| 2 | `majiayu000/claude-skill-registry` | Daily-crawled, dedup'd, security-scanned cross-source index | Best discovery hub. Path format `owner/repo/skills/name` translates directly to APM. |
| 2 | `VoltAgent/awesome-agent-skills` | Org-grouped awesome-list (MIT, active) | Each entry routes through `officialskills.sh`; resolve to underlying GitHub repo before adoption. |
| 3 | `ComposioHQ/awesome-claude-skills` | Awesome-list, broader/looser curation | Treat entries as candidates, not endorsements. |
| 3 | `obra/superpowers` | Skill bundle, methodology-heavy (TDD / subagent / brainstorming) | High-quality but opinionated; check fit carefully. |
| 4 | GitHub `topic:claude-skill` / `topic:agent-skills` / `path:**/SKILL.md` | Raw search | Last resort. Sort by recently-updated, not stars (top-starred repos are usually awesome-lists, not skills). |
| NG | `agent-skills.cc` | SEO scrape, stars-only signal, APM-incompatible | Do not source from here. May be used as an alias lookup to find the underlying GitHub repo, never as a primary recommendation. |

## Workflow

0. **Pre-flight catalog check (see above).** If `ask-koki/references/catalog.md` has a fit, stop and defer to `ask-koki`. Only continue past step 0 when no catalog row matches.
1. **State the recurring need.** A skill is justified only by a recurring task type. If the user cannot name one, do not adopt — solve inline.
2. **Sweep top-down.** Hit Tier 1 first. Stop at the first usable hit; do not survey lower tiers when Tier 1 already matches. Capture per candidate: skill name, resolved GitHub URL, one-line description, last-update date, license.
3. **Apply the rubric.** A candidate passes only if all seven axes are acceptable:
   - **Fit** — does the skill's "Use when..." actually match the project task? Re-read the description, not the title.
   - **Non-redundancy** — does the project's already-installed skill set cover this need? A "Fit ✓" candidate that overlaps with skills already in the stack should still be rejected (or at most project-pinned to one project that genuinely lacks the coverage). Common overlap pairs in this repo's catalog: skill-creation candidates vs `writing-great-skills` + `empirical-prompt-tuning` + `waxa-eval`; testing candidates vs `playwright-test` / `tdd`; bug-diagnosis candidates vs `diagnosing-bugs`; dependency-audit candidates vs `frontend-review-deps`. A redundant skill costs context every conversation without a unique payoff.
   - **Maintenance** — last commit recent? Visible upstream activity?
   - **License** — SPDX present and compatible with the consuming project?
   - **Frontmatter health** — `name` matches dir; description ≤1024 chars and triggering-condition-shaped (per `writing-great-skills` and `optimizing-descriptions`).
   - **Body quality** — explicit "When NOT to use"? Concrete patterns vs vague advice?
   - **Footprint** — body length, demand-loaded vs always-loaded references, cross-skill dependencies.
4. **waxa audit (recommended).** Before spending the eval-gate budget, run the vendored Bun waxa — `bun run src/cli.ts audit <candidate-skill-dir>` from `tools/waxa/` (or `npx @mizchi/waxa audit <candidate-skill-dir>` as a network fallback) — to surface structural problems cheaply: frontmatter shape, body length, missing "When NOT to use", suspicious scripts, missing LICENSE, plus `apm audit`'s hidden-Unicode (prompt-injection) scan. A candidate with audit errors is a probable Reject without spending LLM time on the eval gate.
5. **waxa eval gate (mandatory).** Adoption without empirical evaluation is the failure mode this skill exists to prevent. For each shortlisted candidate:
   - Install temporarily: `apm install <owner>/<repo>/skills/<name>` into a sandbox project (or symlink for local audit).
   - Author 1-2 representative `tasks/*.yaml` matching the project's actual recurring task. See `skill-selector/evals/` for a working template (skill-local layout).
   - Run the eval once with `trials_per_task: 2` minimum: `bun run src/cli.ts <path/to/eval.yaml>` from `tools/waxa/` (or `npx @mizchi/waxa <path/to/eval.yaml>` as a network fallback). Optionally add `--baseline` to compare with-skill vs without-skill and confirm the skill body earns its keep.
   - **Do not use `waxa iterate` here.** The auto-iterate loop can mis-converge (it re-runs the same prompt without editing the skill and marks the same unresolved issue as "reseen", which reads as zero new-unclear). Instead: read the ledger's unclear-points, decide adoption vs reject from a single run, and surface the decision for human approval rather than looping automatically.
   - Reject if the single run's unclear-points expose a genuine gap in the candidate (not an eval-setup artifact like "executor cannot fetch a URL").
6. **Decide and pin.** Adoption is always pinned; pinning is non-negotiable.
   - **Catalog-promote** — passes eval AND used in 2+ projects without issue → propose addition to `ask-koki/references/catalog.md` with the project signal that should trigger it.
   - **Project-pin** — fits one project; add to that project's `apm.yml` with a **tag or SHA** resolved via `apm view <repo>` (or the upstream release page). Pin to the exact ref the waxa eval passed against — adopt after eval, pin the ref that was eval'd. Floating refs (`main`, `master`, `HEAD`) are forbidden for production projects.
   - **Reject** — record the reason in `references/rejection-log.md` (this skill) and / or the project's own `docs/skills-rejected.md` so the same candidate is not re-evaluated quarterly. Common reject reasons: license absent, body quality below floor, **non-redundancy axis fails (already covered by installed stack)**, or maintenance signal too weak.
7. **Fork-and-fix path.** If a candidate is close-but-not-quite, prefer vendoring it into this repo (`skills/<category>/<name>`, recorded in `VENDORED.md`) or the project's local skills dir and reshaping it, over working around its shortcomings at call sites. Document the divergence so an upstream PR can converge.

## Source-specific resolution notes

- **anthropics/skills**: skills live under `skills/<name>`. Install string: `apm install anthropics/skills/skills/<name>` (the path includes "skills/skills" — not a typo).
- **anthropics/claude-plugins-official**: includes `external_plugins/` (asana, linear, playwright, serena, laravel-boost, github, gitlab, firebase, terraform). These are plugins, not raw skills — verify the plugin manifest exposes a SKILL.md before treating them as APM dependencies.
- **majiayu000/claude-skill-registry**: ships its own `sk` CLI; you do not need it. `apm install owner/repo/skills/name` works once you have the path. Use the registry's web UI / data files for discovery only.
- **VoltAgent/awesome-agent-skills**: README is org-grouped (Anthropic / Stripe / HashiCorp / Cloudflare / Sentry / etc.). Extract entries with:

  ```bash
  curl -sL https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md \
    | grep -oE '\[[^]]+\]\(https?://officialskills\.sh[^)]+\)'
  ```

  Each `officialskills.sh` URL routes to a GitHub repo; traverse to that repo before evaluating.
- **GitHub topic search**: use the API. `topic:claude-skill` (1.4k repos) and `topic:agent-skills` (4.3k) are both noisy — filter by SKILL.md presence and recent activity. The `path:SKILL.md` qualifier helps narrow. Star count is mostly signal-less past Tier 3 (top-starred repos are awesome-lists, not skills).

## waxa eval template

For a candidate at `<owner>/<repo>/skills/<name>`, scaffold:

```
evals/
└── <name>/
    ├── eval.yaml
    └── tasks/
        ├── scenario-typical.yaml
        └── scenario-edge.yaml
```

`eval.yaml` skeleton:

```yaml
name: <name>-eval
skill: <name>
version: "0.1"

config:
  trials_per_task: 2
  timeout_seconds: 180
  parallel: false
  executor: mock   # mock for a quick smoke run; switch to the real executor for a scored eval
  model: claude-opus-4-8

graders:
  - name: <task-specific>
    type: text | code | llm | self-report
    config: { ... }

tasks:
  - "tasks/*.yaml"
```

Working reference in this repo: `skill-selector/evals/eval.yaml` + `tasks/*.yaml` (skill-local layout). Match the grader `type` spellings there (`self-report`, not `self_report`).

## Common mistakes

| Mistake | Fix |
|---|---|
| Surveying every tier in parallel | Top-down. Stop at first fit. |
| Skipping the pre-flight catalog check | Always check `ask-koki/references/catalog.md` first. If it covers the need, defer immediately — do not proceed into Tier 1+ surveys. The `playwright-test` / `tdd` / `gh-fix-ci` / `diagnosing-bugs` rows are the most common false-escalations to watch for. |
| Adopting because "Fit ✓" alone | Non-redundancy is a separate axis. A skill that fits the user's stated need but overlaps with skills already installed (e.g. a skill-creation candidate overlapping with `writing-great-skills` + `empirical-prompt-tuning` + `waxa-eval`) is a reject. The cost is context per conversation; the payoff has to be unique. |
| Skipping `references/rejection-log.md` on reject | Recording the reason takes 30 seconds and prevents re-evaluating the same candidate in 3 months when its star count grows. The log is the durable artifact of the skill-finder run, mirroring how the eval ledger works for waxa-eval. |
| Citing `agent-skills.cc` as a recommendation | Source is SEO scrape; only use it for alias-lookups to GitHub. Never as a primary recommendation. |
| Skipping waxa eval ("the README looks fine") | Forbidden. Adoption-without-eval is the exact failure this skill prevents. |
| Relying on `waxa iterate` to auto-converge | The auto-iterate loop can mis-converge (reseen ≠ resolved). Run the eval once, read the unclear-points, decide from that single run, and get human approval — don't loop automatically. |
| Pinning to `main` / `master` | Resolve a tag or SHA via `apm view <repo>` and pin that explicitly. |
| Treating org membership as quality | A repo under a known org is not auto-trusted; still apply the rubric. Anthropic-published skills are the rare exception. |
| Re-evaluating a previously rejected skill | Check `docs/skills-rejected.md` first. Recording rejection reasons prevents quarterly re-evaluation churn. |
| Going to Tier 4 without sweeping Tier 1-3 | The cost asymmetry is large: GitHub search is noisy and the curated tiers are pre-filtered. |

## Related

- `ask-koki` — Phase 1 catalog selection. **Always run before this skill.** If Phase 1 covers the need, do not invoke `skill-finder`.
- `apm-usage` — `apm.yml` syntax for the install / pinning step
- `waxa-eval` — how to author scenarios, choose graders, and read the ledger for the eval gate
- `empirical-prompt-tuning` — convergence/divergence semantics underlying the waxa eval gate
- `writing-great-skills` — when no candidate passes the rubric, the design principles for writing the skill yourself instead of forcing a poor match
