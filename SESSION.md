# SESSION.md

## Active session
- **Date:** 2026-02-25
- **Current task:** v1.x Core Infrastructure — `/build-feature` Phase 4 (Developer)
- **Active agent:** Developer
- **Branch:** `feature/v1x-core-infrastructure`
- **Status:** Implementation in progress — T1+T3 done, T4 next

## What happened this session

### Roadmap review
- Read `guild-roadmap.docx` (3 horizons: v1.x, v2-exp, v3+)
- `/council` Feature-Scope: Advisor + Product Owner + Tech Lead — all 3 approved
- Council observations recorded (no roadmap modifications)

### Spec generation
- Generated 3 technical specs via parallel council agents (2,592 lines total):
  - `docs/specs/spec-guild-dispatch.md` (706 lines)
  - `docs/specs/spec-declarative-workflows.md` (934 lines)
  - `docs/specs/spec-logging-system.md` (952 lines)

### `/build-feature` pipeline — v1.x Core Infrastructure
Currently in Phase 4 (Developer). Pipeline progress:

| Phase | Status | Result |
|-------|--------|--------|
| 1. Advisor | Done | Approved with 5 conditions |
| 2. Product Owner | Done | 6 tasks, 87 acceptance criteria |
| 3. Tech Lead | Done | Full technical plan (import graph, function signatures, test strategy) |
| 4. Developer | **In progress** | T1+T3 done, T4 next |
| 5. Code Review | Pending | — |
| 6. QA | Pending | — |

### Implementation progress (6 tasks)

| Task | Status | Details |
|------|--------|---------|
| T1: dispatch-protocol.js + dispatch.js | **Done** | Constants, validation, tier resolution. 28 tests |
| T2: yaml + workflow-parser.js + skill-loader.js | Pending | Blocked by T1 (now unblocked) |
| T3: trace.js | **Done** | 3-level logging, pure rendering. 29 tests |
| T4: Add default-tier to 8 agent templates | **Next** | Was starting when session paused |
| T5: Migrate 4 Skills to declarative format | Pending | Depends on T1, T2, T4 |
| T6: doctor.js integration + CLI flags | Pending | Depends on all above |

### Files created this session
- `src/utils/dispatch-protocol.js` — Constants (tiers, strategies, profiles, fallback chain)
- `src/utils/dispatch.js` — validateStepConfig, resolveAgentMetadata, resolveEffectiveTier, resolveModel
- `src/utils/trace.js` — createTrace, recordStep, finalizeTrace, renderTrace, listTraces, cleanTraces
- `src/utils/__tests__/dispatch-protocol.test.js` — 15 tests
- `src/utils/__tests__/dispatch.test.js` — 13 tests (+ integration with real agent files)
- `src/utils/__tests__/trace.test.js` — 29 tests
- `docs/specs/spec-guild-dispatch.md` — 706 lines
- `docs/specs/spec-declarative-workflows.md` — 934 lines
- `docs/specs/spec-logging-system.md` — 952 lines

## Key decisions made this session

### 1. New roadmap established (guild-roadmap.docx)
- Three horizons: v1.x (shippable), v2-experimental (Agent Teams research), v3+ (Guild-sobre-Guild vision)
- Tesis: Agent Teams es Kubernetes, Guild es Heroku

### 2. Advisor conditions for implementation
- **Merge dispatch + workflows** — workflow frontmatter is canonical format; no separate guild-dispatch fenced blocks in SKILL bodies
- **trace.js as pure utilities** — rendering functions have no I/O; orchestrator writes trace data via Skill prose
- **Add `yaml` npm package** — for parsing nested YAML frontmatter in workflow definitions
- **Limit Skill migration to 4** — build-feature, council, review, qa-cycle
- **Phased implementation** — working commits after each module

### 3. Tech Lead: single import graph
- dispatch-protocol.js is the leaf (zero deps)
- dispatch.js and workflow-parser.js both import from dispatch-protocol
- trace.js imports from dispatch-protocol for types
- skill-loader.js imports from workflow-parser
- doctor.js imports from dispatch + skill-loader

## Pending items

### `dev` branch does not exist yet
Snapshot workflow triggers on push to `dev`. Branch needs to be created when adopting the branching strategy.

### OG image PNG not regenerated
`docs/og-image.svg` was updated but `docs/og-image.png` was not regenerated.

## Technical context
- **Version**: 0.3.1 (published to npm)
- **Tests**: 195 passing (12 test files)
- **Agents**: 9 templates (default-tier pending addition)
- **Skills**: 11 templates (4 pending migration to declarative format)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x
- **Branch**: feature/v1x-core-infrastructure (2 commits ahead of main)

## Next steps
1. **Resume T4** — Add `default-tier` to 8 agent templates (trivial, ~10 min)
2. **Implement T2** — Install `yaml`, create `workflow-parser.js` + `skill-loader.js` (largest task)
3. **Implement T5** — Migrate 4 Skills to declarative workflow frontmatter
4. **Implement T6** — doctor.js dispatch checks + `--verbose`/`--debug` CLI flags
5. Continue `/build-feature` pipeline: Phase 5 (Code Review) → Phase 6 (QA)

**Resume with:** Continue `/build-feature` from T4. All context is in this file and the task list.
