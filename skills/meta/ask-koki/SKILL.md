---
name: ask-koki
description: Ask which skills from this repo fit a project and how to introduce them. A router over the agent-kit inventory — detects project signals, reads the curated catalog, proposes a small set of skills with install strings, and explains how they compose. Invoke explicitly when setting up a project's apm.yml or deciding which skills a task needs.
disable-model-invocation: true
---

# Ask Koki

You don't remember every skill in this repo, so ask.

This skill answers one question per project: **which of the skills we already own apply here, and how should they be introduced?** The inventory's source of truth is [references/catalog.md](references/catalog.md) — every skill in `HukuKaich0u/agent-kit`, grouped by project signal, with a status column that says whether it can be used as-is.

Two neighbours handle what this skill does not:

- **`/ask-matt`** — routing *within* the engineering flow (grill → spec → tickets → implement → review). Once skills are installed, that's the router for "what do I do next".
- **`/skill-finder`** — discovery *outside* the inventory. Only when the catalog has no fit.

## Process

### 1. Detect the project's signals

Read the repo before asking anything: language manifests (`Cargo.toml`, `go.mod`, `pyproject.toml`, `package.json` + `bun.lock`), frameworks, DB layer (migrations, `schema.prisma`, DynamoDB clients), CI (`.github/workflows/`), test tooling. Ask only for what the repo cannot tell you — most importantly *what kind of work is coming* (feature development? review pass? one-off audit?), because skills serve recurring work, not hypothetical coverage.

### 2. Read the catalog and honour the status column

Open [references/catalog.md](references/catalog.md). The status column governs what you may propose:

| Status | Meaning | What you do |
|---|---|---|
| ✅ | usable as-is | propose on signal match |
| 🔧 | needs the fix named in its row | propose only with that caveat stated; read the skill's SKILL.md first to confirm the row is still accurate |
| ⏸ | reference stock / on hold | do not propose; mention in prose only if the user pushes into that area |
| 🎯 | explicit-invocation meta skill | never auto-propose; only when the user names it |

Do not trust a row blindly — rows go stale. For anything you are about to recommend, open its SKILL.md and check the claim you are relying on.

### 3. Propose few, with reasons

Default to **2–5 skills**. Every installed skill costs context in every conversation, so each proposal carries: the signal that justifies it, the install string from the catalog, and its status caveat if any. Resist completing a "set" — a Rust repo with no frontend gets no frontend skills, a repo with working CI gets no CI skills.

### 4. Explain how they compose

Skills are designed to chain; say which chain applies:

- **Implementation flow** — `setup-agent-environment` once per repo, then `grill-with-docs` / `grill-me` → `to-spec` → `to-tickets` → (`batch-tickets`) → `implement` → `code-review`. If you propose one link, say where the others come in — and hand the details to `/ask-matt`. `batch-tickets` is conditional, not automatic: it earns its place only where a human reviews pull requests and one spec yields enough tickets that per-ticket PRs would swamp them. Never propose it without `to-tickets`, and read the catalog's 使い分け table before recommending either — the two slice for different consumers (agent context vs. human review), and proposing the wrong one is a routing error, not a preference.
- **Review suites** — entry through the triage skill (`backend-review-triage` / `frontend-review-triage`), which picks the domain lenses. Propose the triage skill, not five lenses.
- **Language idioms** — `lang/*` skills load per-language guidance ambiently; they pair with everything above.

### 5. Install only after approval

Present the exact change: the `apm.yml` diff for project scope, or the `apm install -g HukuKaich0u/agent-kit/skills/<path>` commands for global scope. Check `apm-usage` for current syntax if unsure. Run nothing until the user approves; they may also run `just sync` themselves for runtime distribution.

### 6. No fit → escalate honestly

If no catalog row matches the need, say so and offer `/skill-finder` (external survey with an eval gate). Do not quietly substitute a near-miss skill — a wrong-fit skill costs context forever and trust once.

## Maintaining the catalog

The catalog only works if it is boring and current:

- The **same commit** that adds, removes, renames, or meaningfully changes a skill updates its catalog row.
- Status changes come from evidence — an audit (`docs/skill-audit-*.md`), a fix commit, a live run — not from optimism.
- When this skill notices a stale row (step 2's verification), it proposes the row fix to the user rather than silently working around it.
