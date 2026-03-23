# Guild Watchdog — Design Document

**Date:** 2026-03-06
**Status:** Approved
**Scope:** Full implementation (6 phases) inside `packages/watchdog/`

---

## Context

Guild Watchdog is an autonomous maintenance agent that runs 24/7 on a Digital Ocean VPS, monitoring Guild's GitHub repository, CI pipeline, and npm packages. It uses adaptive heartbeat with tiered model routing (Bash sensors -> heuristic classifier -> Haiku triage -> Sonnet action) to produce real cost data validating Guild's value proposition: cost-aware routing produces better results for less money.

Reference spec: `ideas/guild-watchdog-spec.md`

## Key Decisions

1. **Inside Guild repo** — `packages/watchdog/` directory, shares CI but deploys independently
2. **TypeScript** — Watchdog is TypeScript with its own `tsconfig.json`; rest of Guild stays JavaScript
3. **Direct API calls** — `@anthropic-ai/sdk` for Haiku/Sonnet, no Agent SDK
4. **Monolith simple** — Single Node.js process, good module separation, no event bus or workers
5. **Full spec scope** — All 6 phases from the spec, including VPS provisioning

---

## Project Structure

```
packages/watchdog/
  src/
    index.ts                  # Entry point: init + heartbeat loop
    heartbeat.ts              # Adaptive scheduler (backoff/reset)
    sensors/
      index.ts                # runAllSensors() — runs all sensors
      github-ci.ts            # CI status via GitHub REST API
      github-prs.ts           # Renovate PRs + failing checks
      types.ts                # SensorResult interface
    classifier.ts             # Heuristic rules (deterministic, 0 tokens)
    llm.ts                    # Haiku triage + Sonnet action via @anthropic-ai/sdk
    telegram.ts               # Bot: notify + command handler
    stats.ts                  # Per-layer token/cost tracking + aggregation
    workspace.ts              # File I/O: events, MEMORY.md, heartbeat-state
    config.ts                 # HeartbeatConfig, env vars, constants
  workspace/                  # Runtime data (events/, stats/, state gitignored)
    SOUL.md
    HEARTBEAT.md
    MEMORY.md
  __tests__/                  # Vitest tests
    heartbeat.test.ts
    classifier.test.ts
    sensors.test.ts
    llm.test.ts
    stats.test.ts
    workspace.test.ts
  package.json
  tsconfig.json               # ESM target, strict
  vitest.config.ts
  ecosystem.config.cjs        # PM2 config
```

---

## Adaptive Heartbeat

### Config

```typescript
interface HeartbeatConfig {
  minInterval: number;       // 15 min (900_000 ms)
  maxInterval: number;       // 4 hours (14_400_000 ms)
  backoffFactor: number;     // 2
  activeHours?: {
    start: string;           // "08:00"
    end: string;             // "24:00"
    timezone: string;        // "America/Santiago"
  };
}

interface HeartbeatState {
  currentInterval: number;
  lastCheckTimestamp: number;
  lastActivityTimestamp: number;
  consecutiveOkCount: number;
}
```

### Loop

```
start
  load heartbeat-state.json (or defaults on first run / crash recovery)
  loop:
    in activeHours? -> no -> sleep until start, don't reset backoff
    run pipeline (sensors -> classify -> LLM -> notify)
    result === 'ok'?
      yes -> interval = min(current * backoffFactor, maxInterval), consecutiveOkCount++
      no  -> interval = minInterval, consecutiveOkCount = 0
    persist heartbeat-state.json
    sleep(currentInterval)
```

### External reset

Telegram `/resume` or activity resets `currentInterval` to `minInterval`.

### Crash recovery

PM2 restarts process -> `index.ts` reads `heartbeat-state.json` -> resumes with saved interval. Missing or corrupt file -> start with defaults.

### Testability

`computeNextInterval(state, checkResult)` is a pure function. No timers, no I/O. The loop in `index.ts` is the only place with `setTimeout`.

---

## Classification Pipeline (3 layers)

### Flow

```
sensors (Layer 1, $0)          classifier (Layer 2, $0)         LLM (Layer 3, $$)
---------------------          ------------------------         -----------------
github-ci    -> SensorResult --+
github-prs   -> SensorResult --+--> for each result:
                                |   status === 200 -> DONE (ok)
                                |   status === 4xx/5xx -> direct to Sonnet
                                |   status === 201 -> heuristics:
                                |     confidence 'high' + 'ignore' -> DONE
                                |     confidence 'high' + 'action' -> Sonnet
                                |     confidence 'low' -> Haiku triage
                                |                          |
                                |                    Haiku says:
                                |                    'ignore' -> DONE
                                |                    'action' -> Sonnet
                                |                                |
                                |                          Sonnet generates:
                                |                          - event markdown
                                |                          - telegram message
```

### Sensors

```typescript
interface SensorResult {
  source: 'github-ci' | 'github-prs';
  status: number;          // 200=ok, 201=ambiguous, 4xx/5xx=error
  payload?: string;        // Raw data (only if status !== 200)
  timestamp: number;
}
```

- `github-ci.ts` — `GET /repos/{owner}/{repo}/actions/runs?branch=main&per_page=1`
- `github-prs.ts` — `GET /repos/{owner}/{repo}/pulls?state=open` filtered for Renovate >48h and failing checks

Uses native `fetch` (Node 20+). GitHub token via `GITHUB_TOKEN` env var.

### Classifier

```typescript
interface ClassificationResult {
  confidence: 'high' | 'low';
  severity: 'ignore' | 'triage' | 'action';
  reason: string;
}

function classify(signal: SensorResult): ClassificationResult
```

Example rules:
- CI green after green -> `high/ignore`
- Renovate PR for `@types/*` with <72h -> `high/ignore`
- CI red on main -> `high/action` (direct to Sonnet)
- PR with failing checks but <1h old -> `high/ignore` (may still be running)

### LLM

```typescript
// Haiku triage — minimal context
async function triageWithHaiku(
  signal: SensorResult,
  heuristicReason: string
): Promise<'ignore' | 'action'>

// Sonnet action — full context
async function actWithSonnet(
  signal: SensorResult,
  classificationChain: string
): Promise<{
  event: string;            // Markdown for events/
  notification: {
    severity: 'info' | 'warning' | 'critical';
    summary: string;
    details?: string;
    link?: string;
  };
}>
```

- Haiku receives: sensor payload + HEARTBEAT.md + heuristic reason
- Sonnet receives: SOUL.md + MEMORY.md + HEARTBEAT.md + full classification chain

### Deduplication

Before notifying, `workspace.ts` checks `events/` for an existing event with the same `source` and same state in the last 4 hours. If found, skip notification.

---

## Telegram

Uses `node-telegram-bot-api` in polling mode (simpler than webhooks for VPS).

### Outgoing notifications

```
'info'     -> "info-icon {summary}\n{details}"
'warning'  -> "warning-icon {summary}\n{details}\n{link}"
'critical' -> "critical-icon {summary}\n{details}\n{link}"
```

### Incoming commands (restricted to ALLOWED_CHAT_ID)

| Command | Action |
|---------|--------|
| `/status` | Current interval, last check, uptime, CI state |
| `/stats` | Cost today/7d/30d, calls per layer, filter rates |
| `/interval 30m` | Manual interval override |
| `/pause` | Stop heartbeat, confirm |
| `/resume` | Resume heartbeat, reset to minInterval |

Env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

---

## Stats

```typescript
interface LayerStats {
  checks: number;
  filtered: number;
  escalated: number;
  inputTokens: number;
  outputTokens: number;
}

interface DailyStats {
  date: string;                    // "2026-03-06"
  layers: {
    sensor: LayerStats;
    heuristic: LayerStats;
    haiku: LayerStats;
    sonnet: LayerStats;
  };
  heartbeat: {
    totalChecks: number;
    avgIntervalMs: number;
    activityResets: number;
  };
  cost: {
    haiku: number;                 // USD from published pricing
    sonnet: number;
    total: number;
  };
}
```

- Accumulated in memory during the day
- Persisted to `workspace/stats/daily-YYYY-MM-DD.json` after each check
- On-demand aggregation for 7d/30d when `/stats` is invoked
- Includes `comparisonNaive`: theoretical cost at 30min fixed Opus to demonstrate savings

---

## Deploy

### Infrastructure

- Digital Ocean Droplet (basic, ~$6/month)
- Node.js 20+
- PM2 global for process management
- systemd for PM2 boot persistence

### PM2 config (`ecosystem.config.cjs`)

```javascript
module.exports = {
  apps: [{
    name: 'guild-watchdog',
    script: 'dist/index.js',
    env: {
      NODE_ENV: 'production',
    },
    max_restarts: 10,
    restart_delay: 5000,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
```

### Deploy pipeline

1. `npm run build` in `packages/watchdog/` (TypeScript -> `dist/`)
2. `rsync` or `scp` of `dist/` + `package.json` + `workspace/*.md` to VPS
3. `npm install --production` on VPS
4. `pm2 restart guild-watchdog`
5. 48h burn-in, validate metrics vs acceptance criteria

### CI

Guild CI workflow adds a job for `packages/watchdog/` — lint + test. No automatic deploy (manual for now).

---

## Edge Cases

| Case | Behavior |
|------|----------|
| PM2 restarts after crash | Restore heartbeat-state.json, resume saved interval |
| GitHub API rate limit | Back off sensor to 1h minimum, Telegram notify |
| Anthropic API down | Skip LLM layers, queue signals, retry next heartbeat |
| Telegram API down | Write event anyway, retry notification next cycle |
| Multiple simultaneous signals | Process sequentially, no parallel LLM calls |
| Heartbeat during non-active hours | Skip check, maintain interval (don't reset backoff) |
| MEMORY.md grows too large | Compact: summarize old entries, keep last 7 days detailed |
| Same failure detected repeatedly | Deduplicate: notify once per unique failure per 4h window |

---

## Acceptance Criteria

| Metric | Target |
|--------|--------|
| Uptime | > 99.5% |
| Layer 1 filter rate | > 90% of all checks |
| Layer 2 filter rate | > 80% of escalated signals |
| Daily cost | < $0.50/day |
| Cost vs naive (30min Opus) | > 10x cheaper |
| Time to notify | < 2 min from failure detection |
| False negatives | 0 missed CI failures |
| Crash recovery | < 30 seconds |

---

## Test Strategy

- **heartbeat.test.ts** — Pure function tests for `computeNextInterval`, backoff logic, active hours, crash recovery state parsing
- **classifier.test.ts** — Each heuristic rule tested with known inputs, confidence/severity assertions
- **sensors.test.ts** — Mock `fetch`, verify GitHub API URL construction, status code mapping
- **llm.test.ts** — Mock `@anthropic-ai/sdk`, verify prompt assembly, model selection, response parsing
- **stats.test.ts** — Accumulation, daily persistence, aggregation, cost calculation
- **workspace.test.ts** — Event file creation, deduplication, MEMORY.md read/write, state persistence
