---
name: build-feature
description: "Full pipeline: evaluation -> spec -> implementation -> review -> QA"
user-invocable: true
workflow:
  version: 1
  steps:
    - id: evaluate
      role: advisor
      intent: "Evaluate the feature against the project vision. Identify risks, dependencies, and conflicts. Issue verdict: Approved / Rejected / Requires adjustments."
      requires: [feature-description]
      produces: [evaluation-report, verdict]
      model-tier: reasoning
      on-failure: abort
    - id: specify
      role: product-owner
      intent: "Break the feature into concrete tasks with verifiable acceptance criteria. Estimate effort and suggest implementation order."
      requires: [feature-description, evaluation-report]
      produces: [task-list, acceptance-criteria]
      model-tier: reasoning
      condition: step.evaluate.verdict != rejected
    - id: design
      role: tech-lead
      intent: "Define implementation approach: files to modify, patterns to follow, interfaces, and technical risks."
      requires: [task-list, acceptance-criteria]
      produces: [technical-plan]
      model-tier: reasoning
    - id: implement
      role: developer
      intent: "Implement the feature following the technical plan. Write unit tests. Make atomic commits."
      requires: [technical-plan, acceptance-criteria]
      produces: [implementation, test-results]
      model-tier: execution
    - id: gate-pre-review
      role: system
      intent: "Run project tests and lint. Both must pass before review."
      commands: [npm test, npm run lint]
      gate: true
      produces: [gate-pre-review-result]
      on-failure: goto:implement
    - id: checkpoint-phase4
      role: system
      intent: "Create checkpoint commit and write partial pipeline trace (phases 1-4) to spec file."
      requires: [implementation, gate-pre-review-result]
      produces: [checkpoint-commit]
      gate: true
    - id: review
      role: code-reviewer
      intent: "Review code quality, patterns, security, and test coverage. Classify findings as Blocker, Warning, or Suggestion."
      requires: [implementation, gate-pre-review-result]
      produces: [review-report]
      model-tier: reasoning
      retry:
        max: 2
        on: has-blockers
    - id: fix-review-blockers
      role: developer
      intent: "Fix blocker findings from code review. Run tests after fixing."
      requires: [review-report]
      produces: [implementation]
      model-tier: execution
      condition: step.review.has-blockers
      on-failure: goto:review
    - id: qa-phase
      role: system
      intent: "Run QA validation with bugfix cycles."
      delegates-to: qa-cycle
      requires: [acceptance-criteria, implementation]
      produces: [qa-report]
      retry:
        max: 2
        on: has-bugs
    - id: post-qa-review
      role: code-reviewer
      intent: "Review changes introduced during QA bugfix cycles."
      requires: [qa-report, implementation]
      produces: [post-qa-review-report]
      model-tier: reasoning
      condition: step.qa-phase.had-significant-changes
      retry:
        max: 2
        on: has-blockers
    - id: gate-final
      role: system
      intent: "Run project tests and lint as final verification. Both must pass."
      commands: [npm test, npm run lint]
      gate: true
      produces: [final-gate-result]
      on-failure: goto:qa-phase
    - id: completion
      role: system
      intent: "Write complete pipeline trace to spec file. Update SESSION.md. Present summary to user."
      requires: [final-gate-result, review-report, qa-report]
      produces: [pipeline-trace, session-update]
      gate: true
    - id: extract-learnings
      role: learnings-extractor
      intent: "Extract compound learnings from this pipeline execution."
      requires: [pipeline-trace]
      produces: [updated-learnings]
      model-tier: routine
      blocking: false
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

### Progress Display

At the start of each phase, display a progress indicator to the user before any agent output:

```text
[1/6] Advisor (opus) — Evaluating feature...
[2/6] Product Owner (opus) — Defining spec...
[3/6] Tech Lead (opus) — Defining technical approach...
[4/6] Developer (sonnet) — Implementing...
[5/6] Code Reviewer (opus) — Reviewing changes...
[6/6] QA (sonnet) — Validating acceptance criteria...
```

Model names are resolved from the step's `model-tier` using the `max` profile: reasoning=opus, execution=sonnet, routine=haiku. System/gate steps do not show a model name.

When a phase loops (review-fix or QA-review cycles), show the iteration:

```text
[5/6 · round 2] Code Reviewer (opus) — Re-reviewing after fixes...
[4/6 · round 2] Developer (sonnet) — Fixing review blockers...
```

This indicator MUST be displayed before spawning the agent for that phase.

### Phase 1 — Evaluation (Advisor)

**Progress:** `[1/6] Advisor (opus) — Evaluating feature...`
**Agent:** Reads `.claude/agents/advisor.md` via Task tool with `model: "opus"`
**Input:** The feature description provided by the user
**Process:**

1. The Advisor evaluates the feature against the project vision
2. Identifies risks, dependencies, and conflicts with existing functionality
3. Issues evaluation: Approved / Rejected / Requires adjustments

**Output:** Evaluation with reasoning and identified risks
**Trace data:** Verdict (Approved/Rejected/Approved with conditions), risks identified, conditions if any
**Exit condition:** If the Advisor rejects the feature, the pipeline stops here. Inform the user of the reason and suggest adjustments if any.

### Phase 2 — Specification (Product Owner)

**Progress:** `[2/6] Product Owner (opus) — Defining spec...`
**Agent:** Reads `.claude/agents/product-owner.md` via Task tool with `model: "opus"`
**Input:** The feature approved by the Advisor + their observations
**Process:**

1. The Product Owner breaks the feature into concrete tasks
2. Defines verifiable acceptance criteria for each task
3. Estimates effort and suggests implementation order

**Output:** Task list with acceptance criteria, estimation, and order
**Trace data:** Tasks defined count, acceptance criteria count, estimated effort

### Phase 3 — Technical Approach (Tech Lead)

**Progress:** `[3/6] Tech Lead (opus) — Defining technical approach...`
**Agent:** Reads `.claude/agents/tech-lead.md` via Task tool with `model: "opus"`
**Input:** Product Owner tasks + acceptance criteria
**Process:**

1. The Tech Lead defines the implementation approach
2. Identifies files to modify, patterns to follow, interfaces
3. Anticipates technical risks and proposes mitigations

**Output:** Technical plan with files, patterns, interfaces, and risks
**Trace data:** Key patterns identified, files to modify, technical risks

### Phase 4 — Implementation (Developer)

**Progress:** `[4/6] Developer (sonnet) — Implementing...`
**Agent:** Reads `.claude/agents/developer.md` via Task tool with `model: "sonnet"`
**Input:** Tech Lead technical plan + PO acceptance criteria
**Process:**

1. The Developer implements following the technical plan
2. Writes unit tests as part of the implementation
3. Makes atomic commits with descriptive messages
4. Verifies that tests pass

**Output:** Implemented code + tests + commits made
**Trace data:** Files created/modified, tests added, commits made

### Pre-Review Gate (mandatory)

Before advancing to Phase 5, run automated verification:

1. Run the project test commands (e.g., `npm test`) — if it fails, the Developer must fix before advancing
2. Run the project lint commands (e.g., `npm run lint`) — if it fails, the Developer must fix before advancing
3. Only make a checkpoint commit **after** both pass

This gate CANNOT be skipped, even if the user requested phase skipping. The specific commands are in the "CLI commands" section of CLAUDE.md.

**Trace data:** Tests pass/fail, lint pass/fail

### Phase 5 — Review (Code Reviewer)

**Progress:** `[5/6] Code Reviewer (opus) — Reviewing changes...`
**Agent:** Reads `.claude/agents/code-reviewer.md` via Task tool with `model: "opus"`
**Input:** The implemented changes (git diff)
**Process:**

1. The Code Reviewer reviews quality, patterns, security, and tests
2. Classifies findings as Blocker, Warning, or Suggestion

**Output:** Review report with classified findings
**Trace data:** Blockers count, warnings count, suggestions count, review-fix loops
**Loop condition:** If there are Blocker findings, return to **Phase 4** for the Developer to fix them. Maximum 2 review-fix iterations.

### Phase 6 — QA (delegates to /qa-cycle)

**Progress:** `[6/6] QA (sonnet) — Validating acceptance criteria...`

Runs the `/qa-cycle` skill passing the PO acceptance criteria as context. The qa-cycle handles:

1. Running project tests and lint
2. Validating acceptance criteria
3. Testing edge cases and error scenarios
4. Bugfix cycle if issues arise (maximum 3 cycles)

**Trace data:** Acceptance criteria verified count, bugs found, QA cycles
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
- After Phase 4: `wip: [feature] phase 4 — implementation done` -- also write partial trace (phases 1-4) to spec and update status to `implementing`
- After Phase 5: `wip: [feature] phase 5 — review passed`
- After Phase 6: `wip: [feature] phase 6 — QA passed`

Also update SESSION.md at each phase transition:

```text
- [timestamp] | build-feature | Phase N ([phase-name]) complete for [feature]
```

## Pipeline Trace

After pipeline completion, append a `## Pipeline Trace` section to the feature's spec file in `docs/specs/`. This provides a structured record of what happened in each phase.

### Spec file discovery

1. Search `docs/specs/` for a file whose `spec-id` frontmatter matches the feature name (kebab-case)
2. If no matching spec exists, auto-create a minimal spec file at `docs/specs/[feature-name].md`

### Auto-created spec format

When no prior council spec exists, create a minimal spec:

````markdown
---
spec-id: [feature-name]
status: implementing
date: [YYYY-MM-DD]
council-type: none (pipeline-generated)
---

# Spec: [Feature Name]

## Context

Spec auto-generated by /build-feature pipeline. No prior council session.

## Pipeline Trace

[trace content appended here]
````

### Status field updates

- At Phase 4 checkpoint: set `status: implementing`
- At pipeline completion: set `status: implemented`

### Trace section format

Append this section to the spec file:

````markdown
## Pipeline Trace

pipeline-start: [YYYY-MM-DD]
pipeline-end: [YYYY-MM-DD]
phases-completed: [N]/6
review-fix-loops: [N]
qa-cycles: [N]
final-gate: pass | fail

### Phase 1 — Evaluation

- **Verdict**: [Approved/Rejected/Approved with conditions]
- **Risks identified**: [list or "None"]

### Phase 2 — Specification

- **Tasks defined**: [N]
- **Acceptance criteria**: [N]
- **Estimated effort**: [summary]

### Phase 3 — Technical Approach

- **Key patterns**: [list]
- **Files to modify**: [list]
- **Technical risks**: [list or "None"]

### Phase 4 — Implementation

- **Files created/modified**: [list]
- **Tests added**: [N]
- **Commits**: [list of commit summaries]

### Pre-Review Gate

- **Tests**: pass | fail
- **Lint**: pass | fail

### Phase 5 — Review

- **Blockers**: [N]
- **Warnings**: [N]
- **Suggestions**: [N]
- **Review-fix loops**: [N]

### Phase 6 — QA

- **Acceptance criteria verified**: [N]/[total]
- **Bugs found**: [N]
- **QA cycles**: [N]

### Final Gate

- **Tests**: pass | fail
- **Lint**: pass | fail
- **Result**: pass | fail
````

### When to write the trace

- **Phase 4 checkpoint:** Write a partial trace covering phases 1-4 to the spec file. Set status to `implementing`. Include the spec file in the checkpoint commit.
- **Pipeline completion:** Write the complete trace (all phases) to the spec file. Set status to `implemented`. Include the spec file in the final checkpoint commit.

## Final Gate (mandatory before Completion)

Before declaring the pipeline as complete, run final verification:

1. Run project tests — if it fails, return to Phase 6 (QA/Bugfix)
2. Run project lint — if it fails, return to Phase 4 (Developer)
3. Both must pass with exit code 0

This gate is the last safety net. It CANNOT be skipped under any circumstances.

**Trace data:** Tests pass/fail, lint pass/fail, result (pass/fail)

## Completion

Upon successfully completing all phases and the final gate:

1. Write the complete Pipeline Trace to the spec file (see "Pipeline Trace" section above). Update the spec status to `implemented`. Include the spec file in the final checkpoint commit.

2. Present pipeline summary:
   - Feature implemented
   - Files modified/created
   - Tests run and result
   - Review issues resolved
   - Final QA result

3. Update `SESSION.md` with:
   - Feature completed
   - Decisions made during the pipeline
   - Next steps if any

4. Close the GitHub Issue (if applicable):
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
  model: "opus"
  prompt: "Read .claude/agents/advisor.md and assume that role. Then: [task description]"
```

The `model` parameter is resolved from the step's `model-tier`: reasoning→`"opus"`, execution→`"sonnet"`, routine→`"haiku"`. System/gate steps run inline (no Task tool).

## Example Session

```text
User: /build-feature add dark mode toggle to settings page

[1/6] Advisor (opus) — Evaluating feature...
  Approved. Low risk, aligns with UX roadmap.

[2/6] Product Owner (opus) — Defining spec...
  3 tasks defined with acceptance criteria.

[3/6] Tech Lead (opus) — Defining technical approach...
  Use CSS variables + context provider pattern.

[4/6] Developer (sonnet) — Implementing...
  Implemented ThemeContext, toggle component, CSS vars.

[5/6] Code Reviewer (opus) — Reviewing changes...
  Passed. 1 suggestion (memoize context value).

[6/6] QA (sonnet) — Validating acceptance criteria...
  All 3 acceptance criteria verified. 0 bugs.

Feature complete. PR ready for merge.
```

## Notes

- If the user wants to skip phases (e.g., "already evaluated, implement directly"), allow skipping to Phase 4 but warn that validation is lost. Verification gates (pre-Review and final) are NEVER skipped
- The pipeline is sequential: each phase depends on the output of the previous one
- Review/QA loops have limits to prevent infinite cycles
- In v1.x, parallel pipeline execution (multiple build-features via worktrees) is best-effort and depends on the host environment supporting concurrent agents
