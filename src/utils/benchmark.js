/**
 * benchmark.js — Records, reports, and detects regressions in eval benchmarks.
 *
 * Persists results to benchmarks/benchmark.json with 30-entry rotation.
 * Generates benchmarks/benchmark.md as a human-readable report.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const MAX_ENTRIES = 30;

/**
 * Appends a benchmark entry to the JSON file, rotating old entries.
 * @param {object} entry - Benchmark entry with timestamp, matcher, skills, aggregate
 * @param {string} filePath - Path to benchmark.json
 */
export function recordBenchmark(entry, filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let entries = [];
  if (existsSync(filePath)) {
    entries = JSON.parse(readFileSync(filePath, 'utf8'));
  }

  entries.push(entry);

  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(entries.length - MAX_ENTRIES);
  }

  writeFileSync(filePath, JSON.stringify(entries, null, 2));
}

/**
 * Generates a markdown report from a benchmark entry.
 * @param {object} current - Current benchmark entry
 * @param {object|null} previous - Previous entry for delta comparison
 * @returns {string} Markdown report
 */
export function generateReport(current, previous) {
  const lines = [];
  const date = current.timestamp;
  const matcher = current.matcher;
  const model = current.model ? ` (${current.model})` : '';

  lines.push(`# Eval Benchmark — ${date}`);
  lines.push(`Matcher: ${matcher}${model} | Skills: ${current.skills.length} | Total tests: ${current.aggregate.total}`);
  lines.push('');
  lines.push('| Skill | Accuracy | Precision | Recall | Delta |');
  lines.push('|-------|----------|-----------|--------|-------|');

  for (const skill of current.skills) {
    let delta = '—';
    if (previous) {
      const prev = previous.skills.find(s => s.name === skill.name);
      if (prev) {
        const diff = (skill.accuracy - prev.accuracy) * 100;
        if (Math.abs(diff) >= 0.1) {
          const sign = diff > 0 ? '+' : '';
          const warn = diff < -5 ? ' !!' : '';
          delta = `${sign}${diff.toFixed(1)}%${warn}`;
        }
      }
    }

    lines.push(`| ${skill.name} | ${(skill.accuracy * 100).toFixed(1)}% | ${(skill.precision * 100).toFixed(1)}% | ${(skill.recall * 100).toFixed(1)}% | ${delta} |`);
  }

  lines.push('');
  lines.push('## Aggregate');

  let aggDelta = '';
  if (previous) {
    const diff = (current.aggregate.accuracy - previous.aggregate.accuracy) * 100;
    if (Math.abs(diff) >= 0.1) {
      const sign = diff > 0 ? '+' : '';
      aggDelta = ` (Delta ${sign}${diff.toFixed(1)}%)`;
    }
  }

  lines.push(`Accuracy: ${(current.aggregate.accuracy * 100).toFixed(1)}%${aggDelta}`);
  lines.push(`Precision: ${(current.aggregate.precision * 100).toFixed(1)}%`);
  lines.push(`Recall: ${(current.aggregate.recall * 100).toFixed(1)}%`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Detects regressions between two benchmark entries.
 * A regression is: accuracy dropped >5% AND at least 2 tests flipped.
 * @param {object} current
 * @param {object|null} previous
 * @returns {Array<{ skill: string, currentAccuracy: number, previousAccuracy: number, delta: number, flippedTests: number }>}
 */
export function detectRegressions(current, previous) {
  if (!previous) return [];

  const regressions = [];

  for (const skill of current.skills) {
    const prev = previous.skills.find(s => s.name === skill.name);
    if (!prev) continue;

    const delta = skill.accuracy - prev.accuracy;
    if (delta >= -0.05) continue;

    const currentCorrect = skill.tp + skill.tn;
    const prevCorrect = prev.tp + prev.tn;
    const flippedTests = Math.abs(currentCorrect - prevCorrect);

    if (flippedTests < 2) continue;

    regressions.push({
      skill: skill.name,
      currentAccuracy: skill.accuracy,
      previousAccuracy: prev.accuracy,
      delta,
      flippedTests,
    });
  }

  return regressions;
}
