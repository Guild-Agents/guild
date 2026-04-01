import { describe, it, expect } from 'vitest';
import { runEval, runEvalTriggers } from '../eval.js';

describe('runEval', () => {
  it('runs evals for a specific skill', async () => {
    await expect(runEval('build-feature')).resolves.toBeUndefined();
  });

  it('runs all skill evals', async () => {
    await expect(runEval()).resolves.toBeUndefined();
  });
});

describe('runEvalTriggers', () => {
  it('runs trigger tests for all skills with triggers', async () => {
    await expect(runEvalTriggers()).resolves.toBeUndefined();
  });

  it('runs trigger tests for a specific skill', async () => {
    await expect(runEvalTriggers('create-pr')).resolves.toBeUndefined();
  });

  it('accepts options parameter', async () => {
    await expect(runEvalTriggers(undefined, { semantic: false, suggest: false })).resolves.toBeUndefined();
  });

  it('runs with suggest option', async () => {
    await expect(runEvalTriggers(undefined, { suggest: true })).resolves.toBeUndefined();
  });
});
