import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { recordBenchmark, generateReport, detectRegressions } from '../benchmark.js';

const TEST_DIR = join(import.meta.dirname, '__benchmark_test__');
const TEST_JSON = join(TEST_DIR, 'benchmark.json');

function makeEntry(overrides = {}) {
  return {
    timestamp: '2026-03-31T12:00:00.000Z',
    matcher: 'keyword',
    model: null,
    skills: [
      { name: 'build-feature', accuracy: 1.0, precision: 1.0, recall: 1.0, tp: 4, fp: 0, fn: 0, tn: 4 },
      { name: 'council', accuracy: 0.875, precision: 0.8, recall: 1.0, tp: 4, fp: 1, fn: 0, tn: 3 },
    ],
    aggregate: { accuracy: 0.9375, precision: 0.9, recall: 1.0, total: 16 },
    ...overrides,
  };
}

describe('benchmark', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('recordBenchmark', () => {
    it('creates benchmark.json if it does not exist', () => {
      const entry = makeEntry();
      recordBenchmark(entry, TEST_JSON);
      expect(existsSync(TEST_JSON)).toBe(true);
      const data = JSON.parse(readFileSync(TEST_JSON, 'utf8'));
      expect(data).toHaveLength(1);
      expect(data[0].timestamp).toBe('2026-03-31T12:00:00.000Z');
    });

    it('appends to existing benchmark.json', () => {
      const entry1 = makeEntry({ timestamp: '2026-03-30T12:00:00.000Z' });
      const entry2 = makeEntry({ timestamp: '2026-03-31T12:00:00.000Z' });
      recordBenchmark(entry1, TEST_JSON);
      recordBenchmark(entry2, TEST_JSON);
      const data = JSON.parse(readFileSync(TEST_JSON, 'utf8'));
      expect(data).toHaveLength(2);
    });

    it('rotates entries beyond 30', () => {
      const seed = Array.from({ length: 30 }, (_, i) =>
        makeEntry({ timestamp: `2026-03-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` })
      );
      writeFileSync(TEST_JSON, JSON.stringify(seed));

      recordBenchmark(makeEntry({ timestamp: '2026-04-01T00:00:00.000Z' }), TEST_JSON);
      const data = JSON.parse(readFileSync(TEST_JSON, 'utf8'));
      expect(data).toHaveLength(30);
      expect(data[0].timestamp).toBe('2026-03-02T00:00:00.000Z');
      expect(data[29].timestamp).toBe('2026-04-01T00:00:00.000Z');
    });
  });

  describe('generateReport', () => {
    it('generates markdown with skill table', () => {
      const current = makeEntry();
      const md = generateReport(current, null);
      expect(md).toContain('build-feature');
      expect(md).toContain('council');
      expect(md).toContain('100.0%');
      expect(md).toContain('87.5%');
    });

    it('includes delta when previous entry is provided', () => {
      const previous = makeEntry({
        skills: [
          { name: 'build-feature', accuracy: 1.0, precision: 1.0, recall: 1.0, tp: 4, fp: 0, fn: 0, tn: 4 },
          { name: 'council', accuracy: 0.75, precision: 0.67, recall: 1.0, tp: 4, fp: 2, fn: 0, tn: 2 },
        ],
        aggregate: { accuracy: 0.875, precision: 0.8, recall: 1.0, total: 16 },
      });
      const current = makeEntry();
      const md = generateReport(current, previous);
      expect(md).toContain('+12.5%');
    });
  });

  describe('detectRegressions', () => {
    it('detects regression when accuracy drops >5% and 2+ tests flipped', () => {
      const previous = makeEntry({
        skills: [
          { name: 'council', accuracy: 1.0, precision: 1.0, recall: 1.0, tp: 4, fp: 0, fn: 0, tn: 4 },
        ],
      });
      const current = makeEntry({
        skills: [
          { name: 'council', accuracy: 0.75, precision: 0.67, recall: 1.0, tp: 4, fp: 2, fn: 0, tn: 2 },
        ],
      });
      const regressions = detectRegressions(current, previous);
      expect(regressions).toHaveLength(1);
      expect(regressions[0].skill).toBe('council');
      expect(regressions[0].flippedTests).toBe(2);
    });

    it('ignores small drops from single test flips', () => {
      const previous = makeEntry({
        skills: [
          { name: 'council', accuracy: 1.0, precision: 1.0, recall: 1.0, tp: 4, fp: 0, fn: 0, tn: 4 },
        ],
      });
      const current = makeEntry({
        skills: [
          { name: 'council', accuracy: 0.875, precision: 0.8, recall: 1.0, tp: 4, fp: 1, fn: 0, tn: 3 },
        ],
      });
      const regressions = detectRegressions(current, previous);
      expect(regressions).toHaveLength(0);
    });

    it('returns empty array when no previous entry', () => {
      const current = makeEntry();
      const regressions = detectRegressions(current, null);
      expect(regressions).toHaveLength(0);
    });
  });
});
