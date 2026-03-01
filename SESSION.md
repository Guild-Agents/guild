# SESSION.md

## Active session
- **Date:** 2026-03-01
- **Current task:** v1.0.0 release — PR #47 ready for merge
- **Branch:** `develop` (PR #47 → main)
- **Active agent:** none
- **Status:** 467 tests pass, 0 lint errors, CI green

## What happened this session

### PR #46 merged to main
- Promoted all v0.3.x features (20 commits) from develop to main
- Fixed minimatch ReDoS vulnerability (npm audit fix)
- CI green on Node 20.x/22.x matrix

### Council: Workspaces multi-repo
- **Decision:** Opcion A — Diferir y documentar. No implementar hasta v1.0 estable.

### Council: Roadmap v1.0
- **Tipo:** feature-scope (Advisor + Product Owner + Tech Lead)
- **Consenso:** `guild run` es el unico blocker, plan-only mode, guild-specialize + guild logs completan el release
- **Decision:** Opcion B — v1.0 con observabilidad: guild run + guild logs + model visibility + cleanup + README/CHANGELOG + bump

### Pipeline 6: Runtime Orchestrator (feature/runtime-orchestrator)
Completed all 6 phases. The orchestrator module executes declarative skill workflows at runtime — state machine, condition evaluation, retry/failure handling, dispatch resolution, delegation expansion, and execution tracing.
- **Files created**: 4 (`orchestrator.js`, `orchestrator-io.js`, + 2 test files)
- **Lines added**: ~2,300
- **Tests**: 109 new (81 pure + 28 I/O), 453 total
- **Review**: 2 blockers fixed (currentGroupIndex advancement, jumpToStepId clearing), 8 warnings fixed
- **QA**: 43/43 acceptance criteria verified, 2 minor gaps fixed

### Pipeline 7: guild run (build-feature)
- CLI command `guild run <skill>` — plan-only viewer over orchestrate()
- 9 tests, 462 total after merge

### Pipeline 8: guild logs (build-feature, compressed)
- CLI commands `guild logs` and `guild logs clean`
- 5 tests, 467 total after merge

### guild-specialize model visibility (XS)
- Added model names (opus/sonnet) to guild-specialize skill template

### v1.0 Cleanup
- Removed self-dependency from package.json
- README: 10 agents, added guild run + guild logs + learnings-extractor
- CHANGELOG: full [1.0.0] section

### Version bump to 1.0.0
- `npm version 1.0.0`, package-lock regenerated
- PR #47 created (develop → main)
- CI green on all pushes

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
- **Version**: 1.0.0
- **Tests**: 467 passing (21 files)
- **Agents**: 10 templates
- **Skills**: 11 templates
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Next steps
1. **Merge PR #47** — develop to main, tag v1.0.0
2. **npm publish** — `npm publish --tag latest`
3. **Workspaces design doc** — documentar la vision multi-repo para post-v1.0
