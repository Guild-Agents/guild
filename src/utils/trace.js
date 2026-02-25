/**
 * trace.js — Structured trace file utilities for Guild workflows.
 *
 * Provides pure rendering functions (renderTrace, renderStep, renderSummary)
 * that take data in and return strings out, with zero I/O. Also provides
 * I/O functions (createTrace, finalizeTrace, listTraces, cleanTraces) for
 * file operations on `.claude/guild/traces/`.
 */

import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync, unlinkSync, statSync } from 'fs';
import { join, dirname } from 'path';

/** @typedef {'default' | 'verbose' | 'debug'} TraceLevel */

/**
 * @typedef {Object} TraceContext
 * @property {string} filePath - Absolute path to the trace file
 * @property {string} workflow - Skill/workflow name
 * @property {TraceLevel} level - Logging level
 * @property {Date} started - Workflow start time
 * @property {Array<TraceStep>} steps - Recorded steps
 * @property {number} totalTokens - Running token total
 */

/**
 * @typedef {Object} TraceStep
 * @property {string} role - Agent role (e.g. 'tech-lead')
 * @property {string} intent - Brief description of what the agent was asked
 * @property {string} tier - Tier assignment (e.g. 'reasoning', 'execution')
 * @property {string} model - Resolved model ID
 * @property {boolean} fallback - Whether a fallback model was used
 * @property {string} started - ISO-8601 timestamp
 * @property {number} duration - Duration in seconds
 * @property {number} tokens - Token count for this step
 * @property {string} result - 'pass', 'fail', or 'skip'
 * @property {string} [decision] - Verbose+: why this model was chosen
 * @property {string} [reasoning] - Verbose+: agent's self-reported reasoning
 * @property {string} [fullPrompt] - Debug only: complete prompt sent
 * @property {string} [fullResponse] - Debug only: complete response received
 */

/**
 * @typedef {Object} TraceSummary
 * @property {string} result - 'pass' or 'fail'
 * @property {boolean} testsPass - Whether tests passed
 * @property {boolean} lintPass - Whether lint passed
 */

/**
 * Resolves the trace level from CLI option flags.
 * If both verbose and debug are set, debug wins (highest level).
 * @param {Object} [options] - CLI options
 * @param {boolean} [options.verbose] - Enable verbose logging
 * @param {boolean} [options.debug] - Enable debug logging
 * @returns {TraceLevel}
 */
export function resolveTraceLevel(options = {}) {
  if (options.debug) return 'debug';
  if (options.verbose) return 'verbose';
  return 'default';
}

/**
 * Formats a duration in milliseconds to HH:MM:SS string.
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted as HH:MM:SS
 */
export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

/**
 * Creates a new trace context object. Creates the traces directory if needed.
 * Does NOT write anything to disk — writing happens on finalize (lazy).
 * @param {string} workflowName - Skill/workflow name (e.g. 'build-feature')
 * @param {TraceLevel} level - Logging level
 * @param {string} [tracesDir] - Directory for trace files (default: .claude/guild/traces/)
 * @returns {TraceContext}
 */
export function createTrace(workflowName, level, tracesDir) {
  const dir = tracesDir || join('.claude', 'guild', 'traces');
  mkdirSync(dir, { recursive: true });

  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', 'T');
  const filename = `guild-trace-${timestamp}.md`;

  return {
    filePath: join(dir, filename),
    workflow: workflowName,
    level,
    started: now,
    steps: [],
    totalTokens: 0,
  };
}

/**
 * Records a step in the trace context. Pushes step data and updates token total.
 * @param {TraceContext} traceCtx - The trace context from createTrace
 * @param {TraceStep} stepData - The step data to record
 * @returns {TraceContext} The same context (for chaining)
 */
export function recordStep(traceCtx, stepData) {
  traceCtx.steps.push(stepData);
  traceCtx.totalTokens += stepData.tokens || 0;
  return traceCtx;
}

/**
 * Renders a single step section as Markdown. PURE function — no I/O.
 * Only includes decision/reasoning for verbose+. Only includes
 * fullPrompt/fullResponse for debug level.
 * @param {TraceStep} step - Step data
 * @param {number} stepNumber - 1-based step index
 * @param {TraceLevel} level - Current trace level
 * @returns {string} Markdown string for the step
 */
export function renderStep(step, stepNumber, level) {
  const lines = [];
  lines.push(`### Step ${stepNumber} — ${step.role}: ${step.intent}`);
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  lines.push(`| Tier | ${step.tier} |`);
  lines.push(`| Model | ${step.model} |`);
  lines.push(`| Fallback | ${step.fallback ? 'yes' : 'no'} |`);
  lines.push(`| Started | ${step.started} |`);
  lines.push(`| Duration | ${step.duration}s |`);
  lines.push(`| Tokens | ${step.tokens} |`);
  lines.push(`| Result | ${step.result} |`);

  if ((level === 'verbose' || level === 'debug') && step.decision) {
    lines.push('');
    lines.push(`**Decision:** ${step.decision}`);
  }
  if ((level === 'verbose' || level === 'debug') && step.reasoning) {
    lines.push(`**Reasoning:** ${step.reasoning}`);
  }

  if (level === 'debug' && step.fullPrompt) {
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>Full prompt</summary>');
    lines.push('');
    lines.push(step.fullPrompt);
    lines.push('');
    lines.push('</details>');
  }

  if (level === 'debug' && step.fullResponse) {
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>Full response</summary>');
    lines.push('');
    lines.push(step.fullResponse);
    lines.push('');
    lines.push('</details>');
  }

  return lines.join('\n');
}

/**
 * Renders the summary section as Markdown. PURE function — no I/O.
 * @param {TraceSummary} summary - Summary data
 * @param {number} totalTokens - Total tokens across all steps
 * @param {string} duration - Formatted duration string (HH:MM:SS)
 * @returns {string} Markdown string for the summary
 */
export function renderSummary(summary, totalTokens, duration) {
  const lines = [];
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Result**: ${summary.result}`);
  lines.push(`- **Tests**: ${summary.testsPass ? 'pass' : 'fail'}`);
  lines.push(`- **Lint**: ${summary.lintPass ? 'pass' : 'fail'}`);
  lines.push(`- **Total tokens**: ${totalTokens}`);
  lines.push(`- **Duration**: ${duration}`);
  return lines.join('\n');
}

/**
 * Renders a complete trace as a Markdown string. PURE function — no I/O.
 * @param {TraceContext} traceCtx - Trace context with all steps
 * @param {TraceSummary} summary - Final summary data
 * @param {Date} [finished] - Finish time (default: new Date())
 * @returns {string} Complete Markdown content
 */
export function renderTrace(traceCtx, summary, finished) {
  const end = finished || new Date();
  const durationMs = end.getTime() - traceCtx.started.getTime();
  const durationStr = formatDuration(durationMs);

  const lines = [];

  // Header
  lines.push(`# Guild Trace — ${traceCtx.workflow}`);
  lines.push('');
  lines.push(`> Level: ${traceCtx.level}`);
  lines.push(`> Started: ${traceCtx.started.toISOString()}`);
  lines.push(`> Finished: ${end.toISOString()}`);
  lines.push(`> Duration: ${durationStr}`);
  lines.push(`> Total tokens: ${traceCtx.totalTokens}`);
  lines.push(`> Result: ${summary.result}`);

  // Steps
  lines.push('');
  lines.push('## Steps');

  for (let i = 0; i < traceCtx.steps.length; i++) {
    lines.push('');
    lines.push(renderStep(traceCtx.steps[i], i + 1, traceCtx.level));
  }

  // Summary
  lines.push('');
  lines.push(renderSummary(summary, traceCtx.totalTokens, durationStr));

  return lines.join('\n');
}

/**
 * Finalizes a trace: computes duration, renders markdown, writes to disk.
 * @param {TraceContext} traceCtx - The trace context
 * @param {TraceSummary} summary - Final summary data (result, testsPass, lintPass)
 * @returns {{ filePath: string, duration: number, totalTokens: number }}
 */
export function finalizeTrace(traceCtx, summary) {
  const finished = new Date();
  const durationMs = finished.getTime() - traceCtx.started.getTime();
  const content = renderTrace(traceCtx, summary, finished);

  // Ensure directory exists (may have been cleaned between create and finalize)
  const dir = dirname(traceCtx.filePath);
  mkdirSync(dir, { recursive: true });

  writeFileSync(traceCtx.filePath, content, 'utf8');

  return {
    filePath: traceCtx.filePath,
    duration: durationMs,
    totalTokens: traceCtx.totalTokens,
  };
}

/**
 * Lists all trace files in the traces directory, sorted newest first.
 * Parses the header of each file to extract metadata.
 * Returns empty array if directory does not exist (no throw).
 * @param {string} [tracesDir] - Directory to scan (default: .claude/guild/traces/)
 * @returns {Array<{ filePath: string, workflow: string, date: string, level: string, result: string }>}
 */
export function listTraces(tracesDir) {
  const dir = tracesDir || join('.claude', 'guild', 'traces');
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir)
    .filter(f => f.startsWith('guild-trace-') && f.endsWith('.md'))
    .sort()
    .reverse();

  return files.map(filename => {
    const filePath = join(dir, filename);
    const head = readFileSync(filePath, 'utf8').split('\n').slice(0, 10).join('\n');

    const workflowMatch = head.match(/^# Guild Trace — (.+)$/m);
    const levelMatch = head.match(/^> Level: (.+)$/m);
    const resultMatch = head.match(/^> Result: (.+)$/m);
    const startedMatch = head.match(/^> Started: (.+)$/m);

    return {
      filePath,
      workflow: workflowMatch ? workflowMatch[1] : 'unknown',
      date: startedMatch ? startedMatch[1] : 'unknown',
      level: levelMatch ? levelMatch[1] : 'default',
      result: resultMatch ? resultMatch[1] : 'unknown',
    };
  });
}

/**
 * Deletes trace files older than maxAgeDays. If maxAgeDays is 0, deletes ALL traces.
 * Returns count of deleted files. Returns 0 if directory does not exist (no throw).
 * @param {number} maxAgeDays - Traces older than this many days are deleted (0 = delete all)
 * @param {string} [tracesDir] - Directory to clean (default: .claude/guild/traces/)
 * @returns {number} Count of deleted files
 */
export function cleanTraces(maxAgeDays, tracesDir) {
  const dir = tracesDir || join('.claude', 'guild', 'traces');
  if (!existsSync(dir)) return 0;

  const files = readdirSync(dir)
    .filter(f => f.startsWith('guild-trace-') && f.endsWith('.md'));

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  for (const filename of files) {
    const filePath = join(dir, filename);
    if (maxAgeDays === 0) {
      unlinkSync(filePath);
      deleted++;
    } else {
      const stat = statSync(filePath);
      const ageMs = now - stat.mtimeMs;
      if (ageMs > maxAgeMs) {
        unlinkSync(filePath);
        deleted++;
      }
    }
  }

  return deleted;
}
