import { describe, it, expect } from 'vitest';
import { DEFAULT_HEARTBEAT_CONFIG, loadConfig } from '../src/config.js';

describe('config', () => {
  describe('DEFAULT_HEARTBEAT_CONFIG', () => {
    it('has 15 min minimum interval', () => {
      expect(DEFAULT_HEARTBEAT_CONFIG.minInterval).toBe(15 * 60 * 1000);
    });

    it('has 4 hour maximum interval', () => {
      expect(DEFAULT_HEARTBEAT_CONFIG.maxInterval).toBe(4 * 60 * 60 * 1000);
    });

    it('has backoff factor of 2', () => {
      expect(DEFAULT_HEARTBEAT_CONFIG.backoffFactor).toBe(2);
    });
  });

  describe('loadConfig', () => {
    it('returns config with required env vars when set', () => {
      const env = {
        GITHUB_TOKEN: 'ghp_test',
        GITHUB_OWNER: 'Guild-Agents',
        GITHUB_REPO: 'guild',
        ANTHROPIC_API_KEY: 'sk-ant-test',
        TELEGRAM_BOT_TOKEN: 'bot123',
        TELEGRAM_CHAT_ID: '456',
      };
      const config = loadConfig(env);
      expect(config.github.token).toBe('ghp_test');
      expect(config.github.owner).toBe('Guild-Agents');
      expect(config.github.repo).toBe('guild');
      expect(config.anthropic.apiKey).toBe('sk-ant-test');
      expect(config.telegram.botToken).toBe('bot123');
      expect(config.telegram.chatId).toBe('456');
    });

    it('throws if GITHUB_TOKEN is missing', () => {
      expect(() => loadConfig({})).toThrow('GITHUB_TOKEN');
    });

    it('throws if ANTHROPIC_API_KEY is missing', () => {
      expect(() => loadConfig({ GITHUB_TOKEN: 'x', GITHUB_OWNER: 'x', GITHUB_REPO: 'x' })).toThrow('ANTHROPIC_API_KEY');
    });

    it('throws if TELEGRAM_BOT_TOKEN is missing', () => {
      expect(() => loadConfig({
        GITHUB_TOKEN: 'x', GITHUB_OWNER: 'x', GITHUB_REPO: 'x',
        ANTHROPIC_API_KEY: 'x',
      })).toThrow('TELEGRAM_BOT_TOKEN');
    });
  });
});
