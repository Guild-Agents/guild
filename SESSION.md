# SESSION.md

## Active session
- **Date:** 2026-03-05
- **Current task:** guild run executor v1.1 — implemented, reviewed, ready for PR
- **Branch:** `feature/guild-run-executor` (worktree at `.claude/worktrees/guild-run-executor`)
- **Active agent:** none
- **Status:** 485 tests pass, 0 lint errors, review blockers fixed

## What happened this session

### Council: Superpowers vs Guild evaluation
- **Type:** feature-scope (Advisor + Product Owner + Tech Lead)
- **Trigger:** User asked whether Superpowers plugin replaces Guild
- **Consensus:** Unanimous — complement, don't replace
- **Decision:** Guild remains independent. Import 3 skills (TDD, debugging, verification) from Superpowers as Guild templates. Zero coupling.
- **Spec:** `docs/specs/superpowers-complementation.md` (gitignored, local reference)

### Implementation: guild run executor v1.1
- **All 4 tasks completed** (TDD throughout):
  1. Claude Code CLI provider (`src/utils/providers/claude-code.js`) — 6 tests
  2. Executor loop (`src/utils/executor.js`) — 9 tests
  3. Wire into `run.js` + `--dry-run` flag — 3 new tests
  4. Integration verification — 485 tests, 0 lint, smoke test passed
- Tasks 1 and 2 executed in parallel via subagents
- Worktree at `.claude/worktrees/guild-run-executor`

### Code review: executor feature
- **Reviewer:** Code Reviewer agent (opus)
- **Findings:** 2 blockers, 4 warnings, 3 suggestions
- **Blockers fixed:**
  - B1: `input` vs `skillBody` mismatch — user input was silently dropped
  - B2: `cmd.split(' ')` limitation documented for system step commands
- **Additional fixes:** dead-loop guard (W1), error.code type check (W2)
- **Deferred tech debt:** execFileAsync duplication (W3), onStepSkip callback (W4)

### Branch state: feature/guild-logs
- Confirmed already integrated into develop (ancestor of develop HEAD)
- No merge needed

## Key decisions

1. **Superpowers = complement, not replacement** — Guild covers orchestration, Superpowers covers individual discipline
2. **Import 3 skills from Superpowers** — TDD, systematic-debugging, verification-before-completion (future task)
3. **Workspaces → v1.2** — execution first (v1.1), workspaces MVP second (v1.2)
4. **Provider-agnostic vision** — Guild targets any AI runtime; Claude Code CLI is just the first provider
5. **CLI subprocess dispatch** — `claude -p` for agent steps, no API key needed
6. **Full auto with abort** — designed for unattended/CI execution
7. **Sequential only v1.1** — parallel groups deferred to v1.2
8. **Simple function provider** — `(step, dispatch, context) → { status, output, tokens }`
9. **--dry-run flag** — preserves v1.0 plan-only behavior as opt-in mode
10. **Keep develop branch** — user prefers develop→main flow over trunk-based
11. **Backlog priority (Council, Option B)** — re-specialize before Workspaces (protected zones must exist before workspace composition). Watchdog rebajado de P0 a P3 (proyecto separado, cero valor para usuarios npm). Skill Eval: solo Component 1. Unanimidad en items 1-3 esta semana.

## Technical context
- **Version**: 1.1.0
- **Tests**: 518 passing (26 files)
- **Agents**: 10 templates
- **Skills**: 15 templates (12 workflow + 3 discipline)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Next steps (Council-approved, Option B — 2026-03-05)
1. **Create PR** — `/create-pr` for `feature/guild-run-executor` → `develop`
2. **Bump & publish** — v1.1.0 release
3. **Import Superpowers skills** — create `/tdd`, `/debug`, `/verify` as Guild templates
4. ~~**guild-re-specialize (P2)**~~ — ✅ Done. Zone parser, generators emit markers, guild-specialize updated, re-specialize skill created.
5. ~~**Workspaces MVP v1.2 (P2)**~~ — ✅ Done. workspace.js resolver, context generator, CLI commands (init/add/status), workspace-aware init, CLAUDE.md context injection.
6. **Skill Evaluation System (P3)** — Component 1 only: trigger test suite. Defer Components 2-4 until skill count > 20. See `guild-ideas-eval-and-respecialize.md` Idea 2.
7. **Guild Watchdog (P3)** — separate project, defer until v1.2 stable. Consider Watchdog Lite (local, no infra) as intermediate validation. See `ideas/guild-watchdog-spec.md`.
