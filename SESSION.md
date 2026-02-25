# SESSION.md

## Active session
- **Date:** 2026-02-25
- **Current task:** v1.x Core Infrastructure — `/build-feature` pipeline complete
- **Branch:** `feature/v1x-core-infrastructure`
- **Status:** All 6 phases complete — ready for PR

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

| Phase | Status | Result |
|-------|--------|--------|
| 1. Advisor | Done | Approved with 5 conditions |
| 2. Product Owner | Done | 6 tasks, 87 acceptance criteria |
| 3. Tech Lead | Done | Full technical plan (import graph, function signatures, test strategy) |
| 4. Developer | Done | All 6 tasks implemented (T1-T6) |
| 5. Code Review | Done | 2 blockers fixed, 4 warnings fixed, 1 review-fix loop |
| 6. QA | Done | 42/42 criteria verified, 1 bug fixed, approved |

### Implementation summary (6 tasks)

| Task | Status | Details |
|------|--------|---------|
| T1: dispatch-protocol.js + dispatch.js | Done | Constants, validation, tier resolution. 46 tests |
| T2: yaml + workflow-parser.js + skill-loader.js | Done | YAML parser, skill loader. 50 tests |
| T3: trace.js | Done | 3-level logging, pure rendering. 31 tests |
| T4: Add default-tier to 10 agent templates | Done | All templates + .claude/agents/ updated |
| T5: Migrate 4 Skills to declarative format | Done | build-feature, council, review, qa-cycle |
| T6: doctor.js integration + CLI flags | Done | Workflow validation + --verbose/--debug |

### Files created this session
- `src/utils/dispatch-protocol.js` — Constants (tiers, strategies, profiles, fallback chain)
- `src/utils/dispatch.js` — validateStepConfig, resolveAgentMetadata, resolveEffectiveTier, resolveModel
- `src/utils/workflow-parser.js` — extractFrontmatterBlock, parseYamlFrontmatter, parseSkill, validateWorkflow, resolveExecutionPlan
- `src/utils/skill-loader.js` — loadSkill, loadAllSkills
- `src/utils/trace.js` — createTrace, recordStep, finalizeTrace, renderTrace, listTraces, cleanTraces
- `src/templates/agents/learnings-extractor.md` — New agent template (routine tier)
- `docs/specs/v1x-core-infrastructure.md` — Pipeline trace
- 6 test files (250 total tests)

### Files modified this session
- `bin/guild.js` — Added --verbose and --debug global options
- `src/commands/doctor.js` — Added workflow validation + agent reference checks
- 10 agent templates — Added `default-tier` frontmatter field
- 4 skill templates — Added declarative workflow YAML frontmatter
- `.gitignore` — Added `.claude/guild/traces/`
- `package.json` — Added `yaml` dependency

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
- trace.js is independent (no cross-module imports)
- skill-loader.js imports from workflow-parser
- doctor.js imports from dispatch + skill-loader

### 4. Code Review B1 fix: unified failure vocabulary
- Changed FAILURE_STRATEGIES from ['stop', 'continue', 'retry'] to ['abort', 'continue']
- Added goto:<step-id> support in dispatch.js validation
- workflow-parser.js imports from dispatch-protocol (single source of truth)

## Pending items

### `dev` branch does not exist yet
Snapshot workflow triggers on push to `dev`. Branch needs to be created when adopting the branching strategy.

### OG image PNG not regenerated
`docs/og-image.svg` was updated but `docs/og-image.png` was not regenerated.

## Technical context
- **Version**: 0.3.1 (published to npm)
- **Tests**: 250 passing (14 test files)
- **Agents**: 10 templates (all with default-tier)
- **Skills**: 11 templates (4 migrated to declarative workflows)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x
- **Branch**: feature/v1x-core-infrastructure (ahead of main)

## Next steps
1. **Create PR** — `/create-pr` for feature/v1x-core-infrastructure → main
2. **Remaining 7 skill migrations** — guild-specialize, new-feature, dev-flow, session-start, session-end, status, build-feature (if needed)
3. **Wire --verbose/--debug to commands** — Pass trace level through to command handlers
4. **`guild logs` command** — Future CLI command for viewing/cleaning traces
5. **Compound Learning spec** — Next P1 from roadmap

**Resume with:** Create PR with `/create-pr`, or continue with next roadmap item.
