import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, mkdtempSync, existsSync } from 'fs';
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
});
