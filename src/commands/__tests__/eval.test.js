import { describe, it, expect } from 'vitest';
import { runEval } from '../eval.js';

describe('runEval', () => {
  it('runs evals for a specific skill', async () => {
    await expect(runEval('build-feature')).resolves.toBeUndefined();
  });

  it('runs all skill evals', async () => {
    await expect(runEval()).resolves.toBeUndefined();
  });
});
