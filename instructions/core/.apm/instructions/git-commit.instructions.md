---
description: When to commit and how to write the message — commit as a durable record that both humans and agents can act on
---

A commit is a record that someone reads later — a teammate, or an agent
reconstructing why the code looks like this. Write for both. Anything readable
to a person is readable to an agent; the reverse is not true, so never compress
a message into shorthand only a machine would parse.

Two properties matter more than brevity:

- **Every commit stands on its own.** Checked out in isolation, the tree is
  coherent — nothing half-migrated, no index disagreeing with what it indexes.
- **Every commit explains itself.** The reason is in the message, because the
  diff cannot contain it.

## Commit now when

- a requested task is complete and verified — the default and most common trigger
- a self-contained part of a larger task is done and verified, and leaves the
  tree coherent on its own
- you are about to start a risky or large rewrite of code that currently works —
  checkpoint first so the working state stays recoverable
- you are switching to an unrelated task while verified changes sit uncommitted
- the session is ending or the user is taking over, and verified work is uncommitted

## Do not commit when

- the relevant tests / build / lint have not been run, or are failing. Fix or
  revert first.
- the change is a half-finished step of work still in progress
- the tree would be left inconsistent — a caller updated without its callee, a
  catalog listing entries that do not exist yet, a doc describing behavior the
  code does not have
- debug prints, commented-out code, scratch files, or temp scripts remain in the diff

"Verified" means the tests / build / lint relevant to the change pass, or the
change has no runtime surface (docs, comments, config text). If verification is
impossible in this environment, say so in the response — never describe an
unverified state as verified, in the message or anywhere else.

## How much goes in one commit

Size is not the criterion. Coherence is.

- **Split** when the work contains genuinely unrelated concerns, and each half
  would still leave the tree coherent. Related tweaks, review fixes, and
  follow-ups belong with the change they serve, not in commits of their own.
- **Do not split** when the pieces are only meaningful together. Code and the
  index that lists it, a rename and its call sites, a spec and the script that
  enforces it — separating these creates a commit whose tree contradicts itself,
  and a later `git bisect` lands on it and blames the wrong thing. A large commit
  is fine; an incoherent one is not.
- When unrelated work has already piled up in the working tree, do not paper over
  it with one blob commit. Stage by path and commit each concern in turn.

## Subject line

- Format: `type(scope): 日本語で簡潔に説明`
- Types: `feat` / `fix` / `docs` / `refactor` / `test` / `chore`. Choose by the
  effect on the codebase, not by which files moved — a prose-only edit to a
  behavioral spec is `docs`; a rename with no behavior change is `refactor`.
- Name something specific: the file, symbol, error, or feature the change is
  about. `fix(auth): 期限切れトークンで TokenExpiredError が500になる不具合を修正`
  identifies the change; `fix(auth): 参照を修正` identifies nothing, and neither a
  person nor an agent can tell later which commit they want.
- One concern per subject. If the description needs `し` / `かつ` / `+` to join two
  independent changes, split the commit — do not lengthen the line. No character
  limit is imposed: specificity matters more than fitting one terminal row, and
  the one-concern rule already keeps subjects short.
- Do not end the subject with punctuation. Keep code identifiers, paths,
  commands, and library names in their original form.

### Scope

- Scope names the area that changed, not the file that changed. `chore(repo)`,
  not `chore(gitignore)`.
- Reuse the vocabulary already in the repo. Check `git log --format='%s' | head -50`
  before inventing a new scope, and match existing spelling exactly. Where the
  history already disagrees with itself (`spec` vs `specs`), pick the dominant
  form rather than continuing the split.
- Use one scope. If two genuinely apply, ask whether the commit is doing two things.

## Body

Write a body unless the change is self-evident from the subject alone — a typo
fix, a file move, a version bump. Everything else gets one. The test: if reading
the diff would leave someone asking 「なぜ?」, the answer belongs here.

Cover, in prose first and then a `-` list when there are several points:

- **Why** — the constraint, bug, request, or observation that forced the change.
  Include the evidence when there is any: measurements, error messages, the
  reproduction. This is the part that cannot be recovered from the code.
- **What changed, only where the reason is not obvious from the diff.** A bullet
  that says 「Xを追加」 restates the diff and is noise. A bullet that says why that
  X and not another is worth its lines. If a change looks cosmetic but is not,
  say so explicitly.
- **What was rejected**, and why — alternatives considered, tradeoffs accepted,
  scope deliberately cut.
- **How it was verified** — which tests, build, or lint ran; or that the change
  has no runtime surface. A reader deciding whether to trust this commit needs
  this.
- **What remains** — known gaps, follow-ups, anything left deliberately undone.
- **Corrections** — if the commit fixes a wrong assumption from earlier work, say
  plainly that it was wrong.

Body rules:

- Japanese, wrapped at roughly 72 characters.
- The message must stand alone. Never refer to the conversation
  (「前回の指摘を反映」「先ほどの方針で」) — name the actual reason instead.
- Never invent rationale. If the only reason is that the user asked, say that.
- Leave out: file lists the diff already gives, raw test output, restatements of
  the subject. Mention who or what produced the change only when it bears on how
  thoroughly it was verified.

## Staging

- Stage explicitly by path: `git add <paths>`. Never `git add -A`, `git add .`,
  or `git commit -am`.
- Read `git status` and `git diff --cached` before every commit. Confirm that
  everything staged belongs to the concern named in the message, and nothing else.
- Leave files you did not touch alone even if they are dirty, and mention them in
  the response.
- Never commit secrets, credentials, `.env`, or build artifacts. If one appears
  in the diff, stop and tell the user.

## Requires an explicit request

Never `git push`, `git commit --amend`, rebase or otherwise rewrite published
history, force-push, create tags, or open PRs unless the user asks for it.
