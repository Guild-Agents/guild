import { describe, it, expect } from 'vitest';
import { classify } from '../src/classifier.js';
import type { SensorResult } from '../src/sensors/types.js';

function makeSensor(overrides: Partial<SensorResult>): SensorResult {
  return {
    source: 'github-ci',
    status: 200,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('classifier', () => {
  it('ignores with high confidence when status is 200', () => {
    const result = classify(makeSensor({ status: 200 }));
    expect(result.confidence).toBe('high');
    expect(result.severity).toBe('ignore');
  });

  it('escalates to action with high confidence when status is 500', () => {
    const result = classify(makeSensor({ status: 500, payload: 'CI failure' }));
    expect(result.confidence).toBe('high');
    expect(result.severity).toBe('action');
  });

  it('escalates to action with high confidence when status is 4xx', () => {
    const result = classify(makeSensor({ status: 403, payload: 'Forbidden' }));
    expect(result.confidence).toBe('high');
    expect(result.severity).toBe('action');
  });

  it('triages with low confidence when status is 201 (ambiguous)', () => {
    const result = classify(makeSensor({ status: 201, payload: 'in progress' }));
    expect(result.confidence).toBe('low');
    expect(result.severity).toBe('triage');
  });

  it('ignores @types Renovate PRs with high confidence even if stale', () => {
    const result = classify(makeSensor({
      source: 'github-prs',
      status: 500,
      payload: 'Stale Renovate PR (72h): chore(deps): update @types/node',
    }));
    expect(result.confidence).toBe('high');
    expect(result.severity).toBe('ignore');
    expect(result.reason).toContain('@types');
  });

  it('escalates non-@types Renovate PRs', () => {
    const result = classify(makeSensor({
      source: 'github-prs',
      status: 500,
      payload: 'Stale Renovate PR (72h): chore(deps): update eslint',
    }));
    expect(result.severity).toBe('action');
  });
});
