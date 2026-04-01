import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scoreMatchSemantic, SEMANTIC_MODEL_DEFAULT } from '../semantic-matcher.js';

describe('SEMANTIC_MODEL_DEFAULT', () => {
  it('exports the default model string', () => {
    expect(SEMANTIC_MODEL_DEFAULT).toBe('claude-haiku-4-5-20251001');
  });
});

describe('scoreMatchSemantic', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns score and reasoning from a valid API response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: '{"score": 85, "reasoning": "Strong match"}' }],
      }),
    }));

    const result = await scoreMatchSemantic('build a feature', 'build-feature', 'Full pipeline: evaluation -> spec -> implementation -> review -> QA');
    expect(result.score).toBeCloseTo(0.85, 2);
    expect(result.reasoning).toBe('Strong match');
    expect(result.error).toBeUndefined();
  });

  it('extracts JSON when response contains extra text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Here is my analysis: {"score": 40, "reasoning": "Weak overlap"}' }],
      }),
    }));

    const result = await scoreMatchSemantic('deploy app', 'build-feature', 'Full pipeline');
    expect(result.score).toBeCloseTo(0.40, 2);
    expect(result.reasoning).toBe('Weak overlap');
  });

  it('returns error result when JSON parse fails completely', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'I cannot determine a score for this.' }],
      }),
    }));

    const result = await scoreMatchSemantic('something', 'skill', 'desc');
    expect(result.score).toBe(0);
    expect(result.reasoning).toBe('parse-error');
    expect(result.error).toBe(true);
  });

  it('returns error result when API call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    }));

    const result = await scoreMatchSemantic('test', 'skill', 'desc');
    expect(result.score).toBe(0);
    expect(result.reasoning).toContain('API error');
    expect(result.error).toBe(true);
  });

  it('returns error result when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await scoreMatchSemantic('test', 'skill', 'desc');
    expect(result.score).toBe(0);
    expect(result.reasoning).toContain('Network failure');
    expect(result.error).toBe(true);
  });

  it('uses GUILD_SEMANTIC_MODEL env var when set', async () => {
    process.env.GUILD_SEMANTIC_MODEL = 'claude-haiku-custom';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: '{"score": 50, "reasoning": "ok"}' }],
      }),
    }));

    await scoreMatchSemantic('test', 'skill', 'desc');

    const fetchCall = fetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.model).toBe('claude-haiku-custom');

    delete process.env.GUILD_SEMANTIC_MODEL;
  });
});
