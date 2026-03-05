# SESSION.md

## Active session
- **Date:** 2026-03-01
- **Current task:** guild run executor v1.1 — design approved, plan written, ready for implementation
- **Branch:** `develop` (2 commits ahead of main: SESSION.md updates)
- **Active agent:** none
- **Status:** 467 tests pass, 0 lint errors, CI green, npm published

## What happened this session

### Council: Post-v1.0 Roadmap (Workspaces re-eval)
- **Type:** feature-scope (Advisor + Product Owner + Tech Lead)
- **Trigger:** Real user feedback requesting multi-repo workspace support
- **Consensus:** Execution first, workspaces second. All 3 agents agreed.
- **Decision:** Option A — v1.1 = `guild run` real execution. v1.2 = workspaces MVP.
- **Spec:** `docs/specs/post-v1-roadmap-workspaces.md`

### Brainstorming: guild run executor
- Explored the full architecture: orchestrator, dispatch, providers, execution model
- Discussed Claude Code single-process vs guild run multi-process tradeoffs
- Confirmed vision: Guild as provider-agnostic runtime (v3+ supports OpenCode, Codex, Ollama, etc.)
- Discussed token cost implications — executor reduces cost 55-70% via model routing + Node.js orchestration
- Key insight: tiers abstractos + dispatch protocol ya están diseñados para ser agnósticos

### Design: guild run executor v1.1
- **Approved design decisions:**
  1. CLI subprocess dispatch (`claude -p` as provider)
  2. Full auto with abort (no human intervention, CI/CD friendly)
  3. Sequential only for v1.1 (parallel deferred to v1.2)
  4. Simple function provider (no classes, no inheritance)
  5. Executor as separate module (`executor.js`)
- **Design doc:** `docs/plans/2026-03-01-guild-run-executor-design.md`

### Implementation plan written
- **Plan:** `docs/plans/2026-03-01-guild-run-executor-plan.md`
- **4 tasks, TDD throughout:**
  1. Claude Code CLI provider (`src/utils/providers/claude-code.js`) — 6 tests
  2. Executor loop (`src/utils/executor.js`) — 9 tests
  3. Wire into `run.js` + `--dry-run` flag — update existing + 2 new tests
  4. Integration verification (full suite + lint + smoke)
- **Execution mode:** Parallel session in worktree

## Key decisions

1. **Workspaces → v1.2** — re-evaluated post-v1.0; execution first (v1.1), workspaces MVP second (v1.2)
2. **Provider-agnostic vision** — Guild targets any AI runtime; Claude Code CLI is just the first provider
3. **CLI subprocess dispatch** — `claude -p` for agent steps, no API key needed
4. **Full auto with abort** — designed for unattended/CI execution
5. **Sequential only v1.1** — parallel groups deferred to v1.2
6. **Simple function provider** — `(step, dispatch, context) → { status, output, tokens }`
7. **--dry-run flag** — preserves v1.0 plan-only behavior as opt-in mode
8. **Keep develop branch** — user prefers develop→main flow over trunk-based

## Technical context
- **Version**: 1.0.0
- **Tests**: 467 passing (21 files)
- **Agents**: 10 templates
- **Skills**: 11 templates
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Next steps
1. **Execute implementation plan** — open worktree session at `feature/guild-run-executor`, run plan task by task
   ```bash
   git worktree add .claude/worktrees/feature/guild-run-executor -b feature/guild-run-executor develop
   cd .claude/worktrees/feature/guild-run-executor
   claude
   # Then: Read docs/plans/2026-03-01-guild-run-executor-plan.md and execute it task by task.
   ```
2. **After implementation:** `/review` + `/qa-cycle` on the feature branch
3. **After QA passes:** `/create-pr` to merge into develop
4. **v1.2: Workspaces MVP** — `guild-workspace.json`, shared resolution, workspace commands
