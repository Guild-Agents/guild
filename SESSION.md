# SESSION.md

## Active session
- **Date:** 2026-02-25
- **Current task:** Roadmap review
- **Active agent:** Council (Feature-Scope)
- **Status:** New roadmap reviewed by council, no modifications

## What happened this session

### Housekeeping
- Deleted 10 stale spec files from `docs/specs/`
- Cleaned up 16 stale branches (worktree, feature, fix, claude)
- Removed 2 orphaned worktrees
- Git state: clean, only `main`

### Pre-release & Snapshot Publishing (PR #45, merged)
Full `/build-feature` pipeline — 6 phases completed:

| Phase | Result |
|-------|--------|
| 1. Advisor | Approved (user override) |
| 2. Product Owner | 7 stories, 38 acceptance criteria |
| 3. Tech Lead | ESModule architecture, centralized version.js |
| 4. Developer | 11 files, 19 new tests (123 total) |
| 5. Code Review | 3 blockers fixed (ESM require, promote-beta, channel detection) |
| 6. QA | 12/12 acceptance criteria pass, 0 bugs |

**Delivered:**
- `src/utils/version.js` — version parsing and computation
- `scripts/version-{snapshot,beta,stable}.js` — ESModule wrappers
- 7 npm scripts in package.json (version:*, publish:*, promote-beta)
- CLI pre-release indicator (yellow beta, red snapshot, stderr)
- `.github/workflows/snapshot.yml` — auto on push to `dev`
- `.github/workflows/beta.yml` — manual with description
- `.github/workflows/release.yml` — added workflow_dispatch with bump type
- `.github/workflows/ci.yml` — added `dev` branch

## Key decisions made this session

### 1. New roadmap established (guild-roadmap.docx)
- Three horizons: v1.x (shippable), v2-experimental (Agent Teams research), v3+ (Guild-sobre-Guild vision)
- Tesis: Agent Teams es Kubernetes, Guild es Heroku
- v1.x backlog: Compound Learning (P0), Model Routing (P0), Workflows Declarativos (P1), Logs (P1), dispatch (P1), Perfiles (P2)
- Council reviewed unanimously — approved with observations (no modifications requested)

### 2. Council observations (recorded, not acted upon)
- **Consensus:** Workflows Declarativos should be P0; Model Routing should drop to P1
- **Consensus:** Compound Learning needs token cap and user-facing UX for managing learnings
- **Risk flagged:** Agent Teams dependency (experimental), Anthropic absorption risk
- **Tech Lead:** Merge dispatch with Workflows Declarativos as single item
- **Advisor:** Recognize v0.3→v1.x as a rewrite, not an iteration; add Plan B

### 3. Previous: Backlog reset confirmed
- Previous v0.4–v1.0 roadmap replaced by guild-roadmap.docx

### 2. Pre-release spec implemented as-is
- Advisor concerns overridden by user directive
- ESM/package-name issues fixed during implementation

### 3. Backward-compatible release workflow
- Kept `v*` tag trigger alongside new `workflow_dispatch`
- Both paths coexist safely

## Pending items

### `dev` branch does not exist yet
Snapshot workflow triggers on push to `dev`. Branch needs to be created when adopting the branching strategy.

### OG image PNG not regenerated
`docs/og-image.svg` was updated but `docs/og-image.png` was not regenerated.

## Technical context
- **Version**: 0.3.1 (published to npm)
- **Tests**: 123 passing (9 test files)
- **Agents**: 9 templates + SDD Methodologist (local only)
- **Skills**: 11 templates (including create-pr)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Next steps
1. Begin v1.x implementation when user decides first feature to build
2. Create `dev` branch when ready to use snapshot publishing
3. Regenerate `docs/og-image.png` from updated SVG
