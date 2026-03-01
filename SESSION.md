# SESSION.md

## Active session
- **Date:** 2026-03-01
- **Current task:** runtime-orchestrator — pipeline complete, ready to merge
- **Branch:** `feature/runtime-orchestrator` (ready to merge to develop)
- **Active agent:** none
- **Status:** 453 tests pass, 0 lint errors, clean working tree

## What happened this session

### PR #46 merged to main
- Promoted all v0.3.x features (20 commits) from develop to main
- Fixed minimatch ReDoS vulnerability (npm audit fix)
- CI green on Node 20.x/22.x matrix

### Council: Workspaces multi-repo
- **Decision:** Opcion A — Diferir y documentar. No implementar hasta v1.0 estable.

### Pipeline 6: Runtime Orchestrator (feature/runtime-orchestrator)
Completed all 6 phases. The orchestrator module executes declarative skill workflows at runtime — state machine, condition evaluation, retry/failure handling, dispatch resolution, delegation expansion, and execution tracing.
- **Files created**: 4 (`orchestrator.js`, `orchestrator-io.js`, + 2 test files)
- **Lines added**: ~2,300
- **Tests**: 109 new (81 pure + 28 I/O), 453 total
- **Review**: 2 blockers fixed (currentGroupIndex advancement, jumpToStepId clearing), 8 warnings fixed
- **QA**: 43/43 acceptance criteria verified, 2 minor gaps fixed

## Key decisions

1. **Workspaces deferred** — multi-repo workspaces diferido hasta post-v1.0
2. **Orchestrator = plan-only in v1** — produces structured execution plan, does not invoke agents autonomously
3. **Pure/IO split** — orchestrator.js (zero I/O) + orchestrator-io.js (file system, dispatch, tracing)
4. **Plain objects for stepStates** — not Map, for JSON serializability
5. **getNextSteps returns { steps, skipped }** — enables caller to mark condition-skipped steps
6. **Circuit breaker = terminal state** — returns plan with status 'circuit-breaker', does not throw
7. **Delegation depth cap = 2** — prevents infinite sub-workflow chains
8. **Keep develop branch** — user prefers develop→main flow over trunk-based

## Technical context
- **Version**: 0.3.1 (stable) / 0.3.1-snapshot.20260226.1 (snapshot)
- **Tests**: 453 passing (19 files)
- **Agents**: 10 templates
- **Skills**: 11 templates
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Pending items

### Feature branch ready to merge
`feature/runtime-orchestrator` — ready to merge to develop

### OG image PNG not regenerated

## Next steps
1. **Merge orchestrator branch** — merge `feature/runtime-orchestrator` to `develop`
2. **`guild run` CLI command** — thin wrapper over orchestrate() for CLI invocation
3. **guild-specialize model visibility** — add model names to guild-specialize skill
4. **`guild logs` command** — view/clean traces
5. **Workspaces design doc** — documentar la vision multi-repo
6. **Create PR** — develop to main after next batch of features
