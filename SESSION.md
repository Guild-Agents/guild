# SESSION.md

## Active session
- **Date:** 2026-03-07
- **Current task:** Guild Watchdog — build-feature pipeline complete, pending local test + PR
- **Branch:** `feature/guild-watchdog`
- **Active agent:** none
- **Status:** 6/6 pipeline phases complete, 65 watchdog tests + 553 root tests pass

## What happened this session

### Guild Watchdog (feature/guild-watchdog)
- **Brainstorming:** Spec already existed at `ideas/guild-watchdog-spec.md`. Refined via Q&A:
  - Inside Guild repo as `packages/watchdog/` (not separate repo)
  - TypeScript (watchdog only, Guild stays JS)
  - Direct `@anthropic-ai/sdk` (not Agent SDK)
  - Monolith simple architecture
  - Full spec scope (6 phases), minus VPS deploy (manual later)
- **Design doc:** `docs/plans/2026-03-06-guild-watchdog-design.md`
- **Implementation plan:** `docs/plans/2026-03-06-guild-watchdog-plan.md` (16 tasks, 6 phases)

### Build-feature pipeline (all 6 phases)
1. **Advisor (opus):** Approved with adjustments — Phase 6 (VPS deploy) removed from scope
2. **Product Owner (opus):** 14 tasks, 6 deliverables, ~51 tests estimated
3. **Tech Lead (opus):** 7 adjustments (root config excludes, ESLint removal, type sharing, error handling)
4. **Developer (sonnet):** 14 tasks implemented, 57 tests
5. **Code Reviewer (opus):** 2 blockers (HTML injection, heuristic stats), 6 warnings, 5 suggestions
   - Round 2: Developer fixed B1 (escapeHtml), B2 (recordHeuristicCheck), W1 (shared Anthropic client), W3 (dedup before Sonnet), W6 (PR failing checks sensor) — 65 tests
6. **QA (sonnet):** 29/29 acceptance criteria PASS, approved

### What was built
- `packages/watchdog/` — TypeScript ESM package with:
  - Adaptive heartbeat scheduler (15min → 4h backoff)
  - GitHub CI + PR sensors (Layer 1, $0)
  - Heuristic classifier (Layer 2, $0)
  - LLM module: Haiku triage + Sonnet action (Layer 3)
  - Telegram bot (notifications + 5 commands)
  - Workspace I/O (events, state, crash recovery)
  - Stats tracking (per-layer cost accounting)
  - Main pipeline loop orchestrating everything
  - PM2 ecosystem config
  - CI workflow integration (separate job in ci.yml)
- Root `vitest.config.js` and `eslint.config.js` updated to exclude `packages/`
- 25 commits on feature branch

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
15. **Watchdog inside Guild repo** — `packages/watchdog/` as TypeScript, shares CI, deploys independently
16. **Watchdog uses direct API** — `@anthropic-ai/sdk` not Agent SDK, simpler for targeted LLM calls
17. **Watchdog deploy deferred** — VPS provisioning is manual, not part of build-feature pipeline

## Technical context
- **Version**: 1.3.0
- **Tests**: 553 passing (27 files) + 65 watchdog tests (8 files) = 618 total
- **Agents**: 10 templates
- **Skills**: 15 templates (12 workflow + 3 discipline)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Next steps
1. **Test Watchdog locally** — Set up .env with GitHub/Anthropic/Telegram tokens, run `npm run dev` in packages/watchdog. Consider a sensor-only test script first (no API keys needed)
2. **Create PR** — `/create-pr` from feature/guild-watchdog to develop
3. **Merge + deploy** — After CI green, merge PR, then manual VPS setup
4. **Skill Eval Component 2** — full execution with Claude, with-skill vs baseline comparison (future)
