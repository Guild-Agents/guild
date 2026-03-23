# SESSION.md

## Active session
- **Date:** 2026-03-23
- **Current task:** Post-watchdog cleanup — merged PR + Dependabot updates
- **Branch:** `develop`
- **Active agent:** none
- **Status:** Watchdog merged, 4/5 Dependabot PRs merged, develop up to date

## What happened this session

### Guild Watchdog — merged to develop
- PR #58 created and merged (`feature/guild-watchdog` → `develop`)
- CI: 4/5 checks passed (lint + test on Node 20.x/22.x, watchdog lint + test on 20.x/22.x)
- Security Audit failed — preexisting vuln in `flatted` + `node-telegram-bot-api` dependency chain (see below)
- Branch cleaned up (remote + local deleted)

### Dependabot PRs
- ✅ #54 — eslint 10.0.2 → 10.0.3
- ✅ #55 — @clack/prompts 1.0.1 → 1.1.0
- ✅ #57 — vitest 4.0.18 → 4.1.0
- ❌ #56 — @vitest/coverage-v8 4.0.18 → 4.1.0 (CONFLICTING after #57 merge, awaiting Dependabot rebase)

### Security audit findings
7 vulnerabilities total (5 moderate, 2 critical):
- `node-telegram-bot-api@0.66.0` → `@cypress/request-promise` → `request@2.88.2` (deprecated)
  - `form-data` <2.5.4 (critical), `qs` (moderate), `tough-cookie` (moderate)
- `flatted` ≤3.4.1 → from `flat-cache` → `eslint` (dev dependency)
- Options: migrate to grammy/telegraf, or accept risk (request only used for internal polling)

### Coordinated session
- Two Claude Code sessions worked in parallel via claude-peers
- Split: one ran tests + monitored CI, other created PR + merged Dependabot PRs

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
- **Dependencies updated**: eslint 10.0.3, @clack/prompts 1.1.0, vitest 4.1.0

## Next steps
1. **Resolve #56** — wait for Dependabot rebase or bump @vitest/coverage-v8 manually
2. **Security audit** — decide on node-telegram-bot-api alternative (grammy/telegraf) vs accept risk
3. **Watchdog local test** — set up .env with GitHub/Anthropic/Telegram tokens, smoke test
4. **Watchdog VPS deploy** — manual PM2 setup on VPS
5. **Workspaces v1.2.1** — cross-repo execution (feature/cross-repo-commands branch exists)
6. **Skill Eval Component 2** — full execution with Claude, with-skill vs baseline comparison
