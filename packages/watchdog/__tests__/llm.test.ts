import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triageWithHaiku, actWithSonnet } from '../src/llm.js';
import type { SensorResult } from '../src/sensors/types.js';

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

const signal: SensorResult = {
  source: 'github-ci',
  status: 201,
  payload: 'CI run in progress',
  timestamp: Date.now(),
};

describe('llm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('triageWithHaiku', () => {
    it('returns ignore when Haiku says ignore', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'IGNORE' }],
        usage: { input_tokens: 100, output_tokens: 10 },
      });

      const result = await triageWithHaiku(signal, 'ambiguous signal', 'sk-test');
      expect(result.decision).toBe('ignore');
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(10);
    });

    it('returns action when Haiku says action', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'ACTION' }],
        usage: { input_tokens: 100, output_tokens: 10 },
      });

      const result = await triageWithHaiku(signal, 'ambiguous signal', 'sk-test');
      expect(result.decision).toBe('action');
    });

    it('defaults to action on unparseable response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'I think maybe something' }],
        usage: { input_tokens: 100, output_tokens: 20 },
      });

      const result = await triageWithHaiku(signal, 'ambiguous signal', 'sk-test');
      expect(result.decision).toBe('action');
    });
  });

  describe('actWithSonnet', () => {
    it('returns event markdown and notification', async () => {
      const sonnetResponse = JSON.stringify({
        event: '# Event: CI In Progress\n\n- **Source:** github-ci\n- **Severity:** info',
        notification: {
          severity: 'info',
          summary: 'CI run in progress on main',
          link: 'https://github.com/run/1',
        },
      });

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: sonnetResponse }],
        usage: { input_tokens: 500, output_tokens: 150 },
      });

      const result = await actWithSonnet(signal, 'sensor(201) -> haiku(action)', 'sk-test', {
        soul: '# Soul',
        heartbeat: '# Heartbeat',
        memory: '# Memory',
      });

      expect(result.event).toContain('Event');
      expect(result.notification.severity).toBe('info');
      expect(result.notification.summary).toContain('CI');
      expect(result.inputTokens).toBe(500);
      expect(result.outputTokens).toBe(150);
    });

    it('returns fallback notification on unparseable JSON', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'This is not valid JSON at all' }],
        usage: { input_tokens: 500, output_tokens: 50 },
      });

      const result = await actWithSonnet(signal, 'sensor(201) -> haiku(action)', 'sk-test', {
        soul: '# Soul',
        heartbeat: '# Heartbeat',
        memory: '# Memory',
      });

      expect(result.notification.severity).toBe('warning');
      expect(result.notification.summary).toContain('github-ci');
      expect(result.inputTokens).toBe(500);
      expect(result.outputTokens).toBe(50);
    });
  });
});
