import { describe, it, expect } from 'vitest';
import { evaluateAssertion, loadEvals, runEvals } from '../eval-runner.js';

const MOCK_STEPS = [
  { id: 'evaluate', role: 'advisor', modelTier: 'reasoning', gate: false, requires: ['feature-description'], parallel: undefined, condition: undefined },
  { id: 'implement', role: 'developer', modelTier: 'execution', gate: false, requires: ['technical-plan'], parallel: undefined, condition: undefined },
  { id: 'gate-pre-review', role: 'system', modelTier: undefined, gate: true, requires: [], parallel: undefined, condition: undefined },
  { id: 'agent-1', role: 'dynamic', modelTier: 'reasoning', gate: false, requires: ['user-question'], parallel: ['agent-2', 'agent-3'], condition: undefined },
  { id: 'workspace-context', role: 'system', modelTier: undefined, gate: false, requires: ['council-type'], parallel: undefined, condition: 'in-workspace' },
];
const MOCK_WORKFLOW = { version: 1, steps: MOCK_STEPS };

describe('evaluateAssertion', () => {
  it('step-exists passes when step is present', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-exists:evaluate');
    expect(result.passed).toBe(true);
  });

  it('step-exists fails when step is missing', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-exists:nonexistent');
    expect(result.passed).toBe(false);
  });

  it('step-role passes when role matches', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-role:evaluate:advisor');
    expect(result.passed).toBe(true);
  });

  it('step-role fails when role does not match', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-role:evaluate:developer');
    expect(result.passed).toBe(false);
  });

  it('step-model-tier passes when tier matches', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-model-tier:evaluate:reasoning');
    expect(result.passed).toBe(true);
  });

  it('step-model-tier fails when tier does not match', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-model-tier:implement:reasoning');
    expect(result.passed).toBe(false);
  });

  it('step-requires passes when dependency exists', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-requires:evaluate:feature-description');
    expect(result.passed).toBe(true);
  });

  it('step-requires fails when dependency is missing', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-requires:evaluate:nonexistent');
    expect(result.passed).toBe(false);
  });

  it('step-parallel passes when step has parallel group', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-parallel:agent-1');
    expect(result.passed).toBe(true);
  });

  it('step-parallel fails when step has no parallel group', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-parallel:evaluate');
    expect(result.passed).toBe(false);
  });

  it('gate-exists passes when step has gate: true', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'gate-exists:gate-pre-review');
    expect(result.passed).toBe(true);
  });

  it('gate-exists fails when step has no gate', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'gate-exists:evaluate');
    expect(result.passed).toBe(false);
  });

  it('step-count passes when count meets minimum', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-count:3');
    expect(result.passed).toBe(true);
  });

  it('step-count fails when count is below minimum', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-count:10');
    expect(result.passed).toBe(false);
  });

  it('returns evidence string on pass and fail', () => {
    const pass = evaluateAssertion(MOCK_WORKFLOW, 'step-exists:evaluate');
    expect(pass.evidence).toBeTruthy();
    const fail = evaluateAssertion(MOCK_WORKFLOW, 'step-exists:nope');
    expect(fail.evidence).toBeTruthy();
  });

  it('returns passed: false for unknown assertion type', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'unknown-type:foo');
    expect(result.passed).toBe(false);
    expect(result.evidence).toContain('Unknown');
  });
});

describe('loadEvals', () => {
  it('loads evals.json for a skill with evals', () => {
    const evals = loadEvals('build-feature');
    expect(evals).not.toBeNull();
    expect(evals.skill).toBe('build-feature');
    expect(Array.isArray(evals.evals)).toBe(true);
    expect(evals.evals.length).toBeGreaterThan(0);
  });

  it('returns null for a skill without evals', () => {
    const evals = loadEvals('session-start');
    expect(evals).toBeNull();
  });
});

describe('runEvals', () => {
  it('runs all evals for build-feature and returns results', () => {
    const results = runEvals('build-feature');
    expect(results.skill).toBe('build-feature');
    expect(Array.isArray(results.results)).toBe(true);
    expect(results.results.length).toBeGreaterThan(0);
    for (const evalResult of results.results) {
      expect(evalResult).toHaveProperty('id');
      expect(evalResult).toHaveProperty('passed');
      expect(Array.isArray(evalResult.expectations)).toBe(true);
    }
  });

  it('all build-feature evals pass', () => {
    const results = runEvals('build-feature');
    const failed = results.results.filter(r => !r.passed);
    expect(failed).toEqual([]);
  });

  it('all council evals pass', () => {
    const results = runEvals('council');
    const failed = results.results.filter(r => !r.passed);
    expect(failed).toEqual([]);
  });

  it('throws for skill without evals', () => {
    expect(() => runEvals('session-start')).toThrow('No evals found');
  });
});
