---
spec-id: compound-learning
status: implemented
date: 2026-02-25
council-type: feature-scope (advisor approved with conditions)
---

# Spec: Compound Learning Pattern

## Context

Foundational layer for the compound learning system (spec-compound-learning.md, P0). Provides pure functions for parsing/rendering learnings, I/O operations, context injection, token estimation, and the `guild reset-learnings` CLI command.

Runtime orchestrator integration (auto-creation, injection into agent contexts, fire-and-forget extraction) is deferred to the orchestrator implementation phase.

## Pipeline Trace

pipeline-start: 2026-02-25
pipeline-end: 2026-02-25
phases-completed: 6/6
review-fix-loops: 0
qa-cycles: 1
final-gate: pass

### Phase 1 — Evaluation

- **Verdict**: Approved with conditions
- **Risks identified**: Branch dependency on v1x-core-infrastructure, token budget enforcement relies on LLM, file locking unspecified
- **Conditions**: (1) Programmatic token estimation, (2) Defer file locking to v2, (3) No config.yaml, (4) Pure functions for context injection, (5) Commander.js pattern for reset-learnings with --force

### Phase 2 — Specification

- **Tasks defined**: 8
- **Acceptance criteria**: 42
- **Estimated effort**: Medium (6 small + 2 medium tasks)

### Phase 3 — Technical Approach

- **Key patterns**: Pure/IO split (learnings.js + learnings-io.js), leaf module with zero deps, word-count token heuristic, Commander.js lazy import
- **Files to modify**: bin/guild.js (1 modified), 6 new files
- **Technical risks**: Non-deterministic Date in renderEmptyLearnings (W1, documented)

### Phase 4 — Implementation

- **Files created**: learnings.js, learnings-io.js, reset-learnings.js, + 3 test files
- **Files modified**: bin/guild.js
- **Tests added**: 58 (learnings: 39, learnings-io: 13, reset-learnings: 6)
- **Commits**: phase 4 implementation done

### Pre-Review Gate

- **Tests**: pass (307)
- **Lint**: pass (0 errors)

### Phase 5 — Review

- **Blockers**: 0
- **Warnings**: 3 (W1: Date impurity, W2: loose entry regex, W3: relative path default)
- **Suggestions**: 6
- **Review-fix loops**: 0

### Phase 6 — QA

- **Acceptance criteria verified**: 10/10 (4 PASS, 4 PARTIAL, 2 DEFERRED)
- **Bugs found**: 0
- **QA cycles**: 1

### Final Gate

- **Tests**: pass (308)
- **Lint**: pass (0 errors)
- **Result**: pass
