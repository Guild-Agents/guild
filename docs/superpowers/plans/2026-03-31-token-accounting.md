# Token Accounting & `guild stats` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `guild stats` CLI command that tracks token usage and costs across Guild workflow executions, with historical aggregation and profile comparisons.

**Architecture:** Three modules — `pricing.js` (model pricing table), `accounting.js` (usage recording, persistence, aggregation), and `stats.js` (CLI command with formatting). Data persists in `.claude/guild/usage.json`. No runtime dispatch integration yet — `accounting.recordStep()` is callable but not auto-wired.

**Tech Stack:** Node.js ESModules, Commander.js, @clack/prompts, chalk, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/pricing.js` | Create | Model pricing table, cost calculation |
| `src/utils/pricing.test.js` → `src/utils/__tests__/pricing.test.js` | Create | Tests for pricing |
| `src/utils/accounting.js` | Create | Usage recording, persistence, aggregation |
| `src/utils/__tests__/accounting.test.js` | Create | Tests for accounting |
| `src/commands/stats.js` | Create | `guild stats` CLI command |
| `src/commands/__tests__/stats.test.js` | Create | Tests for stats command |
| `bin/guild.js` | Modify | Register `stats` command |

---

### Task 1: Pricing Module

**Files:**
- Create: `src/utils/pricing.js`
- Create: `src/utils/__tests__/pricing.test.js`

- [ ] **Step 1: Write failing tests for pricing**

```javascript
// src/utils/__tests__/pricing.test.js
import { describe, it, expect } from 'vitest';
import { estimateCost, getModelShortName, DEFAULT_PRICING } from '../pricing.js';

describe('DEFAULT_PRICING', () => {
  it('has pricing for opus, sonnet, and haiku', () => {
    expect(DEFAULT_PRICING['claude-opus-4-6']).toBeDefined();
    expect(DEFAULT_PRICING['claude-sonnet-4-5']).toBeDefined();
    expect(DEFAULT_PRICING['claude-haiku-4-5']).toBeDefined();
  });

  it('each model has input and output prices', () => {
    for (const model of Object.keys(DEFAULT_PRICING)) {
      expect(DEFAULT_PRICING[model].input).toBeTypeOf('number');
      expect(DEFAULT_PRICING[model].output).toBeTypeOf('number');
    }
  });
});

describe('estimateCost', () => {
  it('calculates cost for known model', () => {
    // 1000 input tokens of Haiku at $0.80/M = $0.0008
    // 500 output tokens of Haiku at $4.00/M = $0.002
    const cost = estimateCost('claude-haiku-4-5', 1000, 500);
    expect(cost).toBeCloseTo(0.0028, 4);
  });

  it('calculates cost for opus', () => {
    // 10000 input at $15/M = $0.15
    // 5000 output at $75/M = $0.375
    const cost = estimateCost('claude-opus-4-6', 10000, 5000);
    expect(cost).toBeCloseTo(0.525, 3);
  });

  it('returns 0 for unknown model', () => {
    const cost = estimateCost('unknown-model', 1000, 500);
    expect(cost).toBe(0);
  });

  it('returns 0 for zero tokens', () => {
    const cost = estimateCost('claude-sonnet-4-5', 0, 0);
    expect(cost).toBe(0);
  });
});

describe('getModelShortName', () => {
  it('returns short names for known models', () => {
    expect(getModelShortName('claude-opus-4-6')).toBe('Opus');
    expect(getModelShortName('claude-sonnet-4-5')).toBe('Sonnet');
    expect(getModelShortName('claude-haiku-4-5')).toBe('Haiku');
  });

  it('returns model id for unknown models', () => {
    expect(getModelShortName('gemini-2.5-pro')).toBe('gemini-2.5-pro');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/pricing.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement pricing module**

```javascript
// src/utils/pricing.js
/**
 * pricing.js — Model pricing table and cost calculation.
 *
 * Prices per million tokens (USD).
 * Source: https://docs.anthropic.com/en/docs/about-claude/models
 */

export const DEFAULT_PRICING = {
  'claude-opus-4-6': { input: 15.00, output: 75.00 },
  'claude-sonnet-4-5': { input: 3.00, output: 15.00 },
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
};

const SHORT_NAMES = {
  'claude-opus-4-6': 'Opus',
  'claude-sonnet-4-5': 'Sonnet',
  'claude-haiku-4-5': 'Haiku',
};

/**
 * Estimates cost in USD for a given model and token counts.
 * Returns 0 for unknown models.
 * @param {string} model - Model ID (e.g. 'claude-opus-4-6')
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {number} Estimated cost in USD
 */
export function estimateCost(model, inputTokens, outputTokens) {
  const pricing = DEFAULT_PRICING[model];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

/**
 * Returns a human-friendly short name for a model.
 * @param {string} model - Model ID
 * @returns {string}
 */
export function getModelShortName(model) {
  return SHORT_NAMES[model] || model;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/pricing.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/pricing.js src/utils/__tests__/pricing.test.js
git commit -m "feat(stats): add pricing module with model cost calculation"
```

---

### Task 2: Accounting Module — Core Functions

**Files:**
- Create: `src/utils/accounting.js`
- Create: `src/utils/__tests__/accounting.test.js`

- [ ] **Step 1: Write failing tests for recordStep and persistence**

```javascript
// src/utils/__tests__/accounting.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, mkdtempSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  createEntry,
  loadUsage,
  saveUsage,
  recordStep,
  emptyUsage,
} from '../accounting.js';

describe('createEntry', () => {
  it('creates a usage entry with estimated cost', () => {
    const entry = createEntry({
      workflow: 'build-feature',
      agent: 'tech-lead',
      tier: 'reasoning',
      model: 'claude-opus-4-6',
      inputTokens: 10000,
      outputTokens: 5000,
    });
    expect(entry.workflow).toBe('build-feature');
    expect(entry.agent).toBe('tech-lead');
    expect(entry.tier).toBe('reasoning');
    expect(entry.model).toBe('claude-opus-4-6');
    expect(entry.inputTokens).toBe(10000);
    expect(entry.outputTokens).toBe(5000);
    expect(entry.totalTokens).toBe(15000);
    expect(entry.estimatedCostUSD).toBeCloseTo(0.525, 3);
    expect(entry.timestamp).toBeDefined();
  });
});

describe('persistence', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'guild-accounting-'));
    mkdirSync(join(tempDir, '.claude', 'guild'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('loadUsage returns empty usage when file does not exist', () => {
    const usage = loadUsage(tempDir);
    expect(usage.version).toBe(1);
    expect(usage.entries).toEqual([]);
    expect(usage.totals.totalTokens).toBe(0);
  });

  it('saveUsage creates file and loadUsage reads it back', () => {
    const usage = emptyUsage();
    usage.entries.push(createEntry({
      workflow: 'review',
      agent: 'code-reviewer',
      tier: 'reasoning',
      model: 'claude-opus-4-6',
      inputTokens: 5000,
      outputTokens: 2000,
    }));
    saveUsage(tempDir, usage);

    const usagePath = join(tempDir, '.claude', 'guild', 'usage.json');
    expect(existsSync(usagePath)).toBe(true);

    const loaded = loadUsage(tempDir);
    expect(loaded.entries).toHaveLength(1);
    expect(loaded.entries[0].workflow).toBe('review');
  });

  it('recordStep adds entry and updates totals', () => {
    recordStep(tempDir, {
      workflow: 'build-feature',
      agent: 'advisor',
      tier: 'reasoning',
      model: 'claude-opus-4-6',
      inputTokens: 12500,
      outputTokens: 3200,
    });

    const usage = loadUsage(tempDir);
    expect(usage.entries).toHaveLength(1);
    expect(usage.totals.totalTokens).toBe(15700);
    expect(usage.totals.totalInputTokens).toBe(12500);
    expect(usage.totals.totalOutputTokens).toBe(3200);
    expect(usage.totals.tokensByModel['claude-opus-4-6']).toBe(15700);
    expect(usage.totals.tokensByTier['reasoning']).toBe(15700);
    expect(usage.totals.tokensByWorkflow['build-feature']).toBe(15700);
    expect(usage.totals.workflowCount).toBe(1);
  });

  it('recordStep accumulates across multiple calls', () => {
    recordStep(tempDir, {
      workflow: 'build-feature',
      agent: 'advisor',
      tier: 'reasoning',
      model: 'claude-opus-4-6',
      inputTokens: 10000,
      outputTokens: 3000,
    });
    recordStep(tempDir, {
      workflow: 'build-feature',
      agent: 'developer',
      tier: 'execution',
      model: 'claude-sonnet-4-5',
      inputTokens: 20000,
      outputTokens: 8000,
    });

    const usage = loadUsage(tempDir);
    expect(usage.entries).toHaveLength(2);
    expect(usage.totals.totalTokens).toBe(41000);
    expect(usage.totals.tokensByModel['claude-opus-4-6']).toBe(13000);
    expect(usage.totals.tokensByModel['claude-sonnet-4-5']).toBe(28000);
    expect(usage.totals.tokensByTier['reasoning']).toBe(13000);
    expect(usage.totals.tokensByTier['execution']).toBe(28000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/accounting.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement accounting module**

```javascript
// src/utils/accounting.js
/**
 * accounting.js — Token usage recording, persistence, and aggregation.
 *
 * Persists usage data to .claude/guild/usage.json.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { estimateCost } from './pricing.js';

const USAGE_PATH = join('.claude', 'guild', 'usage.json');

/**
 * Returns an empty usage object.
 * @returns {object}
 */
export function emptyUsage() {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    entries: [],
    totals: {
      totalTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUSD: 0,
      tokensByModel: {},
      tokensByTier: {},
      tokensByWorkflow: {},
      workflowCount: 0,
    },
  };
}

/**
 * Creates a usage entry with estimated cost.
 * @param {object} params
 * @param {string} params.workflow
 * @param {string} params.agent
 * @param {string} params.tier
 * @param {string} params.model
 * @param {number} params.inputTokens
 * @param {number} params.outputTokens
 * @returns {object}
 */
export function createEntry({ workflow, agent, tier, model, inputTokens, outputTokens }) {
  const totalTokens = inputTokens + outputTokens;
  return {
    timestamp: new Date().toISOString(),
    workflow,
    agent,
    tier,
    model,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUSD: estimateCost(model, inputTokens, outputTokens),
  };
}

/**
 * Loads usage data from disk. Returns empty usage if file doesn't exist.
 * @param {string} root - Project root directory
 * @returns {object}
 */
export function loadUsage(root) {
  const filePath = join(root, USAGE_PATH);
  if (!existsSync(filePath)) return emptyUsage();
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return emptyUsage();
  }
}

/**
 * Saves usage data to disk.
 * @param {string} root - Project root directory
 * @param {object} usage
 */
export function saveUsage(root, usage) {
  const filePath = join(root, USAGE_PATH);
  mkdirSync(dirname(filePath), { recursive: true });
  usage.lastUpdated = new Date().toISOString();
  writeFileSync(filePath, JSON.stringify(usage, null, 2) + '\n');
}

/**
 * Updates totals with a new entry.
 * @param {object} totals
 * @param {object} entry
 */
function updateTotals(totals, entry) {
  totals.totalTokens += entry.totalTokens;
  totals.totalInputTokens += entry.inputTokens;
  totals.totalOutputTokens += entry.outputTokens;
  totals.totalCostUSD += entry.estimatedCostUSD;
  totals.tokensByModel[entry.model] = (totals.tokensByModel[entry.model] || 0) + entry.totalTokens;
  totals.tokensByTier[entry.tier] = (totals.tokensByTier[entry.tier] || 0) + entry.totalTokens;
  totals.tokensByWorkflow[entry.workflow] = (totals.tokensByWorkflow[entry.workflow] || 0) + entry.totalTokens;
  totals.workflowCount += 1;
}

/**
 * Records a step's token usage: creates entry, appends to usage, updates totals, saves.
 * @param {string} root - Project root directory
 * @param {object} params - Same as createEntry params
 */
export function recordStep(root, params) {
  const usage = loadUsage(root);
  const entry = createEntry(params);
  usage.entries.push(entry);
  updateTotals(usage.totals, entry);
  saveUsage(root, usage);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/accounting.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/accounting.js src/utils/__tests__/accounting.test.js
git commit -m "feat(stats): add accounting module with usage recording and persistence"
```

---

### Task 3: Accounting Module — Aggregation

**Files:**
- Modify: `src/utils/accounting.js`
- Modify: `src/utils/__tests__/accounting.test.js`

- [ ] **Step 1: Write failing tests for aggregate and estimateWithProfile**

Append to `src/utils/__tests__/accounting.test.js`:

```javascript
import { aggregate, estimateWithProfile } from '../accounting.js';

describe('aggregate', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'guild-agg-'));
    mkdirSync(join(tempDir, '.claude', 'guild'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns empty totals when no entries', () => {
    const result = aggregate(tempDir, 'all');
    expect(result.totalTokens).toBe(0);
    expect(result.workflowCount).toBe(0);
  });

  it('aggregate all returns totals across all entries', () => {
    recordStep(tempDir, {
      workflow: 'build-feature', agent: 'advisor', tier: 'reasoning',
      model: 'claude-opus-4-6', inputTokens: 10000, outputTokens: 3000,
    });
    recordStep(tempDir, {
      workflow: 'review', agent: 'code-reviewer', tier: 'reasoning',
      model: 'claude-opus-4-6', inputTokens: 5000, outputTokens: 2000,
    });

    const result = aggregate(tempDir, 'all');
    expect(result.totalTokens).toBe(20000);
    expect(result.workflowCount).toBe(2);
    expect(result.tokensByWorkflow['build-feature']).toBe(13000);
    expect(result.tokensByWorkflow['review']).toBe(7000);
  });

  it('aggregate today filters to current day entries', () => {
    recordStep(tempDir, {
      workflow: 'build-feature', agent: 'advisor', tier: 'reasoning',
      model: 'claude-opus-4-6', inputTokens: 10000, outputTokens: 3000,
    });

    const result = aggregate(tempDir, 'today');
    expect(result.totalTokens).toBe(13000);
  });
});

describe('estimateWithProfile', () => {
  it('calculates cost with pro profile (reasoning→sonnet)', () => {
    const entries = [
      createEntry({
        workflow: 'build-feature', agent: 'advisor', tier: 'reasoning',
        model: 'claude-opus-4-6', inputTokens: 10000, outputTokens: 5000,
      }),
    ];
    // Pro maps reasoning to sonnet: 10000*3/M + 5000*15/M = 0.03 + 0.075 = 0.105
    const cost = estimateWithProfile(entries, 'pro');
    expect(cost).toBeCloseTo(0.105, 3);
  });

  it('calculates cost with max profile (reasoning→opus)', () => {
    const entries = [
      createEntry({
        workflow: 'build-feature', agent: 'developer', tier: 'execution',
        model: 'claude-sonnet-4-5', inputTokens: 20000, outputTokens: 8000,
      }),
    ];
    // Max maps execution to sonnet: 20000*3/M + 8000*15/M = 0.06 + 0.12 = 0.18
    const cost = estimateWithProfile(entries, 'max');
    expect(cost).toBeCloseTo(0.18, 3);
  });

  it('calculates all-opus cost', () => {
    const entries = [
      createEntry({
        workflow: 'review', agent: 'reviewer', tier: 'execution',
        model: 'claude-sonnet-4-5', inputTokens: 10000, outputTokens: 5000,
      }),
    ];
    // all-opus: 10000*15/M + 5000*75/M = 0.15 + 0.375 = 0.525
    const cost = estimateWithProfile(entries, 'all-opus');
    expect(cost).toBeCloseTo(0.525, 3);
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx vitest run src/utils/__tests__/accounting.test.js`
Expected: FAIL — `aggregate` and `estimateWithProfile` not exported

- [ ] **Step 3: Implement aggregate and estimateWithProfile**

Add to `src/utils/accounting.js`:

```javascript
/**
 * Profile definitions: map tier → model.
 */
const PROFILES = {
  max: { reasoning: 'claude-opus-4-6', execution: 'claude-sonnet-4-5', routine: 'claude-haiku-4-5' },
  pro: { reasoning: 'claude-sonnet-4-5', execution: 'claude-sonnet-4-5', routine: 'claude-haiku-4-5' },
  'all-opus': { reasoning: 'claude-opus-4-6', execution: 'claude-opus-4-6', routine: 'claude-opus-4-6' },
};

/**
 * Filters entries by period and recomputes totals.
 * @param {string} root - Project root directory
 * @param {'today'|'week'|'month'|'all'} period
 * @returns {object} Aggregated totals
 */
export function aggregate(root, period) {
  const usage = loadUsage(root);
  const now = new Date();
  let cutoff;

  switch (period) {
    case 'today':
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      break;
    case 'month':
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      break;
    default:
      cutoff = new Date(0);
  }

  const filtered = usage.entries.filter(e => new Date(e.timestamp) >= cutoff);

  const totals = {
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUSD: 0,
    tokensByModel: {},
    tokensByTier: {},
    tokensByWorkflow: {},
    workflowCount: 0,
  };

  for (const entry of filtered) {
    updateTotals(totals, entry);
  }

  return totals;
}

/**
 * Estimates what a set of entries would cost under a different profile.
 * @param {object[]} entries - Usage entries
 * @param {'max'|'pro'|'all-opus'} profileName
 * @returns {number} Estimated cost in USD
 */
export function estimateWithProfile(entries, profileName) {
  const profile = PROFILES[profileName];
  if (!profile) return 0;

  let cost = 0;
  for (const entry of entries) {
    const model = profile[entry.tier] || entry.model;
    cost += estimateCost(model, entry.inputTokens, entry.outputTokens);
  }
  return cost;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/accounting.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/accounting.js src/utils/__tests__/accounting.test.js
git commit -m "feat(stats): add aggregate and estimateWithProfile to accounting"
```

---

### Task 4: Stats Command

**Files:**
- Create: `src/commands/stats.js`
- Create: `src/commands/__tests__/stats.test.js`
- Modify: `bin/guild.js`

- [ ] **Step 1: Write failing tests for stats command**

```javascript
// src/commands/__tests__/stats.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, mkdtempSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { recordStep } from '../../utils/accounting.js';

describe('runStats', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'guild-stats-'));
    mkdirSync(join(tempDir, '.claude', 'guild'), { recursive: true });
    originalCwd = process.cwd();
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('shows no-data message when usage.json does not exist', async () => {
    process.chdir(tempDir);
    const { runStats } = await import('../stats.js');
    await expect(runStats({})).resolves.toBeUndefined();
  });

  it('shows stats when usage data exists', async () => {
    recordStep(tempDir, {
      workflow: 'build-feature', agent: 'advisor', tier: 'reasoning',
      model: 'claude-opus-4-6', inputTokens: 10000, outputTokens: 3000,
    });

    process.chdir(tempDir);
    const { runStats } = await import('../stats.js');
    await expect(runStats({})).resolves.toBeUndefined();
  });

  it('resets usage with --reset --force', async () => {
    recordStep(tempDir, {
      workflow: 'review', agent: 'reviewer', tier: 'reasoning',
      model: 'claude-opus-4-6', inputTokens: 5000, outputTokens: 2000,
    });

    process.chdir(tempDir);
    const { runStats } = await import('../stats.js');
    await runStats({ reset: true, force: true });

    const usagePath = join(tempDir, '.claude', 'guild', 'usage.json');
    expect(existsSync(usagePath)).toBe(false);
  });

  it('exports CSV with --export csv', async () => {
    recordStep(tempDir, {
      workflow: 'build-feature', agent: 'advisor', tier: 'reasoning',
      model: 'claude-opus-4-6', inputTokens: 10000, outputTokens: 3000,
    });

    process.chdir(tempDir);
    const { formatCsv } = await import('../stats.js');
    const { loadUsage } = await import('../../utils/accounting.js');
    const usage = loadUsage(tempDir);
    const csv = formatCsv(usage.entries);
    expect(csv).toContain('timestamp,workflow,agent,tier,model,inputTokens,outputTokens,totalTokens,estimatedCostUSD');
    expect(csv).toContain('build-feature');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/commands/__tests__/stats.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement stats command**

```javascript
// src/commands/stats.js
/**
 * stats.js — Token usage stats command.
 *
 * Usage:
 *   guild stats                    — Last 30 days summary
 *   guild stats --period today     — Today only
 *   guild stats --period week      — Last 7 days
 *   guild stats --period all       — All time
 *   guild stats --compare          — Profile cost comparison
 *   guild stats --reset            — Clear history (requires --force or confirmation)
 *   guild stats --export csv       — Export as CSV
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, unlinkSync, copyFileSync } from 'fs';
import { join } from 'path';
import { loadUsage, aggregate, estimateWithProfile } from '../utils/accounting.js';
import { getModelShortName } from '../utils/pricing.js';

const USAGE_PATH = join('.claude', 'guild', 'usage.json');

/**
 * Formats a number with commas: 15700 → "15,700"
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  return n.toLocaleString('en-US');
}

/**
 * Formats USD: 0.525 → "$0.53"
 * @param {number} n
 * @returns {string}
 */
function usd(n) {
  return `$${n.toFixed(2)}`;
}

/**
 * Formats a percentage: 0.32 → "32%"
 * @param {number} part
 * @param {number} total
 * @returns {string}
 */
function pct(part, total) {
  if (total === 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

/**
 * Period labels for display.
 */
const PERIOD_LABELS = {
  today: 'Today',
  week: 'Last 7 days',
  month: 'Last 30 days',
  all: 'All time',
};

/**
 * Formats entries as CSV.
 * @param {object[]} entries
 * @returns {string}
 */
export function formatCsv(entries) {
  const headers = 'timestamp,workflow,agent,tier,model,inputTokens,outputTokens,totalTokens,estimatedCostUSD';
  const rows = entries.map(e =>
    `${e.timestamp},${e.workflow},${e.agent},${e.tier},${e.model},${e.inputTokens},${e.outputTokens},${e.totalTokens},${e.estimatedCostUSD.toFixed(6)}`
  );
  return [headers, ...rows].join('\n') + '\n';
}

/**
 * Runs the guild stats command.
 * @param {object} options
 * @param {string} [options.period='month']
 * @param {boolean} [options.compare]
 * @param {boolean} [options.reset]
 * @param {boolean} [options.force]
 * @param {string} [options.export]
 */
export async function runStats(options = {}) {
  const root = process.cwd();

  // Handle --reset
  if (options.reset) {
    return handleReset(root, options.force);
  }

  // Handle --export csv
  if (options.export === 'csv') {
    const usage = loadUsage(root);
    if (usage.entries.length === 0) {
      console.log('No usage data to export.');
      return;
    }
    process.stdout.write(formatCsv(usage.entries));
    return;
  }

  const period = options.period || 'month';
  const totals = aggregate(root, period);

  p.intro(chalk.bold.cyan(`Guild Usage Stats — ${PERIOD_LABELS[period] || period}`));

  if (totals.totalTokens === 0) {
    p.log.info('No usage data yet. Token tracking will begin when workflows record usage.');
    p.outro('');
    return;
  }

  // Summary
  p.log.step('Summary');
  p.log.info(`  Workflows executed:  ${chalk.bold(fmt(totals.workflowCount))}`);
  p.log.info(`  Total tokens:        ${chalk.bold(fmt(totals.totalTokens))}`);
  p.log.info(`  Estimated cost:      ${chalk.bold.green(usd(totals.totalCostUSD))}`);

  // By tier
  if (Object.keys(totals.tokensByTier).length > 0) {
    p.log.step('By tier');
    for (const [tier, tokens] of Object.entries(totals.tokensByTier)) {
      p.log.info(`  ${tier.padEnd(12)} ${fmt(tokens).padStart(10)} tok  (${pct(tokens, totals.totalTokens).padStart(4)})`);
    }
  }

  // By model
  if (Object.keys(totals.tokensByModel).length > 0) {
    p.log.step('By model');
    for (const [model, tokens] of Object.entries(totals.tokensByModel)) {
      p.log.info(`  ${getModelShortName(model).padEnd(12)} ${fmt(tokens).padStart(10)} tok`);
    }
  }

  // By workflow
  if (Object.keys(totals.tokensByWorkflow).length > 0) {
    p.log.step('Top workflows');
    const sorted = Object.entries(totals.tokensByWorkflow).sort((a, b) => b[1] - a[1]);
    for (const [wf, tokens] of sorted) {
      p.log.info(`  ${wf.padEnd(20)} ${fmt(tokens).padStart(10)} tok`);
    }
  }

  // Profile comparison
  if (options.compare) {
    const usage = loadUsage(root);
    const filtered = usage.entries;
    const maxCost = estimateWithProfile(filtered, 'max');
    const proCost = estimateWithProfile(filtered, 'pro');
    const allOpusCost = estimateWithProfile(filtered, 'all-opus');

    p.log.step('Profile comparison');
    p.log.info(`  ${'max'.padEnd(12)} ${usd(maxCost).padStart(10)}    —`);
    p.log.info(`  ${'pro'.padEnd(12)} ${usd(proCost).padStart(10)}    ${diffLabel(proCost, maxCost)}`);
    p.log.info(`  ${'all-opus'.padEnd(12)} ${usd(allOpusCost).padStart(10)}    ${diffLabel(allOpusCost, maxCost)}`);
  }

  p.outro('');
}

/**
 * Shows difference label: "+42%" or "-62%"
 */
function diffLabel(cost, baseline) {
  if (baseline === 0) return '';
  const diff = ((cost - baseline) / baseline) * 100;
  const sign = diff >= 0 ? '+' : '';
  return chalk.gray(`${sign}${Math.round(diff)}%`);
}

/**
 * Handles --reset: deletes usage.json after confirmation.
 */
async function handleReset(root, force) {
  const filePath = join(root, USAGE_PATH);

  p.intro(chalk.bold.cyan('Guild — Reset Usage Stats'));

  if (!existsSync(filePath)) {
    p.log.info('No usage data found. Nothing to reset.');
    p.outro('');
    return;
  }

  if (!force) {
    const confirmed = await p.confirm({
      message: 'This will delete all usage history. Continue?',
      initialValue: false,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Reset cancelled.');
      return;
    }
  }

  copyFileSync(filePath, filePath + '.bak');
  unlinkSync(filePath);
  p.log.success(`${chalk.green('✓')} Usage history deleted. Backup saved as usage.json.bak.`);
  p.outro('');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/commands/__tests__/stats.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/stats.js src/commands/__tests__/stats.test.js
git commit -m "feat(stats): add guild stats command with period, compare, reset, export"
```

---

### Task 5: Register Command in CLI

**Files:**
- Modify: `bin/guild.js`

- [ ] **Step 1: Add stats command to bin/guild.js**

Add after the `guild logs clean` block, before the `guild workspace` block:

```javascript
// guild stats
program
  .command('stats')
  .description('View token usage stats and cost estimates')
  .option('--period <period>', 'Filter by period: today, week, month, all', 'month')
  .option('--compare', 'Compare cost across model profiles')
  .option('--reset', 'Delete all usage history')
  .option('-f, --force', 'Skip confirmation prompt (for --reset)')
  .option('--export <format>', 'Export data (csv)')
  .action(async (options) => {
    try {
      const { runStats } = await import('../src/commands/stats.js');
      await runStats(options);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });
```

- [ ] **Step 2: Update the file header comment**

Update the comment at the top of `bin/guild.js` to include `stats`:

```javascript
/**
 * Guild v1 — CLI entry point
 * Usage:
 *   guild init           — interactive onboarding v1
 *   guild new-agent      — create a new agent
 *   guild status         — view project status
 *   guild doctor         — verify setup and report issues
 *   guild list           — list installed agents and skills
 *   guild stats          — view token usage and cost stats
 */
```

- [ ] **Step 3: Run all tests to verify nothing broke**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Test CLI manually**

Run: `node bin/guild.js stats --help`
Expected: Shows stats command help with --period, --compare, --reset, --export options

- [ ] **Step 5: Commit**

```bash
git add bin/guild.js
git commit -m "feat(stats): register guild stats command in CLI"
```

---

### Task 6: Integration Test — Full Workflow

**Files:**
- Modify: `src/commands/__tests__/stats.test.js`

- [ ] **Step 1: Add end-to-end test for stats with multiple entries and compare**

Append to `src/commands/__tests__/stats.test.js`:

```javascript
  it('shows compare output with multiple entries', async () => {
    recordStep(tempDir, {
      workflow: 'build-feature', agent: 'advisor', tier: 'reasoning',
      model: 'claude-opus-4-6', inputTokens: 10000, outputTokens: 3000,
    });
    recordStep(tempDir, {
      workflow: 'build-feature', agent: 'developer', tier: 'execution',
      model: 'claude-sonnet-4-5', inputTokens: 20000, outputTokens: 8000,
    });
    recordStep(tempDir, {
      workflow: 'review', agent: 'reviewer', tier: 'reasoning',
      model: 'claude-opus-4-6', inputTokens: 5000, outputTokens: 2000,
    });

    process.chdir(tempDir);
    const { runStats } = await import('../stats.js');
    await expect(runStats({ compare: true })).resolves.toBeUndefined();
  });

  it('filters by period', async () => {
    recordStep(tempDir, {
      workflow: 'build-feature', agent: 'advisor', tier: 'reasoning',
      model: 'claude-opus-4-6', inputTokens: 10000, outputTokens: 3000,
    });

    process.chdir(tempDir);
    const { runStats } = await import('../stats.js');
    await expect(runStats({ period: 'today' })).resolves.toBeUndefined();
    await expect(runStats({ period: 'all' })).resolves.toBeUndefined();
  });
```

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All pass

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add src/commands/__tests__/stats.test.js
git commit -m "test(stats): add integration tests for compare and period filtering"
```

---

## Summary

| Task | What it builds | Estimated steps |
|------|---------------|----------------|
| Task 1 | `pricing.js` — model pricing + cost calculation | 5 |
| Task 2 | `accounting.js` — recording + persistence | 5 |
| Task 3 | `accounting.js` — aggregation + profile comparison | 5 |
| Task 4 | `stats.js` — CLI command | 5 |
| Task 5 | CLI registration in `bin/guild.js` | 5 |
| Task 6 | Integration tests | 4 |
| **Total** | | **29 steps** |
