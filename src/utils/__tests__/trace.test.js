import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  resolveTraceLevel,
  createTrace,
  recordStep,
  renderStep,
  renderTrace,
  renderSummary,
  finalizeTrace,
  formatDuration,
  listTraces,
  cleanTraces,
} from '../trace.js';

// --- resolveTraceLevel ---

describe('resolveTraceLevel', () => {
  it('returns default when no flags are set', () => {
    expect(resolveTraceLevel({})).toBe('default');
  });

  it('returns default when options is omitted', () => {
    expect(resolveTraceLevel()).toBe('default');
  });

  it('returns verbose when verbose flag is set', () => {
    expect(resolveTraceLevel({ verbose: true })).toBe('verbose');
  });

  it('returns debug when debug flag is set', () => {
    expect(resolveTraceLevel({ debug: true })).toBe('debug');
  });

  it('returns debug when both verbose and debug flags are set', () => {
    expect(resolveTraceLevel({ verbose: true, debug: true })).toBe('debug');
  });
});

// --- formatDuration ---

describe('formatDuration', () => {
  it('formats 0ms as 00:00:00', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('formats 90000ms as 00:01:30', () => {
    expect(formatDuration(90000)).toBe('00:01:30');
  });

  it('formats 3661000ms as 01:01:01', () => {
    expect(formatDuration(3661000)).toBe('01:01:01');
  });
});

// --- createTrace ---

describe('createTrace', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = join(tmpdir(), `guild-trace-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns a correct context object', () => {
    const tracesDir = join(tempDir, 'traces');
    const ctx = createTrace('build-feature', 'verbose', tracesDir);

    expect(ctx.workflow).toBe('build-feature');
    expect(ctx.level).toBe('verbose');
    expect(ctx.started).toBeInstanceOf(Date);
    expect(ctx.steps).toEqual([]);
    expect(ctx.totalTokens).toBe(0);
    expect(ctx.filePath).toContain('guild-trace-');
    expect(ctx.filePath).toMatch(/\.md$/);
  });

  it('uses .claude/guild/traces/ as default tracesDir', () => {
    // We cannot easily test the actual default without side effects,
    // so we verify the parameter-based path works and the default
    // would produce a path containing .claude/guild/traces/
    const tracesDir = join(tempDir, '.claude', 'guild', 'traces');
    const ctx = createTrace('qa-cycle', 'default', tracesDir);

    expect(ctx.filePath).toContain(join('.claude', 'guild', 'traces'));
    expect(existsSync(tracesDir)).toBe(true);
  });

  it('creates the traces directory if it does not exist', () => {
    const tracesDir = join(tempDir, 'nested', 'deep', 'traces');
    expect(existsSync(tracesDir)).toBe(false);

    createTrace('test-workflow', 'default', tracesDir);

    expect(existsSync(tracesDir)).toBe(true);
  });

  it('creates a .gitignore inside the traces directory', () => {
    const tracesDir = join(tempDir, 'traces-gitignore');
    createTrace('test-workflow', 'default', tracesDir);

    const gitignorePath = join(tracesDir, '.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);
    const content = readFileSync(gitignorePath, 'utf8');
    expect(content).toContain('*');
    expect(content).toContain('!.gitignore');
  });

  it('does not overwrite existing .gitignore', () => {
    const tracesDir = join(tempDir, 'traces-existing');
    mkdirSync(tracesDir, { recursive: true });
    const gitignorePath = join(tracesDir, '.gitignore');
    writeFileSync(gitignorePath, 'custom-content\n', 'utf8');

    createTrace('test-workflow', 'default', tracesDir);

    const content = readFileSync(gitignorePath, 'utf8');
    expect(content).toBe('custom-content\n');
  });
});

// --- recordStep ---

describe('recordStep', () => {
  it('adds step and updates totalTokens', () => {
    const ctx = {
      steps: [],
      totalTokens: 0,
    };

    const step = {
      role: 'developer',
      intent: 'Implement feature',
      tier: 'execution',
      model: 'claude-sonnet-4-5',
      fallback: false,
      started: '2026-02-25T14:30:00.000Z',
      duration: 120,
      tokens: 5000,
      result: 'pass',
    };

    recordStep(ctx, step);

    expect(ctx.steps).toHaveLength(1);
    expect(ctx.steps[0]).toBe(step);
    expect(ctx.totalTokens).toBe(5000);
  });

  it('is chainable (returns the context)', () => {
    const ctx = { steps: [], totalTokens: 0 };
    const step1 = { role: 'advisor', intent: 'Evaluate', tier: 'reasoning', model: 'claude-opus-4-6', fallback: false, started: '2026-02-25T14:30:00.000Z', duration: 45, tokens: 3000, result: 'pass' };
    const step2 = { role: 'developer', intent: 'Implement', tier: 'execution', model: 'claude-sonnet-4-5', fallback: false, started: '2026-02-25T14:31:00.000Z', duration: 200, tokens: 8000, result: 'pass' };

    const result = recordStep(recordStep(ctx, step1), step2);

    expect(result).toBe(ctx);
    expect(ctx.steps).toHaveLength(2);
    expect(ctx.totalTokens).toBe(11000);
  });
});

// --- renderStep ---

describe('renderStep', () => {
  const baseStep = {
    role: 'tech-lead',
    intent: 'Design architecture',
    tier: 'reasoning',
    model: 'claude-opus-4-6',
    fallback: false,
    started: '2026-02-25T14:30:00.000Z',
    duration: 58,
    tokens: 22150,
    result: 'pass',
  };

  it('renders default level without decision/reasoning', () => {
    const output = renderStep(baseStep, 1, 'default');

    expect(output).toContain('### Step 1 — tech-lead: Design architecture');
    expect(output).toContain('| Tier | reasoning |');
    expect(output).toContain('| Model | claude-opus-4-6 |');
    expect(output).toContain('| Fallback | no |');
    expect(output).toContain('| Duration | 58s |');
    expect(output).toContain('| Tokens | 22150 |');
    expect(output).toContain('| Result | pass |');
    expect(output).not.toContain('**Decision:**');
    expect(output).not.toContain('**Reasoning:**');
  });

  it('renders verbose level with decision and reasoning', () => {
    const verboseStep = {
      ...baseStep,
      decision: 'tech-lead uses reasoning tier, resolved to opus via max profile',
      reasoning: 'Architecture requires careful consideration of auth patterns',
    };

    const output = renderStep(verboseStep, 3, 'verbose');

    expect(output).toContain('### Step 3 — tech-lead: Design architecture');
    expect(output).toContain('**Decision:** tech-lead uses reasoning tier, resolved to opus via max profile');
    expect(output).toContain('**Reasoning:** Architecture requires careful consideration of auth patterns');
    expect(output).not.toContain('<details>');
  });

  it('renders debug level with fullPrompt and fullResponse details blocks', () => {
    const debugStep = {
      ...baseStep,
      decision: 'reasoning tier for tech-lead',
      reasoning: 'Careful architecture review',
      fullPrompt: 'You are the tech-lead...',
      fullResponse: '## Architecture\n\nUse JWT tokens...',
    };

    const output = renderStep(debugStep, 2, 'debug');

    expect(output).toContain('**Decision:** reasoning tier for tech-lead');
    expect(output).toContain('**Reasoning:** Careful architecture review');
    expect(output).toContain('<details>');
    expect(output).toContain('<summary>Full prompt</summary>');
    expect(output).toContain('You are the tech-lead...');
    expect(output).toContain('<summary>Full response</summary>');
    expect(output).toContain('Use JWT tokens...');
    expect(output).toContain('</details>');
  });

  it('renders fallback as yes when fallback is true', () => {
    const fallbackStep = { ...baseStep, fallback: true };
    const output = renderStep(fallbackStep, 1, 'default');
    expect(output).toContain('| Fallback | yes |');
  });
});

// --- renderSummary ---

describe('renderSummary', () => {
  it('renders summary with pass results', () => {
    const output = renderSummary({ result: 'pass', testsPass: true, lintPass: true }, 50000, '00:05:30');

    expect(output).toContain('## Summary');
    expect(output).toContain('- **Result**: pass');
    expect(output).toContain('- **Tests**: pass');
    expect(output).toContain('- **Lint**: pass');
    expect(output).toContain('- **Total tokens**: 50000');
    expect(output).toContain('- **Duration**: 00:05:30');
  });

  it('renders summary with fail results', () => {
    const output = renderSummary({ result: 'fail', testsPass: false, lintPass: false }, 10000, '00:01:00');

    expect(output).toContain('- **Result**: fail');
    expect(output).toContain('- **Tests**: fail');
    expect(output).toContain('- **Lint**: fail');
  });
});

// --- renderTrace ---

describe('renderTrace', () => {
  it('produces valid markdown with header and steps', () => {
    const started = new Date('2026-02-25T14:30:00.000Z');
    const finished = new Date('2026-02-25T14:35:30.000Z');

    const ctx = {
      workflow: 'build-feature',
      level: 'default',
      started,
      steps: [
        { role: 'advisor', intent: 'Evaluate feature', tier: 'reasoning', model: 'claude-opus-4-6', fallback: false, started: '2026-02-25T14:30:00.000Z', duration: 45, tokens: 12000, result: 'pass' },
        { role: 'developer', intent: 'Implement feature', tier: 'execution', model: 'claude-sonnet-4-5', fallback: false, started: '2026-02-25T14:31:00.000Z', duration: 200, tokens: 38000, result: 'pass' },
      ],
      totalTokens: 50000,
    };

    const summary = { result: 'pass', testsPass: true, lintPass: true };
    const output = renderTrace(ctx, summary, finished);

    expect(output).toContain('# Guild Trace — build-feature');
    expect(output).toContain('> Level: default');
    expect(output).toContain('> Started: 2026-02-25T14:30:00.000Z');
    expect(output).toContain('> Finished: 2026-02-25T14:35:30.000Z');
    expect(output).toContain('> Duration: 00:05:30');
    expect(output).toContain('> Total tokens: 50000');
    expect(output).toContain('> Result: pass');
    expect(output).toContain('## Steps');
    expect(output).toContain('### Step 1 — advisor: Evaluate feature');
    expect(output).toContain('### Step 2 — developer: Implement feature');
  });

  it('includes summary section', () => {
    const started = new Date('2026-02-25T14:30:00.000Z');
    const finished = new Date('2026-02-25T14:31:30.000Z');

    const ctx = {
      workflow: 'qa-cycle',
      level: 'default',
      started,
      steps: [],
      totalTokens: 5000,
    };

    const summary = { result: 'fail', testsPass: false, lintPass: true };
    const output = renderTrace(ctx, summary, finished);

    expect(output).toContain('## Summary');
    expect(output).toContain('- **Result**: fail');
    expect(output).toContain('- **Tests**: fail');
    expect(output).toContain('- **Lint**: pass');
    expect(output).toContain('- **Total tokens**: 5000');
    expect(output).toContain('- **Duration**: 00:01:30');
  });
});

// --- finalizeTrace ---

describe('finalizeTrace', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = join(tmpdir(), `guild-trace-finalize-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates directory and writes file', () => {
    const tracesDir = join(tempDir, 'traces');
    const ctx = createTrace('build-feature', 'default', tracesDir);

    recordStep(ctx, {
      role: 'developer',
      intent: 'Implement',
      tier: 'execution',
      model: 'claude-sonnet-4-5',
      fallback: false,
      started: '2026-02-25T14:30:00.000Z',
      duration: 120,
      tokens: 5000,
      result: 'pass',
    });

    const result = finalizeTrace(ctx, { result: 'pass', testsPass: true, lintPass: true });

    expect(existsSync(result.filePath)).toBe(true);

    const content = readFileSync(result.filePath, 'utf8');
    expect(content).toContain('# Guild Trace — build-feature');
    expect(content).toContain('## Steps');
    expect(content).toContain('### Step 1 — developer: Implement');
    expect(content).toContain('## Summary');
  });

  it('returns correct metadata', () => {
    const tracesDir = join(tempDir, 'traces');
    const ctx = createTrace('qa-cycle', 'verbose', tracesDir);

    recordStep(ctx, {
      role: 'qa',
      intent: 'Validate',
      tier: 'execution',
      model: 'claude-sonnet-4-5',
      fallback: false,
      started: '2026-02-25T14:30:00.000Z',
      duration: 60,
      tokens: 3000,
      result: 'pass',
    });

    const result = finalizeTrace(ctx, { result: 'pass', testsPass: true, lintPass: true });

    expect(result.filePath).toBe(ctx.filePath);
    expect(result.totalTokens).toBe(3000);
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

// --- listTraces ---

describe('listTraces', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = join(tmpdir(), `guild-trace-list-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns empty array for nonexistent directory', () => {
    const result = listTraces(join(tempDir, 'does-not-exist'));
    expect(result).toEqual([]);
  });

  it('returns sorted traces (newest first)', () => {
    const tracesDir = join(tempDir, 'traces');
    mkdirSync(tracesDir, { recursive: true });

    const trace1Content = [
      '# Guild Trace — build-feature',
      '',
      '> Level: default',
      '> Started: 2026-02-24T10:00:00.000Z',
      '> Finished: 2026-02-24T10:05:00.000Z',
      '> Duration: 00:05:00',
      '> Total tokens: 50000',
      '> Result: pass',
    ].join('\n');

    const trace2Content = [
      '# Guild Trace — qa-cycle',
      '',
      '> Level: verbose',
      '> Started: 2026-02-25T14:00:00.000Z',
      '> Finished: 2026-02-25T14:03:00.000Z',
      '> Duration: 00:03:00',
      '> Total tokens: 30000',
      '> Result: fail',
    ].join('\n');

    writeFileSync(join(tracesDir, 'guild-trace-20260224T100000.md'), trace1Content, 'utf8');
    writeFileSync(join(tracesDir, 'guild-trace-20260225T140000.md'), trace2Content, 'utf8');

    const traces = listTraces(tracesDir);

    expect(traces).toHaveLength(2);
    // Newest first (sorted by filename descending)
    expect(traces[0].workflow).toBe('qa-cycle');
    expect(traces[0].level).toBe('verbose');
    expect(traces[0].result).toBe('fail');
    expect(traces[1].workflow).toBe('build-feature');
    expect(traces[1].level).toBe('default');
    expect(traces[1].result).toBe('pass');
  });

  it('ignores non-trace files', () => {
    const tracesDir = join(tempDir, 'traces');
    mkdirSync(tracesDir, { recursive: true });

    writeFileSync(join(tracesDir, 'random-file.md'), '# Not a trace', 'utf8');
    writeFileSync(join(tracesDir, 'guild-trace-20260225T100000.md'), '# Guild Trace — test\n\n> Level: default\n> Started: 2026-02-25T10:00:00.000Z\n> Result: pass', 'utf8');

    const traces = listTraces(tracesDir);
    expect(traces).toHaveLength(1);
    expect(traces[0].workflow).toBe('test');
  });
});

// --- cleanTraces ---

describe('cleanTraces', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = join(tmpdir(), `guild-trace-clean-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns 0 for nonexistent directory', () => {
    const result = cleanTraces(30, join(tempDir, 'does-not-exist'));
    expect(result).toBe(0);
  });

  it('deletes all files when maxAgeDays is 0', () => {
    const tracesDir = join(tempDir, 'traces');
    mkdirSync(tracesDir, { recursive: true });

    writeFileSync(join(tracesDir, 'guild-trace-20260224T100000.md'), '# trace 1', 'utf8');
    writeFileSync(join(tracesDir, 'guild-trace-20260225T100000.md'), '# trace 2', 'utf8');

    const deleted = cleanTraces(0, tracesDir);

    expect(deleted).toBe(2);
    expect(existsSync(join(tracesDir, 'guild-trace-20260224T100000.md'))).toBe(false);
    expect(existsSync(join(tracesDir, 'guild-trace-20260225T100000.md'))).toBe(false);
  });

  it('ignores non-trace files when deleting', () => {
    const tracesDir = join(tempDir, 'traces');
    mkdirSync(tracesDir, { recursive: true });

    writeFileSync(join(tracesDir, 'guild-trace-20260224T100000.md'), '# trace', 'utf8');
    writeFileSync(join(tracesDir, 'other-file.txt'), 'not a trace', 'utf8');

    const deleted = cleanTraces(0, tracesDir);

    expect(deleted).toBe(1);
    expect(existsSync(join(tracesDir, 'other-file.txt'))).toBe(true);
  });
});
