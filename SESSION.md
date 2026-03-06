# SESSION.md

## Active session
- **Date:** 2026-03-06
- **Current task:** none — v1.3.0 release
- **Branch:** `develop`
- **Active agent:** none
- **Status:** v1.3.0 published, 553 tests pass, 10 skill evals pass, CI green

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
- **Phased delivery**: v1.2.0 = context + read, v1.2.1 = cross-repo council, v1.2.2+ = cross-repo commands

### Cross-repo council (PR #51)
- **2 tasks completed** (TDD, subagent-driven):
  1. `collectMemberContext()` in workspace.js — reads CLAUDE.md/PROJECT.md/SESSION.md from siblings, returns formatted markdown — 5 tests
  2. Council SKILL.md updated — workspace-context step in frontmatter, Step 2 detects workspace and injects context
- **Spec review:** compliant, 1 warning fixed (fragile test assertion)
- **Merged:** PR #51, CI green

### Cross-repo commands (PR #52)
- **3 components** (TDD, subagent-driven):
  1. `runInMember()` in workspace.js — executes command via execFileSync with cwd — 3 tests
  2. `runWorkspaceCommand()` in commands/workspace.js — preset/custom/all modes, collect-all — 5 tests
  3. CLI wiring — `guild workspace run` subcommand with member, preset, --cmd, --all options
- **Merged:** PR #52, CI green

### Skill Evaluation System (PR #53)
- **4 tasks completed** (TDD, subagent-driven):
  1. `evaluateAssertion()` engine — 7 assertion types — 16 tests
  2. `loadEvals()` and `runEvals()` — parse SKILL.md + run evals.json assertions — 6 tests
  3. Eval definitions for build-feature (6 evals) and council (4 evals)
  4. `scripts/run-evals.js` runner + npm scripts (eval, eval:build-feature, eval:council)
- **Merged:** PR #53, CI green

### v1.2.0 release
- README updated (15 skills, workspace CLI commands)
- CHANGELOG updated (v1.1.0 + v1.2.0 entries)
- Bumped, tagged, published to npm
- Dependabot alerts already fixed (minimatch resolved)

### v1.3.0 release
- CHANGELOG updated with cross-repo council, cross-repo commands, skill eval
- Bumped, tagged, published to npm

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
14. **Post-v1.2.0 priority (Council, unanimous)** — Dependabot fix → Workspaces v1.2.1 → Skill Eval design → Watchdog deferred to post-v1.3

## Technical context
- **Version**: 1.3.0
- **Tests**: 553 passing (27 files)
- **Agents**: 10 templates
- **Skills**: 15 templates (12 workflow + 3 discipline)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Next steps
1. ~~Create PR~~ ✅
2. ~~Bump & publish v1.1.0~~ ✅
3. ~~Import Superpowers skills~~ ✅
4. ~~guild-re-specialize~~ ✅ PR #49
5. ~~Workspaces MVP v1.2.0~~ ✅ PR #50
6. ~~Bump & publish v1.2.0~~ ✅ tagged, CI green, npm published
7. ~~Fix Dependabot high vulnerability~~ ✅ already resolved
8. ~~Cross-repo council (Workspaces v1.2.1)~~ ✅ PR #51
9. ~~Cross-repo commands (Workspaces v1.2.2)~~ ✅ PR #52
10. ~~Skill Evaluation System~~ ✅ PR #53
11. ~~Bump & publish v1.3.0~~ ✅
12. **Skill Eval Component 2** — full execution with Claude, with-skill vs baseline comparison (future)
13. **Guild Watchdog** — separate project, defer until post-v1.3.
