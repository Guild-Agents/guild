---
name: status
description: "Shows current project and session state"
user-invocable: true
---

# Status

Shows a complete summary of the current project state, the active session, and the available Guild resources.

## When to use

- At the start of a session to get oriented
- To verify that Guild is correctly configured
- To see which agents and skills are available

## Usage

`/status`

## Process

### Step 1 — Read state files

Read the Guild configuration files:

- `CLAUDE.md` — project instructions and conventions
- `PROJECT.md` — identity, stack, and configured agents
- `SESSION.md` — current session state

### Step 2 — Present state

Show the summary in the following format:

```text
Guild v1 — [project name]

Current session:
- Date: [date from SESSION.md]
- Task in progress: [task or "none"]
- State: [current state]

Stack:
- [technologies listed in PROJECT.md]

Available agents:
- [list of .md files in .claude/agents/]

Available skills:
- [list of directories in .claude/skills/]

Next steps:
- [extracted from SESSION.md]
```

### Step 3 — Suggest actions

If there is no task in progress, suggest:

- `/build-feature` to implement something new
- `/new-feature` to prepare the environment for a feature
- `/council` to debate a decision

If there is a task in progress, suggest continuing with the appropriate skill based on the state.

## Example Session

```text
User: /status

Guild — MyProject
Stack: Node.js 20, React 18, PostgreSQL

Session: 2026-02-23
Task: Implementing user preferences
State: Phase 4 — Developer implementing

Agents: advisor, product-owner, tech-lead, developer, code-reviewer, qa, bugfix, db-migration, platform-expert
Skills: guild-specialize, build-feature, new-feature, council, qa-cycle, review, dev-flow,
  status, session-start, session-end
```
