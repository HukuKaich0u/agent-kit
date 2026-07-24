---
name: to-tasks
description: Split a small, current-session implementation into a 2–5 step ephemeral task list without creating a design record or publishing tracker work. Use when work benefits from an ordered breakdown but does not need multi-session, multi-agent, or durable tracking; do not use to create issues.
disable-model-invocation: true
---

# To Tasks

Turn an agreed, small implementation into an **ephemeral task list** for this current session. It is planning output in the conversation, not a design record, ticket, file, tracker issue, label, dependency graph, or work queue.

Use this only when the work has a settled direction, fits the current session, and benefits from 2–5 ordered steps. Do not use it to avoid recording a consequential decision, coordinate multiple agents or sessions, or create tracker work indirectly.

## Process

1. Read the current conversation and inspect the relevant code only as needed to make the steps honest. Use current code, tests, ADRs, and the glossary as truth.

2. Check whether the work is still small and settled. Escalate to `/grilling` if a product, architecture, or acceptance decision remains open. Escalate to `/to-spec` when the work needs a durable decision record, will span sessions, will be handed to another agent, or should become tracker-owned work.

3. Present 2–5 ordered tasks. For each task, state:

   - **Outcome** — the observable change it completes.
   - **Evidence** — the test, check, or direct observation that proves it.
   - **Depends on** — an earlier task or `None`.

   Keep each task small enough to implement in this context. Prefer vertical behaviour slices over layer-only tasks; use a short expand–contract sequence only for a mechanical refactor with broad blast radius.

4. Ask the user to confirm the order or adjust the split before implementation. Keep the list in the conversation. Do not write `.scratch/` files, design records, tracker issues, labels, dependencies, or status fields.

5. After confirmation, call `/implement` for one task at a time without clearing the context. If the scope grows past this session or a durable handoff becomes necessary, stop and promote the agreed understanding through `/to-spec` before creating tickets.
