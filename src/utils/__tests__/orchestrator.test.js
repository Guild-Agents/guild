import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CIRCUIT_BREAKER_LIMIT,
  MAX_DELEGATION_DEPTH,
  createExecutionPlan,
  advanceStep,
  getNextSteps,
  isPlanComplete,
  parseCondition,
  evaluateCondition,
  shouldRetry,
  resolveFailureTarget,
  expandDelegation,
} from '../orchestrator.js';

// --- Shared test data ---

const makeWorkflow = (steps = []) => ({
  version: 1,
  steps,
});

const makeStep = (id, overrides = {}) => ({
  id,
  role: 'developer',
  intent: `Step ${id}`,
  requires: [],
  produces: [],
  blocking: true,
  onFailure: 'abort',
  gate: false,
  retry: undefined,
  condition: undefined,
  parallel: undefined,
  ...overrides,
});

const makeSequentialWorkflow = (ids) =>
  makeWorkflow(ids.map(id => makeStep(id)));

// --- Constants ---

describe('DEFAULT_CIRCUIT_BREAKER_LIMIT', () => {
  it('is 50', () => {
    expect(DEFAULT_CIRCUIT_BREAKER_LIMIT).toBe(50);
  });
});

describe('MAX_DELEGATION_DEPTH', () => {
  it('is 2', () => {
    expect(MAX_DELEGATION_DEPTH).toBe(2);
  });
});

// --- createExecutionPlan ---

describe('createExecutionPlan', () => {
  it('creates plan with basic structure', () => {
    const workflow = makeSequentialWorkflow(['a', 'b', 'c']);
    const plan = createExecutionPlan(workflow);

    expect(plan.workflow).toBe(workflow);
    expect(plan.groups).toHaveLength(3);
    expect(plan.currentGroupIndex).toBe(0);
    expect(plan.totalStepsExecuted).toBe(0);
    expect(plan.status).toBe('running');
    expect(plan.jumpToStepId).toBeNull();
  });

  it('initializes all stepStates as pending with all fields', () => {
    const workflow = makeSequentialWorkflow(['a', 'b', 'c']);
    const plan = createExecutionPlan(workflow);

    expect(Object.keys(plan.stepStates)).toHaveLength(3);
    for (const [id, state] of Object.entries(plan.stepStates)) {
      expect(state.id).toBe(id);
      expect(state.status).toBe('pending');
      expect(state.attempts).toBe(0);
      expect(state.outcome).toBeNull();
      expect(state.error).toBeNull();
      expect(state.startedAt).toBeNull();
      expect(state.finishedAt).toBeNull();
    }
  });

  it('includes totalSteps count', () => {
    const workflow = makeSequentialWorkflow(['a', 'b', 'c']);
    const plan = createExecutionPlan(workflow);
    expect(plan.totalSteps).toBe(3);
  });

  it('uses plain object for stepStates (not Map)', () => {
    const workflow = makeSequentialWorkflow(['a', 'b']);
    const plan = createExecutionPlan(workflow);

    expect(plan.stepStates).not.toBeInstanceOf(Map);
    expect(typeof plan.stepStates).toBe('object');
    expect(plan.stepStates.a).toBeDefined();
    expect(plan.stepStates.b).toBeDefined();
  });

  it('uses default circuit breaker limit', () => {
    const workflow = makeSequentialWorkflow(['a']);
    const plan = createExecutionPlan(workflow);
    expect(plan.circuitBreakerLimit).toBe(DEFAULT_CIRCUIT_BREAKER_LIMIT);
  });

  it('accepts custom circuit breaker limit', () => {
    const workflow = makeSequentialWorkflow(['a']);
    const plan = createExecutionPlan(workflow, { circuitBreakerLimit: 10 });
    expect(plan.circuitBreakerLimit).toBe(10);
  });

  it('sets skillName from options', () => {
    const workflow = makeSequentialWorkflow(['a']);
    const plan = createExecutionPlan(workflow, { skillName: 'my-skill' });
    expect(plan.skillName).toBe('my-skill');
  });

  it('defaults skillName to empty string', () => {
    const workflow = makeSequentialWorkflow(['a']);
    const plan = createExecutionPlan(workflow);
    expect(plan.skillName).toBe('');
  });

  it('groups parallel steps correctly', () => {
    const workflow = makeWorkflow([
      makeStep('a', { parallel: ['b'] }),
      makeStep('b', { parallel: ['a'] }),
      makeStep('c'),
    ]);
    const plan = createExecutionPlan(workflow);

    expect(plan.groups).toHaveLength(2);
    expect(plan.groups[0].parallel).toBe(true);
    expect(plan.groups[0].steps).toHaveLength(2);
    expect(plan.groups[1].parallel).toBe(false);
  });

  it('initializes stepStates for parallel steps too', () => {
    const workflow = makeWorkflow([
      makeStep('a', { parallel: ['b'] }),
      makeStep('b', { parallel: ['a'] }),
    ]);
    const plan = createExecutionPlan(workflow);

    expect(plan.stepStates.a).toBeDefined();
    expect(plan.stepStates.b).toBeDefined();
  });
});

// --- advanceStep ---

describe('advanceStep', () => {
  it('marks step as passed and increments totalStepsExecuted', () => {
    const workflow = makeSequentialWorkflow(['a', 'b']);
    const plan = createExecutionPlan(workflow);

    const newPlan = advanceStep(plan, 'a', { status: 'passed', outcome: { result: 'done' }, error: null });

    expect(newPlan.stepStates.a.status).toBe('passed');
    expect(newPlan.stepStates.a.outcome).toEqual({ result: 'done' });
    expect(newPlan.totalStepsExecuted).toBe(1);
    expect(newPlan.status).toBe('running');
  });

  it('is immutable — does not mutate input plan', () => {
    const workflow = makeSequentialWorkflow(['a']);
    const plan = createExecutionPlan(workflow);
    const originalStatus = plan.stepStates.a.status;

    const newPlan = advanceStep(plan, 'a', { status: 'passed', outcome: null, error: null });

    expect(plan.stepStates.a.status).toBe(originalStatus);
    expect(newPlan.stepStates.a.status).toBe('passed');
    expect(newPlan).not.toBe(plan);
  });

  it('marks step as failed with error', () => {
    const workflow = makeSequentialWorkflow(['a']);
    const plan = createExecutionPlan(workflow);

    const newPlan = advanceStep(plan, 'a', { status: 'failed', outcome: null, error: 'Something went wrong' });

    expect(newPlan.stepStates.a.status).toBe('failed');
    expect(newPlan.stepStates.a.error).toBe('Something went wrong');
    expect(newPlan.status).toBe('aborted'); // default on-failure is abort
  });

  it('throws if stepId does not exist', () => {
    const workflow = makeSequentialWorkflow(['a']);
    const plan = createExecutionPlan(workflow);

    expect(() => advanceStep(plan, 'nonexistent', { status: 'passed', outcome: null, error: null }))
      .toThrow('"nonexistent"');
  });

  it('trips circuit breaker when limit exceeded', () => {
    // With limit=1, the second execution triggers circuit-breaker
    const workflow = makeSequentialWorkflow(['a', 'b']);
    const plan = createExecutionPlan(workflow, { circuitBreakerLimit: 1 });

    let p = advanceStep(plan, 'a', { status: 'passed', outcome: null, error: null });
    p = advanceStep(p, 'b', { status: 'passed', outcome: null, error: null });

    expect(p.status).toBe('circuit-breaker');
  });

  it('handles retry — increments attempts and resets to pending', () => {
    const workflow = makeWorkflow([
      makeStep('a', { retry: { max: 3, on: 'failure' } }),
    ]);
    const plan = createExecutionPlan(workflow);

    // Fail on first attempt (attempts starts at 0, so should retry)
    const newPlan = advanceStep(plan, 'a', { status: 'failed', outcome: null, error: 'fail' });

    expect(newPlan.stepStates.a.status).toBe('pending');
    expect(newPlan.stepStates.a.attempts).toBe(1);
    expect(newPlan.status).toBe('running');
  });

  it('does not retry if max attempts exhausted', () => {
    const workflow = makeWorkflow([
      makeStep('a', { retry: { max: 2, on: 'failure' }, onFailure: 'abort' }),
    ]);
    const plan = createExecutionPlan(workflow);

    // Simulate 2 attempts already made
    const planWith2Attempts = {
      ...plan,
      stepStates: {
        ...plan.stepStates,
        a: { ...plan.stepStates.a, attempts: 2 },
      },
    };

    const newPlan = advanceStep(planWith2Attempts, 'a', { status: 'failed', outcome: null, error: 'fail' });

    expect(newPlan.stepStates.a.status).toBe('failed');
    expect(newPlan.status).toBe('aborted');
  });

  it('sets jumpToStepId on goto failure', () => {
    const workflow = makeWorkflow([
      makeStep('a', { onFailure: 'goto:b' }),
      makeStep('b'),
    ]);
    const plan = createExecutionPlan(workflow);

    const newPlan = advanceStep(plan, 'a', { status: 'failed', outcome: null, error: 'fail' });

    expect(newPlan.jumpToStepId).toBe('b');
    expect(newPlan.status).toBe('running');
    expect(newPlan.stepStates.a.status).toBe('failed');
  });

  it('continues (no abort) when onFailure is continue', () => {
    const workflow = makeWorkflow([
      makeStep('a', { onFailure: 'continue' }),
      makeStep('b'),
    ]);
    const plan = createExecutionPlan(workflow);

    const newPlan = advanceStep(plan, 'a', { status: 'failed', outcome: null, error: 'fail' });

    expect(newPlan.stepStates.a.status).toBe('failed');
    expect(newPlan.status).toBe('running');
    expect(newPlan.jumpToStepId).toBeNull();
  });

  it('marks step as skipped without incrementing attempts', () => {
    const workflow = makeSequentialWorkflow(['a']);
    const plan = createExecutionPlan(workflow);

    const newPlan = advanceStep(plan, 'a', { status: 'skipped', outcome: null, error: null });

    expect(newPlan.stepStates.a.status).toBe('skipped');
    expect(newPlan.stepStates.a.attempts).toBe(0);
  });
});

// --- getNextSteps ---
// getNextSteps returns { steps: object[], skipped: string[] }.
// Callers must call advanceStep(plan, id, { status: 'skipped' }) for each id in skipped.

describe('getNextSteps', () => {
  it('returns first step for a fresh sequential plan', () => {
    const workflow = makeSequentialWorkflow(['a', 'b', 'c']);
    const plan = createExecutionPlan(workflow);

    const { steps, skipped } = getNextSteps(plan);

    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe('a');
    expect(skipped).toEqual([]);
  });

  it('returns second step after first is passed', () => {
    const workflow = makeSequentialWorkflow(['a', 'b', 'c']);
    let plan = createExecutionPlan(workflow);
    plan = advanceStep(plan, 'a', { status: 'passed', outcome: null, error: null });

    const { steps, skipped } = getNextSteps(plan);

    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe('b');
    expect(skipped).toEqual([]);
  });

  it('returns all parallel steps at once', () => {
    const workflow = makeWorkflow([
      makeStep('a', { parallel: ['b'] }),
      makeStep('b', { parallel: ['a'] }),
      makeStep('c'),
    ]);
    const plan = createExecutionPlan(workflow);

    const { steps, skipped } = getNextSteps(plan);

    expect(steps).toHaveLength(2);
    const ids = steps.map(s => s.id).sort();
    expect(ids).toEqual(['a', 'b']);
    expect(skipped).toEqual([]);
  });

  it('returns empty steps when plan is aborted', () => {
    const workflow = makeSequentialWorkflow(['a']);
    let plan = createExecutionPlan(workflow);
    plan = advanceStep(plan, 'a', { status: 'failed', outcome: null, error: 'fail' });

    expect(plan.status).toBe('aborted');
    const { steps, skipped } = getNextSteps(plan);
    expect(steps).toEqual([]);
    expect(skipped).toEqual([]);
  });

  it('returns empty steps when all steps are complete', () => {
    const workflow = makeSequentialWorkflow(['a', 'b']);
    let plan = createExecutionPlan(workflow);
    plan = advanceStep(plan, 'a', { status: 'passed', outcome: null, error: null });
    plan = advanceStep(plan, 'b', { status: 'passed', outcome: null, error: null });

    const { steps, skipped } = getNextSteps(plan);
    expect(steps).toEqual([]);
    expect(skipped).toEqual([]);
  });

  it('returns skipped id for steps with unmet conditions', () => {
    const workflow = makeWorkflow([
      makeStep('a'),
      makeStep('b', { condition: 'step.a.verdict == approved' }),
      makeStep('c'),
    ]);
    let plan = createExecutionPlan(workflow);
    // Pass 'a' with outcome that has verdict != 'approved'
    plan = advanceStep(plan, 'a', {
      status: 'passed',
      outcome: { verdict: 'rejected' },
      error: null,
    });

    // Step 'b' has condition step.a.verdict == approved — not met
    // getNextSteps should NOT include 'b' in steps, but report it in skipped
    const { steps, skipped } = getNextSteps(plan);
    expect(steps.every(s => s.id !== 'b')).toBe(true);
    expect(skipped).toContain('b');
  });

  it('follows jumpToStepId when set', () => {
    const workflow = makeWorkflow([
      makeStep('a', { onFailure: 'goto:c' }),
      makeStep('b'),
      makeStep('c'),
    ]);
    let plan = createExecutionPlan(workflow);
    plan = advanceStep(plan, 'a', { status: 'failed', outcome: null, error: 'fail' });

    expect(plan.jumpToStepId).toBe('c');
    const { steps, skipped } = getNextSteps(plan);
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe('c');
    expect(skipped).toEqual([]);
  });

  it('returns empty steps for completed plan', () => {
    const workflow = makeSequentialWorkflow(['a']);
    let plan = createExecutionPlan(workflow);
    plan = { ...plan, status: 'completed' };

    const { steps, skipped } = getNextSteps(plan);
    expect(steps).toEqual([]);
    expect(skipped).toEqual([]);
  });

  // --- B1: currentGroupIndex advances ---

  it('B1: currentGroupIndex advances after all steps in group 0 are done', () => {
    const workflow = makeSequentialWorkflow(['a', 'b']);
    let plan = createExecutionPlan(workflow);

    expect(plan.currentGroupIndex).toBe(0);

    plan = advanceStep(plan, 'a', { status: 'passed', outcome: null, error: null });

    expect(plan.currentGroupIndex).toBe(1);

    const { steps } = getNextSteps(plan);
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe('b');
  });

  it('B1: getNextSteps returns steps from group 1 after group 0 is complete', () => {
    const workflow = makeSequentialWorkflow(['a', 'b', 'c']);
    let plan = createExecutionPlan(workflow);

    plan = advanceStep(plan, 'a', { status: 'passed', outcome: null, error: null });
    expect(plan.currentGroupIndex).toBe(1);

    const { steps } = getNextSteps(plan);
    expect(steps[0].id).toBe('b');
  });

  // --- B2: jumpToStepId is cleared after executing jump target ---

  it('B2: jumpToStepId is set after goto failure', () => {
    const workflow = makeWorkflow([
      makeStep('a', { onFailure: 'goto:c' }),
      makeStep('b'),
      makeStep('c'),
    ]);
    let plan = createExecutionPlan(workflow);
    plan = advanceStep(plan, 'a', { status: 'failed', outcome: null, error: 'fail' });

    expect(plan.jumpToStepId).toBe('c');
  });

  it('B2: jumpToStepId is cleared after executing the jump target step', () => {
    const workflow = makeWorkflow([
      makeStep('a', { onFailure: 'goto:c' }),
      makeStep('b'),
      makeStep('c'),
    ]);
    let plan = createExecutionPlan(workflow);

    // Step A fails with goto:C
    plan = advanceStep(plan, 'a', { status: 'failed', outcome: null, error: 'fail' });
    expect(plan.jumpToStepId).toBe('c');

    // getNextSteps returns [c]
    const { steps } = getNextSteps(plan);
    expect(steps[0].id).toBe('c');

    // Execute step C (the jump target) — jumpToStepId must be cleared
    plan = advanceStep(plan, 'c', { status: 'passed', outcome: null, error: null });
    expect(plan.jumpToStepId).toBeNull();
  });

  it('B2: full goto cycle — after jump target passes, getNextSteps returns next group (not C again)', () => {
    const workflow = makeWorkflow([
      makeStep('a', { onFailure: 'goto:c' }),
      makeStep('b'),
      makeStep('c'),
      makeStep('d'),
    ]);
    let plan = createExecutionPlan(workflow);

    // A fails -> goto C
    plan = advanceStep(plan, 'a', { status: 'failed', outcome: null, error: 'fail' });
    expect(plan.jumpToStepId).toBe('c');

    // Execute C (jump target)
    plan = advanceStep(plan, 'c', { status: 'passed', outcome: null, error: null });
    expect(plan.jumpToStepId).toBeNull();

    // Now getNextSteps must not return C again
    const { steps } = getNextSteps(plan);
    expect(steps.every(s => s.id !== 'c')).toBe(true);
  });

  // --- W1: skipped steps allow isPlanComplete to work ---

  it('W1: skipped steps returned by getNextSteps allow isPlanComplete after advancing them', () => {
    const workflow = makeWorkflow([
      makeStep('a'),
      makeStep('b', { condition: 'step.a.verdict == approved' }),
    ]);
    let plan = createExecutionPlan(workflow);

    // Pass 'a' with rejected verdict so 'b' condition is false
    plan = advanceStep(plan, 'a', {
      status: 'passed',
      outcome: { verdict: 'rejected' },
      error: null,
    });

    const { steps, skipped } = getNextSteps(plan);
    expect(steps).toEqual([]);
    expect(skipped).toContain('b');

    // Caller advances skipped steps
    for (const id of skipped) {
      plan = advanceStep(plan, id, { status: 'skipped', outcome: null, error: null });
    }

    // Now plan should be complete
    expect(isPlanComplete(plan)).toBe(true);
  });
});

// --- isPlanComplete ---

describe('isPlanComplete', () => {
  it('returns false for fresh plan with pending steps', () => {
    const workflow = makeSequentialWorkflow(['a', 'b']);
    const plan = createExecutionPlan(workflow);
    expect(isPlanComplete(plan)).toBe(false);
  });

  it('returns true when all steps are passed', () => {
    const workflow = makeSequentialWorkflow(['a', 'b']);
    let plan = createExecutionPlan(workflow);
    plan = advanceStep(plan, 'a', { status: 'passed', outcome: null, error: null });
    plan = advanceStep(plan, 'b', { status: 'passed', outcome: null, error: null });
    expect(isPlanComplete(plan)).toBe(true);
  });

  it('returns true when plan is aborted', () => {
    const workflow = makeSequentialWorkflow(['a']);
    let plan = createExecutionPlan(workflow);
    plan = advanceStep(plan, 'a', { status: 'failed', outcome: null, error: 'fail' });

    expect(plan.status).toBe('aborted');
    expect(isPlanComplete(plan)).toBe(true);
  });

  it('returns true for circuit-breaker status', () => {
    const workflow = makeSequentialWorkflow(['a', 'b']);
    let plan = createExecutionPlan(workflow, { circuitBreakerLimit: 1 });
    plan = advanceStep(plan, 'a', { status: 'passed', outcome: null, error: null });
    plan = advanceStep(plan, 'b', { status: 'passed', outcome: null, error: null });
    expect(plan.status).toBe('circuit-breaker');
    expect(isPlanComplete(plan)).toBe(true);
  });

  it('returns true for completed status', () => {
    const workflow = makeSequentialWorkflow(['a']);
    let plan = createExecutionPlan(workflow);
    plan = { ...plan, status: 'completed' };
    expect(isPlanComplete(plan)).toBe(true);
  });

  it('returns true when all steps are skipped', () => {
    const workflow = makeSequentialWorkflow(['a', 'b']);
    let plan = createExecutionPlan(workflow);
    plan = advanceStep(plan, 'a', { status: 'skipped', outcome: null, error: null });
    plan = advanceStep(plan, 'b', { status: 'skipped', outcome: null, error: null });
    expect(isPlanComplete(plan)).toBe(true);
  });

  it('returns false when some steps still pending', () => {
    const workflow = makeSequentialWorkflow(['a', 'b']);
    let plan = createExecutionPlan(workflow);
    plan = advanceStep(plan, 'a', { status: 'passed', outcome: null, error: null });
    // 'b' still pending
    expect(isPlanComplete(plan)).toBe(false);
  });
});

// --- parseCondition ---

describe('parseCondition', () => {
  it('parses truthy check format', () => {
    const result = parseCondition('step.evaluate.verdict');
    expect(result).toEqual({
      stepId: 'evaluate',
      field: 'verdict',
      operator: null,
      value: null,
    });
  });

  it('parses equality check format', () => {
    const result = parseCondition('step.evaluate.verdict == approved');
    expect(result).toEqual({
      stepId: 'evaluate',
      field: 'verdict',
      operator: '==',
      value: 'approved',
    });
  });

  it('parses inequality check format', () => {
    const result = parseCondition('step.evaluate.verdict != rejected');
    expect(result).toEqual({
      stepId: 'evaluate',
      field: 'verdict',
      operator: '!=',
      value: 'rejected',
    });
  });

  it('returns null for invalid format (no step. prefix)', () => {
    expect(parseCondition('evaluate.verdict')).toBeNull();
    expect(parseCondition('just-a-flag')).toBeNull();
    expect(parseCondition('user-wants-issue')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(parseCondition(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseCondition('')).toBeNull();
  });

  it('handles step IDs with hyphens', () => {
    const result = parseCondition('step.qa-validate.has-bugs');
    expect(result).toEqual({
      stepId: 'qa-validate',
      field: 'has-bugs',
      operator: null,
      value: null,
    });
  });

  it('handles step IDs with underscores', () => {
    const result = parseCondition('step.my_step.some_field == true');
    expect(result).toEqual({
      stepId: 'my_step',
      field: 'some_field',
      operator: '==',
      value: 'true',
    });
  });

  it('handles value with spaces after inequality', () => {
    const result = parseCondition('step.a.b != some value with spaces');
    expect(result).not.toBeNull();
    expect(result.value).toBe('some value with spaces');
  });
});

// --- evaluateCondition ---

describe('evaluateCondition', () => {
  it('returns true for truthy outcome field', () => {
    const parsed = { stepId: 'a', field: 'verdict', operator: null, value: null };
    const stepStates = {
      a: { status: 'passed', attempts: 1, outcome: { verdict: 'approved' }, error: null },
    };
    expect(evaluateCondition(parsed, stepStates)).toBe(true);
  });

  it('returns false for falsy outcome field', () => {
    const parsed = { stepId: 'a', field: 'has-bugs', operator: null, value: null };
    const stepStates = {
      a: { status: 'passed', attempts: 1, outcome: { 'has-bugs': false }, error: null },
    };
    expect(evaluateCondition(parsed, stepStates)).toBe(false);
  });

  it('returns false when step not found', () => {
    const parsed = { stepId: 'nonexistent', field: 'verdict', operator: null, value: null };
    const stepStates = {};
    expect(evaluateCondition(parsed, stepStates)).toBe(false);
  });

  it('returns false when outcome is null', () => {
    const parsed = { stepId: 'a', field: 'verdict', operator: null, value: null };
    const stepStates = {
      a: { status: 'pending', attempts: 0, outcome: null, error: null },
    };
    expect(evaluateCondition(parsed, stepStates)).toBe(false);
  });

  it('evaluates == equality correctly (true case)', () => {
    const parsed = { stepId: 'a', field: 'verdict', operator: '==', value: 'approved' };
    const stepStates = {
      a: { status: 'passed', attempts: 1, outcome: { verdict: 'approved' }, error: null },
    };
    expect(evaluateCondition(parsed, stepStates)).toBe(true);
  });

  it('evaluates == equality correctly (false case)', () => {
    const parsed = { stepId: 'a', field: 'verdict', operator: '==', value: 'approved' };
    const stepStates = {
      a: { status: 'passed', attempts: 1, outcome: { verdict: 'rejected' }, error: null },
    };
    expect(evaluateCondition(parsed, stepStates)).toBe(false);
  });

  it('evaluates != inequality correctly (true case)', () => {
    const parsed = { stepId: 'a', field: 'verdict', operator: '!=', value: 'rejected' };
    const stepStates = {
      a: { status: 'passed', attempts: 1, outcome: { verdict: 'approved' }, error: null },
    };
    expect(evaluateCondition(parsed, stepStates)).toBe(true);
  });

  it('evaluates != inequality correctly (false case)', () => {
    const parsed = { stepId: 'a', field: 'verdict', operator: '!=', value: 'rejected' };
    const stepStates = {
      a: { status: 'passed', attempts: 1, outcome: { verdict: 'rejected' }, error: null },
    };
    expect(evaluateCondition(parsed, stepStates)).toBe(false);
  });

  it('returns false for null parsed condition', () => {
    expect(evaluateCondition(null, {})).toBe(false);
  });

  it('coerces values to string for comparison', () => {
    const parsed = { stepId: 'a', field: 'count', operator: '==', value: '3' };
    const stepStates = {
      a: { status: 'passed', attempts: 1, outcome: { count: 3 }, error: null },
    };
    expect(evaluateCondition(parsed, stepStates)).toBe(true);
  });
});

// --- shouldRetry ---

describe('shouldRetry', () => {
  it('returns false when no retry config', () => {
    const step = makeStep('a');
    const state = { status: 'failed', attempts: 0, outcome: null, error: null };
    expect(shouldRetry(step, state)).toBe(false);
  });

  it('returns false when retry is undefined', () => {
    const step = { ...makeStep('a'), retry: undefined };
    const state = { status: 'failed', attempts: 0, outcome: null, error: null };
    expect(shouldRetry(step, state)).toBe(false);
  });

  it('returns true when attempts < max', () => {
    const step = { ...makeStep('a'), retry: { max: 3, on: 'failure' } };
    const state = { status: 'failed', attempts: 1, outcome: null, error: null };
    expect(shouldRetry(step, state)).toBe(true);
  });

  it('returns false when attempts >= max', () => {
    const step = { ...makeStep('a'), retry: { max: 2, on: 'failure' } };
    const state = { status: 'failed', attempts: 2, outcome: null, error: null };
    expect(shouldRetry(step, state)).toBe(false);
  });

  it('returns false when attempts > max (edge case)', () => {
    const step = { ...makeStep('a'), retry: { max: 2, on: 'failure' } };
    const state = { status: 'failed', attempts: 5, outcome: null, error: null };
    expect(shouldRetry(step, state)).toBe(false);
  });

  it('returns true for first attempt with max: 1', () => {
    const step = { ...makeStep('a'), retry: { max: 1, on: 'failure' } };
    const state = { status: 'failed', attempts: 0, outcome: null, error: null };
    expect(shouldRetry(step, state)).toBe(true);
  });
});

// --- resolveFailureTarget ---

describe('resolveFailureTarget', () => {
  const makePlan = (steps) => {
    const workflow = makeWorkflow(steps);
    return createExecutionPlan(workflow);
  };

  it('returns abort for onFailure: abort', () => {
    const step = makeStep('a', { onFailure: 'abort' });
    const plan = makePlan([step]);
    expect(resolveFailureTarget(step, plan)).toEqual({ action: 'abort', targetId: null });
  });

  it('returns continue for onFailure: continue', () => {
    const step = makeStep('a', { onFailure: 'continue' });
    const plan = makePlan([step]);
    expect(resolveFailureTarget(step, plan)).toEqual({ action: 'continue', targetId: null });
  });

  it('returns goto with targetId for valid goto target', () => {
    const stepA = makeStep('a', { onFailure: 'goto:b' });
    const stepB = makeStep('b');
    const plan = makePlan([stepA, stepB]);

    expect(resolveFailureTarget(stepA, plan)).toEqual({ action: 'goto', targetId: 'b' });
  });

  it('throws for goto target that does not exist', () => {
    const step = makeStep('a', { onFailure: 'goto:nonexistent' });
    const plan = makePlan([step]);

    expect(() => resolveFailureTarget(step, plan)).toThrow('"nonexistent"');
  });

  it('defaults to abort when onFailure is not set', () => {
    const step = { ...makeStep('a'), onFailure: undefined };
    const plan = makePlan([makeStep('a')]);
    // Even though step has no onFailure, DEFAULT_FAILURE_STRATEGY should be used
    const result = resolveFailureTarget(step, plan);
    expect(result.action).toBe('abort');
  });
});

// --- expandDelegation ---

describe('expandDelegation', () => {
  const makeSubWorkflow = () => makeWorkflow([
    makeStep('sub-step-1'),
    makeStep('sub-step-2', { condition: 'step.sub-step-1.result' }),
  ]);

  it('prefixes all sub-step IDs with parent step ID', () => {
    const parentStep = makeStep('parent', { delegatesTo: 'sub-skill' });
    const subWorkflow = makeSubWorkflow();

    const { prefixedSteps } = expandDelegation(parentStep, subWorkflow, 0);

    expect(prefixedSteps).toHaveLength(2);
    expect(prefixedSteps[0].id).toBe('parent.sub-step-1');
    expect(prefixedSteps[1].id).toBe('parent.sub-step-2');
  });

  it('updates condition references to use prefixed IDs', () => {
    const parentStep = makeStep('parent', { delegatesTo: 'sub-skill' });
    const subWorkflow = makeSubWorkflow();

    const { prefixedSteps } = expandDelegation(parentStep, subWorkflow, 0);

    // sub-step-2 has condition: step.sub-step-1.result
    // After prefixing, should be: step.parent.sub-step-1.result
    expect(prefixedSteps[1].condition).toBe('step.parent.sub-step-1.result');
  });

  it('updates goto targets in onFailure to use prefixed IDs', () => {
    const parentStep = makeStep('parent', { delegatesTo: 'sub-skill' });
    const subWorkflow = makeWorkflow([
      makeStep('sub-a', { onFailure: 'goto:sub-b' }),
      makeStep('sub-b'),
    ]);

    const { prefixedSteps } = expandDelegation(parentStep, subWorkflow, 0);

    expect(prefixedSteps[0].onFailure).toBe('goto:parent.sub-b');
  });

  it('returns subGroups from resolveExecutionPlan', () => {
    const parentStep = makeStep('parent', { delegatesTo: 'sub-skill' });
    const subWorkflow = makeSubWorkflow();

    const { subGroups } = expandDelegation(parentStep, subWorkflow, 0);

    expect(Array.isArray(subGroups)).toBe(true);
    expect(subGroups).toHaveLength(2); // 2 sequential steps → 2 groups
  });

  it('throws when currentDepth >= maxDepth', () => {
    const parentStep = makeStep('parent', { delegatesTo: 'sub-skill' });
    const subWorkflow = makeSubWorkflow();

    expect(() => expandDelegation(parentStep, subWorkflow, 2, { maxDepth: 2 }))
      .toThrow('Delegation depth limit');
  });

  it('allows expansion at depth 0 with default maxDepth', () => {
    const parentStep = makeStep('parent', { delegatesTo: 'sub-skill' });
    const subWorkflow = makeSubWorkflow();

    expect(() => expandDelegation(parentStep, subWorkflow, 0)).not.toThrow();
  });

  it('allows expansion at depth 1 with default maxDepth', () => {
    const parentStep = makeStep('parent', { delegatesTo: 'sub-skill' });
    const subWorkflow = makeSubWorkflow();

    expect(() => expandDelegation(parentStep, subWorkflow, 1)).not.toThrow();
  });

  it('throws at depth 2 with default maxDepth', () => {
    const parentStep = makeStep('parent', { delegatesTo: 'sub-skill' });
    const subWorkflow = makeSubWorkflow();

    expect(() => expandDelegation(parentStep, subWorkflow, 2)).toThrow('Delegation depth limit');
  });
});
