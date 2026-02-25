import { describe, it, expect } from 'vitest';
import { join } from 'path';
import {
  validateStepConfig,
  resolveAgentMetadata,
  resolveEffectiveTier,
  resolveModel,
} from '../dispatch.js';

describe('validateStepConfig', () => {
  it('returns empty array for valid config', () => {
    const errors = validateStepConfig({
      role: 'developer',
      intent: 'Implement the feature',
    });
    expect(errors).toEqual([]);
  });

  it('returns empty array for config with all optional fields', () => {
    const errors = validateStepConfig({
      role: 'developer',
      intent: 'Implement the feature',
      'model-tier': 'execution',
      'on-failure': 'abort',
      'max-retries': 3,
    });
    expect(errors).toEqual([]);
  });

  it('returns error for missing role', () => {
    const errors = validateStepConfig({ intent: 'Do something' });
    expect(errors).toContainEqual(expect.stringContaining('role'));
  });

  it('returns error for missing intent', () => {
    const errors = validateStepConfig({ role: 'developer' });
    expect(errors).toContainEqual(expect.stringContaining('intent'));
  });

  it('returns errors for both missing role and intent', () => {
    const errors = validateStepConfig({});
    expect(errors).toHaveLength(2);
  });

  it('returns error for invalid model-tier', () => {
    const errors = validateStepConfig({
      role: 'developer',
      intent: 'Do something',
      'model-tier': 'superfast',
    });
    expect(errors).toContainEqual(expect.stringContaining('model-tier'));
    expect(errors).toContainEqual(expect.stringContaining('superfast'));
  });

  it('returns error for invalid on-failure', () => {
    const errors = validateStepConfig({
      role: 'developer',
      intent: 'Do something',
      'on-failure': 'explode',
    });
    expect(errors).toContainEqual(expect.stringContaining('on-failure'));
  });

  it('returns error for negative max-retries', () => {
    const errors = validateStepConfig({
      role: 'developer',
      intent: 'Do something',
      'max-retries': -1,
    });
    expect(errors).toContainEqual(expect.stringContaining('max-retries'));
  });

  it('returns error for non-integer max-retries', () => {
    const errors = validateStepConfig({
      role: 'developer',
      intent: 'Do something',
      'max-retries': 2.5,
    });
    expect(errors).toContainEqual(expect.stringContaining('max-retries'));
  });

  it('returns error for zero max-retries', () => {
    const errors = validateStepConfig({
      role: 'developer',
      intent: 'Do something',
      'max-retries': 0,
    });
    expect(errors).toContainEqual(expect.stringContaining('max-retries'));
  });

  it('accepts valid model-tier values', () => {
    for (const tier of ['reasoning', 'execution', 'routine']) {
      const errors = validateStepConfig({
        role: 'developer',
        intent: 'Do something',
        'model-tier': tier,
      });
      expect(errors).toEqual([]);
    }
  });
});

describe('resolveAgentMetadata', () => {
  // Use the real project root to read actual agent files
  const projectRoot = join(import.meta.dirname, '..', '..', '..');

  it('reads existing agent frontmatter', () => {
    const meta = resolveAgentMetadata('tech-lead', projectRoot);
    expect(meta).not.toBeNull();
    expect(meta.role).toBe('tech-lead');
    expect(meta.name).toBe('tech-lead');
  });

  it('reads developer agent frontmatter', () => {
    const meta = resolveAgentMetadata('developer', projectRoot);
    expect(meta).not.toBeNull();
    expect(meta.role).toBe('developer');
    expect(meta.name).toBe('developer');
  });

  it('returns null for nonexistent agent', () => {
    const meta = resolveAgentMetadata('nonexistent-agent', projectRoot);
    expect(meta).toBeNull();
  });

  it('reads default-tier from agent frontmatter', () => {
    const meta = resolveAgentMetadata('tech-lead', projectRoot);
    expect(meta).not.toBeNull();
    expect(meta.defaultTier).toBe('reasoning');
  });

  it('reads execution tier from developer agent', () => {
    const meta = resolveAgentMetadata('developer', projectRoot);
    expect(meta).not.toBeNull();
    expect(meta.defaultTier).toBe('execution');
  });
});

describe('resolveEffectiveTier', () => {
  it('step model-tier wins over all', () => {
    const tier = resolveEffectiveTier(
      { role: 'developer', 'model-tier': 'reasoning' },
      { defaultTier: 'execution' },
    );
    expect(tier).toBe('reasoning');
  });

  it('agent defaultTier is second priority', () => {
    const tier = resolveEffectiveTier(
      { role: 'developer' },
      { defaultTier: 'reasoning' },
    );
    expect(tier).toBe('reasoning');
  });

  it('DEFAULT_AGENT_TIERS is third priority', () => {
    const tier = resolveEffectiveTier(
      { role: 'advisor' },
      null,
    );
    expect(tier).toBe('reasoning');
  });

  it('execution is ultimate fallback for unknown role', () => {
    const tier = resolveEffectiveTier(
      { role: 'unknown-agent' },
      null,
    );
    expect(tier).toBe('execution');
  });

  it('ignores invalid model-tier in step config', () => {
    const tier = resolveEffectiveTier(
      { role: 'advisor', 'model-tier': 'turbo' },
      null,
    );
    expect(tier).toBe('reasoning');
  });

  it('ignores invalid defaultTier in agent metadata', () => {
    const tier = resolveEffectiveTier(
      { role: 'developer' },
      { defaultTier: 'turbo' },
    );
    expect(tier).toBe('execution');
  });
});

describe('resolveModel', () => {
  it('resolves max profile correctly', () => {
    expect(resolveModel('reasoning', 'max')).toBe('claude-opus-4-6');
    expect(resolveModel('execution', 'max')).toBe('claude-sonnet-4-6');
    expect(resolveModel('routine', 'max')).toBe('claude-haiku-4-5');
  });

  it('resolves pro profile correctly', () => {
    expect(resolveModel('reasoning', 'pro')).toBe('claude-sonnet-4-6');
    expect(resolveModel('execution', 'pro')).toBe('claude-sonnet-4-6');
    expect(resolveModel('routine', 'pro')).toBe('claude-haiku-4-5');
  });

  it('works with custom profile object', () => {
    const custom = {
      reasoning: 'my-model-large',
      execution: 'my-model-medium',
      routine: 'my-model-small',
    };
    expect(resolveModel('reasoning', custom)).toBe('my-model-large');
    expect(resolveModel('routine', custom)).toBe('my-model-small');
  });

  it('applies fallback chain when tier not in profile', () => {
    const sparseProfile = {
      routine: 'claude-haiku-4-5',
    };
    // reasoning -> execution -> routine -> haiku
    expect(resolveModel('reasoning', sparseProfile)).toBe('claude-haiku-4-5');
  });

  it('throws for unknown profile name', () => {
    expect(() => resolveModel('reasoning', 'enterprise')).toThrow('Unknown profile');
  });

  it('throws when fallback chain exhausted', () => {
    const emptyProfile = {};
    expect(() => resolveModel('routine', emptyProfile)).toThrow('Cannot resolve model');
  });

  it('throws when entire chain has no model', () => {
    const emptyProfile = {};
    expect(() => resolveModel('reasoning', emptyProfile)).toThrow('Cannot resolve model');
  });
});
