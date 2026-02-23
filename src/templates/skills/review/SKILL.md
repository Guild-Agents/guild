---
name: review
description: "Standalone code review on the current diff"
user-invocable: true
---

# Review

Runs an independent code review on the current project changes. Invokes the Code Reviewer agent to analyze quality, patterns, security, and technical debt.

## When to use

- Before creating a PR
- To review your own changes before requesting review from others
- When you want a second opinion on the code you wrote

## Usage

`/review`

## Process

### Step 1 — Get diff and verification state

Get the current changes:

1. First try `git diff --staged` (staged changes)
2. If there are no staged changes, use `git diff` (unstaged changes)
3. If there are no changes at all, report that there is nothing to review

Run automated verification to give context to the reviewer:

1. Run project tests (e.g., `npm test`) — capture result
2. Run project lint (e.g., `npm run lint`) — capture result
3. Include both results as context for the Code Reviewer

Note: The Code Reviewer does not have access to Bash (only Read, Glob, Grep), so tests and lint are run here before invoking the reviewer.

### Step 2 — Invoke Code Reviewer

Invoke the Code Reviewer agent using Task tool:

1. Read `.claude/agents/code-reviewer.md` to assume the role
2. Read CLAUDE.md to understand the project conventions
3. Receive the full diff + test and lint results from Step 1
4. If tests or lint failed, this is automatically a Blocker finding
5. Review the full diff
6. Classify each finding by severity:
   - **Blocker**: Must be fixed before merge
   - **Warning**: Should be fixed, introduces technical debt
   - **Suggestion**: Optional improvement

### Step 3 — Present findings

Present the report organized by severity:

- Total count of findings by type
- Detail of each finding: file, description, suggested fix
- Final verdict: Approved / Approved with warnings / Blocked

If there are blockers, suggest fixing them and running `/review` again.

## Example Session

```text
User: /review

Reviewing diff: 4 files changed, +127 -34

Findings:
- [Warning] src/api/users.js:45 — No input validation on email parameter
- [Suggestion] src/utils/format.js:12 — Consider using Intl.DateTimeFormat
- [Blocker] src/db/queries.js:78 — SQL injection vulnerability in raw query

1 blocker, 1 warning, 1 suggestion.
```
