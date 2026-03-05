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

// Mock orchestrator-io
vi.mock('../../utils/orchestrator-io.js', () => ({
  orchestrate: vi.fn(),
  finalizeWorkflowTrace: vi.fn(() => ({
    trace: {},
    executionSummary: '3 steps | 0 failures',
  })),
}));

// Mock executor
vi.mock('../../utils/executor.js', () => ({
  execute: vi.fn(),
}));

// Mock provider
vi.mock('../../utils/providers/claude-code.js', () => ({
  createClaudeCodeProvider: vi.fn(() => vi.fn()),
}));

/**
 * Creates a minimal fake ExecutionPlan with the given groups.
 * @param {Array} groups - Array of group definitions
 * @returns {{ plan: object, dispatchInfoMap: object }}
 */
function fakePlan(groups) {
  const dispatchInfoMap = {};
  let totalSteps = 0;

  for (const group of groups) {
    for (const step of group.steps) {
      totalSteps++;
      dispatchInfoMap[step.id] = step._dispatch || {};
      delete step._dispatch;
    }
  }

  const plan = {
    skillName: 'test-skill',
    groups,
    stepStates: {},
    totalSteps,
    status: 'running',
  };

  return { plan, dispatchInfoMap };
}

describe('runRun', () => {
  let prompts;
  let orchestrateMock;
  let ensureProjectRootMock;

  beforeEach(async () => {
    vi.resetModules();

    prompts = await import('@clack/prompts');
    vi.clearAllMocks();

    const orchestratorIo = await import('../../utils/orchestrator-io.js');
    orchestrateMock = orchestratorIo.orchestrate;

    const files = await import('../../utils/files.js');
    ensureProjectRootMock = files.ensureProjectRoot;
    ensureProjectRootMock.mockReturnValue('/fake/project');
  });

  // --- Dry-run mode tests (plan display) ---

  it('dry-run — 2 sequential steps: calls intro, step, info for each step', async () => {
    const { plan, dispatchInfoMap } = fakePlan([
      {
        parallel: false,
        steps: [
          { id: 'step-1', role: 'developer', intent: 'Write the feature', _dispatch: { model: 'claude-opus-4-5' } },
          { id: 'step-2', role: 'tech-lead', intent: 'Review the code', _dispatch: { model: 'claude-sonnet-4-5' } },
        ],
      },
    ]);
    orchestrateMock.mockResolvedValueOnce({ plan, dispatchInfoMap });

    const { runRun } = await import('../run.js');
    await runRun('review', '', { profile: 'max', dryRun: true });

    expect(prompts.intro).toHaveBeenCalledOnce();
    expect(prompts.log.step).toHaveBeenCalledWith(expect.stringContaining('Group 1'));
    expect(prompts.log.info).toHaveBeenCalledWith(expect.stringContaining('step-1'));
    expect(prompts.log.info).toHaveBeenCalledWith(expect.stringContaining('Write the feature'));
    expect(prompts.log.info).toHaveBeenCalledWith(expect.stringContaining('step-2'));
    expect(prompts.log.info).toHaveBeenCalledWith(expect.stringContaining('Review the code'));
    expect(prompts.outro).toHaveBeenCalledWith(expect.stringContaining('dry-run'));
  });

  it('dry-run — parallel group label includes "(parallel)"', async () => {
    const { plan, dispatchInfoMap } = fakePlan([
      {
        parallel: true,
        steps: [
          { id: 'par-1', role: 'developer', intent: 'Do thing A', _dispatch: { model: 'claude-opus-4-5' } },
          { id: 'par-2', role: 'developer', intent: 'Do thing B', _dispatch: { model: 'claude-opus-4-5' } },
        ],
      },
    ]);
    orchestrateMock.mockResolvedValueOnce({ plan, dispatchInfoMap });

    const { runRun } = await import('../run.js');
    await runRun('build-feature', '', { dryRun: true });

    expect(prompts.log.step).toHaveBeenCalledWith(expect.stringContaining('(parallel)'));
  });

  it('dry-run — system step shows "system", no model shown', async () => {
    const { plan, dispatchInfoMap } = fakePlan([
      {
        parallel: false,
        steps: [
          { id: 'sys-1', role: 'system', intent: 'Setup the environment', _dispatch: { model: null } },
        ],
      },
    ]);
    orchestrateMock.mockResolvedValueOnce({ plan, dispatchInfoMap });

    const { runRun } = await import('../run.js');
    await runRun('review', '', { dryRun: true });

    const infoCalls = prompts.log.info.mock.calls.map(c => c[0]);
    const stepRowCall = infoCalls.find(msg => msg.includes('sys-1'));
    expect(stepRowCall).toBeDefined();
    expect(stepRowCall).not.toContain('→');
  });

  it('dry-run — gate step shows "GATE" label', async () => {
    const { plan, dispatchInfoMap } = fakePlan([
      {
        parallel: false,
        steps: [
          { id: 'gate-1', role: 'developer', intent: 'Run tests', gate: true, _dispatch: { model: 'claude-opus-4-5' } },
        ],
      },
    ]);
    orchestrateMock.mockResolvedValueOnce({ plan, dispatchInfoMap });

    const { runRun } = await import('../run.js');
    await runRun('qa-cycle', '', { dryRun: true });

    const infoCalls = prompts.log.info.mock.calls.map(c => c[0]);
    const stepRowCall = infoCalls.find(msg => msg.includes('gate-1'));
    expect(stepRowCall).toBeDefined();
    expect(stepRowCall).toContain('GATE');
  });

  it('dry-run — step with condition displays condition line', async () => {
    const { plan, dispatchInfoMap } = fakePlan([
      {
        parallel: false,
        steps: [
          {
            id: 'cond-1',
            role: 'developer',
            intent: 'Conditionally fix things',
            condition: 'gate-tests == failed',
            _dispatch: { model: 'claude-opus-4-5' },
          },
        ],
      },
    ]);
    orchestrateMock.mockResolvedValueOnce({ plan, dispatchInfoMap });

    const { runRun } = await import('../run.js');
    await runRun('review', '', { dryRun: true });

    const infoCalls = prompts.log.info.mock.calls.map(c => c[0]);
    const conditionLine = infoCalls.find(msg => msg.includes('condition:'));
    expect(conditionLine).toBeDefined();
    expect(conditionLine).toContain('gate-tests == failed');
  });

  it('dry-run — step with requires and produces displays both lines', async () => {
    const { plan, dispatchInfoMap } = fakePlan([
      {
        parallel: false,
        steps: [
          {
            id: 'req-1',
            role: 'code-reviewer',
            intent: 'Review the diff',
            requires: ['diff-content', 'test-result'],
            produces: ['review-report'],
            _dispatch: { model: 'claude-opus-4-5' },
          },
        ],
      },
    ]);
    orchestrateMock.mockResolvedValueOnce({ plan, dispatchInfoMap });

    const { runRun } = await import('../run.js');
    await runRun('review', '', { dryRun: true });

    const infoCalls = prompts.log.info.mock.calls.map(c => c[0]);
    const reqLine = infoCalls.find(msg => msg.includes('requires:'));
    expect(reqLine).toContain('diff-content');
    expect(reqLine).toContain('test-result');
    const prodLine = infoCalls.find(msg => msg.includes('produces:'));
    expect(prodLine).toContain('review-report');
  });

  it('dry-run — system step with commands displays commands line', async () => {
    const { plan, dispatchInfoMap } = fakePlan([
      {
        parallel: false,
        steps: [
          {
            id: 'cmd-1',
            role: 'system',
            intent: 'Run build and test',
            commands: ['npm run build', 'npm test'],
            _dispatch: { model: null },
          },
        ],
      },
    ]);
    orchestrateMock.mockResolvedValueOnce({ plan, dispatchInfoMap });

    const { runRun } = await import('../run.js');
    await runRun('build', '', { dryRun: true });

    const infoCalls = prompts.log.info.mock.calls.map(c => c[0]);
    const cmdLine = infoCalls.find(msg => msg.includes('commands:'));
    expect(cmdLine).toContain('npm run build');
    expect(cmdLine).toContain('npm test');
  });

  it('dry-run — does not call execute', async () => {
    const { plan, dispatchInfoMap } = fakePlan([
      {
        parallel: false,
        steps: [
          { id: 's1', role: 'developer', intent: 'Do work', _dispatch: { model: 'claude-sonnet-4-6' } },
        ],
      },
    ]);
    orchestrateMock.mockResolvedValueOnce({ plan, dispatchInfoMap });

    const { execute } = await import('../../utils/executor.js');
    const { runRun } = await import('../run.js');
    await runRun('test-skill', '', { dryRun: true });

    expect(execute).not.toHaveBeenCalled();
    expect(prompts.outro).toHaveBeenCalledWith(expect.stringContaining('dry-run'));
  });

  // --- Execution mode tests ---

  it('execution mode — calls execute with provider and callbacks', async () => {
    const { plan, dispatchInfoMap } = fakePlan([
      {
        parallel: false,
        steps: [
          { id: 's1', role: 'developer', intent: 'Do work', _dispatch: { model: 'claude-sonnet-4-6' } },
        ],
      },
    ]);
    orchestrateMock.mockResolvedValueOnce({ plan, dispatchInfoMap, trace: {} });

    const { execute } = await import('../../utils/executor.js');
    execute.mockResolvedValueOnce({ ...plan, status: 'completed', stepStates: { s1: { status: 'passed' } } });

    const { runRun } = await import('../run.js');
    await runRun('test-skill', '', { profile: 'max' });

    expect(execute).toHaveBeenCalledOnce();
    expect(execute.mock.calls[0][2]).toHaveProperty('provider');
    expect(execute.mock.calls[0][2]).toHaveProperty('onStepStart');
    expect(execute.mock.calls[0][2]).toHaveProperty('onStepEnd');
  });

  it('execution mode — shows completed status in outro', async () => {
    const { plan, dispatchInfoMap } = fakePlan([
      {
        parallel: false,
        steps: [
          { id: 's1', role: 'developer', intent: 'Do work', _dispatch: { model: 'claude-sonnet-4-6' } },
        ],
      },
    ]);
    orchestrateMock.mockResolvedValueOnce({ plan, dispatchInfoMap, trace: {} });

    const { execute } = await import('../../utils/executor.js');
    execute.mockResolvedValueOnce({ ...plan, status: 'completed', stepStates: { s1: { status: 'passed' } } });

    const { runRun } = await import('../run.js');
    await runRun('test-skill', '', { profile: 'max' });

    expect(prompts.outro).toHaveBeenCalledWith(expect.stringContaining('completed'));
  });

  // --- Error tests ---

  it('skill not found — orchestrate throws, error propagates', async () => {
    orchestrateMock.mockRejectedValueOnce(new Error('Skill "nonexistent" not found'));

    const { runRun } = await import('../run.js');
    await expect(runRun('nonexistent', '', { dryRun: true })).rejects.toThrow('Skill "nonexistent" not found');
  });

  it('project not found — ensureProjectRoot throws, error propagates', async () => {
    ensureProjectRootMock.mockImplementationOnce(() => {
      throw new Error('Guild project not found');
    });

    const { runRun } = await import('../run.js');
    await expect(runRun('review', '', { dryRun: true })).rejects.toThrow('Guild project not found');
  });
});
