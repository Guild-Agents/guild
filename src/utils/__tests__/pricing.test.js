import { describe, it, expect } from 'vitest';
import { estimateCost, getModelShortName, DEFAULT_PRICING } from '../pricing.js';

describe('DEFAULT_PRICING', () => {
  it('has pricing for opus, sonnet, and haiku', () => {
    expect(DEFAULT_PRICING['claude-opus-4-6']).toBeDefined();
    expect(DEFAULT_PRICING['claude-sonnet-4-5']).toBeDefined();
    expect(DEFAULT_PRICING['claude-haiku-4-5']).toBeDefined();
  });

  it('each model has input and output prices', () => {
    for (const model of Object.keys(DEFAULT_PRICING)) {
      expect(DEFAULT_PRICING[model].input).toBeTypeOf('number');
      expect(DEFAULT_PRICING[model].output).toBeTypeOf('number');
    }
  });
});

describe('estimateCost', () => {
  it('calculates cost for known model', () => {
    // 1000 input tokens of Haiku at $0.80/M = $0.0008
    // 500 output tokens of Haiku at $4.00/M = $0.002
    const cost = estimateCost('claude-haiku-4-5', 1000, 500);
    expect(cost).toBeCloseTo(0.0028, 4);
  });

  it('calculates cost for opus', () => {
    // 10000 input at $15/M = $0.15
    // 5000 output at $75/M = $0.375
    const cost = estimateCost('claude-opus-4-6', 10000, 5000);
    expect(cost).toBeCloseTo(0.525, 3);
  });

  it('returns 0 for unknown model', () => {
    const cost = estimateCost('unknown-model', 1000, 500);
    expect(cost).toBe(0);
  });

  it('returns 0 for zero tokens', () => {
    const cost = estimateCost('claude-sonnet-4-5', 0, 0);
    expect(cost).toBe(0);
  });
});

describe('getModelShortName', () => {
  it('returns short names for known models', () => {
    expect(getModelShortName('claude-opus-4-6')).toBe('Opus');
    expect(getModelShortName('claude-sonnet-4-5')).toBe('Sonnet');
    expect(getModelShortName('claude-haiku-4-5')).toBe('Haiku');
  });

  it('returns model id for unknown models', () => {
    expect(getModelShortName('gemini-2.5-pro')).toBe('gemini-2.5-pro');
  });
});
