# SESSION.md

## Active session
- **Date:** 2026-03-31
- **Current task:** Housekeeping + Watchdog deploy
- **Branch:** `develop`
- **Active agent:** none
- **Status:** Deps updated, grammy migrated, Watchdog deployed to VPS (pending tokens)

## What happened this session

### Dependabot cleanup
- 5 Dependabot PRs closed (#59–#63), all superseded by manual update
- Updated: vitest 4.1.2, @vitest/coverage-v8 4.1.2, eslint 10.1.0, yaml 2.8.3
- Fixed picomatch + yaml audit vulnerabilities → 0 vulnerabilities
- Skipped markdownlint-cli2 0.22.0 (introduces smol-toml vuln)

### CI matrix update
- Changed from Node 20.x/22.x to 22.x/24.x
- Root cause: npm 11 (Node 24) generates lock files with unresolved peer deps (@emnapi/core, @emnapi/runtime) that npm 10 (Node 20/22) rejects
- Fix: regenerated lock file from scratch + updated CI matrix
- All 5 CI jobs green

### Grammy migration (Watchdog)
- Replaced `node-telegram-bot-api` with `grammy` in packages/watchdog
- Eliminates 7 vulnerabilities from deprecated `request@2.88.2` dependency chain
- grammy is TypeScript-native, aligns with Watchdog's TS codebase
- WatchdogBot abstraction isolated the swap — only telegram.ts, index.ts, and tests changed
- 65 watchdog tests passing, 0 vulnerabilities

### Watchdog VPS deploy (in progress)
- VPS: `aldo@45.55.53.146` (Digital Ocean droplet)
- Node 22.22.0, npm 10.9.4, PM2 running `trader-consigliere`
- Files deployed to `~/guild-watchdog/`: src, dist (compiled), workspace, ecosystem.config.cjs
- npm ci + tsc build successful on server
- **BLOCKED: .env tokens not yet filled** — user will set GITHUB_TOKEN, ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
- After tokens: `pm2 start ecosystem.config.cjs` to launch

### Roadmap imported
- Consolidated backlog from Claude Desktop ("Uso de IA") imported and saved to memory
- Compared roadmap vs current implementation state

## Key decisions
- CI matrix 22.x/24.x (drop Node 20, align with dev environment)
- Skip markdownlint-cli2 0.22.0 until smol-toml vuln is fixed upstream
- grammy over telegraf (TypeScript-native, lighter)

## Technical context
- **Version**: 1.3.0
- **Tests**: 553 passing (27 files) + 65 watchdog tests (8 files) = 618 total
- **Agents**: 10 templates
- **Skills**: 15 templates (12 workflow + 3 discipline)
- **Node**: v24.12.0 local, CI matrix 22.x/24.x
- **Vulnerabilities**: 0 (main project + watchdog)

## Next steps
1. **Fill .env tokens on VPS** — `ssh aldo@45.55.53.146` → `vim ~/guild-watchdog/.env` → set 4 tokens
2. **Start Watchdog with PM2** — `pm2 start ecosystem.config.cjs` → verify Telegram bot responds
3. **Watchdog smoke test** — send `/status`, `/stats` commands, verify heartbeat loop runs
4. **Workspaces v1.2.1** — cross-repo execution (branches feature/cross-repo-commands and feature/cross-repo-council exist)
5. **Skill Eval Component 2** — full execution with Claude
6. **Token Accounting / `guild stats`** — P0 from roadmap, partially implemented
