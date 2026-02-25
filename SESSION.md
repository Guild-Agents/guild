# SESSION.md

## Active session
- **Date:** 2026-02-25
- **Current task:** All specs + refinements implemented — 3 feature branches ready for PR
- **Branch:** `feature/spec-refinements` (based on `feature/compound-learning`)
- **Status:** All pipelines complete

## What happened this session

### Pipeline 1: v1.x Core Infrastructure (feature/v1x-core-infrastructure)
Completed all 6 phases. Implements dispatch protocol, declarative workflows, logging system.
- 250 tests, 0 lint errors
- Ready for PR to main

### Pipeline 2: Compound Learning Pattern (feature/compound-learning)
Completed all 6 phases. Implements learnings module, I/O layer, CLI reset command.
- 308 tests, 0 lint errors
- Based on v1x-core-infrastructure branch

### Pipeline 3: Spec Refinements (feature/spec-refinements)
Completed all 6 phases. Implements 3 post-implementation adjustments:
- T1: `extractDispatchConfigs()` — workflow > null precedence in dispatch.js
- T2: `guild doctor` dual-format warning (workflow + body step/phase headings)
- T3+T4: `generateExecutionSummary()` in trace.js (500 token budget) + wired into `finalizeTrace()`
- T5: `parallel` documented as v1.x best-effort in skill templates
- 336 tests, 0 lint errors
- Based on compound-learning branch

### Implementation summary

| Feature | Branch | Tests | Status |
|---------|--------|-------|--------|
| v1.x Core Infrastructure | feature/v1x-core-infrastructure | 250 | Complete |
| Compound Learning | feature/compound-learning | 308 | Complete |
| Spec Refinements | feature/spec-refinements | 336 | Complete |

### Files created/modified in spec-refinements pipeline
- `src/utils/dispatch.js` — added extractDispatchConfigs()
- `src/utils/trace.js` — added generateExecutionSummary(), EXECUTION_SUMMARY_BUDGET, updated finalizeTrace()
- `src/commands/doctor.js` — added dual-format warning check
- `src/templates/skills/council/SKILL.md` — parallel v1.x note
- `src/templates/skills/build-feature/SKILL.md` — parallel v1.x note
- `docs/specs/spec-refinements.md` — pipeline trace

## Key decisions

1. **Merge dispatch + workflows** — workflow frontmatter is canonical format
2. **Pure/IO split** — learnings.js (zero deps) + learnings-io.js (fs operations)
3. **File locking deferred to v2** — concurrent workflows not supported yet
4. **No config.yaml** — out of scope
5. **Token estimation heuristic** — words × 1.35, no external tokenizer
6. **Dispatch precedence** — workflow steps > null (no "dispatch blocks" format yet)
7. **Execution summary budget** — 500 tokens, compact digest for learnings-extractor
8. **Dual-format regex** — `Step N`/`Phase N` pattern, requires digit after keyword

## Pending items

### Branches need merging (stacked)
Three stacked branches:
1. `feature/v1x-core-infrastructure` → main (PR first)
2. `feature/compound-learning` → main (after v1x merges)
3. `feature/spec-refinements` → main (after compound-learning merges)

### `dev` branch does not exist yet
Snapshot workflow triggers on push to `dev`.

### OG image PNG not regenerated

## Technical context
- **Version**: 0.3.1
- **Tests**: 336 passing (17 files)
- **Agents**: 10 templates
- **Skills**: 11 templates (4 with declarative workflows)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Next steps
1. **Create PRs** — v1x-core-infrastructure first, then compound-learning, then spec-refinements
2. **Runtime orchestrator** — executes declarative workflows, wires learnings injection
3. **Remaining skill migrations** — 7 skills pending declarative format
4. **`guild logs` command** — view/clean traces
5. **Wire --verbose/--debug** — pass trace level to commands

**Resume with:** Create PRs with `/create-pr`, or continue with orchestrator.
