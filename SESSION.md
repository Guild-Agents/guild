# SESSION.md

## Active session
- **Date:** 2026-03-06
- **Current task:** none — backlog items 4 and 5 completed
- **Branch:** `develop`
- **Active agent:** none
- **Status:** 518 tests pass, 0 lint errors, CI green

## What happened this session

### guild-re-specialize (PR #49)
- **5 tasks completed** (TDD, subagent-driven):
  1. Zone parser (`src/utils/zones.js`) — wrapZone, extractZones, replaceZone — 8 tests
  2. Generators emit zone markers on 4 auto-generated sections
  3. guild-specialize skill updated with zone marker guidance
  4. New `/re-specialize` skill template created
  5. CLAUDE.md and SESSION.md updated
- **Review:** 0 blockers, 2 warnings (CRLF edge case, hardcoded regex), approved
- **Merged:** PR #49, CI green

### Guild Workspaces MVP v1.2.0 (PR #50)
- **7 tasks completed** (TDD, subagent-driven):
  1. Workspace resolver — findWorkspaceRoot, loadWorkspace, resolveWorkspaceAgents — 9 tests
  2. Workspace context generator — generateWorkspaceContext — 3 tests
  3. CLI command functions — createWorkspaceFile, addWorkspaceMember, getWorkspaceStatus — 7 tests
  4. CLI wiring — `guild workspace init/add/status` subcommands
  5. Workspace-aware `guild init` — detects workspace membership
  6. CLAUDE.md generator accepts workspace context injection — 2 tests
  7. Docs updated
- **Review:** 1 blocker fixed (B1: init.js didn't pass workspace to generateClaudeMd), 4 warnings (W1 constant dedup fixed, W4 dual context gen fixed)
- **Merged:** PR #50, CI green

### Workspace design decisions
- **Parent directory pattern**: `guild-workspace.json` in parent dir, `.guild/` for shared config
- **Merge + local-wins**: shared agents/skills inherited, local overrides on name conflict
- **Cross-repo context**: agents see other members' stack via CLAUDE.md injection
- **Phased delivery**: v1.2.0 = context + read, v1.2.1 = cross-repo execution

## Key decisions

1. **Superpowers = complement, not replacement** — Guild covers orchestration, Superpowers covers individual discipline
2. **Import 3 skills from Superpowers** — TDD, systematic-debugging, verification-before-completion
3. **Workspaces → v1.2** — execution first (v1.1), workspaces MVP second (v1.2)
4. **Provider-agnostic vision** — Guild targets any AI runtime; Claude Code CLI is just the first provider
5. **CLI subprocess dispatch** — `claude -p` for agent steps, no API key needed
6. **Full auto with abort** — designed for unattended/CI execution
7. **Sequential only v1.1** — parallel groups deferred to v1.2
8. **Simple function provider** — `(step, dispatch, context) → { status, output, tokens }`
9. **--dry-run flag** — preserves v1.0 plan-only behavior as opt-in mode
10. **Keep develop branch** — user prefers develop→main flow over trunk-based
11. **Backlog priority (Council, Option B)** — re-specialize before Workspaces, Watchdog P3, Skill Eval Component 1 only
12. **Workspace parent dir pattern** — `guild-workspace.json` + `.guild/` in parent directory, merge + local-wins resolution
13. **Workspace v1.2.0 vs v1.2.1** — context + read first, cross-repo execution second

## Technical context
- **Version**: 1.1.0
- **Tests**: 518 passing (26 files)
- **Agents**: 10 templates
- **Skills**: 15 templates (12 workflow + 3 discipline)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Next steps
1. ~~Create PR~~ ✅
2. ~~Bump & publish v1.1.0~~ ✅
3. ~~Import Superpowers skills~~ ✅
4. ~~guild-re-specialize~~ ✅ PR #49
5. ~~Workspaces MVP v1.2.0~~ ✅ PR #50
6. **Skill Evaluation System (P3)** — Component 1 only: trigger test suite after skill execution. Needs brainstorming/design first.
7. **Guild Watchdog (P3)** — separate project, defer until v1.2 stable.
8. **Bump & publish v1.2.0** — merge develop → main, tag, publish.
9. **Workspaces v1.2.1** — cross-repo execution (run tests/skills in sibling repos). Design at `docs/plans/2026-03-05-guild-workspaces-design.md`.
