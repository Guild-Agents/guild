import { describe, it, expect } from 'vitest';
import { scoreMatch, rankSkills, tokenize } from '../trigger-matcher.js';

describe('scoreMatch', () => {
  it('scores high when prompt keywords match description', () => {
    const score = scoreMatch(
      'create a pull request',
      'Create a pull request from the current branch with structured summary'
    );
    expect(score).toBeGreaterThan(0.5);
  });

  it('scores low when prompt is unrelated to description', () => {
    const score = scoreMatch(
      'deploy to production',
      'Save project state and durable learnings'
    );
    expect(score).toBeLessThan(0.2);
  });

  it('scores zero for empty prompt', () => {
    const score = scoreMatch('', 'Some description');
    expect(score).toBe(0);
  });

  it('is case insensitive', () => {
    const score1 = scoreMatch('Create PR', 'Create a pull request');
    const score2 = scoreMatch('create pr', 'Create a pull request');
    expect(score1).toBe(score2);
  });

  it('handles abbreviations and partial matches', () => {
    const score = scoreMatch(
      'TDD red green refactor',
      'Discipline skill — TDD red-green-refactor cycle. Use when implementing any feature or bugfix, before writing implementation code.'
    );
    expect(score).toBeGreaterThan(0.3);
  });
});

describe('rankSkills', () => {
  const skills = [
    { name: 'create-pr', description: 'Create a pull request from the current branch with structured summary' },
    { name: 'review', description: 'Standalone code review on the current diff' },
    { name: 'debug', description: 'Systematic debugging process for bugs and unexpected behavior' },
  ];

  it('ranks matching skill first', () => {
    const ranked = rankSkills('create a pull request', skills);
    expect(ranked[0].name).toBe('create-pr');
  });

  it('ranks code review first for review prompt', () => {
    const ranked = rankSkills('review my code changes', skills);
    expect(ranked[0].name).toBe('review');
  });

  it('returns all skills with scores', () => {
    const ranked = rankSkills('anything', skills);
    expect(ranked).toHaveLength(3);
    for (const r of ranked) {
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('score');
    }
  });
});

describe('tokenize', () => {
  it('splits text into lowercase words', () => {
    const tokens = tokenize('Build a Feature');
    expect(tokens).toEqual(['build', 'feature']);
  });

  it('strips punctuation and splits on dashes', () => {
    const tokens = tokenize('red-green-refactor cycle!');
    expect(tokens).toEqual(['red', 'green', 'refactor', 'cycle']);
  });

  it('filters single-character words', () => {
    const tokens = tokenize('I am a dev');
    expect(tokens).toEqual(['am', 'dev']);
  });
});
