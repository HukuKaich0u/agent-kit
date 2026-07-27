---
name: setup-agent-environment
description: Configure this repo's agent environment — set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills.
disable-model-invocation: true
---

# Setup Agent Environment

Scaffold the per-repo configuration that the engineering skills assume:

- **Issue tracker** — where issues live (GitHub by default; local markdown is also supported out of the box)
- **Triage labels** — the strings used for the five canonical triage roles
- **Domain docs** — where `CONTEXT.md` and ADRs live, and the consumer rules for reading them

This is a prompt-driven skill, not a deterministic script. Explore, present what you found, confirm with the user, then write.

## Process

### 1. Explore

Look at the current repo to understand its starting state. Read whatever exists; don't assume:

- `git remote -v` and `.git/config` — is this a GitHub repo? Which one?
- `AGENTS.md` and `CLAUDE.md` at the repo root — does either exist? Is there already an `## Agent skills` section in either?
- `CONTEXT.md` and `CONTEXT-MAP.md` at the repo root — plus a glossary under another name (`GLOSSARY.md`, `docs/glossary.md`)
- `docs/adr/` and any `src/*/docs/adr/` directories — plus decision logs in other homes or formats (`docs/decisions/`, `docs/architecture/decisions/`, MADR-style templates). Note the format and numbering of whatever you find.
- `docs/agents/` — does this skill's prior output already exist?
- `.scratch/` — sign that a local-markdown issue tracker convention is already in use
- Is the `triage` skill installed? (a `triage` skill folder alongside this one, or `triage` in your available skills.) This decides whether Section B runs at all.
- Is the `batch-tickets` skill installed? (same check.) This decides whether Section D runs at all. Also note whether `to-tickets` and `implement` are installed — Section D's flow description only mentions the steps that exist here.
- The default branch and the base of recent pull requests (`git symbolic-ref refs/remotes/origin/HEAD`, `gh pr list --state merged --limit 5 --json baseRefName` where a tracker CLI is available) — plus existing branch names (`git branch -a`), which may already encode a naming convention worth keeping.
- Monorepo signals — a `pnpm-workspace.yaml`, a `workspaces` field in `package.json`, or a populated `packages/*` with its own `src/`. Present only in a genuinely large multi-package repo; their absence means single-context, which is almost every repo.

### 2. Present findings and ask

Summarise what's present and what's missing. Then take the sections in order — one section, one answer, then the next.

Lead each section with the recommended answer so the user can accept it in a word. Give a one-line explainer only when the choice genuinely branches; skip the section entirely when exploration already settled it (Section B when `triage` isn't installed, Section C when there's no monorepo).

**Section A — Issue tracker.**

> Explainer: The "issue tracker" is where issues live. Skills like `to-tickets` and `triage` need to know whether to call `gh issue create`, write a markdown file under `.scratch/`, or follow another workflow.

Default posture: these skills were designed for GitHub. If a `git remote` points at GitHub, propose that. If a `git remote` points at GitLab (`gitlab.com` or a self-hosted host), propose GitLab. Otherwise (or if the user prefers), offer:

- **GitHub** — issues live in the repo's GitHub Issues (uses the `gh` CLI)
- **GitLab** — issues live in the repo's GitLab Issues (uses the [`glab`](https://gitlab.com/gitlab-org/cli) CLI)
- **Local markdown** — issues live as files under `.scratch/<feature>/` in this repo (good for solo projects or repos without a remote)
- **Other** (Jira, Linear, etc.) — ask the user to describe the workflow in one paragraph; the skill will record it as freeform prose

Record the choice in `docs/agents/issue-tracker.md`. The GitHub and GitLab templates carry a "PRs as a request surface" flag, defaulted **off** — leave it off and don't raise it; a user who wants external PRs in the triage queue can flip the flag in the file later.

**Section B — Triage label vocabulary.** Skip this section entirely if the `triage` skill isn't installed (exploration told you) — an uninstalled skill needs no labels.

If it is installed, ask exactly one question:

> Do you want to keep the default triage labels? (recommended: **yes**)

The defaults are the five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. On **yes**, write them as-is. Only if the user says no — usually because their tracker already uses other names (e.g. `bug:triage` for `needs-triage`) — collect the overrides so `triage` applies existing labels instead of creating duplicates.

**Section C — Domain docs.** If exploration found an existing convention — a glossary under another name, decisions in another directory or format — propose recording *that* layout in `docs/agents/domain.md`. Existing conventions win over the defaults; never scaffold a parallel structure next to one the repo already has.

Otherwise default to **single-context** — one `CONTEXT.md` + `docs/adr/` at the repo root. This fits almost every repo; write it without asking.

Offer **multi-context** — a root `CONTEXT-MAP.md` pointing to per-context `CONTEXT.md` files — only when exploration found monorepo signals. Then confirm which layout they want.

**Section D — Development flow.** Skip this section entirely if the `batch-tickets` skill isn't installed (exploration told you). Without it there is no batch layer to describe, and the skills chain directly.

> Explainer: The skills chain, but nothing in an individual skill's instructions names the next one. Recording the flow here is what makes an agent mid-task read `to-tickets → batch-tickets` instead of jumping straight to `implement` and opening one PR per ticket.

When it is installed, confirm two things:

> Batch branch naming: `spec/<spec-number>-b<batch-number>-<slug>` (recommended, unless this repo already has a convention)

If exploration found an existing branch naming convention, propose that instead — an existing convention wins.

> PR base branch: [the default branch exploration found]

Take the answer from exploration rather than asking, unless the repo has both a `dev`-style integration branch and a `main`, in which case ask which one batch PRs target.

Do not record merge method, release versioning, or deploy policy here. Those are repo policy that changes independently of the agent flow; this file describes only how work moves from spec to merged PR.

### 3. Confirm and edit

Show the user a draft of:

- The `## Agent skills` block to add to whichever of `CLAUDE.md` / `AGENTS.md` is being edited (see step 4 for selection rules)
- The contents of `docs/agents/issue-tracker.md` and `docs/agents/domain.md`, plus `docs/agents/triage-labels.md` (only when `triage` is installed) and `docs/agents/development-flow.md` (only when `batch-tickets` is installed)

Let them edit before writing.

### 4. Write

**Pick the file to edit:**

- If `CLAUDE.md` exists, edit it.
- Else if `AGENTS.md` exists, edit it.
- If neither exists, ask the user which one to create — don't pick for them.

Never create `AGENTS.md` when `CLAUDE.md` already exists (or vice versa) — always edit the one that's already there.

If an `## Agent skills` block already exists in the chosen file, update its contents in-place rather than appending a duplicate. Don't overwrite user edits to the surrounding sections.

The block:

```markdown
## Agent skills

### Issue tracker

[one-line summary of where issues are tracked]. See `docs/agents/issue-tracker.md`.

### Triage labels

[one-line summary of the label vocabulary]. See `docs/agents/triage-labels.md`.

### Domain docs

[one-line summary of layout — "single-context" or "multi-context"]. See `docs/agents/domain.md`.

### Development flow

`to-tickets` sizes tickets for an agent's context; `batch-tickets` groups them
into the batches a human reviews as one PR. Ticket count is not PR count. Read the
parent spec's Delivery plan before claiming a ticket. See `docs/agents/development-flow.md`.
```

Include the `### Triage labels` sub-block, and write `docs/agents/triage-labels.md`, only when `triage` is installed and Section B ran. When it isn't, both are omitted.

Include the `### Development flow` sub-block, and write `docs/agents/development-flow.md`, only when `batch-tickets` is installed and Section D ran. When it isn't, both are omitted. Unlike the other sub-blocks this one carries the rule inline rather than only pointing at the file — an agent that is mid-flow and about to open a PR per ticket needs the correction where it is already reading, not one hop away.

Then write the docs files using the seed templates in this skill folder as a starting point:

- [issue-tracker-github.md](./issue-tracker-github.md) — GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md) — GitLab issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md) — local-markdown issue tracker
- [triage-labels.md](./triage-labels.md) — label mapping (only if `triage` is installed)
- [domain.md](./domain.md) — domain doc consumer rules + layout. When Section C recorded an existing convention, rewrite the paths and file-structure trees in this template to match that convention before writing.
- [development-flow.md](./development-flow.md) — the flow through the skills, the two slicing units, and where each artifact is recorded (only if `batch-tickets` is installed). Before writing, adjust it to this repo: drop flow steps whose skills aren't installed, substitute the branch naming and PR base branch confirmed in Section D, and — for a local-markdown tracker — replace the Delivery plan's home with `.scratch/<feature-slug>/delivery-plan.md`, since there are no issue comments to hold it.

For "other" issue trackers, write `docs/agents/issue-tracker.md` from scratch using the user's description.

### 5. Done

Tell the user the setup is complete and which engineering skills will now read from these files. Mention they can edit `docs/agents/*.md` directly later — re-running this skill is only necessary if they want to switch issue trackers or restart from scratch.
