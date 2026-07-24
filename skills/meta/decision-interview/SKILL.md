---
name: decision-interview
description: Lead a structured, one-question-at-a-time interview that turns an ambiguous plan, feature, or design into explicit user-owned decisions. Use when the user wants to clarify or stress-test a consequential idea before acting and needs a decision record; do not use for simple clarification, fact lookup, open-ended ideation, or implementation.
---

# Decision Interview

Turn an ambiguous idea into a small, explicit set of user-approved decisions. Be rigorous and collaborative: challenge contradictions and hidden assumptions, but never treat the interview as an interrogation or manufacture a decision for the user.

## Start the interview

1. Inspect available context and the environment for relevant facts before asking about them. State evidence and uncertainty separately.
2. State a brief **decision frame** in one or two sentences: intended outcome, scope, and the one unknown that blocks progress. Mark unknowns as unknown rather than filling them in.
3. Keep an in-conversation **decision ledger** with four sections:
   - Confirmed decisions
   - Open decisions
   - Assumptions and evidence gaps
   - Deferred matters

Keep the ledger internally. Do not render empty sections at the start; show only entries that changed after an answer or that help the user answer the next question. Do not demand an exhaustive decision tree up front. Discover dependent decisions just in time.

## Choose the next question

Ask exactly one question, then wait for the user's answer. A question must resolve one fact or one decision; if it contains two independently answerable parts, split it.

Before choosing an intervention, architecture, or implementation decision, check whether an observable fact determines which choices are meaningful. Inspect that fact yourself when the environment makes it available. If it is not available, ask for only the single factual measurement or access needed, and say how it will guide the later decision. Do not mix this fact-gathering question with a decision question.

Once the necessary facts are known, prefer the highest-impact unblocked decision in this order:

1. Outcome and evidence of success
2. Scope and non-goals
3. Hard constraints and irreversible commitments
4. Primary actor and main flow
5. High-impact design choices and risks
6. Acceptance evidence, rollout, and operational concerns

Do not ask a downstream question while its prerequisite remains open. Skip a category when it is irrelevant to the decision frame.

Use this format:

> **Question**: [one decision the user owns]
>
> **Recommendation**: [a conditional recommendation]
>
> **Why it matters**: [evidence, trade-off, and impact on later decisions]

Offer a recommendation only when it follows from stated evidence or clearly labelled judgment. Name a meaningful alternative when the trade-off is material.

## Process each answer

Record the user's answer in the ledger as a decision, an assumption, or a deferral; preserve the reason when it affects later choices. If the answer contradicts an earlier decision or available evidence, surface the conflict and resolve it before proceeding.

When the user cannot decide yet, do one of the following instead of guessing:

- investigate a discoverable fact;
- state a bounded assumption and its risk for explicit approval; or
- mark the matter deferred, including what would unblock it.

Show a compact ledger recap after every three confirmed decisions, whenever scope changes, and before concluding.

## Conclude

Do not act on the outcome. Finish only after presenting a decision summary and receiving confirmation that it is sufficient to proceed. The summary must include the intended outcome, confirmed decisions, non-goals, evidence or assumptions, unresolved or deferred matters, and the suggested next step.
