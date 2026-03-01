import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: {
    info: vi.fn(),
    step: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock files utility
vi.mock('../../utils/files.js', () => ({
  ensureProjectRoot: vi.fn(() => '/fake/project'),
}));

// Mock trace utility
vi.mock('../../utils/trace.js', () => ({
  listTraces: vi.fn(),
  cleanTraces: vi.fn(),
}));

describe('runLogs', () => {
  let prompts;
  let listTracesMock;
  let cleanTracesMock;
  let ensureProjectRootMock;

  beforeEach(async () => {
    vi.resetModules();

    prompts = await import('@clack/prompts');
    vi.clearAllMocks();

    const trace = await import('../../utils/trace.js');
    listTracesMock = trace.listTraces;
    cleanTracesMock = trace.cleanTraces;

    const files = await import('../../utils/files.js');
    ensureProjectRootMock = files.ensureProjectRoot;
    ensureProjectRootMock.mockReturnValue('/fake/project');
  });

  it('list traces — empty: shows "No traces found" message', async () => {
    listTracesMock.mockReturnValue([]);

    const { runLogs } = await import('../logs.js');
    await runLogs('list', {});

    expect(prompts.intro).toHaveBeenCalledOnce();
    const infoCalls = prompts.log.info.mock.calls.map(c => c[0]);
    const noTracesMsg = infoCalls.find(msg => msg.includes('No traces found'));
    expect(noTracesMsg).toBeDefined();
    expect(prompts.outro).toHaveBeenCalledOnce();
  });

  it('list traces — with data: displays both traces', async () => {
    listTracesMock.mockReturnValue([
      { filePath: '/fake/project/.claude/guild/traces/guild-trace-1.md', workflow: 'build-feature', date: '2026-03-01T10:00:00.000Z', level: 'default', result: 'pass' },
      { filePath: '/fake/project/.claude/guild/traces/guild-trace-2.md', workflow: 'review', date: '2026-03-01T11:00:00.000Z', level: 'verbose', result: 'fail' },
    ]);

    const { runLogs } = await import('../logs.js');
    await runLogs('list', {});

    expect(prompts.intro).toHaveBeenCalledOnce();
    const infoCalls = prompts.log.info.mock.calls.map(c => c[0]);
    const buildFeatureRow = infoCalls.find(msg => msg.includes('build-feature'));
    expect(buildFeatureRow).toBeDefined();
    const reviewRow = infoCalls.find(msg => msg.includes('review'));
    expect(reviewRow).toBeDefined();
    const totalMsg = infoCalls.find(msg => msg.includes('Total: 2'));
    expect(totalMsg).toBeDefined();
    expect(prompts.outro).toHaveBeenCalledOnce();
  });

  it('clean traces — shows count of removed traces', async () => {
    cleanTracesMock.mockReturnValue(3);

    const { runLogs } = await import('../logs.js');
    await runLogs('clean', { days: '30' });

    expect(prompts.intro).toHaveBeenCalledOnce();
    expect(cleanTracesMock).toHaveBeenCalledWith(30, '/fake/project/.claude/guild/traces');
    const infoCalls = prompts.log.info.mock.calls.map(c => c[0]);
    const removedMsg = infoCalls.find(msg => msg.includes('Removed 3 trace(s)'));
    expect(removedMsg).toBeDefined();
    expect(prompts.outro).toHaveBeenCalledOnce();
  });

  it('clean all — passes maxAgeDays: 0 to cleanTraces', async () => {
    cleanTracesMock.mockReturnValue(5);

    const { runLogs } = await import('../logs.js');
    await runLogs('clean', { all: true });

    expect(cleanTracesMock).toHaveBeenCalledWith(0, '/fake/project/.claude/guild/traces');
    const infoCalls = prompts.log.info.mock.calls.map(c => c[0]);
    const removedMsg = infoCalls.find(msg => msg.includes('Removed 5 trace(s)'));
    expect(removedMsg).toBeDefined();
  });

  it('project not found — ensureProjectRoot throws, error propagates', async () => {
    ensureProjectRootMock.mockImplementationOnce(() => {
      throw new Error('Guild project not found');
    });

    const { runLogs } = await import('../logs.js');
    await expect(runLogs('list', {})).rejects.toThrow('Guild project not found');
  });
});
