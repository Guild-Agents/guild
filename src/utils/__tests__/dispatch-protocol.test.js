import { describe, it, expect } from 'vitest';
import {
  MODEL_TIERS,
  FAILURE_STRATEGIES,
  DEFAULT_AGENT_TIERS,
  DEFAULT_MODEL_PROFILES,
  FALLBACK_CHAIN,
} from '../dispatch-protocol.js';

describe('MODEL_TIERS', () => {
  it('has exactly 3 tiers', () => {
    expect(MODEL_TIERS).toHaveLength(3);
  });

  it('contains reasoning, execution, routine', () => {
    expect(MODEL_TIERS).toEqual(['reasoning', 'execution', 'routine']);
  });
});

describe('FAILURE_STRATEGIES', () => {
  it('has exactly 3 strategies', () => {
    expect(FAILURE_STRATEGIES).toHaveLength(3);
  });

  it('contains stop, continue, retry', () => {
    expect(FAILURE_STRATEGIES).toEqual(['stop', 'continue', 'retry']);
  });
});

describe('DEFAULT_AGENT_TIERS', () => {
  it('covers 10 agents', () => {
    expect(Object.keys(DEFAULT_AGENT_TIERS)).toHaveLength(10);
  });

  it('maps reasoning agents correctly', () => {
    expect(DEFAULT_AGENT_TIERS['advisor']).toBe('reasoning');
    expect(DEFAULT_AGENT_TIERS['product-owner']).toBe('reasoning');
    expect(DEFAULT_AGENT_TIERS['tech-lead']).toBe('reasoning');
    expect(DEFAULT_AGENT_TIERS['code-reviewer']).toBe('reasoning');
  });

  it('maps execution agents correctly', () => {
    expect(DEFAULT_AGENT_TIERS['developer']).toBe('execution');
    expect(DEFAULT_AGENT_TIERS['bugfix']).toBe('execution');
    expect(DEFAULT_AGENT_TIERS['db-migration']).toBe('execution');
    expect(DEFAULT_AGENT_TIERS['qa']).toBe('execution');
    expect(DEFAULT_AGENT_TIERS['platform-expert']).toBe('execution');
  });

  it('maps routine agents correctly', () => {
    expect(DEFAULT_AGENT_TIERS['learnings-extractor']).toBe('routine');
  });

  it('all values are valid tiers', () => {
    for (const tier of Object.values(DEFAULT_AGENT_TIERS)) {
      expect(MODEL_TIERS).toContain(tier);
    }
  });
});

describe('DEFAULT_MODEL_PROFILES', () => {
  it('has max and pro profiles', () => {
    expect(Object.keys(DEFAULT_MODEL_PROFILES)).toEqual(['max', 'pro']);
  });

  it('max profile maps all tiers', () => {
    const { max } = DEFAULT_MODEL_PROFILES;
    expect(max.reasoning).toBe('claude-opus-4-6');
    expect(max.execution).toBe('claude-sonnet-4-6');
    expect(max.routine).toBe('claude-haiku-4-5');
  });

  it('pro profile maps reasoning to sonnet', () => {
    const { pro } = DEFAULT_MODEL_PROFILES;
    expect(pro.reasoning).toBe('claude-sonnet-4-6');
    expect(pro.execution).toBe('claude-sonnet-4-6');
    expect(pro.routine).toBe('claude-haiku-4-5');
  });
});

describe('FALLBACK_CHAIN', () => {
  it('reasoning falls back to execution', () => {
    expect(FALLBACK_CHAIN.reasoning).toBe('execution');
  });

  it('execution falls back to routine', () => {
    expect(FALLBACK_CHAIN.execution).toBe('routine');
  });

  it('routine has no fallback', () => {
    expect(FALLBACK_CHAIN.routine).toBeNull();
  });
});
