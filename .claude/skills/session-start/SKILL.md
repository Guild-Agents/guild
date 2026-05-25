---
name: session-start
description: "Loads context and resumes work from SESSION.md"
user-invocable: true
workflow:
  version: 1
  steps:
    - id: load-context
      role: system
      intent: "Read CLAUDE.md, SESSION.md, PROJECT.md, and Claude Code memory (MEMORY.md index + relevant memory files)."
      commands: [cat CLAUDE.md, cat SESSION.md, cat PROJECT.md]
      produces: [claude-md, session-md, project-md, memory-context]
    - id: detect-resumable
      role: system
      intent: "Check for wip: checkpoint commits on feature and fix branches."
      commands: [git branch --list "feature/*" --list "fix/*", git log --oneline -1]
      requires: [session-md]
      produces: [resumable-branches, last-phase]
    - id: present-state
      role: system
      intent: "Display unified summary: ephemeral state from SESSION.md + durable context from memory."
      requires: [session-md, memory-context, resumable-branches]
      produces: [state-display]
      gate: true
    - id: suggest-continuation
      role: system
      intent: "Suggest appropriate skill to continue based on current state and memory context."
      requires: [state-display]
      produces: [suggested-action]
      gate: true
    - id: update-session
      role: system
      intent: "Update SESSION.md with current date to record session start."
      requires: [session-md]
      produces: [session-updated]
      gate: true
---

# Session Start

Loads project context from two sources — SESSION.md (ephemeral work state) and Claude Code memory (durable learnings) — to resume where you left off. This is the first skill you should run when starting a work session.

## When to use

- At the start of each work session with the project
- When you want to resume context after a pause

## Usage

`/session-start`

## Two context sources

| Source | What it provides | Example |
| --- | --- | --- |
| **SESSION.md** | Where you stopped: task, branch, phase, next steps | "Implementing executor v1.2, branch feature/executor, tests passing, next: write delegation tests" |
| **Claude Code Memory** | What you know: decisions, lessons, references | "Chose recursive execution for delegation because plan-expansion breaks retry semantics" |

Both are read and combined into a unified summary.

## Process

### Step 1 — Load context

Read from both persistence layers:

**Ephemeral state (SESSION.md):**

- `CLAUDE.md` — project instructions, conventions, and rules
- `SESSION.md` — last session state, task in progress, next steps
- `PROJECT.md` — project identity, stack, configured agents

**Durable context (Claude Code memory):**

- Read `MEMORY.md` index from the project's memory directory
- Load relevant memory files, especially:
  - `project` type — active decisions, ongoing initiatives
  - `feedback` type — lessons learned, corrections, validated approaches

If either source is missing (no SESSION.md or no memory files), work with what's available.

### Step 2 — Detect resumable work

Check for `wip:` checkpoint commits on active branches:

```bash
git branch --list "feature/*" --list "fix/*" | while read branch; do
  git log --oneline "$branch" -1 | grep "^wip:" && echo "Resumable: $branch"
done
```

If `wip:` commits are found, present them to the user with the phase they were in when interrupted.

### Step 3 — Present unified state

Show a combined summary from both sources:

**From SESSION.md (where you stopped):**

- Date of the last session
- Task in progress (if any)
- Branch and pipeline phase
- Recorded next steps
- Resumable pipelines (if wip: commits detected)

**From memory (what you know):**

- Recent project decisions that affect current work
- Relevant lessons or corrections from past sessions
- References to external systems or resources

### Step 4 — Suggest how to continue

If there is a task in progress:

- Show the task state
- Suggest continuing with the appropriate skill (e.g., `/build-feature` if in implementation)
- Show the next steps recorded in SESSION.md
- Flag any memory entries that are relevant to the current task

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

SESSION.md: Last session 2026-05-25
  Task: executor-v1.2 (complete)
  Branch: main (clean)
  Next steps: 1. MCP server  2. Agent Teams v2

Memory: 3 entries loaded
  - project: "v1.5.0 shipped — 7 agents, 5-phase pipeline"
  - feedback: "Recursive execution for delegation > plan-expansion"
  - feedback: "npm audit fix resolves transitive vulns"

Suggested: Pick a backlog item — /build-feature or /council to decide.
```
