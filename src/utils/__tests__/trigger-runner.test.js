import { describe, it, expect } from 'vitest';
import { loadTriggers, runTriggerTests, computeAccuracy } from '../trigger-runner.js';

describe('loadTriggers', () => {
  it('returns null for skill without triggers', () => {
    const triggers = loadTriggers('nonexistent-skill');
    expect(triggers).toBeNull();
  });
});

describe('computeAccuracy', () => {
  it('computes perfect accuracy', () => {
    const results = [
      { prompt: 'a', expected: true, actual: true },
      { prompt: 'b', expected: false, actual: false },
    ];
    const acc = computeAccuracy(results);
    expect(acc.precision).toBe(1.0);
    expect(acc.recall).toBe(1.0);
    expect(acc.accuracy).toBe(1.0);
  });

  it('computes accuracy with false positive', () => {
    const results = [
      { prompt: 'a', expected: true, actual: true },
      { prompt: 'b', expected: false, actual: true },
    ];
    const acc = computeAccuracy(results);
    expect(acc.precision).toBe(0.5);
    expect(acc.recall).toBe(1.0);
  });

  it('computes accuracy with false negative', () => {
    const results = [
      { prompt: 'a', expected: true, actual: false },
      { prompt: 'b', expected: false, actual: false },
    ];
    const acc = computeAccuracy(results);
    expect(acc.precision).toBe(0);
    expect(acc.recall).toBe(0);
  });

  it('handles empty results', () => {
    const acc = computeAccuracy([]);
    expect(acc.accuracy).toBe(0);
  });
});

describe('runTriggerTests', () => {
  it('returns results with expected and actual fields', () => {
    const triggers = {
      skill: 'test-skill',
      matcherType: 'keyword',
      description: 'Create a pull request from the current branch',
      threshold: 0.3,
      tests: [
        { prompt: 'create a pull request', shouldTrigger: true },
        { prompt: 'deploy to production', shouldTrigger: false },
      ],
    };

    const allSkills = [
      { name: 'test-skill', description: 'Create a pull request from the current branch' },
      { name: 'other-skill', description: 'Saves current state to SESSION.md' },
    ];

    const results = runTriggerTests(triggers, allSkills);
    expect(results).toHaveLength(2);
    expect(results[0].expected).toBe(true);
    expect(results[0]).toHaveProperty('actual');
    expect(results[0]).toHaveProperty('score');
    expect(results[0]).toHaveProperty('rank');
    expect(results[1].expected).toBe(false);
  });

  it('uses keywordExpected when present for keyword matcher', () => {
    const triggers = {
      skill: 'test-skill',
      matcherType: 'keyword',
      description: 'Create a pull request from the current branch',
      threshold: 0.3,
      tests: [
        { prompt: 'I am ready to submit this for review', shouldTrigger: true, keywordExpected: false },
      ],
    };

    const allSkills = [
      { name: 'test-skill', description: 'Create a pull request from the current branch' },
      { name: 'other-skill', description: 'Saves current state to SESSION.md' },
    ];

    const results = runTriggerTests(triggers, allSkills);
    expect(results[0].expected).toBe(false);
    expect(results[0].semanticExpected).toBe(true);
  });
});
