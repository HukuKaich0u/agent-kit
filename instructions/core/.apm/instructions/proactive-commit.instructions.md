---
description: Commit proactively at milestone granularity without waiting to be asked
---

- Commit proactively without waiting to be asked, but at milestone granularity — not one commit per edit or per small change.
- Default cadence: one commit when a requested task is complete and verified. Fold related tweaks, review fixes, and follow-ups into that single commit instead of committing each one separately.
- Split into multiple commits only when the accumulated work contains clearly unrelated concerns that a reviewer would want to see separately.
- Also checkpoint-commit in two cases: before a risky or large rewrite of currently-working code, and when switching to an unrelated task while verified changes are still uncommitted.
- Verified means tests/build/lint relevant to the change pass, or the change has no runtime surface (docs, config comments). Never commit broken or unverified state.
- Stage files explicitly (`git add <paths>`); never stage blindly with `git add -A`. Leave unrelated dirty files alone and mention them.
- Never push, amend or rewrite published history, or open PRs without an explicit request.
- Follow the commit message format defined in the git-commit instructions.
