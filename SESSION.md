# SESSION.md

## Active session
- **Date:** 2026-02-25
- **Current task:** All specs implemented — 2 feature branches ready for PR
- **Branch:** `feature/compound-learning` (based on `feature/v1x-core-infrastructure`)
- **Status:** Both pipelines complete

## What happened this session

### Pipeline 1: v1.x Core Infrastructure (feature/v1x-core-infrastructure)
Completed all 6 phases. Implements dispatch protocol, declarative workflows, logging system.
- 250 tests, 0 lint errors
- Ready for PR to main

### Pipeline 2: Compound Learning Pattern (feature/compound-learning)
Completed all 6 phases. Implements learnings module, I/O layer, CLI reset command.
- 308 tests, 0 lint errors
- Based on v1x-core-infrastructure branch

### Implementation summary

| Feature | Branch | Tests | Status |
|---------|--------|-------|--------|
| v1.x Core Infrastructure | feature/v1x-core-infrastructure | 250 | Complete |
| Compound Learning | feature/compound-learning | 308 | Complete |

### Files created across both pipelines
- `src/utils/dispatch-protocol.js` — Constants (tiers, strategies, profiles)
- `src/utils/dispatch.js` — Validation, resolution utilities
- `src/utils/workflow-parser.js` — YAML workflow parser
- `src/utils/skill-loader.js` — Skill loading from disk
- `src/utils/trace.js` — Structured trace/logging
- `src/utils/learnings.js` — Pure functions for compound learning
- `src/utils/learnings-io.js` — I/O layer for learnings
- `src/commands/reset-learnings.js` — CLI command
- `src/templates/agents/learnings-extractor.md` — New agent
- 9 test files

## Key decisions

1. **Merge dispatch + workflows** — workflow frontmatter is canonical format
2. **Pure/IO split** — learnings.js (zero deps) + learnings-io.js (fs operations)
3. **File locking deferred to v2** — concurrent workflows not supported yet
4. **No config.yaml** — out of scope
5. **Token estimation heuristic** — words × 1.35, no external tokenizer

## Pending items

### Branches need merging
Two stacked branches:
1. `feature/v1x-core-infrastructure` → main (PR first)
2. `feature/compound-learning` → main (after v1x merges, or rebase)

### `dev` branch does not exist yet
Snapshot workflow triggers on push to `dev`.

### OG image PNG not regenerated

## Technical context
- **Version**: 0.3.1
- **Tests**: 308 passing (17 files)
- **Agents**: 10 templates
- **Skills**: 11 templates (4 with declarative workflows)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Next steps
1. **Create PRs** — v1x-core-infrastructure first, then compound-learning
2. **Runtime orchestrator** — executes declarative workflows, wires learnings injection
3. **Remaining skill migrations** — 7 skills pending declarative format
4. **`guild logs` command** — view/clean traces
5. **Wire --verbose/--debug** — pass trace level to commands

**Resume with:** Create PRs with `/create-pr`, or continue with orchestrator.
