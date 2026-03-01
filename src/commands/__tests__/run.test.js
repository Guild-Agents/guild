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

  it('happy path — 2 sequential steps: calls intro, step, info for each step', async () => {
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
    await runRun('review', '', { profile: 'max' });

    expect(prompts.intro).toHaveBeenCalledOnce();
    expect(prompts.log.step).toHaveBeenCalledWith(expect.stringContaining('Group 1'));
    expect(prompts.log.info).toHaveBeenCalledWith(expect.stringContaining('step-1'));
    expect(prompts.log.info).toHaveBeenCalledWith(expect.stringContaining('Write the feature'));
    expect(prompts.log.info).toHaveBeenCalledWith(expect.stringContaining('step-2'));
    expect(prompts.log.info).toHaveBeenCalledWith(expect.stringContaining('Review the code'));
    expect(prompts.outro).toHaveBeenCalledOnce();
  });

  it('parallel group — label includes "(parallel)"', async () => {
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
    await runRun('build-feature', '', {});

    expect(prompts.log.step).toHaveBeenCalledWith(expect.stringContaining('(parallel)'));
  });

  it('system step — shows "system" in output, no model shown', async () => {
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
    await runRun('review', '', {});

    // The info call for step row should include the step id
    const infoCalls = prompts.log.info.mock.calls.map(c => c[0]);
    const stepRowCall = infoCalls.find(msg => msg.includes('sys-1'));
    expect(stepRowCall).toBeDefined();
    // Should not include a model arrow since model is null
    expect(stepRowCall).not.toContain('→');
  });

  it('gate step — shows "GATE" label in step row', async () => {
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
    await runRun('qa-cycle', '', {});

    const infoCalls = prompts.log.info.mock.calls.map(c => c[0]);
    const stepRowCall = infoCalls.find(msg => msg.includes('gate-1'));
    expect(stepRowCall).toBeDefined();
    expect(stepRowCall).toContain('GATE');
  });

  it('step with condition — displays condition line', async () => {
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
    await runRun('review', '', {});

    const infoCalls = prompts.log.info.mock.calls.map(c => c[0]);
    const conditionLine = infoCalls.find(msg => msg.includes('condition:'));
    expect(conditionLine).toBeDefined();
    expect(conditionLine).toContain('gate-tests == failed');
  });

  it('skill not found — orchestrate throws, error propagates', async () => {
    orchestrateMock.mockRejectedValueOnce(new Error('Skill "nonexistent" not found'));

    const { runRun } = await import('../run.js');
    await expect(runRun('nonexistent', '', {})).rejects.toThrow('Skill "nonexistent" not found');
  });

  it('project not found — ensureProjectRoot throws, error propagates', async () => {
    ensureProjectRootMock.mockImplementationOnce(() => {
      throw new Error('Guild project not found');
    });

    const { runRun } = await import('../run.js');
    await expect(runRun('review', '', {})).rejects.toThrow('Guild project not found');
  });
});
