---
description: When to commit — trigger conditions, granularity, and staging safety
---

Commit without waiting to be asked. The unit is a milestone, not an edit.

## Commit now when

- a requested task is complete and verified — the default and most common trigger
- a self-contained part of a larger task is done and verified, and the next part
  does not depend on it (each part must stand on its own)
- you are about to start a risky or large rewrite of code that currently works —
  checkpoint first so the working state stays recoverable
- you are switching to an unrelated task while verified changes sit uncommitted
- the session is ending or the user is taking over, and verified work is uncommitted

## Do not commit when

- the relevant tests / build / lint have not been run, or are failing. Fix or
  revert first.
- the change is a half-finished step of work still in progress
- debug prints, commented-out code, scratch files, or temp scripts remain in the diff
- you have only made trivial follow-ups to something already committed — fold
  them into the next real milestone

"Verified" means the tests / build / lint relevant to the change pass, or the
change has no runtime surface (docs, comments, config text). If verification is
impossible in this environment, say so in the response — never describe an
unverified state as verified, in the message or anywhere else.

## Granularity

- One commit per concern. Related tweaks, review fixes, and follow-ups belong in
  the same commit as the change they serve.
- Split only when the accumulated work touches clearly unrelated concerns that a
  reviewer would want to read separately.
- When unrelated work has already piled up in the working tree, do not paper over
  it with one blob commit. Stage by path and commit each concern in turn.

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

Message format: see the git-commit instructions.
