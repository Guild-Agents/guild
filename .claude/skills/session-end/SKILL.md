---
name: session-end
description: "Saves current state to SESSION.md"
user-invocable: true
---

# Session End

Saves the current work state to SESSION.md so it can be resumed in the next session. Run this skill before closing your work session.

## When to use

- Before closing the work session
- When you need to pause and want to save the context

## Usage

`/session-end`

## Process

### Step 1 — Gather current state

Analyze the current work state:

- What task was in progress
- Which pipeline phase it is in (if applicable)
- What files were modified (via `git status`)
- What commits were made in this session

### Step 2 — Update SESSION.md

Update SESSION.md with the following information:

- **Date:** current date
- **Task in progress:** task name or "none"
- **GitHub Issue:** associated issue URL (if it exists)
- **Active agent:** last agent used or "none"
- **State:** concrete description of where the work left off

**Relevant context:**

- Decisions made in this session
- Problems encountered and how they were resolved
- Important information for resuming

**Next steps:**

- The 2-3 most important concrete actions when resuming
- Suggested skill to continue (e.g., "run /build-feature to continue from Phase 4")

### Step 3 — Commit WIP if uncommitted work exists

If there are uncommitted changes, create a checkpoint commit:

```bash
git add -A
git commit -m "wip: session paused — [brief description of current state]"
```

This ensures no work is lost between sessions. Never leave uncommitted changes across session boundaries.

## Example Session

```text
User: /session-end

Saving session state...
Task: user-preferences
Phase: 4 — Implementation (in progress)
Files modified: 3 files
WIP committed: wip: session paused — user-preferences phase 4

SESSION.md updated. Safe to close.
```

### Step 4 — Confirm

Confirm to the user:

- SESSION.md updated with the current state
- WIP committed (if applicable)
- Next steps recorded
- You can safely close the session
