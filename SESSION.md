# SESSION.md

## Active session
- **Date:** 2026-05-25
- **Current task:** none
- **Branch:** `main` (clean)
- **Active agent:** none
- **Status:** Idle — last release shipped (v1.4.0), no work in progress

## Previous session recap (2026-03-31 → release)
- PR #66 (eval enhancements) merged into develop, then into main
- Version bumped to 1.4.0 (`913bff4`)
- `package-lock.json` regenerated for CI compatibility (`80f384e`)
- Shipped: semantic matcher (Haiku-based), benchmark aggregation (FIFO 30-entry,
  regression detection), description analyzer, `guild eval --semantic/--suggest` flags

## Technical context
- **Version**: 1.4.0
- **Tests**: 626 passing (36 files) as of last session
- **Evals**: 56 structural + 120 trigger = 176 total
- **Agents**: 7 templates
- **Skills**: 15 templates (12 workflow + 3 discipline)
- **Node**: v24.12.0 local, CI matrix 22.x/24.x
- **Vulnerabilities**: 0

## Backlog (next candidates)
1. **MCP server** — expose Guild capabilities via MCP
2. **Agent Teams v2** — multi-agent coordination improvements
3. **Multi-Runtime v3** — broader runtime support

## Notes
- `PROJECT.md` referenced by `/session-start` skill is not present in repo root —
  may need creation or skill update if it's expected to exist
