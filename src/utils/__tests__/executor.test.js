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

// Stub for buildStepContext — executor imports this from orchestrator-io
vi.mock('../orchestrator-io.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    buildStepContext: vi.fn((_step, _plan, _options) => 'mocked context prompt'),
    recordStepTrace: vi.fn(),
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

  it('handles delegation steps by marking passed (v1.1)', async () => {
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

    const result = await execute(plan, dispatchMap, { provider });

    expect(result.status).toBe('completed');
    expect(result.stepStates['delegate'].status).toBe('passed');
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
