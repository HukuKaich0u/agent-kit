---
description: Commit only with the user's approval, and how to write the message — commit as a durable record that both humans and agents can act on
---

A commit is a record that someone reads later — a teammate, or an agent
reconstructing why the code looks like this. Write for both. Anything readable
to a person is readable to an agent; the reverse is not true, so never compress
a message into shorthand only a machine would parse.

These are defaults. When a repository has its own enforced or established
convention — commitlint, CONTRIBUTING, or a history consistently in another
language or format — the repository's convention wins where the two conflict.

Two properties matter more than brevity:

- **Every commit stands on its own.** Checked out in isolation, the tree is
  coherent — nothing half-migrated, no index disagreeing with what it indexes.
- **Every commit explains itself.** The reason is in the message, because the
  diff cannot contain it.

## Committing requires the user's approval

Never run `git commit` on your own initiative. Task completion, a finished
sub-step, an upcoming risky rewrite, a task switch, or the session ending —
none of these authorize a commit by themselves. Commit only when the user has
approved it:

- a direct instruction ("これcommitして"), or
- a standing instruction the user gave for the current task
  ("終わったらcommitしていい").

An approval covers the change it was given for, not every later change in the
session. When in doubt whether an earlier approval still applies, it does not —
ask or propose instead.

When work is done and verified but no approval exists, stop at the commit
boundary and report: say the change is ready to commit, propose the split and
the subject line(s), and leave the tree uncommitted. Do the same for
checkpoints before a risky rewrite and at session end — suggest the commit,
do not make it.

## Even with approval, do not commit when

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
  If the change they serve is already committed, see the follow-up rule under
  "Requires an explicit request".
- **Do not split** when the pieces are only meaningful together. Code and the
  index that lists it, a rename and its call sites, a spec and the script that
  enforces it — separating these creates a commit whose tree contradicts itself,
  and a later `git bisect` lands on it and blames the wrong thing. A large commit
  is fine; an incoherent one is not.
- Within those bounds, prefer the smallest unit that stays coherent. A change
  that decomposes into steps that each leave the tree consistent (one batch plus
  its index update, then the next batch) should be committed as those steps —
  bisect localizes a regression far better to a small commit than to a
  700-file one.
- When unrelated work has already piled up in the working tree, do not paper over
  it with one blob commit. Stage by path and commit each concern in turn.

## Subject line

- Format: `type(scope): 日本語で簡潔に説明`
- Types: `build` / `cd` / `chore` / `ci` / `docs` / `feat` / `fix` / `perf` /
  `refactor` / `revert` / `style` / `test`. These are the standard Conventional
  Commits types plus `cd`; use `ci` for continuous integration and `cd` for
  continuous delivery or deployment. Choose by the effect on the codebase, not
  by which files moved — a prose-only edit to a behavioral spec is `docs`; a
  rename with no behavior change is `refactor`.
- Name something specific: the file, symbol, error, or feature the change is
  about. `fix(auth): 期限切れトークンで TokenExpiredError が500になる不具合を修正`
  identifies the change; `fix(auth): 参照を修正` identifies nothing, and neither a
  person nor an agent can tell later which commit they want.
- One concern per subject. A connective (`し` / `かつ` / `+`) joining two changes is
  a signal to stop and apply the coherence test above: if each half would leave
  the tree coherent on its own, split the commit; if the halves are interlocked
  parts of one change, they are one concern and the connective is fine.
  Coherence decides, not grammar.
- No character limit is imposed: specificity matters more than fitting one
  terminal row, and the one-concern rule already keeps subjects short. Put the
  most identifying term early in the line, so truncated views (`git log
  --oneline`, commit lists) still show it.
- Do not end the subject with punctuation. Keep code identifiers, paths,
  commands, and library names in their original form.

### Scope

- Scope names the area that changed, not the file that changed. `chore(repo)`,
  not `chore(gitignore)`.
- Reuse the vocabulary already in the repo. Check `git log --format='%s' | head -50`
  before inventing a new scope, and match existing spelling exactly. Where the
  history already disagrees with itself (`spec` vs `specs`), pick the dominant
  form; on a tie, pick one, use it, and keep using it in later commits.
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

Never `git push`, rebase or otherwise rewrite published history, force-push,
create tags, or open PRs unless the user asks for it.

`git commit --amend` is allowed without a separate amend request in exactly one
case: the user approved committing a small follow-up (typo, missed rename site,
review nit), and the immediately preceding commit was created by you in this
session with the user's approval and has not been pushed — then folding the
follow-up in via amend is fine. In every other case — someone else's commit, a
pushed commit, an older commit, a message rewrite the user did not ask for —
amend requires an explicit request. If amend is not permitted, propose a small
follow-up commit instead.
