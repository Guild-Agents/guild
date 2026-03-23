import { describe, it, expect } from 'vitest';
import {
  computeNextInterval,
  createInitialState,
  isInActiveHours,
} from '../src/heartbeat.js';
import { DEFAULT_HEARTBEAT_CONFIG } from '../src/config.js';

const config = DEFAULT_HEARTBEAT_CONFIG;
const MIN = config.minInterval;
const MAX = config.maxInterval;

describe('heartbeat', () => {
  describe('createInitialState', () => {
    it('starts at minimum interval', () => {
      const state = createInitialState(config);
      expect(state.currentInterval).toBe(MIN);
      expect(state.consecutiveOkCount).toBe(0);
    });
  });

  describe('computeNextInterval', () => {
    it('doubles interval on ok', () => {
      const state = createInitialState(config);
      const next = computeNextInterval(state, 'ok', config);
      expect(next.currentInterval).toBe(MIN * 2);
      expect(next.consecutiveOkCount).toBe(1);
    });

    it('caps at maxInterval', () => {
      const state = {
        currentInterval: MAX / 2 + 1,
        lastCheckTimestamp: Date.now(),
        lastActivityTimestamp: Date.now(),
        consecutiveOkCount: 5,
      };
      const next = computeNextInterval(state, 'ok', config);
      expect(next.currentInterval).toBe(MAX);
    });

    it('resets to minInterval on alert', () => {
      const state = {
        currentInterval: MAX,
        lastCheckTimestamp: Date.now(),
        lastActivityTimestamp: Date.now(),
        consecutiveOkCount: 10,
      };
      const next = computeNextInterval(state, 'alert', config);
      expect(next.currentInterval).toBe(MIN);
      expect(next.consecutiveOkCount).toBe(0);
    });

    it('resets to minInterval on reset', () => {
      const state = {
        currentInterval: MAX,
        lastCheckTimestamp: Date.now(),
        lastActivityTimestamp: Date.now(),
        consecutiveOkCount: 10,
      };
      const next = computeNextInterval(state, 'reset', config);
      expect(next.currentInterval).toBe(MIN);
    });
  });

  describe('isInActiveHours', () => {
    it('returns true when no activeHours configured', () => {
      const configNoHours = { ...config, activeHours: undefined };
      expect(isInActiveHours(configNoHours, new Date())).toBe(true);
    });

    it('returns true during active hours', () => {
      const configHours = {
        ...config,
        activeHours: { start: '08:00', end: '22:00', timezone: 'UTC' },
      };
      // 12:00 UTC
      const noon = new Date('2026-03-06T12:00:00Z');
      expect(isInActiveHours(configHours, noon)).toBe(true);
    });

    it('returns false outside active hours', () => {
      const configHours = {
        ...config,
        activeHours: { start: '08:00', end: '22:00', timezone: 'UTC' },
      };
      // 03:00 UTC
      const earlyMorning = new Date('2026-03-06T03:00:00Z');
      expect(isInActiveHours(configHours, earlyMorning)).toBe(false);
    });
  });
});
