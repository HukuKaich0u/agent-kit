---
description: Commit message convention — subject line, scope vocabulary, and when a body is required
---

## Subject line

- Format: `type(scope): 日本語で簡潔に説明`
- Types: `feat` / `fix` / `docs` / `refactor` / `test` / `chore`. Choose by the
  effect on the codebase, not by which files moved — a prose-only edit to a
  behavioral spec is `docs`; a rename with no behavior change is `refactor`.
- Keep the entire subject line within 60 characters, Japanese included. Anything
  that does not fit goes in the body — never into a trailing `(...)`.
- One concern per subject. If the description needs `し` / `かつ` / `+` / `、` to
  join two independent changes, that is a signal to split the commit, not to
  lengthen the line.
- State the effect, not the mechanics. `fix(auth): 期限切れトークンで500になる不具合を修正`
  beats `fix(auth): token.rs を修正`.
- Do not end the subject with punctuation. Keep code identifiers, paths,
  commands, and library names in their original form.

## Scope

- Scope names the area that changed, not the file that changed. `chore(repo)`,
  not `chore(gitignore)`.
- Reuse the vocabulary already in the repo. Check `git log --format='%s' | head -50`
  before inventing a new scope, and match existing spelling exactly (never let
  `spec` and `specs` coexist).
- Use one scope. If two genuinely apply, the commit is doing two things.

## Body

Write a body whenever the commit is more than a self-evident one-liner. A body
is required when any of these hold:

- a reviewer reading the diff would ask 「なぜ?」
- an alternative was considered and rejected, or a tradeoff was accepted
- the change is driven by context invisible in the code (bug report, upstream
  breakage, spec, a decision the user made)
- the change spans several sub-areas, or corrects something that looks cosmetic
  but is not

Body rules:

- Explain **why**, and what constraint drove the decision. The diff already shows
  **what**; do not paraphrase it hunk by hunk.
- Open with a short prose paragraph giving the reason, then a `-` bullet list of
  the substantive changes when there are several.
- Record what a future reader cannot recover from the code: rejected
  alternatives, deliberate scope cuts, known remaining gaps, and corrections of
  a previously wrong assumption (say plainly that it was wrong).
- Japanese, wrapped at roughly 72 characters.
- The message must stand alone. Never refer to the conversation
  (「前回の指摘を反映」「先ほどの方針で」) — name the actual reason instead.
- Never invent rationale. If the only reason is that the user asked, say that.
- Leave out: file lists the diff already gives, test output, restatements of the
  subject. Mention process (who or what produced the change) only when it bears
  on how thoroughly the change was verified.
