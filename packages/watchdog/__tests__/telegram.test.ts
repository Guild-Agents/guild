import { describe, it, expect, vi } from 'vitest';
import { formatNotification, createTelegramBot, escapeHtml } from '../src/telegram.js';

describe('telegram', () => {
  describe('formatNotification', () => {
    it('formats info message', () => {
      const msg = formatNotification({
        severity: 'info',
        summary: 'CI is green',
      });
      expect(msg).toContain('CI is green');
    });

    it('formats warning with link', () => {
      const msg = formatNotification({
        severity: 'warning',
        summary: 'Stale PR detected',
        link: 'https://github.com/pr/1',
      });
      expect(msg).toContain('Stale PR detected');
      expect(msg).toContain('https://github.com/pr/1');
    });

    it('formats critical with details and link', () => {
      const msg = formatNotification({
        severity: 'critical',
        summary: 'CI failed on main',
        details: 'TypeScript error in router.ts',
        link: 'https://github.com/run/1',
      });
      expect(msg).toContain('CI failed on main');
      expect(msg).toContain('TypeScript error');
      expect(msg).toContain('https://github.com/run/1');
    });

    it('escapes HTML entities in summary, details, and link', () => {
      const msg = formatNotification({
        severity: 'warning',
        summary: 'Error: <script>alert("xss")</script> & more',
        details: 'Payload contains <b>HTML</b> & special chars',
        link: 'https://example.com/foo?a=1&b=2',
      });
      expect(msg).toContain('&lt;script&gt;');
      expect(msg).toContain('&amp; more');
      expect(msg).toContain('&lt;b&gt;HTML&lt;/b&gt;');
      expect(msg).toContain('&amp; special chars');
      expect(msg).toContain('a=1&amp;b=2');
      expect(msg).not.toContain('<script>');
      expect(msg).not.toContain('<b>');
    });
  });

  describe('escapeHtml', () => {
    it('escapes ampersands, less-than, and greater-than', () => {
      expect(escapeHtml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
    });

    it('returns unchanged text when no special chars', () => {
      expect(escapeHtml('plain text')).toBe('plain text');
    });
  });

  describe('createTelegramBot', () => {
    it('creates bot with sendNotification method', () => {
      const mockBot = {
        api: { sendMessage: vi.fn().mockResolvedValue({}) },
        command: vi.fn(),
      };

      const bot = createTelegramBot(mockBot as any, '12345');
      expect(bot.sendNotification).toBeTypeOf('function');
    });

    it('sendNotification calls bot.api.sendMessage with correct chat ID', async () => {
      const mockBot = {
        api: { sendMessage: vi.fn().mockResolvedValue({}) },
        command: vi.fn(),
      };

      const bot = createTelegramBot(mockBot as any, '12345');
      await bot.sendNotification({
        severity: 'info',
        summary: 'Test message',
      });

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        '12345',
        expect.stringContaining('Test message'),
        expect.any(Object),
      );
    });
  });
});
