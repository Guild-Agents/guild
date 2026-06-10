import { describe, it, expect, vi } from 'vitest';
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
  it('returns results with expected and actual fields', async () => {
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
      { name: 'other-skill', description: 'Save project state and durable learnings' },
    ];

    const results = await runTriggerTests(triggers, allSkills);
    expect(results).toHaveLength(2);
    expect(results[0].expected).toBe(true);
    expect(results[0]).toHaveProperty('actual');
    expect(results[0]).toHaveProperty('score');
    expect(results[0]).toHaveProperty('rank');
    expect(results[1].expected).toBe(false);
  });

  it('uses keywordExpected when present for keyword matcher', async () => {
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
      { name: 'other-skill', description: 'Save project state and durable learnings' },
    ];

    const results = await runTriggerTests(triggers, allSkills);
    expect(results[0].expected).toBe(false);
    expect(results[0].semanticExpected).toBe(true);
  });
});

describe('runTriggerTests with semantic option', () => {
  it('uses semantic matcher when semantic option is true', async () => {
    const mockSemantic = vi.fn().mockResolvedValue({ score: 0.9, reasoning: 'Strong match' });

    const triggers = {
      skill: 'test-skill',
      matcherType: 'keyword',
      description: 'Create a pull request',
      threshold: 0.3,
      tests: [
        { prompt: 'submit this for review', shouldTrigger: true, keywordExpected: false },
      ],
    };

    const allSkills = [
      { name: 'test-skill', description: 'Create a pull request' },
      { name: 'other-skill', description: 'Save session state' },
    ];

    const results = await runTriggerTests(triggers, allSkills, {
      semantic: true,
      scoreMatchSemantic: mockSemantic,
    });

    expect(mockSemantic).toHaveBeenCalledWith('submit this for review', 'test-skill', 'Create a pull request');
    expect(results[0].matcherUsed).toBe('semantic');
    expect(results[0].reasoning).toBe('Strong match');
    expect(results[0].expected).toBe(true); // uses shouldTrigger, not keywordExpected
  });

  it('defaults to keyword matcher when semantic option is false', async () => {
    const triggers = {
      skill: 'test-skill',
      matcherType: 'keyword',
      description: 'Create a pull request from the current branch',
      threshold: 0.3,
      tests: [
        { prompt: 'create a pull request', shouldTrigger: true },
      ],
    };

    const allSkills = [
      { name: 'test-skill', description: 'Create a pull request from the current branch' },
      { name: 'other-skill', description: 'Save project state and durable learnings' },
    ];

    const results = await runTriggerTests(triggers, allSkills, { semantic: false });
    expect(results[0].matcherUsed).toBe('keyword');
    expect(results[0].reasoning).toBeUndefined();
  });

  it('ignores keywordExpected in semantic mode', async () => {
    const mockSemantic = vi.fn().mockResolvedValue({ score: 0.1, reasoning: 'No match' });

    const triggers = {
      skill: 'test-skill',
      matcherType: 'keyword',
      description: 'Create a pull request',
      threshold: 0.3,
      tests: [
        { prompt: 'something unrelated', shouldTrigger: true, keywordExpected: false },
      ],
    };

    const allSkills = [
      { name: 'test-skill', description: 'Create a pull request' },
    ];

    const results = await runTriggerTests(triggers, allSkills, {
      semantic: true,
      scoreMatchSemantic: mockSemantic,
    });

    // In semantic mode, expected comes from shouldTrigger (true), not keywordExpected (false)
    expect(results[0].expected).toBe(true);
    expect(results[0]).not.toHaveProperty('semanticExpected');
  });
});
