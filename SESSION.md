# SESSION.md

## Active session
- **Date:** 2026-02-25
- **Current task:** Backlog reset — awaiting new backlog from user
- **Active agent:** None
- **Status:** Old specs purged, roadmap on hold pending new direction

## What happened this session

### Backlog reset initiated

1. **Pre-release publishing spec evaluated** — Advisor reviewed `spec-prerelease-publishing.md`, verdict: "Requires adjustments" (premature for v0.3.1, ESM issues, package name mismatch, roadmap conflict)
2. **Old v0.3.1 specs deleted** — Removed 10 stale council-generated specs from `docs/specs/` (build-feature-trace, council-writes-specs, devops-agent-showcase, devops-agent, github-pages-update, package-json-sdd, post-init-onboarding, readme-rewrite, resolve-project-root, spec-template-format)
3. **Only `spec-prerelease-publishing.md` retained** in `docs/specs/` as reference for future backlog
4. **Feature branch cleaned** — `feature/prerelease-publishing` deleted (no changes made)
5. **Previous roadmap (v0.4–v1.0) on hold** — user will provide new backlog

### Advisor findings on pre-release publishing (for reference)

- Spec targets v1.x but Guild is at v0.3.1 — premature
- Scripts use `require()` but project is ESModules — would crash
- Package name `guild` in spec but actual npm name is `guild-agents`
- `dev` branch strategy adds overhead for single-developer project
- Conflicts with previous v0.4 roadmap priorities

## Key decisions made this session

### 1. Backlog is being reset
- Previous v0.4–v1.0 roadmap is on hold
- User will provide new backlog direction
- Old spec artifacts purged to start clean

## Pending items

### Stale worktree branches
8 worktree branches remain in git (can be cleaned with `git branch -d`):
- `worktree-agent-a596c8fb`, `worktree-agent-a7e6940c`, `worktree-agent-af6c6296`
- `worktree-agent-a4860a3a`, `worktree-agent-af22f060`, `worktree-agent-a5ac9b1e`
- `worktree-agent-a7420d31`, `worktree-agent-ade3d736`

### Stale feature branches
Old merged branches still exist locally:
- `feature/build-feature-progress`, `feature/e2e-init-test`, `feature/post-init-onboarding`
- `feature/skill-create-pr`, `fix/quality-gates`, `fix/unified-markdown-lint`

### OG image PNG not regenerated
`docs/og-image.svg` was updated but `docs/og-image.png` was not regenerated.

## Approved Roadmap

### v0.3.1 — "Spec Artifacts + SDD Identity" (SHIPPED)
All 9 items completed and released.

### v0.4+ — Pending
Awaiting new backlog from user. Previous roadmap (Connected Pipeline, Spec Intelligence, Stable SDD) is on hold.

## Technical context
- **Version**: 0.3.1 (published to npm)
- **Tests**: 104 passing (8 test files)
- **Agents**: 9 templates + SDD Methodologist (local only)
- **Skills**: 11 templates (including create-pr)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Next steps
1. Receive new backlog from user
2. Clean up stale worktree and feature branches (housekeeping)
3. Regenerate `docs/og-image.png` from updated SVG
