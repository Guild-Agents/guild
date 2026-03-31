import type { HeartbeatConfig } from './config.js';

export interface HeartbeatState {
  currentInterval: number;
  lastCheckTimestamp: number;
  lastActivityTimestamp: number;
  consecutiveOkCount: number;
}

export type CheckResult = 'ok' | 'alert' | 'reset';

export function createInitialState(config: HeartbeatConfig): HeartbeatState {
  const now = Date.now();
  return {
    currentInterval: config.minInterval,
    lastCheckTimestamp: now,
    lastActivityTimestamp: now,
    consecutiveOkCount: 0,
  };
}

export function computeNextInterval(
  state: HeartbeatState,
  result: CheckResult,
  config: HeartbeatConfig,
): HeartbeatState {
  const now = Date.now();

  if (result === 'alert' || result === 'reset') {
    return {
      currentInterval: config.minInterval,
      lastCheckTimestamp: now,
      lastActivityTimestamp: now,
      consecutiveOkCount: 0,
    };
  }

  // result === 'ok' -- backoff
  const nextInterval = Math.min(
    state.currentInterval * config.backoffFactor,
    config.maxInterval,
  );

  return {
    currentInterval: nextInterval,
    lastCheckTimestamp: now,
    lastActivityTimestamp: state.lastActivityTimestamp,
    consecutiveOkCount: state.consecutiveOkCount + 1,
  };
}

export function isInActiveHours(config: HeartbeatConfig, now: Date): boolean {
  if (!config.activeHours) return true;

  const { start, end, timezone } = config.activeHours;
  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    hour12: false,
  });

  return timeStr >= start && timeStr < end;
}
