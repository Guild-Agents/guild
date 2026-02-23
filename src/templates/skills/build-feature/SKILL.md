---
name: build-feature
description: "Full pipeline: evaluation -> spec -> implementation -> review -> QA"
user-invocable: true
---

# Build Feature

Full pipeline to build a feature end-to-end with all team agents. Each phase invokes a specialized agent using the `Task` tool.

## When to use

- To implement a new feature that requires the complete cycle
- When you want the feature to go through evaluation, specification, implementation, review, and QA

## Usage

`/build-feature [feature description]`

## Parallel Execution: Worktree Isolation

When multiple build-feature pipelines run in parallel, each MUST use its own git worktree to avoid branch conflicts:

```bash
git worktree add .claude/worktrees/[branch-name] -b [branch-name] develop
```

All file operations within the pipeline must use the worktree directory as the working directory. After the PR is merged, clean up with:

```bash
git worktree remove .claude/worktrees/[branch-name]
```

When running a single build-feature, a simple `git checkout -b` is sufficient.

## 6-Phase Pipeline

### Phase 1 — Evaluation (Advisor)

**Agent:** Reads `.claude/agents/advisor.md` via Task tool
**Input:** The feature description provided by the user
**Process:**

1. The Advisor evaluates the feature against the project vision
2. Identifies risks, dependencies, and conflicts with existing functionality
3. Issues evaluation: Approved / Rejected / Requires adjustments

**Output:** Evaluation with reasoning and identified risks
**Exit condition:** If the Advisor rejects the feature, the pipeline stops here. Inform the user of the reason and suggest adjustments if any.

### Phase 2 — Specification (Product Owner)

**Agent:** Reads `.claude/agents/product-owner.md` via Task tool
**Input:** The feature approved by the Advisor + their observations
**Process:**

1. The Product Owner breaks the feature into concrete tasks
2. Defines verifiable acceptance criteria for each task
3. Estimates effort and suggests implementation order

**Output:** Task list with acceptance criteria, estimation, and order

### Phase 3 — Technical Approach (Tech Lead)

**Agent:** Reads `.claude/agents/tech-lead.md` via Task tool
**Input:** Product Owner tasks + acceptance criteria
**Process:**

1. The Tech Lead defines the implementation approach
2. Identifies files to modify, patterns to follow, interfaces
3. Anticipates technical risks and proposes mitigations

**Output:** Technical plan with files, patterns, interfaces, and risks

### Phase 4 — Implementation (Developer)

**Agent:** Reads `.claude/agents/developer.md` via Task tool
**Input:** Tech Lead technical plan + PO acceptance criteria
**Process:**

1. The Developer implements following the technical plan
2. Writes unit tests as part of the implementation
3. Makes atomic commits with descriptive messages
4. Verifies that tests pass

**Output:** Implemented code + tests + commits made

### Pre-Review Gate (mandatory)

Before advancing to Phase 5, run automated verification:

1. Run the project test commands (e.g., `npm test`) — if it fails, the Developer must fix before advancing
2. Run the project lint commands (e.g., `npm run lint`) — if it fails, the Developer must fix before advancing
3. Only make a checkpoint commit **after** both pass

This gate CANNOT be skipped, even if the user requested phase skipping. The specific commands are in the "CLI commands" section of CLAUDE.md.

### Phase 5 — Review (Code Reviewer)

**Agent:** Reads `.claude/agents/code-reviewer.md` via Task tool
**Input:** The implemented changes (git diff)
**Process:**

1. The Code Reviewer reviews quality, patterns, security, and tests
2. Classifies findings as Blocker, Warning, or Suggestion

**Output:** Review report with classified findings
**Loop condition:** If there are Blocker findings, return to **Phase 4** for the Developer to fix them. Maximum 2 review-fix iterations.

### Phase 6 — QA (delegates to /qa-cycle)

Runs the `/qa-cycle` skill passing the PO acceptance criteria as context. The qa-cycle handles:

1. Running project tests and lint
2. Validating acceptance criteria
3. Testing edge cases and error scenarios
4. Bugfix cycle if issues arise (maximum 3 cycles)

**Additional loop condition:** If the qa-cycle bugfix introduces significant changes, return to **Phase 5** (Review) for verification. Maximum 2 review-QA cycles.

## Checkpoint Commits

After each phase completes, create a checkpoint commit to preserve progress. This ensures work survives session interruptions.

```bash
git add -A
git commit -m "wip: [feature-name] phase N complete — [phase-name]"
```

Pattern for each phase:

- After Phase 1: `wip: [feature] phase 1 — advisor approved`
- After Phase 2: `wip: [feature] phase 2 — PO spec ready`
- After Phase 3: `wip: [feature] phase 3 — tech approach defined`
- After Phase 4: `wip: [feature] phase 4 — implementation done`
- After Phase 5: `wip: [feature] phase 5 — review passed`
- After Phase 6: `wip: [feature] phase 6 — QA passed`

Also update SESSION.md at each phase transition:

```text
- [timestamp] | build-feature | Phase N ([phase-name]) complete for [feature]
```

## Final Gate (mandatory before Completion)

Before declaring the pipeline as complete, run final verification:

1. Run project tests — if it fails, return to Phase 6 (QA/Bugfix)
2. Run project lint — if it fails, return to Phase 4 (Developer)
3. Both must pass with exit code 0

This gate is the last safety net. It CANNOT be skipped under any circumstances.

## Completion

Upon successfully completing all phases and the final gate:

1. Present pipeline summary:
   - Feature implemented
   - Files modified/created
   - Tests run and result
   - Review issues resolved
   - Final QA result

2. Update `SESSION.md` with:
   - Feature completed
   - Decisions made during the pipeline
   - Next steps if any

3. Close the GitHub Issue (if applicable):
   - Do NOT use `Closes #N` in PR description (only works when merging to default branch)
   - After the PR is merged, run: `gh issue close N --comment "Resolved in PR #X"`

## Subagent Configuration

When spawning agents via the Task tool, use these `subagent_type` values:

| Guild Agent Role | subagent_type to use |
| --- | --- |
| advisor, product-owner, tech-lead | `"general-purpose"` |
| developer, bugfix | `"general-purpose"` |
| code-reviewer, qa | `"general-purpose"` |

**IMPORTANT:** Guild agent role names (advisor, developer, etc.) are NOT valid Claude Code subagent_types. Always use `"general-purpose"` for agents that need full tool access (Read, Write, Edit, Bash, Grep, Glob, etc.). Never use `"Bash"` alone — it lacks file editing tools.

Example Task invocation:

```text
Task tool with:
  subagent_type: "general-purpose"
  prompt: "Read .claude/agents/developer.md and assume that role. Then: [task description]"
```

## Example Session

```text
User: /build-feature add dark mode toggle to settings page

Phase 1 — Advisor: Approved. Low risk, aligns with UX roadmap.
Phase 2 — PO: 3 tasks defined with acceptance criteria.
Phase 3 — Tech Lead: Use CSS variables + context provider pattern.
Phase 4 — Developer: Implemented ThemeContext, toggle component, CSS vars.
Phase 5 — Review: Passed. 1 suggestion (memoize context value).
Phase 6 — QA: All 3 acceptance criteria verified. 0 bugs.

Feature complete. PR ready for merge.
```

## Notes

- If the user wants to skip phases (e.g., "already evaluated, implement directly"), allow skipping to Phase 4 but warn that validation is lost. Verification gates (pre-Review and final) are NEVER skipped
- The pipeline is sequential: each phase depends on the output of the previous one
- Review/QA loops have limits to prevent infinite cycles
