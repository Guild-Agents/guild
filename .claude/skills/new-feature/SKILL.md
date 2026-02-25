---
name: new-feature
description: "Creates branch and scaffold for a new feature"
user-invocable: true
---

# New Feature

Prepares the environment for working on a new feature: creates a branch, updates SESSION.md, and optionally creates a GitHub Issue.

## When to use

- When starting a new feature before writing code
- When you want to record the feature context in SESSION.md

## Usage

`/new-feature [feature-name]`

## Process

### Step 1 — Get name

If the user did not provide a name, ask for:

- Short name for the feature (will be used in the branch name)
- Brief description (1-2 sentences)

### Step 2 — Create branch with worktree isolation

When running in parallel with other agents, use git worktrees for isolation. When running standalone, a simple branch is sufficient.

**For parallel execution (multiple build-features at once):**

```bash
git worktree add .claude/worktrees/feature-[name] -b feature/[feature-name] develop
```

All subsequent operations should use `.claude/worktrees/feature-[name]` as the working directory.

**For standalone execution:**

```bash
git checkout -b feature/[feature-name]
```

If the branch already exists, ask whether to switch to it or create a new one.

**Cleanup:** At skill exit, if using worktrees, the caller is responsible for cleanup via `git worktree remove .claude/worktrees/feature-[name]` after the PR is merged.

### Step 3 — Update SESSION.md

Update SESSION.md with the new feature context:

- **Date:** current date
- **Task in progress:** feature name
- **State:** Feature started — pending implementation

## Example Session

```text
User: /new-feature user-preferences

Branch created: feature/user-preferences
SESSION.md updated with feature context.
GitHub Issue #42 created.

Next: Run /build-feature to implement.
```

### Step 4 — GitHub Issue (optional)

If the project has GitHub integration configured in PROJECT.md:

1. Ask whether to create a GitHub Issue for the feature
2. If accepted, create the issue with `gh issue create`
3. Record the issue URL in SESSION.md

### Step 5 — Confirm

Confirm to the user:

- Branch created: `feature/[name]`
- SESSION.md updated
- GitHub Issue created (if applicable)
- Suggest: "Run /build-feature to implement the full feature"
