import { describe, it, expect, vi } from 'vitest';
import { formatNotification, createTelegramBot } from '../src/telegram.js';

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
  });

  describe('createTelegramBot', () => {
    it('creates bot with sendNotification method', () => {
      const mockBot = {
        sendMessage: vi.fn().mockResolvedValue({}),
        onText: vi.fn(),
      };

      const bot = createTelegramBot(mockBot as any, '12345');
      expect(bot.sendNotification).toBeTypeOf('function');
    });

    it('sendNotification calls sendMessage with correct chat ID', async () => {
      const mockBot = {
        sendMessage: vi.fn().mockResolvedValue({}),
        onText: vi.fn(),
      };

      const bot = createTelegramBot(mockBot as any, '12345');
      await bot.sendNotification({
        severity: 'info',
        summary: 'Test message',
      });

      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '12345',
        expect.stringContaining('Test message'),
        expect.any(Object),
      );
    });
  });
});
