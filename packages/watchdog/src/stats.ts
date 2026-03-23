import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

// Pricing per million tokens (as of 2026 -- update if changed)
const HAIKU_INPUT_COST = 0.80;
const HAIKU_OUTPUT_COST = 4.00;
const SONNET_INPUT_COST = 3.00;
const SONNET_OUTPUT_COST = 15.00;

export interface LayerStats {
  checks: number;
  filtered: number;
  escalated: number;
  inputTokens: number;
  outputTokens: number;
}

export interface DailyStats {
  date: string;
  layers: {
    sensor: LayerStats;
    heuristic: LayerStats;
    haiku: LayerStats;
    sonnet: LayerStats;
  };
  heartbeat: {
    totalChecks: number;
    intervalSumMs: number;
    activityResets: number;
  };
}

export interface CostBreakdown {
  haiku: number;
  sonnet: number;
  total: number;
}

function emptyLayer(): LayerStats {
  return { checks: 0, filtered: 0, escalated: 0, inputTokens: 0, outputTokens: 0 };
}

export function createDailyStats(): DailyStats {
  return {
    date: new Date().toISOString().slice(0, 10),
    layers: {
      sensor: emptyLayer(),
      heuristic: emptyLayer(),
      haiku: emptyLayer(),
      sonnet: emptyLayer(),
    },
    heartbeat: { totalChecks: 0, intervalSumMs: 0, activityResets: 0 },
  };
}

export function recordSensorCheck(stats: DailyStats, filtered: boolean): void {
  stats.layers.sensor.checks++;
  if (filtered) stats.layers.sensor.filtered++;
  else stats.layers.sensor.escalated++;
}

export function recordHeuristicCheck(stats: DailyStats, filtered: boolean): void {
  stats.layers.heuristic.checks++;
  if (filtered) stats.layers.heuristic.filtered++;
  else stats.layers.heuristic.escalated++;
}

export function recordHaikuCall(
  stats: DailyStats, inputTokens: number, outputTokens: number, escalated: boolean,
): void {
  stats.layers.haiku.checks++;
  stats.layers.haiku.inputTokens += inputTokens;
  stats.layers.haiku.outputTokens += outputTokens;
  if (escalated) stats.layers.haiku.escalated++;
  else stats.layers.haiku.filtered++;
}

export function recordSonnetCall(
  stats: DailyStats, inputTokens: number, outputTokens: number,
): void {
  stats.layers.sonnet.checks++;
  stats.layers.sonnet.inputTokens += inputTokens;
  stats.layers.sonnet.outputTokens += outputTokens;
}

export function recordHeartbeatCheck(stats: DailyStats, intervalMs: number): void {
  stats.heartbeat.totalChecks++;
  stats.heartbeat.intervalSumMs += intervalMs;
}

export function computeCost(stats: DailyStats): CostBreakdown {
  const haiku =
    (stats.layers.haiku.inputTokens / 1_000_000) * HAIKU_INPUT_COST +
    (stats.layers.haiku.outputTokens / 1_000_000) * HAIKU_OUTPUT_COST;

  const sonnet =
    (stats.layers.sonnet.inputTokens / 1_000_000) * SONNET_INPUT_COST +
    (stats.layers.sonnet.outputTokens / 1_000_000) * SONNET_OUTPUT_COST;

  return { haiku, sonnet, total: haiku + sonnet };
}

export function persistDailyStats(workspacePath: string, stats: DailyStats): void {
  const dir = path.join(workspacePath, 'stats');
  mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `daily-${stats.date}.json`);
  writeFileSync(filePath, JSON.stringify(stats, null, 2), 'utf8');
}

export function loadDailyStats(workspacePath: string, date: string): DailyStats | null {
  const filePath = path.join(workspacePath, 'stats', `daily-${date}.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as DailyStats;
  } catch {
    return null;
  }
}

export function formatStatsReport(stats: DailyStats): string {
  const cost = computeCost(stats);
  const lines = [
    `Date: ${stats.date}`,
    ``,
    `Sensor: ${stats.layers.sensor.checks} checks, ${stats.layers.sensor.filtered} filtered, ${stats.layers.sensor.escalated} escalated`,
    `Heuristic: ${stats.layers.heuristic.checks} checks, ${stats.layers.heuristic.filtered} filtered`,
    `Haiku: ${stats.layers.haiku.checks} calls, ${stats.layers.haiku.inputTokens} in / ${stats.layers.haiku.outputTokens} out tokens`,
    `Sonnet: ${stats.layers.sonnet.checks} calls, ${stats.layers.sonnet.inputTokens} in / ${stats.layers.sonnet.outputTokens} out tokens`,
    ``,
    `Cost: $${cost.total.toFixed(4)} (Haiku: $${cost.haiku.toFixed(4)}, Sonnet: $${cost.sonnet.toFixed(4)})`,
    `Heartbeat: ${stats.heartbeat.totalChecks} checks`,
  ];
  return lines.join('\n');
}
