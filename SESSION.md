# SESSION.md

## Active session
- **Date:** 2026-03-31
- **Current task:** none
- **Branch:** `develop` (synced with main)
- **Active agent:** none
- **Status:** v1.4.0 released, repo cleaned up

## What happened this session

### Release v1.4.0
- Merged PR #66 (eval enhancements) into develop
- Merged develop → main
- Bumped version to 1.4.0
- Fixed package-lock.json CI desync (Node 24 local vs 22 in CI)
- Published to npm via release workflow — all green
- GitHub Release created automatically

### Branch cleanup
- **Deleted local:** `dev` (stale, no remote tracking)
- **Deleted remote (7 merged):** `dev`, `feature/eval-enhancements`, `feature/guild-re-specialize`, `feature/guild-run-executor`, `feature/guild-stats`, `feature/guild-watchdog`, `feature/guild-workspaces`
- **Deleted remote (1 orphaned):** `feature/skill-eval` (was PR #53, already merged)
- **Remaining:** `main` and `develop` only

### Synced main ↔ develop
- Both branches at same commit after release

## Key decisions
- v1.4.0 (minor bump) for eval enhancements feature set
- Force-retagged v1.4.0 after lockfile fix (first release attempt failed on `npm ci`)

## Technical context
- **Version**: 1.4.0
- **Tests**: 626 passing (36 files)
- **Evals**: 56 structural assertions + 120 trigger tests = 176 total
- **Agents**: 10 templates
- **Skills**: 15 templates (12 workflow + 3 discipline), all deployed
- **Node**: v24.12.0 local, CI matrix 22.x/24.x
- **Vulnerabilities**: 0

## Next steps
1. **Backlog**: MCP server, Agent Teams v2, Multi-Runtime v3
2. Review roadmap priorities for next feature cycle
