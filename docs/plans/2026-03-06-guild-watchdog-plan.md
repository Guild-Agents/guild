# Guild Watchdog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an autonomous 24/7 maintenance agent in `packages/watchdog/` that monitors Guild's GitHub health using adaptive heartbeat and tiered model routing (sensors -> heuristics -> Haiku -> Sonnet), notifies via Telegram, and tracks cost data.

**Architecture:** Single Node.js TypeScript process managed by PM2 on a Digital Ocean VPS. Three-layer classification pipeline filters 95%+ of checks at zero token cost. File-based state (Markdown + JSON) for crash recovery and auditability.

**Tech Stack:** TypeScript (ESM), Node.js 20+, `@anthropic-ai/sdk`, `node-telegram-bot-api`, Vitest, PM2

**Design doc:** `docs/plans/2026-03-06-guild-watchdog-design.md`
**Full spec:** `ideas/guild-watchdog-spec.md`

---

## Phase 1: Project Skeleton

### Task 1: Initialize packages/watchdog project

**Files:**
- Create: `packages/watchdog/package.json`
- Create: `packages/watchdog/tsconfig.json`
- Create: `packages/watchdog/vitest.config.ts`
- Create: `packages/watchdog/.gitignore`

**Step 1: Create directory and package.json**

```bash
mkdir -p packages/watchdog
```

```json
// packages/watchdog/package.json
{
  "name": "guild-watchdog",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.52.0",
    "node-telegram-bot-api": "^0.66.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/node-telegram-bot-api": "^0.64.0",
    "@vitest/coverage-v8": "^4.0.0",
    "eslint": "^10.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.8.0",
    "vitest": "^4.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
// packages/watchdog/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

**Step 3: Create vitest.config.ts**

```typescript
// packages/watchdog/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
});
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
coverage/
workspace/events/
workspace/stats/
workspace/heartbeat-state.json
workspace/MEMORY.md
.env
```

**Step 5: Install dependencies**

Run: `cd packages/watchdog && npm install`
Expected: `node_modules/` created, lock file generated

**Step 6: Verify TypeScript compiles**

Create a placeholder:

```typescript
// packages/watchdog/src/index.ts
console.log('Guild Watchdog starting...');
```

Run: `cd packages/watchdog && npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add packages/watchdog/
git commit -m "chore: initialize packages/watchdog TypeScript project"
```

---

### Task 2: Workspace template files

**Files:**
- Create: `packages/watchdog/workspace/SOUL.md`
- Create: `packages/watchdog/workspace/HEARTBEAT.md`
- Create: `packages/watchdog/workspace/MEMORY.md.template`

**Step 1: Create SOUL.md**

```markdown
# Guild Watchdog

You are the Maintenance agent for the Guild open-source project (guild-agents on npm).

## Your Role
- Monitor the health of Guild's GitHub repository, CI pipeline, and npm packages
- Detect issues early and notify Aldo via Telegram
- Log all findings as events for audit trail
- Be concise in notifications — lead with what's wrong, then context

## Principles
- Never take destructive actions (no force pushes, no npm unpublish, no PR merges)
- When uncertain, notify and ask — don't act autonomously on ambiguous situations
- Log everything to events/ with timestamps
- Prefer false alarms over missed issues

## Context
- Repository: github.com/Guild-Agents/guild
- NPM package: guild-agents
- CI: GitHub Actions
- Dependency management: Renovate Bot
```

**Step 2: Create HEARTBEAT.md**

```markdown
# Watchdog Checklist

## Every check (Layer 1 — sensors):
- GitHub Actions: Is CI green on main branch?
- Pull Requests: Are there Renovate Bot PRs older than 48 hours?
- Pull Requests: Are there open PRs with failing checks?

## When something needs attention (Layer 2/3):
- Summarize the issue clearly
- Write an event file to events/ with: timestamp, source, severity, description
- Send Telegram notification to Aldo with: one-line summary + link to relevant PR/action

## What NOT to do:
- Do not merge PRs
- Do not push code
- Do not modify any repository settings
- Do not retry failed CI without human approval
```

**Step 3: Create MEMORY.md.template**

```markdown
# Watchdog Memory

## Last Updated
(not yet started)

## Known State
- Last CI status: unknown
- Open Renovate PRs: 0
- Last notification sent: never
- Current heartbeat interval: 15m

## Learned Patterns
(none yet)
```

**Step 4: Commit**

```bash
git add packages/watchdog/workspace/
git commit -m "feat(watchdog): add workspace template files (SOUL.md, HEARTBEAT.md, MEMORY.md)"
```

---

### Task 3: Config module

**Files:**
- Create: `packages/watchdog/src/config.ts`
- Create: `packages/watchdog/__tests__/config.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/watchdog/__tests__/config.test.ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_HEARTBEAT_CONFIG, loadConfig } from '../src/config.js';

describe('config', () => {
  describe('DEFAULT_HEARTBEAT_CONFIG', () => {
    it('has 15 min minimum interval', () => {
      expect(DEFAULT_HEARTBEAT_CONFIG.minInterval).toBe(15 * 60 * 1000);
    });

    it('has 4 hour maximum interval', () => {
      expect(DEFAULT_HEARTBEAT_CONFIG.maxInterval).toBe(4 * 60 * 60 * 1000);
    });

    it('has backoff factor of 2', () => {
      expect(DEFAULT_HEARTBEAT_CONFIG.backoffFactor).toBe(2);
    });
  });

  describe('loadConfig', () => {
    it('returns config with required env vars when set', () => {
      const env = {
        GITHUB_TOKEN: 'ghp_test',
        GITHUB_OWNER: 'Guild-Agents',
        GITHUB_REPO: 'guild',
        ANTHROPIC_API_KEY: 'sk-ant-test',
        TELEGRAM_BOT_TOKEN: 'bot123',
        TELEGRAM_CHAT_ID: '456',
      };
      const config = loadConfig(env);
      expect(config.github.token).toBe('ghp_test');
      expect(config.github.owner).toBe('Guild-Agents');
      expect(config.github.repo).toBe('guild');
      expect(config.anthropic.apiKey).toBe('sk-ant-test');
      expect(config.telegram.botToken).toBe('bot123');
      expect(config.telegram.chatId).toBe('456');
    });

    it('throws if GITHUB_TOKEN is missing', () => {
      expect(() => loadConfig({})).toThrow('GITHUB_TOKEN');
    });

    it('throws if ANTHROPIC_API_KEY is missing', () => {
      expect(() => loadConfig({ GITHUB_TOKEN: 'x', GITHUB_OWNER: 'x', GITHUB_REPO: 'x' })).toThrow('ANTHROPIC_API_KEY');
    });

    it('throws if TELEGRAM_BOT_TOKEN is missing', () => {
      expect(() => loadConfig({
        GITHUB_TOKEN: 'x', GITHUB_OWNER: 'x', GITHUB_REPO: 'x',
        ANTHROPIC_API_KEY: 'x',
      })).toThrow('TELEGRAM_BOT_TOKEN');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/watchdog && npx vitest run __tests__/config.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// packages/watchdog/src/config.ts

export interface HeartbeatConfig {
  minInterval: number;
  maxInterval: number;
  backoffFactor: number;
  activeHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export interface AppConfig {
  heartbeat: HeartbeatConfig;
  github: {
    token: string;
    owner: string;
    repo: string;
  };
  anthropic: {
    apiKey: string;
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  workspacePath: string;
}

export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  minInterval: 15 * 60 * 1000,       // 15 minutes
  maxInterval: 4 * 60 * 60 * 1000,   // 4 hours
  backoffFactor: 2,
  activeHours: {
    start: '08:00',
    end: '24:00',
    timezone: 'America/Santiago',
  },
};

function requireEnv(env: Record<string, string | undefined>, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  return {
    heartbeat: { ...DEFAULT_HEARTBEAT_CONFIG },
    github: {
      token: requireEnv(env, 'GITHUB_TOKEN'),
      owner: requireEnv(env, 'GITHUB_OWNER'),
      repo: requireEnv(env, 'GITHUB_REPO'),
    },
    anthropic: {
      apiKey: requireEnv(env, 'ANTHROPIC_API_KEY'),
    },
    telegram: {
      botToken: requireEnv(env, 'TELEGRAM_BOT_TOKEN'),
      chatId: requireEnv(env, 'TELEGRAM_CHAT_ID'),
    },
    workspacePath: env.WATCHDOG_WORKSPACE_PATH || 'workspace',
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/watchdog && npx vitest run __tests__/config.test.ts`
Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add packages/watchdog/src/config.ts packages/watchdog/__tests__/config.test.ts
git commit -m "feat(watchdog): config module with env validation and heartbeat defaults"
```

---

### Task 4: Heartbeat scheduler

**Files:**
- Create: `packages/watchdog/src/heartbeat.ts`
- Create: `packages/watchdog/__tests__/heartbeat.test.ts`

**Step 1: Write the failing tests**

```typescript
// packages/watchdog/__tests__/heartbeat.test.ts
import { describe, it, expect } from 'vitest';
import {
  computeNextInterval,
  createInitialState,
  isInActiveHours,
} from '../src/heartbeat.js';
import { DEFAULT_HEARTBEAT_CONFIG } from '../src/config.js';

const config = DEFAULT_HEARTBEAT_CONFIG;
const MIN = config.minInterval;
const MAX = config.maxInterval;

describe('heartbeat', () => {
  describe('createInitialState', () => {
    it('starts at minimum interval', () => {
      const state = createInitialState(config);
      expect(state.currentInterval).toBe(MIN);
      expect(state.consecutiveOkCount).toBe(0);
    });
  });

  describe('computeNextInterval', () => {
    it('doubles interval on ok', () => {
      const state = createInitialState(config);
      const next = computeNextInterval(state, 'ok', config);
      expect(next.currentInterval).toBe(MIN * 2);
      expect(next.consecutiveOkCount).toBe(1);
    });

    it('caps at maxInterval', () => {
      const state = {
        currentInterval: MAX / 2 + 1,
        lastCheckTimestamp: Date.now(),
        lastActivityTimestamp: Date.now(),
        consecutiveOkCount: 5,
      };
      const next = computeNextInterval(state, 'ok', config);
      expect(next.currentInterval).toBe(MAX);
    });

    it('resets to minInterval on alert', () => {
      const state = {
        currentInterval: MAX,
        lastCheckTimestamp: Date.now(),
        lastActivityTimestamp: Date.now(),
        consecutiveOkCount: 10,
      };
      const next = computeNextInterval(state, 'alert', config);
      expect(next.currentInterval).toBe(MIN);
      expect(next.consecutiveOkCount).toBe(0);
    });

    it('resets to minInterval on reset', () => {
      const state = {
        currentInterval: MAX,
        lastCheckTimestamp: Date.now(),
        lastActivityTimestamp: Date.now(),
        consecutiveOkCount: 10,
      };
      const next = computeNextInterval(state, 'reset', config);
      expect(next.currentInterval).toBe(MIN);
    });
  });

  describe('isInActiveHours', () => {
    it('returns true when no activeHours configured', () => {
      const configNoHours = { ...config, activeHours: undefined };
      expect(isInActiveHours(configNoHours, new Date())).toBe(true);
    });

    it('returns true during active hours', () => {
      const configHours = {
        ...config,
        activeHours: { start: '08:00', end: '22:00', timezone: 'UTC' },
      };
      // 12:00 UTC
      const noon = new Date('2026-03-06T12:00:00Z');
      expect(isInActiveHours(configHours, noon)).toBe(true);
    });

    it('returns false outside active hours', () => {
      const configHours = {
        ...config,
        activeHours: { start: '08:00', end: '22:00', timezone: 'UTC' },
      };
      // 03:00 UTC
      const earlyMorning = new Date('2026-03-06T03:00:00Z');
      expect(isInActiveHours(configHours, earlyMorning)).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/watchdog && npx vitest run __tests__/heartbeat.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// packages/watchdog/src/heartbeat.ts
import type { HeartbeatConfig } from './config.js';

export interface HeartbeatState {
  currentInterval: number;
  lastCheckTimestamp: number;
  lastActivityTimestamp: number;
  consecutiveOkCount: number;
}

export type CheckResult = 'ok' | 'alert' | 'reset';

export function createInitialState(config: HeartbeatConfig): HeartbeatState {
  const now = Date.now();
  return {
    currentInterval: config.minInterval,
    lastCheckTimestamp: now,
    lastActivityTimestamp: now,
    consecutiveOkCount: 0,
  };
}

export function computeNextInterval(
  state: HeartbeatState,
  result: CheckResult,
  config: HeartbeatConfig,
): HeartbeatState {
  const now = Date.now();

  if (result === 'alert' || result === 'reset') {
    return {
      currentInterval: config.minInterval,
      lastCheckTimestamp: now,
      lastActivityTimestamp: now,
      consecutiveOkCount: 0,
    };
  }

  // result === 'ok' — backoff
  const nextInterval = Math.min(
    state.currentInterval * config.backoffFactor,
    config.maxInterval,
  );

  return {
    currentInterval: nextInterval,
    lastCheckTimestamp: now,
    lastActivityTimestamp: state.lastActivityTimestamp,
    consecutiveOkCount: state.consecutiveOkCount + 1,
  };
}

export function isInActiveHours(config: HeartbeatConfig, now: Date): boolean {
  if (!config.activeHours) return true;

  const { start, end, timezone } = config.activeHours;
  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    hour12: false,
  });

  return timeStr >= start && timeStr < end;
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/watchdog && npx vitest run __tests__/heartbeat.test.ts`
Expected: PASS (all 7 tests)

**Step 5: Commit**

```bash
git add packages/watchdog/src/heartbeat.ts packages/watchdog/__tests__/heartbeat.test.ts
git commit -m "feat(watchdog): adaptive heartbeat scheduler with backoff and active hours"
```

---

## Phase 2: Sensors

### Task 5: Sensor types and GitHub CI sensor

**Files:**
- Create: `packages/watchdog/src/sensors/types.ts`
- Create: `packages/watchdog/src/sensors/github-ci.ts`
- Create: `packages/watchdog/__tests__/sensors.test.ts`

**Step 1: Create types**

```typescript
// packages/watchdog/src/sensors/types.ts
export interface SensorResult {
  source: 'github-ci' | 'github-prs';
  status: number;          // 200=ok, 201=ambiguous, 4xx/5xx=error
  payload?: string;
  timestamp: number;
}

export type SensorFn = () => Promise<SensorResult>;
```

**Step 2: Write the failing tests**

```typescript
// packages/watchdog/__tests__/sensors.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCiStatus } from '../src/sensors/github-ci.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const githubConfig = { token: 'ghp_test', owner: 'Guild-Agents', repo: 'guild' };

describe('sensors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('github-ci', () => {
    it('returns 200 when latest run succeeded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflow_runs: [{ conclusion: 'success', html_url: 'https://github.com/run/1' }],
        }),
      });

      const result = await checkCiStatus(githubConfig);
      expect(result.source).toBe('github-ci');
      expect(result.status).toBe(200);
    });

    it('returns 500 when latest run failed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflow_runs: [{ conclusion: 'failure', html_url: 'https://github.com/run/2' }],
        }),
      });

      const result = await checkCiStatus(githubConfig);
      expect(result.status).toBe(500);
      expect(result.payload).toContain('failure');
    });

    it('returns 201 when latest run is in progress', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflow_runs: [{ conclusion: null, status: 'in_progress', html_url: 'https://github.com/run/3' }],
        }),
      });

      const result = await checkCiStatus(githubConfig);
      expect(result.status).toBe(201);
    });

    it('returns 200 when no workflow runs exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflow_runs: [] }),
      });

      const result = await checkCiStatus(githubConfig);
      expect(result.status).toBe(200);
    });

    it('returns 502 when GitHub API fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' });

      const result = await checkCiStatus(githubConfig);
      expect(result.status).toBe(502);
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd packages/watchdog && npx vitest run __tests__/sensors.test.ts`
Expected: FAIL — module not found

**Step 4: Write implementation**

```typescript
// packages/watchdog/src/sensors/github-ci.ts
import type { SensorResult } from './types.js';

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export async function checkCiStatus(github: GitHubConfig): Promise<SensorResult> {
  const url = `https://api.github.com/repos/${github.owner}/${github.repo}/actions/runs?branch=main&per_page=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${github.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return {
        source: 'github-ci',
        status: response.status,
        payload: `GitHub API error: ${response.statusText}`,
        timestamp: Date.now(),
      };
    }

    const data = await response.json() as { workflow_runs: Array<{ conclusion: string | null; status?: string; html_url: string }> };
    const runs = data.workflow_runs;

    if (runs.length === 0) {
      return { source: 'github-ci', status: 200, timestamp: Date.now() };
    }

    const latest = runs[0];

    if (latest.conclusion === 'success') {
      return { source: 'github-ci', status: 200, timestamp: Date.now() };
    }

    if (latest.conclusion === null) {
      return {
        source: 'github-ci',
        status: 201,
        payload: `CI run in progress: ${latest.html_url}`,
        timestamp: Date.now(),
      };
    }

    return {
      source: 'github-ci',
      status: 500,
      payload: `CI ${latest.conclusion}: ${latest.html_url}`,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      source: 'github-ci',
      status: 503,
      payload: `Network error: ${(error as Error).message}`,
      timestamp: Date.now(),
    };
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd packages/watchdog && npx vitest run __tests__/sensors.test.ts`
Expected: PASS (all 5 tests)

**Step 6: Commit**

```bash
git add packages/watchdog/src/sensors/ packages/watchdog/__tests__/sensors.test.ts
git commit -m "feat(watchdog): GitHub CI sensor with status mapping"
```

---

### Task 6: GitHub PRs sensor

**Files:**
- Create: `packages/watchdog/src/sensors/github-prs.ts`
- Modify: `packages/watchdog/__tests__/sensors.test.ts`

**Step 1: Write the failing tests**

Append to `__tests__/sensors.test.ts`:

```typescript
import { checkPrStatus } from '../src/sensors/github-prs.js';

describe('github-prs', () => {
  it('returns 200 when no open PRs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    });

    const result = await checkPrStatus(githubConfig);
    expect(result.status).toBe(200);
  });

  it('returns 500 for Renovate PR older than 48h', async () => {
    const staleDate = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          title: 'chore(deps): update dependency',
          created_at: staleDate,
          html_url: 'https://github.com/pr/1',
          user: { login: 'renovate[bot]' },
          labels: [{ name: 'dependencies' }],
        },
      ]),
    });

    const result = await checkPrStatus(githubConfig);
    expect(result.status).toBe(500);
    expect(result.payload).toContain('Renovate');
  });

  it('returns 200 for fresh Renovate PR under 48h', async () => {
    const freshDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          title: 'chore(deps): update dependency',
          created_at: freshDate,
          html_url: 'https://github.com/pr/2',
          user: { login: 'renovate[bot]' },
          labels: [{ name: 'dependencies' }],
        },
      ]),
    });

    const result = await checkPrStatus(githubConfig);
    expect(result.status).toBe(200);
  });

  it('returns 502 when GitHub API fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' });

    const result = await checkPrStatus(githubConfig);
    expect(result.status).toBe(502);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/watchdog && npx vitest run __tests__/sensors.test.ts`
Expected: FAIL — checkPrStatus not found

**Step 3: Write implementation**

```typescript
// packages/watchdog/src/sensors/github-prs.ts
import type { SensorResult } from './types.js';

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

interface PullRequest {
  title: string;
  created_at: string;
  html_url: string;
  user: { login: string };
  labels: Array<{ name: string }>;
}

export async function checkPrStatus(github: GitHubConfig): Promise<SensorResult> {
  const url = `https://api.github.com/repos/${github.owner}/${github.repo}/pulls?state=open&per_page=30`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${github.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return {
        source: 'github-prs',
        status: response.status,
        payload: `GitHub API error: ${response.statusText}`,
        timestamp: Date.now(),
      };
    }

    const prs = await response.json() as PullRequest[];

    if (prs.length === 0) {
      return { source: 'github-prs', status: 200, timestamp: Date.now() };
    }

    const now = Date.now();
    const issues: string[] = [];

    for (const pr of prs) {
      const isRenovate = pr.user.login === 'renovate[bot]';
      const ageMs = now - new Date(pr.created_at).getTime();

      if (isRenovate && ageMs > STALE_THRESHOLD_MS) {
        issues.push(`Stale Renovate PR (${Math.floor(ageMs / 3600000)}h): ${pr.title} — ${pr.html_url}`);
      }
    }

    if (issues.length > 0) {
      return {
        source: 'github-prs',
        status: 500,
        payload: issues.join('\n'),
        timestamp: Date.now(),
      };
    }

    return { source: 'github-prs', status: 200, timestamp: Date.now() };
  } catch (error) {
    return {
      source: 'github-prs',
      status: 503,
      payload: `Network error: ${(error as Error).message}`,
      timestamp: Date.now(),
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/watchdog && npx vitest run __tests__/sensors.test.ts`
Expected: PASS (all 9 tests)

**Step 5: Create sensors index**

```typescript
// packages/watchdog/src/sensors/index.ts
import type { SensorResult } from './types.js';
import type { AppConfig } from '../config.js';
import { checkCiStatus } from './github-ci.js';
import { checkPrStatus } from './github-prs.js';

export type { SensorResult } from './types.js';

export async function runAllSensors(config: AppConfig): Promise<SensorResult[]> {
  const results = await Promise.all([
    checkCiStatus(config.github),
    checkPrStatus(config.github),
  ]);
  return results;
}
```

**Step 6: Commit**

```bash
git add packages/watchdog/src/sensors/ packages/watchdog/__tests__/sensors.test.ts
git commit -m "feat(watchdog): GitHub PR sensor and runAllSensors aggregator"
```

---

### Task 7: Heuristic classifier

**Files:**
- Create: `packages/watchdog/src/classifier.ts`
- Create: `packages/watchdog/__tests__/classifier.test.ts`

**Step 1: Write the failing tests**

```typescript
// packages/watchdog/__tests__/classifier.test.ts
import { describe, it, expect } from 'vitest';
import { classify } from '../src/classifier.js';
import type { SensorResult } from '../src/sensors/types.js';

function makeSensor(overrides: Partial<SensorResult>): SensorResult {
  return {
    source: 'github-ci',
    status: 200,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('classifier', () => {
  it('ignores with high confidence when status is 200', () => {
    const result = classify(makeSensor({ status: 200 }));
    expect(result.confidence).toBe('high');
    expect(result.severity).toBe('ignore');
  });

  it('escalates to action with high confidence when status is 500', () => {
    const result = classify(makeSensor({ status: 500, payload: 'CI failure' }));
    expect(result.confidence).toBe('high');
    expect(result.severity).toBe('action');
  });

  it('escalates to action with high confidence when status is 4xx', () => {
    const result = classify(makeSensor({ status: 403, payload: 'Forbidden' }));
    expect(result.confidence).toBe('high');
    expect(result.severity).toBe('action');
  });

  it('triages with low confidence when status is 201 (ambiguous)', () => {
    const result = classify(makeSensor({ status: 201, payload: 'in progress' }));
    expect(result.confidence).toBe('low');
    expect(result.severity).toBe('triage');
  });

  it('ignores @types Renovate PRs with high confidence even if stale', () => {
    const result = classify(makeSensor({
      source: 'github-prs',
      status: 500,
      payload: 'Stale Renovate PR (72h): chore(deps): update @types/node',
    }));
    expect(result.confidence).toBe('high');
    expect(result.severity).toBe('ignore');
    expect(result.reason).toContain('@types');
  });

  it('escalates non-@types Renovate PRs', () => {
    const result = classify(makeSensor({
      source: 'github-prs',
      status: 500,
      payload: 'Stale Renovate PR (72h): chore(deps): update eslint',
    }));
    expect(result.severity).toBe('action');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/watchdog && npx vitest run __tests__/classifier.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// packages/watchdog/src/classifier.ts
import type { SensorResult } from './sensors/types.js';

export interface ClassificationResult {
  confidence: 'high' | 'low';
  severity: 'ignore' | 'triage' | 'action';
  reason: string;
}

export function classify(signal: SensorResult): ClassificationResult {
  // Layer 1: Status 200 — everything is fine
  if (signal.status === 200) {
    return { confidence: 'high', severity: 'ignore', reason: 'Sensor reported OK' };
  }

  // Layer 1: Status 201 — ambiguous, needs triage
  if (signal.status === 201) {
    return {
      confidence: 'low',
      severity: 'triage',
      reason: `Ambiguous signal from ${signal.source}: ${signal.payload ?? 'no details'}`,
    };
  }

  // PR-specific heuristics
  if (signal.source === 'github-prs' && signal.payload) {
    // @types packages can wait longer
    if (signal.payload.includes('@types/')) {
      return {
        confidence: 'high',
        severity: 'ignore',
        reason: '@types dependency PR — low urgency, can wait',
      };
    }
  }

  // Default: 4xx/5xx — escalate
  return {
    confidence: 'high',
    severity: 'action',
    reason: `Error signal from ${signal.source}: status ${signal.status}`,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/watchdog && npx vitest run __tests__/classifier.test.ts`
Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add packages/watchdog/src/classifier.ts packages/watchdog/__tests__/classifier.test.ts
git commit -m "feat(watchdog): heuristic classifier with deterministic rules"
```

---

## Phase 3: LLM Layers

### Task 8: LLM module (Haiku triage + Sonnet action)

**Files:**
- Create: `packages/watchdog/src/llm.ts`
- Create: `packages/watchdog/__tests__/llm.test.ts`

**Step 1: Write the failing tests**

```typescript
// packages/watchdog/__tests__/llm.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triageWithHaiku, actWithSonnet } from '../src/llm.js';
import type { SensorResult } from '../src/sensors/types.js';

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

const signal: SensorResult = {
  source: 'github-ci',
  status: 201,
  payload: 'CI run in progress',
  timestamp: Date.now(),
};

describe('llm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('triageWithHaiku', () => {
    it('returns ignore when Haiku says ignore', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'IGNORE' }],
        usage: { input_tokens: 100, output_tokens: 10 },
      });

      const result = await triageWithHaiku(signal, 'ambiguous signal', 'sk-test');
      expect(result.decision).toBe('ignore');
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(10);
    });

    it('returns action when Haiku says action', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'ACTION' }],
        usage: { input_tokens: 100, output_tokens: 10 },
      });

      const result = await triageWithHaiku(signal, 'ambiguous signal', 'sk-test');
      expect(result.decision).toBe('action');
    });

    it('defaults to action on unparseable response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'I think maybe something' }],
        usage: { input_tokens: 100, output_tokens: 20 },
      });

      const result = await triageWithHaiku(signal, 'ambiguous signal', 'sk-test');
      expect(result.decision).toBe('action');
    });
  });

  describe('actWithSonnet', () => {
    it('returns event markdown and notification', async () => {
      const sonnetResponse = JSON.stringify({
        event: '# Event: CI In Progress\n\n- **Source:** github-ci\n- **Severity:** info',
        notification: {
          severity: 'info',
          summary: 'CI run in progress on main',
          link: 'https://github.com/run/1',
        },
      });

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: sonnetResponse }],
        usage: { input_tokens: 500, output_tokens: 150 },
      });

      const result = await actWithSonnet(signal, 'sensor(201) -> haiku(action)', 'sk-test', {
        soul: '# Soul',
        heartbeat: '# Heartbeat',
        memory: '# Memory',
      });

      expect(result.event).toContain('Event');
      expect(result.notification.severity).toBe('info');
      expect(result.notification.summary).toContain('CI');
      expect(result.inputTokens).toBe(500);
      expect(result.outputTokens).toBe(150);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/watchdog && npx vitest run __tests__/llm.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// packages/watchdog/src/llm.ts
import Anthropic from '@anthropic-ai/sdk';
import type { SensorResult } from './sensors/types.js';

export interface TriageResult {
  decision: 'ignore' | 'action';
  inputTokens: number;
  outputTokens: number;
}

export interface ActionResult {
  event: string;
  notification: {
    severity: 'info' | 'warning' | 'critical';
    summary: string;
    details?: string;
    link?: string;
  };
  inputTokens: number;
  outputTokens: number;
}

interface WorkspaceContext {
  soul: string;
  heartbeat: string;
  memory: string;
}

export async function triageWithHaiku(
  signal: SensorResult,
  heuristicReason: string,
  apiKey: string,
): Promise<TriageResult> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 50,
    messages: [{
      role: 'user',
      content: `You are a signal triage system. Classify this signal as IGNORE or ACTION. Respond with ONLY one word.

Signal source: ${signal.source}
Signal payload: ${signal.payload ?? 'none'}
Heuristic reason for uncertainty: ${heuristicReason}

Classification:`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text.trim().toUpperCase() : '';
  const decision = text === 'IGNORE' ? 'ignore' : 'action';

  return {
    decision,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

export async function actWithSonnet(
  signal: SensorResult,
  classificationChain: string,
  apiKey: string,
  workspace: WorkspaceContext,
): Promise<ActionResult> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `${workspace.soul}

---
${workspace.heartbeat}

---
## Current Memory
${workspace.memory}

---
## Signal Detected

Source: ${signal.source}
Status: ${signal.status}
Payload: ${signal.payload ?? 'none'}
Classification chain: ${classificationChain}

---
## Your Task

Generate a JSON response with:
1. "event": A markdown string for the event log file
2. "notification": An object with severity ("info"|"warning"|"critical"), summary (max 100 chars), optional details, optional link

Respond with ONLY valid JSON, no markdown fencing.`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
  const parsed = JSON.parse(text) as {
    event: string;
    notification: { severity: 'info' | 'warning' | 'critical'; summary: string; details?: string; link?: string };
  };

  return {
    event: parsed.event,
    notification: parsed.notification,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/watchdog && npx vitest run __tests__/llm.test.ts`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add packages/watchdog/src/llm.ts packages/watchdog/__tests__/llm.test.ts
git commit -m "feat(watchdog): LLM module with Haiku triage and Sonnet action layers"
```

---

## Phase 4: Telegram

### Task 9: Telegram bot (notify + commands)

**Files:**
- Create: `packages/watchdog/src/telegram.ts`
- Create: `packages/watchdog/__tests__/telegram.test.ts`

**Step 1: Write the failing tests**

```typescript
// packages/watchdog/__tests__/telegram.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatNotification, createTelegramBot } from '../src/telegram.js';

describe('telegram', () => {
  describe('formatNotification', () => {
    it('formats info message', () => {
      const msg = formatNotification({
        severity: 'info',
        summary: 'CI is green',
      });
      expect(msg).toContain('CI is green');
    });

    it('formats warning with link', () => {
      const msg = formatNotification({
        severity: 'warning',
        summary: 'Stale PR detected',
        link: 'https://github.com/pr/1',
      });
      expect(msg).toContain('Stale PR detected');
      expect(msg).toContain('https://github.com/pr/1');
    });

    it('formats critical with details and link', () => {
      const msg = formatNotification({
        severity: 'critical',
        summary: 'CI failed on main',
        details: 'TypeScript error in router.ts',
        link: 'https://github.com/run/1',
      });
      expect(msg).toContain('CI failed on main');
      expect(msg).toContain('TypeScript error');
      expect(msg).toContain('https://github.com/run/1');
    });
  });

  describe('createTelegramBot', () => {
    it('creates bot with sendNotification method', () => {
      const mockBot = {
        sendMessage: vi.fn().mockResolvedValue({}),
        onText: vi.fn(),
      };

      const bot = createTelegramBot(mockBot as any, '12345');
      expect(bot.sendNotification).toBeTypeOf('function');
    });

    it('sendNotification calls sendMessage with correct chat ID', async () => {
      const mockBot = {
        sendMessage: vi.fn().mockResolvedValue({}),
        onText: vi.fn(),
      };

      const bot = createTelegramBot(mockBot as any, '12345');
      await bot.sendNotification({
        severity: 'info',
        summary: 'Test message',
      });

      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '12345',
        expect.stringContaining('Test message'),
        expect.any(Object),
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/watchdog && npx vitest run __tests__/telegram.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// packages/watchdog/src/telegram.ts
import type TelegramBotApi from 'node-telegram-bot-api';

export interface Notification {
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  details?: string;
  link?: string;
}

const SEVERITY_ICON: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🚨',
};

export function formatNotification(notification: Notification): string {
  const icon = SEVERITY_ICON[notification.severity] ?? '';
  const lines = [`${icon} ${notification.summary}`];

  if (notification.details) {
    lines.push(notification.details);
  }
  if (notification.link) {
    lines.push(notification.link);
  }

  return lines.join('\n');
}

export interface WatchdogBot {
  sendNotification(notification: Notification): Promise<void>;
  registerCommands(handlers: CommandHandlers): void;
}

export interface CommandHandlers {
  onStatus: () => string;
  onStats: () => string;
  onInterval: (minutes: string) => string;
  onPause: () => string;
  onResume: () => string;
}

export function createTelegramBot(bot: TelegramBotApi, chatId: string): WatchdogBot {
  return {
    async sendNotification(notification: Notification) {
      const text = formatNotification(notification);
      await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    },

    registerCommands(handlers: CommandHandlers) {
      bot.onText(/\/status/, async (msg) => {
        if (String(msg.chat.id) !== chatId) return;
        await bot.sendMessage(chatId, handlers.onStatus());
      });

      bot.onText(/\/stats/, async (msg) => {
        if (String(msg.chat.id) !== chatId) return;
        await bot.sendMessage(chatId, handlers.onStats());
      });

      bot.onText(/\/interval (.+)/, async (msg, match) => {
        if (String(msg.chat.id) !== chatId) return;
        const response = handlers.onInterval(match?.[1] ?? '15m');
        await bot.sendMessage(chatId, response);
      });

      bot.onText(/\/pause/, async (msg) => {
        if (String(msg.chat.id) !== chatId) return;
        await bot.sendMessage(chatId, handlers.onPause());
      });

      bot.onText(/\/resume/, async (msg) => {
        if (String(msg.chat.id) !== chatId) return;
        await bot.sendMessage(chatId, handlers.onResume());
      });
    },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/watchdog && npx vitest run __tests__/telegram.test.ts`
Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add packages/watchdog/src/telegram.ts packages/watchdog/__tests__/telegram.test.ts
git commit -m "feat(watchdog): Telegram bot with notifications and command handlers"
```

---

## Phase 5: Stats & Workspace I/O

### Task 10: Workspace I/O (events, state, memory)

**Files:**
- Create: `packages/watchdog/src/workspace.ts`
- Create: `packages/watchdog/__tests__/workspace.test.ts`

**Step 1: Write the failing tests**

```typescript
// packages/watchdog/__tests__/workspace.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import {
  writeEvent,
  isDuplicate,
  loadHeartbeatState,
  saveHeartbeatState,
  loadWorkspaceFile,
} from '../src/workspace.js';

const TEST_DIR = path.join(import.meta.dirname, '__tmp_workspace__');

describe('workspace', () => {
  beforeEach(() => {
    mkdirSync(path.join(TEST_DIR, 'events'), { recursive: true });
    mkdirSync(path.join(TEST_DIR, 'stats'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('writeEvent', () => {
    it('writes markdown event file to events/', () => {
      const filePath = writeEvent(TEST_DIR, 'github-ci', 'action', '# CI Failed');
      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, 'utf8')).toContain('CI Failed');
    });
  });

  describe('isDuplicate', () => {
    it('returns false when no events exist', () => {
      expect(isDuplicate(TEST_DIR, 'github-ci', 4)).toBe(false);
    });

    it('returns true when recent event with same source exists', () => {
      writeEvent(TEST_DIR, 'github-ci', 'action', '# CI Failed');
      expect(isDuplicate(TEST_DIR, 'github-ci', 4)).toBe(true);
    });
  });

  describe('heartbeat state', () => {
    it('returns null when no state file exists', () => {
      const state = loadHeartbeatState(TEST_DIR);
      expect(state).toBeNull();
    });

    it('round-trips state through save and load', () => {
      const state = {
        currentInterval: 1800000,
        lastCheckTimestamp: Date.now(),
        lastActivityTimestamp: Date.now(),
        consecutiveOkCount: 3,
      };
      saveHeartbeatState(TEST_DIR, state);
      const loaded = loadHeartbeatState(TEST_DIR);
      expect(loaded).toEqual(state);
    });

    it('returns null on corrupt state file', () => {
      writeFileSync(path.join(TEST_DIR, 'heartbeat-state.json'), 'not json', 'utf8');
      const state = loadHeartbeatState(TEST_DIR);
      expect(state).toBeNull();
    });
  });

  describe('loadWorkspaceFile', () => {
    it('reads a markdown file from workspace', () => {
      writeFileSync(path.join(TEST_DIR, 'SOUL.md'), '# Soul', 'utf8');
      expect(loadWorkspaceFile(TEST_DIR, 'SOUL.md')).toBe('# Soul');
    });

    it('returns empty string for missing file', () => {
      expect(loadWorkspaceFile(TEST_DIR, 'MISSING.md')).toBe('');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/watchdog && npx vitest run __tests__/workspace.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// packages/watchdog/src/workspace.ts
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import type { HeartbeatState } from './heartbeat.js';

export function writeEvent(
  workspacePath: string,
  source: string,
  severity: string,
  content: string,
): string {
  const eventsDir = path.join(workspacePath, 'events');
  mkdirSync(eventsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}_${source}.md`;
  const filePath = path.join(eventsDir, filename);

  writeFileSync(filePath, content, 'utf8');
  return filePath;
}

export function isDuplicate(
  workspacePath: string,
  source: string,
  windowHours: number,
): boolean {
  const eventsDir = path.join(workspacePath, 'events');
  if (!existsSync(eventsDir)) return false;

  const files = readdirSync(eventsDir).filter(f => f.endsWith('.md') && f.includes(`_${source}`));
  if (files.length === 0) return false;

  const now = Date.now();
  const windowMs = windowHours * 60 * 60 * 1000;

  for (const file of files) {
    const filePath = path.join(eventsDir, file);
    const stat = statSync(filePath);
    if (now - stat.mtimeMs < windowMs) {
      return true;
    }
  }

  return false;
}

export function loadHeartbeatState(workspacePath: string): HeartbeatState | null {
  const filePath = path.join(workspacePath, 'heartbeat-state.json');
  if (!existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as HeartbeatState;
  } catch {
    return null;
  }
}

export function saveHeartbeatState(workspacePath: string, state: HeartbeatState): void {
  const filePath = path.join(workspacePath, 'heartbeat-state.json');
  writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}

export function loadWorkspaceFile(workspacePath: string, filename: string): string {
  const filePath = path.join(workspacePath, filename);
  if (!existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf8');
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/watchdog && npx vitest run __tests__/workspace.test.ts`
Expected: PASS (all 7 tests)

**Step 5: Commit**

```bash
git add packages/watchdog/src/workspace.ts packages/watchdog/__tests__/workspace.test.ts
git commit -m "feat(watchdog): workspace I/O for events, heartbeat state, and file loading"
```

---

### Task 11: Stats tracking

**Files:**
- Create: `packages/watchdog/src/stats.ts`
- Create: `packages/watchdog/__tests__/stats.test.ts`

**Step 1: Write the failing tests**

```typescript
// packages/watchdog/__tests__/stats.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  createDailyStats,
  recordSensorCheck,
  recordHaikuCall,
  recordSonnetCall,
  recordHeartbeatCheck,
  persistDailyStats,
  loadDailyStats,
  computeCost,
  formatStatsReport,
} from '../src/stats.js';

const TEST_DIR = path.join(import.meta.dirname, '__tmp_stats__');

describe('stats', () => {
  beforeEach(() => {
    mkdirSync(path.join(TEST_DIR, 'stats'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('createDailyStats', () => {
    it('creates empty stats for today', () => {
      const stats = createDailyStats();
      expect(stats.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(stats.layers.sensor.checks).toBe(0);
    });
  });

  describe('recording', () => {
    it('increments sensor checks and filtered count', () => {
      const stats = createDailyStats();
      recordSensorCheck(stats, true);
      expect(stats.layers.sensor.checks).toBe(1);
      expect(stats.layers.sensor.filtered).toBe(1);

      recordSensorCheck(stats, false);
      expect(stats.layers.sensor.checks).toBe(2);
      expect(stats.layers.sensor.escalated).toBe(1);
    });

    it('records Haiku token usage', () => {
      const stats = createDailyStats();
      recordHaikuCall(stats, 100, 20, false);
      expect(stats.layers.haiku.checks).toBe(1);
      expect(stats.layers.haiku.inputTokens).toBe(100);
      expect(stats.layers.haiku.outputTokens).toBe(20);
      expect(stats.layers.haiku.filtered).toBe(1);
    });

    it('records Sonnet token usage', () => {
      const stats = createDailyStats();
      recordSonnetCall(stats, 500, 150);
      expect(stats.layers.sonnet.checks).toBe(1);
      expect(stats.layers.sonnet.inputTokens).toBe(500);
    });

    it('records heartbeat check', () => {
      const stats = createDailyStats();
      recordHeartbeatCheck(stats, 900000);
      expect(stats.heartbeat.totalChecks).toBe(1);
    });
  });

  describe('computeCost', () => {
    it('computes cost from token counts', () => {
      const stats = createDailyStats();
      recordHaikuCall(stats, 1000, 100, false);
      recordSonnetCall(stats, 1000, 100);
      const cost = computeCost(stats);
      expect(cost.total).toBeGreaterThan(0);
      expect(cost.haiku).toBeGreaterThan(0);
      expect(cost.sonnet).toBeGreaterThan(0);
    });
  });

  describe('persistence', () => {
    it('round-trips through persist and load', () => {
      const stats = createDailyStats();
      recordSensorCheck(stats, true);
      persistDailyStats(TEST_DIR, stats);

      const loaded = loadDailyStats(TEST_DIR, stats.date);
      expect(loaded).toBeTruthy();
      expect(loaded!.layers.sensor.checks).toBe(1);
    });

    it('returns null for missing date', () => {
      expect(loadDailyStats(TEST_DIR, '2020-01-01')).toBeNull();
    });
  });

  describe('formatStatsReport', () => {
    it('returns human-readable summary', () => {
      const stats = createDailyStats();
      recordSensorCheck(stats, true);
      recordSensorCheck(stats, false);
      recordHaikuCall(stats, 100, 20, false);
      const report = formatStatsReport(stats);
      expect(report).toContain('Sensor');
      expect(report).toContain('Haiku');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/watchdog && npx vitest run __tests__/stats.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// packages/watchdog/src/stats.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

// Pricing per million tokens (as of 2026 — update if changed)
const HAIKU_INPUT_COST = 0.80;
const HAIKU_OUTPUT_COST = 4.00;
const SONNET_INPUT_COST = 3.00;
const SONNET_OUTPUT_COST = 15.00;

export interface LayerStats {
  checks: number;
  filtered: number;
  escalated: number;
  inputTokens: number;
  outputTokens: number;
}

export interface DailyStats {
  date: string;
  layers: {
    sensor: LayerStats;
    heuristic: LayerStats;
    haiku: LayerStats;
    sonnet: LayerStats;
  };
  heartbeat: {
    totalChecks: number;
    intervalSumMs: number;
    activityResets: number;
  };
}

export interface CostBreakdown {
  haiku: number;
  sonnet: number;
  total: number;
}

function emptyLayer(): LayerStats {
  return { checks: 0, filtered: 0, escalated: 0, inputTokens: 0, outputTokens: 0 };
}

export function createDailyStats(): DailyStats {
  return {
    date: new Date().toISOString().slice(0, 10),
    layers: {
      sensor: emptyLayer(),
      heuristic: emptyLayer(),
      haiku: emptyLayer(),
      sonnet: emptyLayer(),
    },
    heartbeat: { totalChecks: 0, intervalSumMs: 0, activityResets: 0 },
  };
}

export function recordSensorCheck(stats: DailyStats, filtered: boolean): void {
  stats.layers.sensor.checks++;
  if (filtered) stats.layers.sensor.filtered++;
  else stats.layers.sensor.escalated++;
}

export function recordHaikuCall(
  stats: DailyStats, inputTokens: number, outputTokens: number, escalated: boolean,
): void {
  stats.layers.haiku.checks++;
  stats.layers.haiku.inputTokens += inputTokens;
  stats.layers.haiku.outputTokens += outputTokens;
  if (escalated) stats.layers.haiku.escalated++;
  else stats.layers.haiku.filtered++;
}

export function recordSonnetCall(
  stats: DailyStats, inputTokens: number, outputTokens: number,
): void {
  stats.layers.sonnet.checks++;
  stats.layers.sonnet.inputTokens += inputTokens;
  stats.layers.sonnet.outputTokens += outputTokens;
}

export function recordHeartbeatCheck(stats: DailyStats, intervalMs: number): void {
  stats.heartbeat.totalChecks++;
  stats.heartbeat.intervalSumMs += intervalMs;
}

export function computeCost(stats: DailyStats): CostBreakdown {
  const haiku =
    (stats.layers.haiku.inputTokens / 1_000_000) * HAIKU_INPUT_COST +
    (stats.layers.haiku.outputTokens / 1_000_000) * HAIKU_OUTPUT_COST;

  const sonnet =
    (stats.layers.sonnet.inputTokens / 1_000_000) * SONNET_INPUT_COST +
    (stats.layers.sonnet.outputTokens / 1_000_000) * SONNET_OUTPUT_COST;

  return { haiku, sonnet, total: haiku + sonnet };
}

export function persistDailyStats(workspacePath: string, stats: DailyStats): void {
  const dir = path.join(workspacePath, 'stats');
  mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `daily-${stats.date}.json`);
  writeFileSync(filePath, JSON.stringify(stats, null, 2), 'utf8');
}

export function loadDailyStats(workspacePath: string, date: string): DailyStats | null {
  const filePath = path.join(workspacePath, 'stats', `daily-${date}.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as DailyStats;
  } catch {
    return null;
  }
}

export function formatStatsReport(stats: DailyStats): string {
  const cost = computeCost(stats);
  const lines = [
    `Date: ${stats.date}`,
    ``,
    `Sensor: ${stats.layers.sensor.checks} checks, ${stats.layers.sensor.filtered} filtered, ${stats.layers.sensor.escalated} escalated`,
    `Heuristic: ${stats.layers.heuristic.checks} checks, ${stats.layers.heuristic.filtered} filtered`,
    `Haiku: ${stats.layers.haiku.checks} calls, ${stats.layers.haiku.inputTokens} in / ${stats.layers.haiku.outputTokens} out tokens`,
    `Sonnet: ${stats.layers.sonnet.checks} calls, ${stats.layers.sonnet.inputTokens} in / ${stats.layers.sonnet.outputTokens} out tokens`,
    ``,
    `Cost: $${cost.total.toFixed(4)} (Haiku: $${cost.haiku.toFixed(4)}, Sonnet: $${cost.sonnet.toFixed(4)})`,
    `Heartbeat: ${stats.heartbeat.totalChecks} checks`,
  ];
  return lines.join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/watchdog && npx vitest run __tests__/stats.test.ts`
Expected: PASS (all 8 tests)

**Step 5: Commit**

```bash
git add packages/watchdog/src/stats.ts packages/watchdog/__tests__/stats.test.ts
git commit -m "feat(watchdog): stats tracking with per-layer token/cost accounting"
```

---

### Task 12: Main entry point (pipeline orchestration)

**Files:**
- Modify: `packages/watchdog/src/index.ts`

**Step 1: Write the main loop**

```typescript
// packages/watchdog/src/index.ts
import TelegramBot from 'node-telegram-bot-api';
import { loadConfig } from './config.js';
import { createInitialState, computeNextInterval, isInActiveHours } from './heartbeat.js';
import type { HeartbeatState } from './heartbeat.js';
import { runAllSensors } from './sensors/index.js';
import { classify } from './classifier.js';
import { triageWithHaiku, actWithSonnet } from './llm.js';
import { createTelegramBot } from './telegram.js';
import type { CommandHandlers } from './telegram.js';
import {
  writeEvent,
  isDuplicate,
  loadHeartbeatState,
  saveHeartbeatState,
  loadWorkspaceFile,
} from './workspace.js';
import {
  createDailyStats,
  recordSensorCheck,
  recordHaikuCall,
  recordSonnetCall,
  recordHeartbeatCheck,
  persistDailyStats,
  computeCost,
  formatStatsReport,
} from './stats.js';
import type { DailyStats } from './stats.js';

const config = loadConfig(process.env as Record<string, string>);

// State
let heartbeatState: HeartbeatState =
  loadHeartbeatState(config.workspacePath) ?? createInitialState(config.heartbeat);
let dailyStats: DailyStats = createDailyStats();
let paused = false;
const startedAt = Date.now();

// Telegram
const telegramBot = new TelegramBot(config.telegram.botToken, { polling: true });
const bot = createTelegramBot(telegramBot, config.telegram.chatId);

const commands: CommandHandlers = {
  onStatus: () => {
    const uptime = Math.floor((Date.now() - startedAt) / 1000);
    return [
      `Uptime: ${uptime}s`,
      `Interval: ${Math.floor(heartbeatState.currentInterval / 60000)}m`,
      `Consecutive OK: ${heartbeatState.consecutiveOkCount}`,
      `Paused: ${paused}`,
    ].join('\n');
  },
  onStats: () => formatStatsReport(dailyStats),
  onInterval: (min: string) => {
    const ms = parseInt(min) * 60 * 1000;
    if (isNaN(ms) || ms < 60000) return 'Invalid interval. Use minutes (e.g. "30")';
    heartbeatState = { ...heartbeatState, currentInterval: ms };
    return `Interval set to ${min}m`;
  },
  onPause: () => { paused = true; return 'Heartbeat paused'; },
  onResume: () => {
    paused = false;
    heartbeatState = computeNextInterval(heartbeatState, 'reset', config.heartbeat);
    return 'Heartbeat resumed, interval reset';
  },
};

bot.registerCommands(commands);

// Pipeline
async function runPipeline(): Promise<'ok' | 'alert'> {
  const signals = await runAllSensors(config);
  let hadAlert = false;

  for (const signal of signals) {
    const classification = classify(signal);
    recordSensorCheck(dailyStats, classification.severity === 'ignore');

    if (classification.severity === 'ignore') continue;

    // Triage with Haiku if low confidence
    if (classification.confidence === 'low') {
      const triage = await triageWithHaiku(
        signal, classification.reason, config.anthropic.apiKey,
      );
      recordHaikuCall(dailyStats, triage.inputTokens, triage.outputTokens, triage.decision === 'action');
      if (triage.decision === 'ignore') continue;
    }

    // Action with Sonnet
    const chain = `sensor(${signal.status}) -> classifier(${classification.severity}) -> sonnet`;
    const workspace = {
      soul: loadWorkspaceFile(config.workspacePath, 'SOUL.md'),
      heartbeat: loadWorkspaceFile(config.workspacePath, 'HEARTBEAT.md'),
      memory: loadWorkspaceFile(config.workspacePath, 'MEMORY.md'),
    };

    const action = await actWithSonnet(signal, chain, config.anthropic.apiKey, workspace);
    recordSonnetCall(dailyStats, action.inputTokens, action.outputTokens);

    // Deduplication check
    if (!isDuplicate(config.workspacePath, signal.source, 4)) {
      writeEvent(config.workspacePath, signal.source, 'action', action.event);
      await bot.sendNotification(action.notification);
    }

    hadAlert = true;
  }

  return hadAlert ? 'alert' : 'ok';
}

// Main loop
async function loop(): Promise<void> {
  console.log(`Guild Watchdog started. Interval: ${heartbeatState.currentInterval / 60000}m`);

  while (true) {
    if (paused || !isInActiveHours(config.heartbeat, new Date())) {
      await sleep(60_000); // Check every minute when paused/inactive
      continue;
    }

    try {
      const result = await runPipeline();
      heartbeatState = computeNextInterval(heartbeatState, result, config.heartbeat);
      recordHeartbeatCheck(dailyStats, heartbeatState.currentInterval);

      // Roll over stats at midnight
      const today = new Date().toISOString().slice(0, 10);
      if (dailyStats.date !== today) {
        persistDailyStats(config.workspacePath, dailyStats);
        dailyStats = createDailyStats();
      }
    } catch (error) {
      console.error('Pipeline error:', (error as Error).message);
      heartbeatState = computeNextInterval(heartbeatState, 'alert', config.heartbeat);
    }

    saveHeartbeatState(config.workspacePath, heartbeatState);
    persistDailyStats(config.workspacePath, dailyStats);

    console.log(`Next check in ${Math.floor(heartbeatState.currentInterval / 60000)}m`);
    await sleep(heartbeatState.currentInterval);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

loop().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

**Step 2: Verify TypeScript compiles**

Run: `cd packages/watchdog && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/watchdog/src/index.ts
git commit -m "feat(watchdog): main entry point with pipeline loop and Telegram integration"
```

---

## Phase 6: Deploy & CI Integration

### Task 13: PM2 ecosystem config

**Files:**
- Create: `packages/watchdog/ecosystem.config.cjs`

**Step 1: Create config**

```javascript
// packages/watchdog/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'guild-watchdog',
    script: 'dist/index.js',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production',
    },
    max_restarts: 10,
    restart_delay: 5000,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    out_file: 'logs/watchdog-out.log',
    error_file: 'logs/watchdog-error.log',
    merge_logs: true,
  }],
};
```

**Step 2: Commit**

```bash
git add packages/watchdog/ecosystem.config.cjs
git commit -m "feat(watchdog): PM2 ecosystem config for production deployment"
```

---

### Task 14: CI workflow integration

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1: Add watchdog job to CI**

Add a new job to the existing CI workflow:

```yaml
  watchdog-lint-and-test:
    name: Watchdog — Lint & Test
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x, 22.x]

    defaults:
      run:
        working-directory: packages/watchdog

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Test with coverage
        run: npx vitest run --coverage
```

**Step 2: Run existing Guild CI locally to ensure no breakage**

Run: `npm test && npm run lint`
Expected: All 553 tests pass, lint clean

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add watchdog lint and test job to CI workflow"
```

---

### Task 15: Deploy script and documentation

**Files:**
- Create: `packages/watchdog/scripts/deploy.sh`
- Create: `packages/watchdog/README.md`
- Create: `packages/watchdog/.env.example`

**Step 1: Create .env.example**

```bash
# packages/watchdog/.env.example
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=Guild-Agents
GITHUB_REPO=guild
ANTHROPIC_API_KEY=sk-ant-your_key_here
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
WATCHDOG_WORKSPACE_PATH=workspace
```

**Step 2: Create deploy script**

```bash
#!/usr/bin/env bash
# packages/watchdog/scripts/deploy.sh
# Usage: ./scripts/deploy.sh user@host

set -euo pipefail

HOST="${1:?Usage: deploy.sh user@host}"
REMOTE_DIR="/opt/guild-watchdog"

echo "Building..."
npm run build

echo "Deploying to $HOST..."
rsync -avz --delete \
  dist/ \
  package.json \
  package-lock.json \
  ecosystem.config.cjs \
  workspace/SOUL.md \
  workspace/HEARTBEAT.md \
  workspace/MEMORY.md.template \
  "$HOST:$REMOTE_DIR/"

echo "Installing production deps and restarting..."
ssh "$HOST" "cd $REMOTE_DIR && npm install --production && pm2 restart ecosystem.config.cjs"

echo "Done. Check with: ssh $HOST 'pm2 logs guild-watchdog --lines 20'"
```

**Step 3: Create README.md**

```markdown
# Guild Watchdog

Autonomous maintenance agent for the Guild project. Monitors GitHub CI, PRs,
and npm packages using adaptive heartbeat with tiered model routing.

## Quick Start

1. Copy `.env.example` to `.env` and fill in values
2. `npm install`
3. `npm run dev` (development with tsx)
4. `npm run build && node dist/index.js` (production)

## Deploy

```bash
./scripts/deploy.sh user@your-vps-ip
```

Requires PM2 and Node.js 20+ on the VPS.

## Architecture

Three-layer classification pipeline:
- **Layer 1 (Sensors):** GitHub API checks — $0
- **Layer 2 (Heuristics):** Deterministic rules — $0
- **Layer 3 (LLM):** Haiku triage + Sonnet action — only when needed

## Telegram Commands

- `/status` — Current state
- `/stats` — Cost and usage report
- `/interval <min>` — Set check interval
- `/pause` / `/resume` — Control heartbeat

## Testing

```bash
npm test              # Run tests
npm run test:coverage # With coverage
```
```

**Step 4: Make deploy script executable and commit**

```bash
chmod +x packages/watchdog/scripts/deploy.sh
git add packages/watchdog/scripts/ packages/watchdog/README.md packages/watchdog/.env.example
git commit -m "feat(watchdog): deploy script, README, and env example"
```

---

### Task 16: Digital Ocean VPS provisioning

**Manual steps (not automated):**

1. Create a Digital Ocean Droplet (basic, $6/month, Ubuntu 24.04)
2. SSH in, install Node.js 20+:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. Install PM2:
   ```bash
   sudo npm install -g pm2
   pm2 startup systemd
   ```
4. Create directory and .env:
   ```bash
   sudo mkdir -p /opt/guild-watchdog
   sudo chown $USER /opt/guild-watchdog
   # Copy .env with real secrets
   ```
5. Create Telegram bot with BotFather, get token and chat ID
6. Create GitHub personal access token with `repo:status` and `public_repo` scopes
7. Deploy: `./scripts/deploy.sh user@vps-ip`
8. Verify: `ssh user@vps-ip 'pm2 logs guild-watchdog --lines 20'`
9. Start 48h burn-in, check `/stats` via Telegram daily

---

## Summary

| Phase | Tasks | Tests |
|-------|-------|-------|
| 1. Skeleton | Tasks 1-4 (project, workspace, config, heartbeat) | ~12 tests |
| 2. Sensors | Tasks 5-7 (CI sensor, PR sensor, classifier) | ~15 tests |
| 3. LLM | Task 8 (Haiku + Sonnet) | ~4 tests |
| 4. Telegram | Task 9 (bot + commands) | ~5 tests |
| 5. Stats & I/O | Tasks 10-12 (workspace, stats, main loop) | ~15 tests |
| 6. Deploy | Tasks 13-16 (PM2, CI, deploy, VPS) | 0 (infra) |
| **Total** | **16 tasks** | **~51 tests** |
