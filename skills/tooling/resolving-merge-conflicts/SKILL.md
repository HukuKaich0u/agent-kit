---
name: resolving-merge-conflicts
description: "Use when you need to resolve an in-progress git merge/rebase conflict."
---

1. **See the current state** of the merge/rebase. Check git history, and the conflicting files.

2. **Find the primary sources** for each conflict. Understand deeply why each change was made, and what the original intent was. Read the commit messages, check the PRs, check original issues/tickets.

3. **Resolve each hunk.** Preserve both intents where possible. Where incompatible, pick the one matching the merge's stated goal and note the trade-off. Do **not** invent new behaviour. Default to resolving, not `--abort` — abort only when the user asks for it or when resolution would require inventing behaviour neither side had; in that case stop and report instead of guessing.

4. Discover the project's **automated checks** and run them — typically typecheck, then tests, then format. Fix anything the merge broke.

5. **Finish the merge/rebase.** Stage the resolved files explicitly by path (never `git add -A` / `git add .`), review `git diff --cached`, and summarize the resolutions — which side won each conflicted hunk and why — before committing. The user asking for the merge to be resolved covers the merge commit itself; anything beyond it (follow-up fix commits, push) still needs an explicit request. If rebasing, continue the rebase process until all commits are rebased.
