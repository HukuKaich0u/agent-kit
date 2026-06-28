# Mizchi Skills Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import `mizchi/skills` into this repo's `skills/` tree, preserving category layout and avoiding destructive overwrites.

**Architecture:** Fetch the upstream repo into a temporary location, compare its `skills/` tree against the local `skills/` tree, then copy files into place. On path collisions, move the local path aside to a unique backup path before copying the upstream version, then verify the resulting tree and summarize collisions.

**Tech Stack:** git, shell utilities, repository filesystem

---

### Task 1: Snapshot local skills state

**Files:**
- Modify: `docs/superpowers/plans/2026-06-28-mizchi-skills-import.md`
- Test: `skills/**/*.md`

- [ ] **Step 1: Record the current skill file list**

```bash
find skills -type f | sort
```

- [ ] **Step 2: Record the current `SKILL.md` count**

```bash
find skills -name SKILL.md | wc -l
```

- [ ] **Step 3: Confirm the worktree is otherwise clean enough to reason about**

Run: `git status --short`
Expected: only intentional local changes appear

### Task 2: Fetch upstream source

**Files:**
- Create: `/private/tmp/mizchi-skills-import/`
- Test: `/private/tmp/mizchi-skills-import/skills/**/*`

- [ ] **Step 1: Clone the upstream repo into a temp directory**

```bash
git clone --depth 1 https://github.com/mizchi/skills /private/tmp/mizchi-skills-import
```

- [ ] **Step 2: Confirm the upstream `skills/` tree exists**

Run: `find /private/tmp/mizchi-skills-import/skills -maxdepth 3 -type f | sort`
Expected: category directories and multiple `SKILL.md` files are listed

- [ ] **Step 3: Record the upstream `SKILL.md` count**

Run: `find /private/tmp/mizchi-skills-import/skills -name SKILL.md | wc -l`
Expected: a non-zero count larger than the local baseline

### Task 3: Import with collision backups

**Files:**
- Modify: `skills/**/*`
- Test: `skills/**/*`

- [ ] **Step 1: Detect path collisions between local and upstream trees**

```bash
comm -12 \
  <(cd skills && find . -type f | sort) \
  <(cd /private/tmp/mizchi-skills-import/skills && find . -type f | sort) \
  | tee /tmp/mizchi-skill-collisions.txt
```

- [ ] **Step 2: Backup each colliding local file to a unique `.pre-mizchi-import` path**

```bash
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  src="skills/$rel"
  dst="skills/${rel}.pre-mizchi-import"
  mkdir -p "$(dirname "$dst")"
  mv "$src" "$dst"
done < /tmp/mizchi-skill-collisions.txt
```

- [ ] **Step 3: Copy the upstream `skills/` tree over the local `skills/` tree**

```bash
cp -R /private/tmp/mizchi-skills-import/skills/. skills/
```

- [ ] **Step 4: Confirm the imported files now exist**

Run: `find skills -maxdepth 3 -type f | sort`
Expected: the previous local files plus imported upstream files are present

### Task 4: Verify and summarize

**Files:**
- Modify: `skills/**/*`
- Test: `skills/**/*`

- [ ] **Step 1: Recount local `SKILL.md` files after import**

Run: `find skills -name SKILL.md | wc -l`
Expected: count increased from the baseline

- [ ] **Step 2: Review the collision backups**

Run: `find skills -name '*.pre-mizchi-import' | sort`
Expected: only pre-existing conflicting files are listed

- [ ] **Step 3: Inspect the resulting git changes**

Run: `git status --short`
Expected: newly added upstream files and any backup paths are shown

- [ ] **Step 4: Summarize what changed**

```text
Report:
- upstream source path used
- number of imported `SKILL.md` files
- list of collision backup paths
- any obvious environment-specific skills to customize later
```
