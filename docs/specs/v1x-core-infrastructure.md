---
spec-id: v1x-core-infrastructure
status: implemented
date: 2026-02-25
council-type: feature-scope (advisor + product-owner + tech-lead)
---

# Spec: v1.x Core Infrastructure

## Context

Three foundational modules for Guild v1.x: Agent Dispatch Protocol, Declarative Workflows, and Structured Logging. Covers specs `spec-guild-dispatch.md`, `spec-declarative-workflows.md`, and `spec-logging-system.md`.

Advisor approved with 5 conditions: merge dispatch+workflows, trace.js as pure utilities, add `yaml` npm package, limit skill migration to 4, phased commits.

## Pipeline Trace

pipeline-start: 2026-02-25
pipeline-end: 2026-02-25
phases-completed: 6/6
review-fix-loops: 1
qa-cycles: 1
final-gate: pass

### Phase 1 — Evaluation

- **Verdict**: Approved with conditions
- **Risks identified**: Vocabulary divergence risk between dispatch and workflow modules (materialized and was fixed in review), scope creep from 3 separate specs
- **Conditions**: (1) Merge dispatch + workflows — workflow frontmatter is canonical format, (2) trace.js as pure utilities with no I/O in renderers, (3) Add `yaml` npm package, (4) Limit skill migration to 4 skills, (5) Phased commits after each module

### Phase 2 — Specification

- **Tasks defined**: 6
- **Acceptance criteria**: 87 (across 3 specs: D1-D19, W1-W23, L1-L17 + subtotals)
- **Estimated effort**: Large (3 new modules, 1 new agent template, 4 skill migrations, CLI additions)

### Phase 3 — Technical Approach

- **Key patterns**: Single import graph (dispatch-protocol.js as leaf), ESModules throughout, pure functions for rendering, YAML frontmatter parsing with `yaml` npm package
- **Files to modify**: 31 files (14 new, 17 modified)
- **Technical risks**: Nested YAML parsing complexity, frontmatter pattern conflicts in agent templates with code examples

### Phase 4 — Implementation

- **Files created**: `dispatch-protocol.js`, `dispatch.js`, `workflow-parser.js`, `skill-loader.js`, `trace.js`, `learnings-extractor.md`, + 6 test files
- **Files modified**: `doctor.js`, `guild.js`, `files.test.js`, 10 agent templates, 4 skill templates, `package.json`
- **Tests added**: 55 new tests (dispatch-protocol: 16, dispatch: 30, trace: 31, workflow-parser: 39, skill-loader: 11, files: +3)
- **Commits**: T1+T3 dispatch+trace, T2+T4+T5+T6 workflows+agents+skills+doctor

### Pre-Review Gate

- **Tests**: pass (248)
- **Lint**: pass (0 errors)

### Phase 5 — Review

- **Blockers**: 2 (B1: failure strategy vocabulary divergence, B2: missing learnings-extractor template)
- **Warnings**: 4 (W1: join(path,'..') vs dirname(), W2: --verbose/--debug not wired, W3: redundant variable, W4: fixtures in source tree)
- **Suggestions**: 5
- **Review-fix loops**: 1

### Phase 6 — QA

- **Acceptance criteria verified**: 42/42 (35 PASS, 3 DEFERRED by design, 2 PARTIAL by design, 1 FAIL fixed, 1 optional)
- **Bugs found**: 1 (L13: .gitignore for traces directory — fixed)
- **QA cycles**: 1

### Final Gate

- **Tests**: pass (250)
- **Lint**: pass (0 errors)
- **Result**: pass
