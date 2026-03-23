import TelegramBot from 'node-telegram-bot-api';
import { loadConfig } from './config.js';
import { createInitialState, computeNextInterval, isInActiveHours } from './heartbeat.js';
import type { HeartbeatState } from './heartbeat.js';
import { runAllSensors } from './sensors/index.js';
import { classify } from './classifier.js';
import { createLlmClient } from './llm.js';
import { createTelegramBot } from './telegram.js';
import type { CommandHandlers } from './telegram.js';
import {
  writeEvent,
  isDuplicate,
  loadHeartbeatState,
  saveHeartbeatState,
  loadWorkspaceFile,
} from './workspace.js';
import {
  createDailyStats,
  recordSensorCheck,
  recordHeuristicCheck,
  recordHaikuCall,
  recordSonnetCall,
  recordHeartbeatCheck,
  persistDailyStats,
  formatStatsReport,
} from './stats.js';
import type { DailyStats } from './stats.js';

const config = loadConfig(process.env as Record<string, string>);

// State
let heartbeatState: HeartbeatState =
  loadHeartbeatState(config.workspacePath) ?? createInitialState(config.heartbeat);
let dailyStats: DailyStats = createDailyStats();
let paused = false;
const startedAt = Date.now();

// LLM
const llm = createLlmClient(config.anthropic.apiKey);

// Telegram
const telegramBot = new TelegramBot(config.telegram.botToken, { polling: true });
const bot = createTelegramBot(telegramBot, config.telegram.chatId);

const commands: CommandHandlers = {
  onStatus: () => {
    const uptime = Math.floor((Date.now() - startedAt) / 1000);
    return [
      `Uptime: ${uptime}s`,
      `Interval: ${Math.floor(heartbeatState.currentInterval / 60000)}m`,
      `Consecutive OK: ${heartbeatState.consecutiveOkCount}`,
      `Paused: ${paused}`,
    ].join('\n');
  },
  onStats: () => formatStatsReport(dailyStats),
  onInterval: (min: string) => {
    const ms = parseInt(min) * 60 * 1000;
    if (isNaN(ms) || ms < 60000) return 'Invalid interval. Use minutes (e.g. "30")';
    heartbeatState = { ...heartbeatState, currentInterval: ms };
    return `Interval set to ${min}m`;
  },
  onPause: () => { paused = true; return 'Heartbeat paused'; },
  onResume: () => {
    paused = false;
    heartbeatState = computeNextInterval(heartbeatState, 'reset', config.heartbeat);
    return 'Heartbeat resumed, interval reset';
  },
};

bot.registerCommands(commands);

// Pipeline
async function runPipeline(): Promise<'ok' | 'alert'> {
  const signals = await runAllSensors(config);
  let hadAlert = false;

  for (const signal of signals) {
    recordSensorCheck(dailyStats, false); // always count raw sensor call
    const classification = classify(signal);
    recordHeuristicCheck(dailyStats, classification.severity === 'ignore');

    if (classification.severity === 'ignore') continue;

    // Triage with Haiku if low confidence
    if (classification.confidence === 'low') {
      const triage = await llm.triageWithHaiku(signal, classification.reason);
      recordHaikuCall(dailyStats, triage.inputTokens, triage.outputTokens, triage.decision === 'action');
      if (triage.decision === 'ignore') continue;
    }

    // Deduplication check — skip Sonnet call if duplicate
    if (isDuplicate(config.workspacePath, signal.source, 4)) continue;

    // Action with Sonnet
    const chain = `sensor(${signal.status}) -> classifier(${classification.severity}) -> sonnet`;
    const workspace = {
      soul: loadWorkspaceFile(config.workspacePath, 'SOUL.md'),
      heartbeat: loadWorkspaceFile(config.workspacePath, 'HEARTBEAT.md'),
      memory: loadWorkspaceFile(config.workspacePath, 'MEMORY.md'),
    };

    const action = await llm.actWithSonnet(signal, chain, workspace);
    recordSonnetCall(dailyStats, action.inputTokens, action.outputTokens);

    writeEvent(config.workspacePath, signal.source, 'action', action.event);
    await bot.sendNotification(action.notification);

    hadAlert = true;
  }

  return hadAlert ? 'alert' : 'ok';
}

// Main loop
async function loop(): Promise<void> {
  console.log(`Guild Watchdog started. Interval: ${heartbeatState.currentInterval / 60000}m`);

  while (true) {
    if (paused || !isInActiveHours(config.heartbeat, new Date())) {
      await sleep(60_000); // Check every minute when paused/inactive
      continue;
    }

    try {
      const result = await runPipeline();
      heartbeatState = computeNextInterval(heartbeatState, result, config.heartbeat);
      recordHeartbeatCheck(dailyStats, heartbeatState.currentInterval);

      // Roll over stats at midnight
      const today = new Date().toISOString().slice(0, 10);
      if (dailyStats.date !== today) {
        persistDailyStats(config.workspacePath, dailyStats);
        dailyStats = createDailyStats();
      }
    } catch (error) {
      console.error('Pipeline error:', (error as Error).message);
      heartbeatState = computeNextInterval(heartbeatState, 'alert', config.heartbeat);
    }

    saveHeartbeatState(config.workspacePath, heartbeatState);
    persistDailyStats(config.workspacePath, dailyStats);

    console.log(`Next check in ${Math.floor(heartbeatState.currentInterval / 60000)}m`);
    await sleep(heartbeatState.currentInterval);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

loop().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
