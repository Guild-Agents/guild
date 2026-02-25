# SESSION.md

## Active session
- **Date:** 2026-02-25
- **Current task:** Pre-release publishing — pipeline complete
- **Active agent:** None
- **Status:** Feature implemented on `feature/prerelease-publishing`, ready for merge/PR

## What happened this session

### Housekeeping
1. Deleted 10 stale spec files from `docs/specs/` (kept only `spec-prerelease-publishing.md`)
2. Cleaned up 16 stale branches (8 worktree, 6 feature/fix, 2 claude/)
3. Removed 2 orphaned worktrees
4. Branch state: only `main` + `feature/prerelease-publishing`

### Pre-release & Snapshot Publishing (build-feature pipeline)

Full 6-phase pipeline completed:

| Phase | Result |
|-------|--------|
| 1. Advisor | Approved (user override) |
| 2. Product Owner | 7 stories, 38 acceptance criteria |
| 3. Tech Lead | ESModule architecture, centralized version logic |
| 4. Developer | 11 files changed, 19 new tests |
| 5. Code Review | 3 blockers fixed (ESM require, promote-beta, channel detection) |
| 6. QA | 12/12 acceptance criteria pass, 0 bugs |

### What was implemented

1. **`src/utils/version.js`** — parseVersion, getPreReleaseWarning, computeSnapshot/Beta/StableVersion
2. **`scripts/version-{snapshot,beta,stable}.js`** — thin ESModule wrappers
3. **`package.json`** — 7 new npm scripts (version:*, publish:*, publish:promote-beta)
4. **`bin/guild.js`** — pre-release indicator (yellow for beta, red for snapshot, on stderr)
5. **`.github/workflows/snapshot.yml`** — auto-publish on push to `dev`
6. **`.github/workflows/beta.yml`** — manual trigger with description input
7. **`.github/workflows/release.yml`** — added workflow_dispatch with bump type (kept tag trigger)
8. **`.github/workflows/ci.yml`** — added `dev` to branch triggers

## Key decisions made this session

### 1. Backlog reset
- Previous v0.4-v1.0 roadmap on hold
- User will provide new backlog direction

### 2. Spec implemented as-is
- Advisor concerns overridden by user directive
- ESM/package-name issues fixed during implementation

### 3. Version computation centralized
- All logic in `src/utils/version.js` (pure, testable functions)
- Scripts are thin wrappers (read pkg → compute → write pkg)

### 4. Backward-compatible release workflow
- Kept `v*` tag trigger alongside new `workflow_dispatch`
- Tag-triggered releases skip version bump (already correct)

## Pending items

### Feature branch ready for merge
`feature/prerelease-publishing` has 4 commits ready for merge to main.

### OG image PNG not regenerated
`docs/og-image.svg` was updated but `docs/og-image.png` was not regenerated.

### `dev` branch does not exist yet
Snapshot workflow triggers on push to `dev`. Branch needs to be created when adopting the branching strategy.

## Technical context
- **Version**: 0.3.1 (on main)
- **Tests**: 123 passing (9 test files)
- **Agents**: 9 templates + SDD Methodologist (local only)
- **Skills**: 11 templates (including create-pr)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Next steps
1. Merge `feature/prerelease-publishing` to main (or create PR)
2. Receive new backlog from user
3. Regenerate `docs/og-image.png`
