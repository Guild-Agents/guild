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
