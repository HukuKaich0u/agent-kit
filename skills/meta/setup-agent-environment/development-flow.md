# Development flow

The path work travels in this repo, and where each step's output is recorded.

```text
grill-with-docs → to-spec → to-tickets → batch-tickets
               → implement → code-review → batch PR
```

Every step's output is reviewed and approved by a human before the next step
starts. An agent does not advance the flow on its own.

## The two slicing units

`to-tickets` and `batch-tickets` both split work, for different consumers.
Confusing them is the failure this file exists to prevent.

| | `to-tickets` | `batch-tickets` |
|---|---|---|
| Sized for | an **agent** — one fresh context window | a **human** — one review narrative |
| Output | tickets + blocking edges | Delivery batches + merge order |
| Finer is | better (agents execute more reliably) | worse (more PRs to review) |

A spec that fans out into ten tickets does not become ten pull requests. The
Delivery plan is what keeps review load from scaling with ticket count.

## Where each artifact lives

- **Spec** — on the issue tracker (see `issue-tracker.md`)
- **Tickets** — on the issue tracker, with blocking edges
- **Delivery plan** — a `## Delivery plan` comment on the parent spec. There is
  exactly one; updates edit it in place rather than adding a second comment
- **Implementation** — commits on the batch branch
- **Review** — `code-review` in working-tree mode, before the commit is proposed

## Branch naming

One branch per Delivery batch, not per ticket:

```text
spec/<spec-number>-b<batch-number>-<slug>
```

Tickets in the same batch stack on the same branch. Parallel work on
independent tickets may use `git worktree` to separate working directories, but
that is about avoiding collisions — it does not change the batch's single PR.

## `ready-for-agent` and the frontier

`ready-for-agent` marks issues that need no further human judgement before the
next agent step. Its scope narrows as the flow advances:

1. `to-spec` publishes the spec and applies the label to it
2. `to-tickets` publishes tickets. Immediately after this step the label is
   broad — **it does not yet reflect the batch order**
3. Once the Delivery plan is approved, the label moves off the spec and onto
   only those tickets in the first batch whose blockers are done
4. After a batch PR merges, the label goes to the tickets whose blockers that
   merge resolved

Before claiming a ticket, read the parent spec's Delivery plan and confirm which
batch and branch the ticket belongs to. Do not start a ticket in a later batch
while its blocking batch is unmerged.

## When the plan turns out to be wrong

A Delivery plan drawn before any code exists is a hypothesis. If a batch grows,
splits into unrelated stories, or hits a dependency the blocking graph missed,
update the plan and get it re-approved **before starting the next ticket** —
not at PR time.
