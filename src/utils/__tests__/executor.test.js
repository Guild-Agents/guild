import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execute } from '../executor.js';
import {
  createExecutionPlan,
} from '../orchestrator.js';

// --- Helpers ---

function makeWorkflow(steps) {
  return { version: 1, steps };
}

function makeStep(overrides) {
  return {
    id: 'step-1',
    role: 'developer',
    intent: 'Do work',
    modelTier: 'execution',
    ...overrides,
  };
}

function makeDispatchMap(plan, defaultDispatch = {}) {
  const map = {};
  for (const group of plan.groups) {
    for (const step of group.steps) {
      map[step.id] = {
        role: step.role === 'system' ? 'system' : 'agent',
        tier: step.role === 'system' ? null : 'execution',
        model: step.role === 'system' ? null : 'claude-sonnet-4-6',
        fallback: false,
        agentMetadata: null,
        ...defaultDispatch,
      };
    }
  }
  return map;
}

function mockProvider(responses = {}) {
  return vi.fn(async (step) => {
    if (responses[step.id]) return responses[step.id];
    return { status: 'passed', output: `Output for ${step.id}` };
  });
}

vi.mock('../orchestrator-io.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    buildStepContext: vi.fn((_step, _plan, _options) => 'mocked context prompt'),
    recordStepTrace: vi.fn(),
    loadWorkflow: vi.fn(),
    resolveStepDispatch: vi.fn((step) => ({
      role: step.role === 'system' ? 'system' : 'agent',
      tier: step.role === 'system' ? null : 'execution',
      model: step.role === 'system' ? null : 'claude-sonnet-4-6',
      fallback: false,
      agentMetadata: null,
    })),
  };
});

describe('execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes a single agent step and returns completed plan', async () => {
    const workflow = makeWorkflow([makeStep({ id: 'eval', role: 'advisor' })]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);
    const provider = mockProvider();

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('completed');
    expect(result.stepStates['eval'].status).toBe('passed');
    expect(provider).toHaveBeenCalledOnce();
  });

  it('executes multiple sequential steps in order', async () => {
    const workflow = makeWorkflow([
      makeStep({ id: 'step-a', role: 'advisor' }),
      makeStep({ id: 'step-b', role: 'developer' }),
      makeStep({ id: 'step-c', role: 'qa' }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);

    const callOrder = [];
    const provider = vi.fn(async (step) => {
      callOrder.push(step.id);
      return { status: 'passed', output: 'ok' };
    });

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('completed');
    expect(callOrder).toEqual(['step-a', 'step-b', 'step-c']);
  });

  it('calls onStepStart and onStepEnd callbacks', async () => {
    const workflow = makeWorkflow([makeStep({ id: 's1', role: 'advisor' })]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);
    const provider = mockProvider();

    const onStepStart = vi.fn();
    const onStepEnd = vi.fn();

    await execute(plan, dispatchMap, { provider, onStepStart, onStepEnd });

    expect(onStepStart).toHaveBeenCalledOnce();
    expect(onStepStart.mock.calls[0][0].id).toBe('s1');
    expect(onStepEnd).toHaveBeenCalledOnce();
  });

  it('skips steps with unmet conditions', async () => {
    const workflow = makeWorkflow([
      makeStep({ id: 'eval', role: 'advisor', produces: ['verdict'] }),
      makeStep({
        id: 'fix',
        role: 'developer',
        condition: 'step.eval.verdict == rejected',
      }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);
    const provider = mockProvider({
      eval: { status: 'passed', output: 'ok', outcome: { verdict: 'approved' } },
    });

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('completed');
    expect(result.stepStates['eval'].status).toBe('passed');
    expect(result.stepStates['fix'].status).toBe('skipped');
    expect(provider).toHaveBeenCalledOnce();
  });

  it('aborts plan when step fails with on-failure: abort', async () => {
    const workflow = makeWorkflow([
      makeStep({ id: 'risky', role: 'developer', onFailure: 'abort' }),
      makeStep({ id: 'after', role: 'qa' }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);
    const provider = mockProvider({
      risky: { status: 'failed', output: 'boom', error: 'exploded' },
    });

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('aborted');
    expect(result.stepStates['risky'].status).toBe('failed');
    expect(result.stepStates['after'].status).toBe('pending');
  });

  it('executes system step commands directly (not via provider)', async () => {
    const workflow = makeWorkflow([
      makeStep({
        id: 'gate',
        role: 'system',
        intent: 'Run tests',
        commands: ['echo hello'],
        gate: true,
      }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);
    const provider = mockProvider();

    const result = await execute(plan, dispatchMap, {
      provider,
      projectRoot: '/tmp',
    });

    expect(result.status).toBe('completed');
    expect(result.stepStates['gate'].status).toBe('passed');
    expect(provider).not.toHaveBeenCalled();
  });

  it('handles system step with failed command', async () => {
    const workflow = makeWorkflow([
      makeStep({
        id: 'gate',
        role: 'system',
        intent: 'Run tests',
        commands: ['false'],
        gate: true,
        onFailure: 'abort',
      }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);
    const provider = mockProvider();

    const result = await execute(plan, dispatchMap, {
      provider,
      projectRoot: '/tmp',
    });

    expect(result.status).toBe('aborted');
    expect(result.stepStates['gate'].status).toBe('failed');
  });

  it('handles delegation steps by executing sub-skill', async () => {
    const { loadWorkflow: mockLoadWorkflow } = await import('../orchestrator-io.js');

    const workflow = makeWorkflow([
      makeStep({
        id: 'delegate',
        role: 'system',
        intent: 'Run QA cycle',
        delegatesTo: 'qa-cycle',
      }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);
    const provider = mockProvider();

    vi.mocked(mockLoadWorkflow).mockReturnValueOnce({
      workflow: makeWorkflow([makeStep({ id: 'sub-1', role: 'qa' })]),
      body: '',
      name: 'qa-cycle',
    });

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('completed');
    expect(result.stepStates['delegate'].status).toBe('passed');
    expect(provider).toHaveBeenCalledOnce();
  });

  it('aborts after MAX_EMPTY_ITERATIONS when no steps are executable', async () => {
    const workflow = makeWorkflow([makeStep({ id: 's1', role: 'advisor' })]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);
    const provider = mockProvider();

    // Patch getNextSteps to always return empty (simulates stuck plan)
    const orchestrator = await import('../orchestrator.js');
    const originalGetNext = orchestrator.getNextSteps;
    const originalIsComplete = orchestrator.isPlanComplete;
    let callCount = 0;
    vi.spyOn(orchestrator, 'getNextSteps').mockImplementation((p) => {
      callCount++;
      if (callCount <= 150) return { steps: [], skipped: [] };
      return originalGetNext(p);
    });
    vi.spyOn(orchestrator, 'isPlanComplete').mockImplementation((p) => {
      if (callCount <= 150) return false;
      return originalIsComplete(p);
    });

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('aborted');
    expect(provider).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('retries step on failure when retry is configured', async () => {
    const workflow = makeWorkflow([
      makeStep({
        id: 'flaky',
        role: 'developer',
        retry: { max: 2, on: 'failure' },
      }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);

    let calls = 0;
    const provider = vi.fn(async () => {
      calls++;
      if (calls === 1) return { status: 'failed', output: 'fail', error: 'oops' };
      return { status: 'passed', output: 'ok' };
    });

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('completed');
    expect(result.stepStates['flaky'].status).toBe('passed');
    expect(provider).toHaveBeenCalledTimes(2);
  });
});

describe('parallel execution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches parallel steps concurrently', async () => {
    const workflow = makeWorkflow([
      makeStep({ id: 'a', role: 'advisor', parallel: ['b', 'c'] }),
      makeStep({ id: 'b', role: 'developer', parallel: ['a', 'c'] }),
      makeStep({ id: 'c', role: 'qa', parallel: ['a', 'b'] }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);

    const inFlight = [];
    const provider = vi.fn(async (step) => {
      inFlight.push(step.id);
      await new Promise(r => { globalThis.setTimeout(r, 10); });
      return { status: 'passed', output: `done-${step.id}` };
    });

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('completed');
    expect(result.stepStates['a'].status).toBe('passed');
    expect(result.stepStates['b'].status).toBe('passed');
    expect(result.stepStates['c'].status).toBe('passed');
    // All 3 should have been started before any finished
    expect(inFlight).toEqual(['a', 'b', 'c']);
    expect(provider).toHaveBeenCalledTimes(3);
  });

  it('handles mixed sequential and parallel groups', async () => {
    const workflow = makeWorkflow([
      makeStep({ id: 'seq1', role: 'advisor' }),
      makeStep({ id: 'par-a', role: 'developer', parallel: ['par-b'] }),
      makeStep({ id: 'par-b', role: 'qa', parallel: ['par-a'] }),
      makeStep({ id: 'seq2', role: 'code-reviewer' }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);

    const callOrder = [];
    const provider = vi.fn(async (step) => {
      callOrder.push(step.id);
      return { status: 'passed', output: 'ok' };
    });

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('completed');
    expect(callOrder[0]).toBe('seq1');
    expect(callOrder.slice(1, 3).sort()).toEqual(['par-a', 'par-b']);
    expect(callOrder[3]).toBe('seq2');
  });

  it('failing parallel step does not block other parallel peers', async () => {
    const workflow = makeWorkflow([
      makeStep({ id: 'a', role: 'advisor', parallel: ['b'], onFailure: 'continue' }),
      makeStep({ id: 'b', role: 'developer', parallel: ['a'] }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);

    const provider = vi.fn(async (step) => {
      if (step.id === 'a') return { status: 'failed', output: 'boom', error: 'err' };
      return { status: 'passed', output: 'ok' };
    });

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.stepStates['a'].status).toBe('failed');
    expect(result.stepStates['b'].status).toBe('passed');
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('fires onStepStart and onStepEnd for each parallel step', async () => {
    const workflow = makeWorkflow([
      makeStep({ id: 'a', role: 'advisor', parallel: ['b'] }),
      makeStep({ id: 'b', role: 'developer', parallel: ['a'] }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);
    const provider = mockProvider();

    const starts = [];
    const ends = [];

    await execute(plan, dispatchMap, {
      provider,
      onStepStart: (step) => starts.push(step.id),
      onStepEnd: (step) => ends.push(step.id),
    });

    expect(starts.sort()).toEqual(['a', 'b']);
    expect(ends.sort()).toEqual(['a', 'b']);
  });
});

describe('delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes delegated sub-skill to completion', async () => {
    const { loadWorkflow: mockLoadWorkflow } = await import('../orchestrator-io.js');

    const workflow = makeWorkflow([
      makeStep({
        id: 'delegate',
        role: 'system',
        intent: 'Run QA cycle',
        delegatesTo: 'qa-cycle',
      }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);

    // Mock loadWorkflow to return a simple sub-skill
    vi.mocked(mockLoadWorkflow).mockReturnValueOnce({
      workflow: makeWorkflow([
        makeStep({ id: 'sub-1', role: 'qa' }),
        makeStep({ id: 'sub-2', role: 'bugfix' }),
      ]),
      body: 'sub-skill body',
      name: 'qa-cycle',
    });

    const provider = mockProvider();

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('completed');
    expect(result.stepStates['delegate'].status).toBe('passed');
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('fails delegation step when sub-skill fails', async () => {
    const { loadWorkflow: mockLoadWorkflow } = await import('../orchestrator-io.js');

    const workflow = makeWorkflow([
      makeStep({
        id: 'delegate',
        role: 'system',
        intent: 'Run QA cycle',
        delegatesTo: 'qa-cycle',
        onFailure: 'abort',
      }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);

    vi.mocked(mockLoadWorkflow).mockReturnValueOnce({
      workflow: makeWorkflow([
        makeStep({ id: 'sub-1', role: 'qa', onFailure: 'abort' }),
      ]),
      body: '',
      name: 'qa-cycle',
    });

    const provider = vi.fn(async () => ({
      status: 'failed', output: 'qa failed', error: 'bugs found',
    }));

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('aborted');
    expect(result.stepStates['delegate'].status).toBe('failed');
  });

  it('fails when delegation depth limit is exceeded', async () => {
    const workflow = makeWorkflow([
      makeStep({
        id: 'delegate',
        role: 'system',
        intent: 'Deep delegation',
        delegatesTo: 'some-skill',
        onFailure: 'abort',
      }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);
    const provider = mockProvider();

    const result = await execute(plan, dispatchMap, {
      provider,
      delegationDepth: 2,
    });

    expect(result.status).toBe('aborted');
    expect(result.stepStates['delegate'].status).toBe('failed');
    expect(result.stepStates['delegate'].error).toContain('depth limit');
  });

  it('fails gracefully when delegated skill cannot be loaded', async () => {
    const { loadWorkflow: mockLoadWorkflow } = await import('../orchestrator-io.js');

    const workflow = makeWorkflow([
      makeStep({
        id: 'delegate',
        role: 'system',
        intent: 'Run missing skill',
        delegatesTo: 'nonexistent-skill',
        onFailure: 'abort',
      }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);
    const provider = mockProvider();

    vi.mocked(mockLoadWorkflow).mockImplementationOnce(() => {
      throw new Error('Skill "nonexistent-skill" not found');
    });

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('aborted');
    expect(result.stepStates['delegate'].status).toBe('failed');
    expect(result.stepStates['delegate'].error).toContain('nonexistent-skill');
  });

  it('retries delegation step when configured', async () => {
    const { loadWorkflow: mockLoadWorkflow } = await import('../orchestrator-io.js');

    const subWorkflow = makeWorkflow([
      makeStep({ id: 'sub-1', role: 'qa', onFailure: 'abort' }),
    ]);

    const workflow = makeWorkflow([
      makeStep({
        id: 'delegate',
        role: 'system',
        intent: 'Run QA cycle',
        delegatesTo: 'qa-cycle',
        retry: { max: 2, on: 'failure' },
      }),
    ]);
    const plan = createExecutionPlan(workflow, { skillName: 'test' });
    const dispatchMap = makeDispatchMap(plan);

    let calls = 0;
    vi.mocked(mockLoadWorkflow).mockImplementation(() => ({
      workflow: subWorkflow,
      body: '',
      name: 'qa-cycle',
    }));

    const provider = vi.fn(async () => {
      calls++;
      if (calls === 1) return { status: 'failed', output: 'fail', error: 'bugs' };
      return { status: 'passed', output: 'ok' };
    });

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('completed');
    expect(result.stepStates['delegate'].status).toBe('passed');
    expect(calls).toBe(2);
  });
});
