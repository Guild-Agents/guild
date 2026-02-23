---
name: qa-cycle
description: "QA + bugfix cycle until it passes"
user-invocable: true
---

# QA Cycle

Runs a QA validation cycle followed by bugfix until all criteria pass clean. Useful for validating implementations without the full build-feature pipeline.

## When to use

- After implementing changes that need validation
- To verify that a bug fix did not introduce regressions
- As a final cycle before creating a PR

## Usage

`/qa-cycle`

## Process

### Step 1 — Automated verification (mandatory)

Before invoking the QA agent, run the project verification commands. The specific commands are in the "CLI commands" section of CLAUDE.md:

1. Run project tests (e.g., `npm test`) — record result and output
2. Run project lint (e.g., `npm run lint`) — record result and output
3. If any fail, this becomes input for the QA report as an automatic Blocker bug

### Step 2 — QA Validation

Invoke the QA agent using Task tool:

1. Read `.claude/agents/qa.md` to assume the QA role
2. Read CLAUDE.md and SESSION.md for context
3. Receive the test and lint results from Step 1
4. If tests or lint failed, include them as Blocker bugs in the report
5. Review the acceptance criteria for the current task (if they exist in SESSION.md)
6. Validate edge cases and error scenarios
7. Report results

### Step 3 — Bugfix (if there are bugs)

If QA reports bugs (including test/lint failures), invoke the Bugfix agent using Task tool:

1. Read `.claude/agents/bugfix.md` to assume the Bugfix role
2. Receive the QA bug report as input
3. Diagnose the root cause of each bug
4. Implement the minimal fix
5. Verify that the fix resolves the issue
6. Run tests and lint to confirm no regressions were introduced

### Step 4 — Re-validation

Return to Step 1 (automated verification) to re-validate after the bugfix.
Maximum 3 verification-QA-bugfix cycles to prevent infinite loops.

### Step 5 — Final result

Present the result:

- **Approved**: All criteria pass, no pending bugs
- **With warnings**: Passes but there are minor warnings
- **Rejected**: There are critical bugs that could not be resolved — escalate to the Tech Lead

Update SESSION.md with the QA cycle result.

## Example Session

```text
User: /qa-cycle

QA Cycle 1: 2 of 5 criteria pass. Bug: form validation missing on email field.
Bugfix: Added email regex validation to UserForm component.
QA Cycle 2: 5 of 5 criteria pass. 0 bugs.

Result: Approved.
```

## Subagent Configuration

When spawning QA or Bugfix agents via the Task tool, always use `subagent_type: "general-purpose"`. Guild agent role names are NOT valid Claude Code subagent_types.
