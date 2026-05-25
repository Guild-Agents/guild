---
name: session-end
description: "Saves current state to SESSION.md"
user-invocable: true
workflow:
  version: 1
  steps:
    - id: gather-state
      role: system
      intent: "Analyze current work state: task in progress, pipeline phase, modified files, session commits."
      commands: [git status, git log --oneline -10]
      produces: [work-state, modified-files, session-commits]
    - id: update-session
      role: system
      intent: "Write ephemeral state (task, branch, phase, next steps) to SESSION.md."
      requires: [work-state, modified-files, session-commits]
      produces: [session-update]
      gate: true
    - id: save-memory
      role: system
      intent: "Save durable learnings (decisions, lessons, references) to Claude Code memory files if any emerged this session."
      requires: [session-update]
      produces: [memory-update]
    - id: commit-wip
      role: system
      intent: "Create WIP checkpoint commit if uncommitted changes exist."
      commands: [git add -A, git commit -m "wip: session paused"]
      requires: [modified-files]
      produces: [wip-commit]
      condition: has-uncommitted-changes
    - id: confirm
      role: system
      intent: "Confirm SESSION.md updated, memory saved, WIP committed, safe to close."
      requires: [session-update, memory-update]
      produces: [confirmation]
      gate: true
---

# Session End

Saves the current work state to SESSION.md (ephemeral) and durable learnings to Claude Code memory (long-term). Run this skill before closing your work session.

## When to use

- Before closing the work session
- When you need to pause and want to save the context

## Usage

`/session-end`

## Two persistence layers

This skill writes to two complementary systems:

| Layer | File | What goes here | Lifespan |
| --- | --- | --- | --- |
| **SESSION.md** | `SESSION.md` (project root) | Where you stopped: task, branch, phase, next steps | Overwritten each session |
| **Claude Code Memory** | `.claude/projects/*/memory/*.md` | What you learned: decisions, lessons, references | Persists across sessions |

**Rule of thumb:** if removing the information would make it hard to resume tomorrow, it goes in SESSION.md. If removing it would make you repeat a mistake in two weeks, it goes in memory.

## Process

### Step 1 — Gather current state

Analyze the current work state:

- What task was in progress
- Which pipeline phase it is in (if applicable)
- What files were modified (via `git status`)
- What commits were made in this session

### Step 2 — Update SESSION.md (ephemeral state)

Update SESSION.md with the following information:

- **Date:** current date
- **Task in progress:** task name or "none"
- **GitHub Issue:** associated issue URL (if it exists)
- **Branch:** current branch name
- **State:** concrete description of where the work left off

**Next steps:**

- The 2-3 most important concrete actions when resuming
- Suggested skill to continue (e.g., "run /build-feature to continue from Phase 4")

**Technical context:**

- Version, test count, agent/skill counts — a snapshot that helps orient the next session

Do NOT put decisions, lessons, or references in SESSION.md — those belong in memory.

### Step 3 — Save durable learnings to Claude Code memory

Review the session for knowledge worth preserving long-term. For each item, write a memory file using the Write tool to the project's memory directory.

**What to save (only if something emerged this session):**

- **Decisions with lasting impact** → memory type `project`. Example: "Chose recursive execution for delegation because plan-expansion would break retry semantics on parent steps."
- **Lessons learned / corrections** → memory type `feedback`. Example: "npm audit fix resolves transitive vulnerabilities — don't chase individual Dependabot PRs when a single fix covers all."
- **New external references** → memory type `reference`. Example: "Release workflow logs at gh run view --job=ID --log."

**What NOT to save to memory:**

- Current task state (goes in SESSION.md)
- Code patterns or architecture (derivable from code)
- Git history (derivable from git log)

Use the standard memory frontmatter format:

```markdown
---
name: short-kebab-slug
description: "one-line summary"
metadata:
  type: project|feedback|reference
---

Content with **Why:** and **How to apply:** lines for feedback/project types.
```

Update `MEMORY.md` index if new memory files were created.

If nothing durable emerged this session, skip this step — not every session produces long-term learnings.

### Step 4 — Commit WIP if uncommitted work exists

If there are uncommitted changes, create a checkpoint commit:

```bash
git add -A
git commit -m "wip: session paused — [brief description of current state]"
```

This ensures no work is lost between sessions. Never leave uncommitted changes across session boundaries.

### Step 5 — Confirm

Confirm to the user:

- SESSION.md updated with the current state
- Memory files saved (list which ones, if any)
- WIP committed (if applicable)
- Next steps recorded
- You can safely close the session

## Example Session

```text
User: /session-end

Saving session state...

SESSION.md: task=executor-v1.2, branch=feature/executor-v1.2, phase=complete
Memory: saved feedback/delegation-approach.md (recursive > plan-expansion)
WIP: no uncommitted changes

Safe to close. Next session: create PR and update docs.
```
