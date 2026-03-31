/**
 * stats.js — Token usage stats command.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, unlinkSync, copyFileSync } from 'fs';
import { join } from 'path';
import { loadUsage, aggregate, estimateWithProfile } from '../utils/accounting.js';
import { getModelShortName } from '../utils/pricing.js';

const USAGE_PATH = join('.claude', 'guild', 'usage.json');

function fmt(n) {
  return n.toLocaleString('en-US');
}

function usd(n) {
  return `$${n.toFixed(2)}`;
}

function pct(part, total) {
  if (total === 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

const PERIOD_LABELS = {
  today: 'Today',
  week: 'Last 7 days',
  month: 'Last 30 days',
  all: 'All time',
};

export function formatCsv(entries) {
  const headers = 'timestamp,workflow,agent,tier,model,inputTokens,outputTokens,totalTokens,estimatedCostUSD';
  const rows = entries.map(e =>
    `${e.timestamp},${e.workflow},${e.agent},${e.tier},${e.model},${e.inputTokens},${e.outputTokens},${e.totalTokens},${e.estimatedCostUSD.toFixed(6)}`
  );
  return [headers, ...rows].join('\n') + '\n';
}

export async function runStats(options = {}) {
  const root = process.cwd();

  if (options.reset) {
    return handleReset(root, options.force);
  }

  if (options.export === 'csv') {
    const usage = loadUsage(root);
    if (usage.entries.length === 0) {
      console.log('No usage data to export.');
      return;
    }
    process.stdout.write(formatCsv(usage.entries));
    return;
  }

  const period = options.period || 'month';
  const totals = aggregate(root, period);

  p.intro(chalk.bold.cyan(`Guild Usage Stats — ${PERIOD_LABELS[period] || period}`));

  if (totals.totalTokens === 0) {
    p.log.info('No usage data yet. Token tracking will begin when workflows record usage.');
    p.outro('');
    return;
  }

  p.log.step('Summary');
  p.log.info(`  Workflows executed:  ${chalk.bold(fmt(totals.workflowCount))}`);
  p.log.info(`  Total tokens:        ${chalk.bold(fmt(totals.totalTokens))}`);
  p.log.info(`  Estimated cost:      ${chalk.bold.green(usd(totals.totalCostUSD))}`);

  if (Object.keys(totals.tokensByTier).length > 0) {
    p.log.step('By tier');
    for (const [tier, tokens] of Object.entries(totals.tokensByTier)) {
      p.log.info(`  ${tier.padEnd(12)} ${fmt(tokens).padStart(10)} tok  (${pct(tokens, totals.totalTokens).padStart(4)})`);
    }
  }

  if (Object.keys(totals.tokensByModel).length > 0) {
    p.log.step('By model');
    for (const [model, tokens] of Object.entries(totals.tokensByModel)) {
      p.log.info(`  ${getModelShortName(model).padEnd(12)} ${fmt(tokens).padStart(10)} tok`);
    }
  }

  if (Object.keys(totals.tokensByWorkflow).length > 0) {
    p.log.step('Top workflows');
    const sorted = Object.entries(totals.tokensByWorkflow).sort((a, b) => b[1] - a[1]);
    for (const [wf, tokens] of sorted) {
      p.log.info(`  ${wf.padEnd(20)} ${fmt(tokens).padStart(10)} tok`);
    }
  }

  if (options.compare) {
    const usage = loadUsage(root);
    const filtered = usage.entries;
    const maxCost = estimateWithProfile(filtered, 'max');
    const proCost = estimateWithProfile(filtered, 'pro');
    const allOpusCost = estimateWithProfile(filtered, 'all-opus');

    p.log.step('Profile comparison');
    p.log.info(`  ${'max'.padEnd(12)} ${usd(maxCost).padStart(10)}    —`);
    p.log.info(`  ${'pro'.padEnd(12)} ${usd(proCost).padStart(10)}    ${diffLabel(proCost, maxCost)}`);
    p.log.info(`  ${'all-opus'.padEnd(12)} ${usd(allOpusCost).padStart(10)}    ${diffLabel(allOpusCost, maxCost)}`);
  }

  p.outro('');
}

function diffLabel(cost, baseline) {
  if (baseline === 0) return '';
  const diff = ((cost - baseline) / baseline) * 100;
  const sign = diff >= 0 ? '+' : '';
  return chalk.gray(`${sign}${Math.round(diff)}%`);
}

async function handleReset(root, force) {
  const filePath = join(root, USAGE_PATH);

  p.intro(chalk.bold.cyan('Guild — Reset Usage Stats'));

  if (!existsSync(filePath)) {
    p.log.info('No usage data found. Nothing to reset.');
    p.outro('');
    return;
  }

  if (!force) {
    const confirmed = await p.confirm({
      message: 'This will delete all usage history. Continue?',
      initialValue: false,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Reset cancelled.');
      return;
    }
  }

  copyFileSync(filePath, filePath + '.bak');
  unlinkSync(filePath);
  p.log.success(`${chalk.green('✓')} Usage history deleted. Backup saved as usage.json.bak.`);
  p.outro('');
}
