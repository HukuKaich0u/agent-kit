---
name: to-tickets
description: Break an approved immutable design record into tracer-bullet implementation tickets with explicit blocking edges, then publish only those work tickets to the configured tracker. Use after to-spec for a multi-session build; do not create or update a tracker issue for the design record.
disable-model-invocation: true
---

# To Tickets

Break one approved design record into **tracer-bullet** implementation tickets. The design record is historical input, not a parent work item: never edit it, publish it to the tracker, or give it a tracker status.

The issue tracker, triage labels, and design-record convention should be available under `docs/agents/`. Run `/setup-agent-kit` if they are missing.

## Process

### 1. Gather context

Require a path under `docs/specs/YYYY-MM-DD-<slug>.md`. Read the full design record, including its historical-record notice and any `## Supersedes` section. Verify that this path is tracked, committed, and has no staged or unstaged changes. Do not require unrelated worktree changes to be clean. If the user has only a raw conversation, an unapproved plan, or an uncommitted record, direct them to `/to-spec` first; do not create tickets from a mutable draft.

Treat code, tests, ADRs, and the glossary as current truth whenever they differ from the historical record. If the divergence changes the intended work, stop and ask the user to re-grill rather than silently repairing the old design.

### 2. Explore the codebase

Explore the relevant code if needed. Use the glossary vocabulary and respect ADRs. Look for prefactoring that makes the implementation easier: make the change easy, then make the easy change.

### 3. Draft vertical slices

Break the work into **tracer-bullet** tickets.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every relevant layer — vertical, not a horizontal layer-only task.
- A completed slice is independently demoable or verifiable.
- Each slice fits in one fresh context window.
- Each acceptance criterion traces to the design record's ticketing evidence and can be proven by code or tests where appropriate.
- Do any necessary prefactoring first.
</vertical-slice-rules>

Give each ticket its **blocking edges**. A ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** Sequence a mechanical change with broad blast radius as expand–contract: expand without breaking callers, migrate call sites in green batches, then contract after every migration is complete. Each phase or batch is a ticket with explicit blockers.

### 4. Get approval

Present the proposed breakdown as a numbered list. For each ticket, show:

- **Title**
- **Blocked by**
- **What it delivers**
- **Acceptance evidence**
- **Ready for agent?** — `yes` only when no human decision, secret, external authority, or manual-only verification remains

Ask whether the granularity and blocking edges are correct, and whether any tickets should be merged or split. Do not publish anything until the user approves the complete breakdown and the intended tracker writes.

### 5. Publish only approved work tickets

Publish in dependency order, blockers first. Every ticket must reference the immutable design-record path. Do not create a tracker issue for the design record and do not modify the record.

- **Local tracker** — write one file per ticket under `.scratch/<feature-slug>/issues/<NN>-<slug>.md`. Derive `<feature-slug>` from the design-record filename. List local blocker numbers and titles.
- **Real tracker** — create one issue per ticket in dependency order. Use native blocking links when the platform supports them; otherwise write `Blocked by` references in the ticket body.

Apply the configured `ready-for-agent` label only to tickets marked ready in the approved breakdown. Tickets awaiting a human decision, credentials, external approval, or manual verification must make that dependency explicit and must not receive the label.

Work the **frontier** — tickets whose blockers are complete — one at a time with `/implement`, clearing context between tickets.

<local-ticket-template>

# <NN> — <Ticket title>

**Design record:** `docs/specs/YYYY-MM-DD-<slug>.md`

**What to build:** the end-to-end behaviour this ticket makes work, from the user's perspective.

**Blocked by:** ticket numbers/titles that gate this one, or "None — can start immediately".

**Status:** <ready-for-agent or the configured non-agent-ready state>

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
</local-ticket-template>

<issue-template>

## Design record

`docs/specs/YYYY-MM-DD-<slug>.md`

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to each blocking ticket, or "None — can start immediately".
</issue-template>

Avoid volatile file paths and code snippets in tickets. Exception: retain only the decision-rich portion of a prototype when prose cannot express a state machine, reducer, schema, or type shape precisely.
