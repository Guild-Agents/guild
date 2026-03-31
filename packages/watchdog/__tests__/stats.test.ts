import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  createDailyStats,
  recordSensorCheck,
  recordHeuristicCheck,
  recordHaikuCall,
  recordSonnetCall,
  recordHeartbeatCheck,
  persistDailyStats,
  loadDailyStats,
  computeCost,
  formatStatsReport,
} from '../src/stats.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, '__tmp_stats__');

describe('stats', () => {
  beforeEach(() => {
    mkdirSync(path.join(TEST_DIR, 'stats'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('createDailyStats', () => {
    it('creates empty stats for today', () => {
      const stats = createDailyStats();
      expect(stats.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(stats.layers.sensor.checks).toBe(0);
    });
  });

  describe('recording', () => {
    it('increments sensor checks and filtered count', () => {
      const stats = createDailyStats();
      recordSensorCheck(stats, true);
      expect(stats.layers.sensor.checks).toBe(1);
      expect(stats.layers.sensor.filtered).toBe(1);

      recordSensorCheck(stats, false);
      expect(stats.layers.sensor.checks).toBe(2);
      expect(stats.layers.sensor.escalated).toBe(1);
    });

    it('increments heuristic checks and filtered count', () => {
      const stats = createDailyStats();
      recordHeuristicCheck(stats, true);
      expect(stats.layers.heuristic.checks).toBe(1);
      expect(stats.layers.heuristic.filtered).toBe(1);

      recordHeuristicCheck(stats, false);
      expect(stats.layers.heuristic.checks).toBe(2);
      expect(stats.layers.heuristic.escalated).toBe(1);
    });

    it('records Haiku token usage', () => {
      const stats = createDailyStats();
      recordHaikuCall(stats, 100, 20, false);
      expect(stats.layers.haiku.checks).toBe(1);
      expect(stats.layers.haiku.inputTokens).toBe(100);
      expect(stats.layers.haiku.outputTokens).toBe(20);
      expect(stats.layers.haiku.filtered).toBe(1);
    });

    it('records Sonnet token usage', () => {
      const stats = createDailyStats();
      recordSonnetCall(stats, 500, 150);
      expect(stats.layers.sonnet.checks).toBe(1);
      expect(stats.layers.sonnet.inputTokens).toBe(500);
    });

    it('records heartbeat check', () => {
      const stats = createDailyStats();
      recordHeartbeatCheck(stats, 900000);
      expect(stats.heartbeat.totalChecks).toBe(1);
    });
  });

  describe('computeCost', () => {
    it('computes cost from token counts', () => {
      const stats = createDailyStats();
      recordHaikuCall(stats, 1000, 100, false);
      recordSonnetCall(stats, 1000, 100);
      const cost = computeCost(stats);
      expect(cost.total).toBeGreaterThan(0);
      expect(cost.haiku).toBeGreaterThan(0);
      expect(cost.sonnet).toBeGreaterThan(0);
    });
  });

  describe('persistence', () => {
    it('round-trips through persist and load', () => {
      const stats = createDailyStats();
      recordSensorCheck(stats, true);
      persistDailyStats(TEST_DIR, stats);

      const loaded = loadDailyStats(TEST_DIR, stats.date);
      expect(loaded).toBeTruthy();
      expect(loaded!.layers.sensor.checks).toBe(1);
    });

    it('returns null for missing date', () => {
      expect(loadDailyStats(TEST_DIR, '2020-01-01')).toBeNull();
    });
  });

  describe('formatStatsReport', () => {
    it('returns human-readable summary', () => {
      const stats = createDailyStats();
      recordSensorCheck(stats, true);
      recordSensorCheck(stats, false);
      recordHaikuCall(stats, 100, 20, false);
      const report = formatStatsReport(stats);
      expect(report).toContain('Sensor');
      expect(report).toContain('Haiku');
    });
  });
});
