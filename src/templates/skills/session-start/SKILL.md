---
name: session-start
description: "Loads context and resumes work from SESSION.md"
user-invocable: true
---

# Session Start

Loads the project context and resumes work from where it was left off in the previous session. This is the first skill you should run when starting a work session.

## When to use

- At the start of each work session with the project
- When you want to resume context after a pause

## Usage

`/session-start`

## Process

### Step 1 — Load context

Read the Guild state files:

- `CLAUDE.md` — project instructions, conventions, and rules
- `SESSION.md` — last session state, task in progress, next steps
- `PROJECT.md` — project identity, stack, configured agents

### Step 2 — Detect resumable work

Check for `wip:` checkpoint commits on active branches:

```bash
git branch --list "feature/*" --list "fix/*" | while read branch; do
  git log --oneline "$branch" -1 | grep "^wip:" && echo "Resumable: $branch"
done
```

If `wip:` commits are found, present them to the user with the phase they were in when interrupted.

### Step 3 — Present state

Show a summary of the previous session:

- Date of the last session
- Task in progress (if any)
- State where the work left off
- Decisions made previously
- Recorded next steps
- **Resumable pipelines** (if wip: commits detected)

### Step 4 — Suggest how to continue

If there is a task in progress:

- Show the task state
- Suggest continuing with the appropriate skill (e.g., `/build-feature` if in implementation)
- Show the next steps recorded in SESSION.md

If there is no task in progress, suggest options:

- `/build-feature [description]` — to implement a new feature
- `/new-feature [name]` — to prepare the environment for a feature
- `/status` — to see the general project state
- `/council [question]` — to debate an important decision

### Step 5 — Update session

Update SESSION.md with the current date to record that the session has started.

## Example Session

```text
User: /session-start

Loading context...
Last session: 2026-02-22
Task in progress: user-preferences (Phase 4 — Implementation)
Resumable: feature/user-preferences (wip: phase 3 complete)

Suggested: Continue with /build-feature to resume implementation.
```
