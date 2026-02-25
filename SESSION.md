# SESSION.md

## Active session
- **Date:** 2026-02-25
- **Current task:** None — all features merged and snapshot published
- **Branch:** `develop` (up to date with origin)
- **Status:** Clean working tree

## What happened this session

### Pipeline 1: v1.x Core Infrastructure (feature/v1x-core-infrastructure)
Completed all 6 phases. Implements dispatch protocol, declarative workflows, logging system.
- 250 tests at branch level

### Pipeline 2: Compound Learning Pattern (feature/compound-learning)
Completed all 6 phases. Implements learnings module, I/O layer, CLI reset command.
- 308 tests at branch level

### Pipeline 3: Spec Refinements (feature/spec-refinements)
Completed all 6 phases. Implements 3 post-implementation adjustments:
- T1: `extractDispatchConfigs()` — workflow > null precedence in dispatch.js
- T2: `guild doctor` dual-format warning (workflow + body step/phase headings)
- T3+T4: `generateExecutionSummary()` in trace.js (500 token budget) + wired into `finalizeTrace()`
- T5: `parallel` documented as v1.x best-effort in skill templates
- 336 tests at branch level

### Merge and publish
- All 3 feature branches merged into `develop`
- CI fix: `resolveAgentMetadata` tests now use temp dirs (were reading .claude/agents/ which is gitignored)
- `dev` branch pushed — triggered snapshot CI
- **Published:** `guild-agents@0.3.1-snapshot.20260225.1`

### Implementation summary

| Feature | Branch | Tests | Status |
|---------|--------|-------|--------|
| v1.x Core Infrastructure | feature/v1x-core-infrastructure | 250 | Merged to develop |
| Compound Learning | feature/compound-learning | 308 | Merged to develop |
| Spec Refinements | feature/spec-refinements | 336 | Merged to develop |

### Key files created across all pipelines
- `src/utils/dispatch-protocol.js` — Constants (tiers, strategies, profiles)
- `src/utils/dispatch.js` — Validation, resolution, extractDispatchConfigs
- `src/utils/workflow-parser.js` — YAML workflow parser
- `src/utils/skill-loader.js` — Skill loading from disk
- `src/utils/trace.js` — Structured trace/logging + generateExecutionSummary
- `src/utils/learnings.js` — Pure functions for compound learning
- `src/utils/learnings-io.js` — I/O layer for learnings
- `src/commands/reset-learnings.js` — CLI command
- `src/commands/doctor.js` — Enhanced with workflow validation + dual-format warning
- `src/templates/agents/learnings-extractor.md` — New agent
- 10 test files (336 tests total)

## Key decisions

1. **Merge dispatch + workflows** — workflow frontmatter is canonical format
2. **Pure/IO split** — learnings.js (zero deps) + learnings-io.js (fs operations)
3. **File locking deferred to v2** — concurrent workflows not supported yet
4. **Token estimation heuristic** — words x 1.35, no external tokenizer
5. **Dispatch precedence** — workflow steps > null (no "dispatch blocks" format yet)
6. **Execution summary budget** — 500 tokens, compact digest for learnings-extractor
7. **Dual-format regex** — `Step N`/`Phase N` pattern, requires digit after keyword
8. **CI fix** — resolveAgentMetadata tests use temp dirs instead of .claude/agents/

## Problems encountered and resolved

1. **CI test failure** — `resolveAgentMetadata` tests read from `.claude/agents/` which is gitignored. Fixed by creating temp agent files in tests.
2. **Regex false positives** — Original dual-format regex `.*step` matched unrelated headings. Tightened to `Step\s+\d` pattern.
3. **Token budget test** — 25 short steps fit within 500 tokens; needed longer intents to trigger truncation path.

## Technical context
- **Version**: 0.3.1 (stable) / 0.3.1-snapshot.20260225.1 (snapshot)
- **Tests**: 336 passing (17 files)
- **Agents**: 10 templates
- **Skills**: 11 templates (4 with declarative workflows)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Pending items

### Feature branches still exist locally
The 3 feature branches can be cleaned up: `feature/v1x-core-infrastructure`, `feature/compound-learning`, `feature/spec-refinements`.

### PRs to main not yet created
All work is on `develop` but no PR to `main` has been created yet.

### OG image PNG not regenerated

## Next steps
1. **Create PR** — `develop` to `main` to promote all v1.x core features
2. **Runtime orchestrator** — executes declarative workflows, wires learnings injection
3. **Remaining skill migrations** — 7 skills pending declarative format
4. **`guild logs` command** — view/clean traces
5. **Wire --verbose/--debug** — pass trace level to commands

**Resume with:** `/session-start` then create PR from develop to main, or continue with orchestrator.
