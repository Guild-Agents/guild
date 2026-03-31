# SESSION.md

## Active session
- **Date:** 2026-03-31
- **Current task:** none
- **Branch:** `develop`
- **Active agent:** none
- **Status:** All P0/P1/P2 roadmap items complete

## What happened this session

### Watchdog VPS deploy (complete)
- Tokens configured, PM2 started
- Fix: `node_args: '--env-file=.env'` in ecosystem.config.cjs (PM2 wasn't loading .env)
- Watchdog running 4h+, 0 restarts, adaptive backoff working
- Telegram bot responding to `/status`

### Skill Evals — Component 1 complete
- Added evals.json for 10 remaining workflow skills (12/12 total, 56 assertions)
- Updated test fixture (`tdd` as no-evals example instead of `session-start`)

### `guild stats` command (PR #64, merged)
- `src/utils/pricing.js` — model pricing table (Opus/Sonnet/Haiku)
- `src/utils/accounting.js` — usage recording, persistence, aggregation, profile comparison
- `src/commands/stats.js` — CLI with --period, --compare, --reset, --export csv
- 25 new tests

### `guild eval` command
- Wrapped eval-runner into CLI command with clack UI
- `guild eval [skill]` runs structural evals
- Registered in bin/guild.js

### Skills deploy
- Deployed re-specialize, debug, tdd, verify to .claude/skills/ (15/15 active)

### Trigger Tests — Component 2 start
- `src/utils/trigger-matcher.js` — keyword overlap scoring engine
- `src/utils/trigger-runner.js` — test execution, precision/recall/accuracy metrics
- `matcherType: "keyword"` in triggers.json, `keywordExpected` override for semantic gaps
- triggers.json for all 15 skills (120 tests, 100% keyword accuracy)
- `guild eval --triggers` flag integrated
- Improved debug description for better keyword matching (75% → 100%)

### Housekeeping
- Merged PR #64 (guild stats) → develop
- Merged PR #65 (develop → main) — 73 commits, resolves 3 Dependabot vulns
- Deleted stale branches: feature/cross-repo-commands, feature/cross-repo-council

## Key decisions
- Separate API keys per service (Watchdog vs Consigliere) for isolation + cost tracking
- `keywordExpected` field in triggers.json to be honest about keyword matcher limitations
- Trigger tests use keyword matching only (no Claude) — semantic matcher deferred

## Technical context
- **Version**: 1.3.0
- **Tests**: 597 passing (33 files) + 65 watchdog tests (8 files) = 662 total
- **Evals**: 56 structural assertions + 120 trigger tests = 176 total
- **Agents**: 10 templates
- **Skills**: 15 templates (12 workflow + 3 discipline), all deployed
- **Node**: v24.12.0 local, CI matrix 22.x/24.x
- **Vulnerabilities**: 0
- **VPS**: Watchdog running on aldo@45.55.53.146 via PM2

## Next steps
1. **Skill Eval Component 2 — semantic matcher** — replace/complement keyword matcher with LLM-based scoring
2. **Benchmark aggregation** — benchmark.json + benchmark.md per eval run
3. **Description optimization** — use trigger accuracy data to improve skill descriptions
4. **Backlog**: MCP server, Agent Teams v2, Multi-Runtime v3
