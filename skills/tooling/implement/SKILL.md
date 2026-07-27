---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Before starting, read the parent spec. If it carries a Delivery plan, work on the branch that plan assigns to this ticket's batch, and don't start a ticket whose batch is blocked by an unmerged one. If the repo records a development flow for agents (`docs/agents/development-flow.md` or an equivalent section in `AGENTS.md` / `CLAUDE.md`), follow it — it decides branch naming and whether pull requests are per ticket or per batch.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review in working-tree mode before committing. Pass the
originating spec or ticket explicitly, and review all uncommitted changes,
including untracked files.

Then stop and report before writing anything outside the working tree: what changed, how it was verified (typecheck, tests, review findings), and anything left undone. Propose the commit — the files to stage and the message — and any tracker update (ticket status change, comment). Apply each only after the user approves it. Commit to the current branch; never push.
