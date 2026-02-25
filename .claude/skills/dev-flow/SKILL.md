---
name: dev-flow
description: "Shows current pipeline phase and what comes next"
user-invocable: true
---

# Dev Flow

Shows the current phase of the development pipeline and suggests the next step. Useful for resuming work when you do not remember where you left off in the flow.

## When to use

- When resuming work and you do not remember the current phase
- To see the progress of the build-feature pipeline
- To decide which skill to run next

## Usage

`/dev-flow`

## Process

### Step 1 — Read state

Read `SESSION.md` to determine:

- Whether there is a feature in progress
- Which pipeline phase it is in
- What has been completed and what remains

### Step 2 — Determine current phase

The pipeline phases are:

1. **Evaluation** (Advisor) — go/no-go
2. **Specification** (Product Owner) — acceptance criteria
3. **Technical Approach** (Tech Lead) — implementation plan
4. **Implementation** (Developer) — code and tests
5. **Review** (Code Reviewer) — quality review
6. **QA** — functional validation

### Step 3 — Present flow state

```text
Dev Flow — [feature name]

[x] Phase 1 — Evaluation (completed)
[x] Phase 2 — Specification (completed)
[ ] Phase 3 — Technical Approach (pending) <-- you are here
[ ] Phase 4 — Implementation
[ ] Phase 5 — Review
[ ] Phase 6 — QA

Next step: Run /build-feature to continue from Phase 3.
```

If there is no feature in progress, report that there is no active pipeline and suggest `/new-feature` or `/build-feature`.

## Example Session

```text
User: /dev-flow

Current pipeline: build-feature "add user preferences"
Phase: 4 of 6 — Implementation
Developer agent active.

Next: Phase 5 — Code Review
```
