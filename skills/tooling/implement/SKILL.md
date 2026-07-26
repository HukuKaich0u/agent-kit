---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Then stop and report before writing anything outside the working tree: what changed, how it was verified (typecheck, tests, review findings), and anything left undone. Propose the commit — the files to stage and the message — and any tracker update (ticket status change, comment). Apply each only after the user approves it. Commit to the current branch; never push.
