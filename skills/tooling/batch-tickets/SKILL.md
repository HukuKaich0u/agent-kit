---
name: batch-tickets
description: Group approved tickets into Delivery batches — the units a human reviews as one pull request — and record the plan on the parent spec. Use after /to-tickets, when a spec has fanned out into more tickets than anyone wants to review one PR at a time, or when the user asks how to batch tickets into PRs, what the merge order is, or how to keep review load flat as ticket count grows.
disable-model-invocation: true
---

# Batch Tickets

`/to-tickets` sizes tickets for an **agent**: each one fits a single fresh context window. A pull request is sized for a **human**: it has to be understandable as one review narrative. Those two units are not the same, and a spec that fans out into ten tickets does not become ten pull requests.

This skill closes that gap. It groups approved tickets into **Delivery batches**, gets the batch boundaries and merge order approved, and records the plan on the parent spec so every later agent reads the same plan.

The issue tracker should have been provided to you — run `/setup-agent-environment` if not.

## When this skill is worth running

Run it when a spec produced enough tickets that per-ticket PRs would swamp review, or when tickets are interdependent enough that merge order matters. Skip it when the spec produced one or two independent tickets — a single batch is the trivial answer and does not need a plan comment.

The failure mode this prevents is mechanical: review load scaling linearly with how finely `/to-tickets` sliced the work. Finer slicing is good for agents and should not be punished by making it expensive for the human.

## Process

### 1. Read the tickets and their blocking edges

Fetch the parent spec and every ticket produced from it, including bodies and blocking edges. If the user passes a spec reference (issue number, URL, path) as an argument, start there; otherwise work from the tickets in conversation context.

The blocking graph is the primary input. Batches cannot contradict it: if ticket B is blocked by ticket A, B's batch cannot merge before A's.

### 2. Draw the batch boundaries

Group tickets so that each batch is **independently verifiable** and readable as **one review narrative** — something a reviewer can hold in their head in one sitting.

<batch-boundary-rules>

- Prefer a boundary the reviewer can name: one externally observable behaviour; one module, data flow, or migration phase; a verified intermediate state that later batches can build on
- Do not size batches by line count. A 600-line batch that tells one story reviews better than a 200-line batch that tells three
- Never make "1 spec = 1 PR" or "1 ticket = 1 PR" a rule. Both are outcomes, not constraints
- Small specs get one batch. Large specs usually get two or three. More than three means the boundaries are probably wrong, or the spec should have been split
- A batch must be able to land green on its own. When tickets cannot each stay green alone (expand–contract migrations, wide refactors), keep them in the same batch so the batch is green even though its individual commits are not

</batch-boundary-rules>

### 3. Order the batches

Give the batches a merge order consistent with the blocking graph. Batches that are genuinely independent may proceed in parallel — say so explicitly in the plan, because the default reading is sequential and a later agent will otherwise wait for nothing.

Name each batch's branch so the spec, the batch, and the topic are all recoverable from the branch name alone. Use whatever convention the repo already has; if it has none, `spec/<spec-number>-b<batch-number>-<slug>` works and is the form the rest of this skill assumes.

### 4. Quiz the user

Present the proposed plan and ask for approval. For each batch, show:

- **Branch**: the branch name
- **Tickets**: which tickets it contains
- **Review narrative**: what a reviewer will be asked to understand, in one or two sentences
- **Verifiable on its own**: how this batch is checked without later batches
- **Acceptance criteria covered**: which of the spec's criteria this batch satisfies

Then state the merge order, which batches (if any) are parallel-safe, and the `ready-for-agent` label changes step 6 will apply — which tickets keep it, and which lose it.

Ask the user:

- Are the batch boundaries reviewable — is each one a story you would want to review in one sitting?
- Is the merge order right, and is anything marked sequential that is actually independent?
- Should any batch be split or merged?

Iterate until the user approves. **Do not publish the plan before approval** — the plan is the contract later agents follow, and an unapproved contract is worse than no contract.

### 5. Record the approved plan where later agents will find it

The plan goes in **one** place, alongside the spec rather than scattered across tickets, because every later agent starts by reading the spec and needs a single authoritative answer to "which batch and branch does my ticket belong to". Where that is depends on the tracker `/setup-agent-environment` configured:

- **A real issue tracker (GitHub, Linear, …)** → a `## Delivery plan` comment on the parent spec issue.
- **Local files** → a `delivery-plan.md` next to the tickets, at `.scratch/<feature-slug>/delivery-plan.md`. There are no comments to hold it, and it does not belong inside an individual ticket file.

**Updating an existing plan edits it in place** — edit the comment, or the file. Never post a second plan comment: two plans on one spec means a later agent picks the wrong one, and the whole point of this step is that there is exactly one answer.

<delivery-plan-template>

## Delivery plan

- Batch 1 — `spec/123-b1-runtime`: #124, #125, #126
  Review narrative: <what the reviewer is being asked to understand>
- Batch 2 — `spec/123-b2-control-plane`: #127, #128
  Review narrative: <…>

Merge order: Batch 1 → Batch 2

</delivery-plan-template>

Keep it terse. The tickets hold the detail; the plan holds only the batching, the order, and why each batch is one narrative.

### 6. Narrow the frontier to the first batch

The plan is not a scheduler; the `ready-for-agent` label (or the tracker's equivalent) is. After publishing the plan, that label must point at exactly the tickets that can start now: those in the **first batch** whose blockers are all done.

`/to-tickets` applies `ready-for-agent` to every ticket it publishes — correctly, since at that moment there is no batch order to respect. Once a plan exists, that broad marking is stale and an agent reading it will claim a ticket from a later batch. So this step **removes the label from every ticket outside the first batch**, and from the parent spec.

State the label changes in the approval request from step 4, and apply them only after approval — the same rule as the plan itself.

Do not close or modify ticket bodies here. This skill writes the plan and adjusts labels, nothing else.

## Keeping the plan honest during implementation

A Delivery plan drawn before any code exists is a hypothesis. Implementation tests it.

When a batch turns out to be unreviewable — it grew, it split into two unrelated stories, a dependency appeared that the blocking graph missed — update the plan and get it re-approved **before starting the next ticket**, not at PR time. Amending a plan comment is cheap; discovering at review that the PR contains three narratives is not.

After a batch's PR merges, apply `ready-for-agent` to the tickets whose blockers that merge resolved.

## What this skill does not do

- It does not create or re-slice tickets. If the batching exposes that the slicing was wrong, go back to `/to-tickets`.
- It does not create branches, push, or open pull requests. `/implement` and the repo's own workflow own that.
- It does not decide merge method, release versioning, or deploy. Those are repo policy, not plan content.
