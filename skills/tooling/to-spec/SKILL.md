---
name: to-spec
description: Turn an approved design conversation into one immutable, date-stamped design record in docs/specs. Use after grilling or wayfinding when a multi-session build needs a durable account of the decisions made; do not use to create a current implementation specification or tracker issue.
disable-model-invocation: true
---

# To Spec

Turn the current conversation and codebase understanding into an immutable **design record**. A design record captures what was agreed at one point in time; it is not a living specification.

Current truth lives in code, tests, ADRs, and the domain glossary. Do not publish this record to an issue tracker, apply tracker labels, or update it after it is written.

The design-record convention should be available at `docs/agents/design-records.md`. Run `/setup-agent-kit` if it is missing.

## Process

1. Explore the relevant codebase area if needed. Use the project's glossary vocabulary and respect applicable ADRs. Capture only facts supported by the conversation, codebase, or ADRs; do not fill gaps with plausible detail.

2. Identify decisions that must remain true beyond this feature. If a decision is hard to reverse, surprising without context, and the result of a real trade-off, present it as an ADR candidate. Keep it out of the design record's implementation narrative and use `/domain-modeling` to record it when approved.

3. Sketch the highest practical test seam and the acceptance evidence each future ticket must produce. Prefer existing seams. If a critical decision or acceptance condition remains unresolved, return to `/grilling`; do not write a record.

4. Present the complete draft and proposed path below. This is the approval gate. Do not write a file until the user confirms the draft is the agreed point-in-time record.

5. On approval, create exactly one new file at `docs/specs/YYYY-MM-DD-<slug>.md`:

   - Use today's date and a concise slug.
   - Set `author` to `git config user.name`; ask if it is unavailable or not a human name.
   - Set `based_on_revision` to `git rev-parse HEAD` when available; otherwise omit that field.
   - Write the historical-record notice verbatim.
   - Never amend, overwrite, or regenerate this file. If direction changes after approval, re-grill and create a new record that names this path under `## Supersedes`.

6. Stage only the new record and commit it as a standalone commit according to the repository's commit policy. If the repository requires approval before committing, request it; do not hand an uncommitted record to `/to-tickets`.

7. Hand the committed path to `/to-tickets` for implementation planning. The tickets own actionable acceptance criteria; the design record stays a dead historical record.

<design-record-template>
---
created: <YYYY-MM-DD>
author: <git config user.name>
type: design-record
based_on_revision: <git revision, when available>
---

# <Title>

> **Historical design record.** This captures the design agreed on <YYYY-MM-DD>.
> Do not update it. Current truth lives in code, tests, ADRs, and the domain glossary.
> Re-grill and create a new record if the direction changes.

## Problem and intended outcome

The user-facing problem, the intended outcome, and how the outcome will be recognised.

## Scope and non-goals

What this decision covers and deliberately excludes.

## Decisions and rationale

The choices agreed in this conversation, their trade-offs, and any rejected alternatives worth remembering. Do not include volatile file paths or a predicted final implementation structure.

When prose cannot preserve an agreed decision precisely, include the smallest **decision-dense** excerpt from a prototype: a state machine, reducer, schema, or type shape. Identify it as prototype-derived and explain the decision it records. Do not include a runnable prototype, an implementation walkthrough, or ordinary production code.

## Ticketing evidence

The observable acceptance evidence that `/to-tickets` must distribute across implementation tickets. Permanent behaviour belongs in code and tests, not in this record.

## Assumptions and deferred matters

Non-critical assumptions accepted for this design and matters deliberately left for later.

## Supersedes

Optional paths to earlier design records this record replaces. A new record names its predecessors; never edit a predecessor to add a successor.
</design-record-template>
