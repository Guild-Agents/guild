---
spec-id: spec-refinements
status: implementing
date: 2026-02-25
council-type: none (pipeline-generated)
---

# Spec: Post-Implementation Spec Refinements

## Context

Implements 3 adjustments from `guild-specs-post-implementation-feedback.md`:
1. Dispatch/Workflow precedence resolution with `extractDispatchConfigs()`
2. `executionSummary` bridge between trace and learnings-extractor
3. Document `parallel` as v1.x best-effort hint

## Pipeline Trace

pipeline-start: 2026-02-25
phases-completed: 4/6
review-fix-loops: 0
qa-cycles: 0
final-gate: pending

### Phase 1 — Evaluation

- **Verdict**: Approved with conditions
- **Risks identified**: Low — dispatch block format ambiguity, trace→learnings import direction
- **Conditions**: extractDispatchConfigs in dispatch.js, doctor check as separate block, generateExecutionSummary as pure function

### Phase 2 — Specification

- **Tasks defined**: 5
- **Acceptance criteria**: 38
- **Estimated effort**: 3S + 1M

### Phase 3 — Technical Approach

- **Key patterns**: Pure/IO split, workflow-parser import direction, leaf module dependency
- **Files to modify**: dispatch.js, trace.js, doctor.js, dispatch.test.js, trace.test.js, doctor.test.js, 2 SKILL.md templates
- **Technical risks**: None significant

### Phase 4 — Implementation

- **Files modified**: dispatch.js, trace.js, doctor.js, dispatch.test.js, trace.test.js, doctor.test.js, council/SKILL.md, build-feature/SKILL.md
- **Tests added**: 27 (9 extractDispatchConfigs + 8 generateExecutionSummary + 2 finalizeTrace + 8 dual-format heuristic)
- **Commits**: wip: spec-refinements phase 4 — implementation done (T1-T5)

### Pre-Review Gate

- **Tests**: pass (335)
- **Lint**: pass (0 errors)
