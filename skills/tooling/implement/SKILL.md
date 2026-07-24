---
name: implement
description: "Implement one agreed scope from a work ticket, its linked design record, or a confirmed current-session task list."
disable-model-invocation: true
---

Implement one agreed scope from a work ticket and its linked design record, or from a confirmed current-session task list.

A design record is historical intent, not current implementation truth. When it differs from code, tests, ADRs, or the glossary, surface the divergence and follow the repository's current truth rather than editing the record.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.
