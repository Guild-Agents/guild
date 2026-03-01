/**
 * logs.js — View and manage Guild execution traces
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { join } from 'node:path';
import { ensureProjectRoot } from '../utils/files.js';
import { listTraces, cleanTraces } from '../utils/trace.js';

/**
 * Runs the `guild logs` command.
 *
 * @param {'list'|'clean'} action - Subcommand to run
 * @param {object} [options={}] - Options
 * @param {string} [options.days='30'] - Days threshold for clean
 * @param {boolean} [options.all] - Remove all traces
 */
export async function runLogs(action, options = {}) {
  const root = ensureProjectRoot();
  const tracesDir = join(root, '.claude', 'guild', 'traces');

  if (action === 'clean') {
    p.intro(chalk.bold.cyan('Guild — Clean Traces'));

    let removed;
    if (options.all) {
      removed = cleanTraces(0, tracesDir);
    } else {
      const days = parseInt(options.days || '30', 10);
      removed = cleanTraces(days, tracesDir);
    }

    p.log.info(chalk.gray(`Removed ${removed} trace(s).`));
    p.outro('');
    return;
  }

  // Default: list traces
  p.intro(chalk.bold.cyan('Guild — Traces'));

  const traces = listTraces(tracesDir);

  if (traces.length === 0) {
    p.log.info(chalk.gray('No traces found.'));
    p.outro('');
    return;
  }

  for (const trace of traces) {
    const date = trace.date !== 'unknown' ? new Date(trace.date).toLocaleString() : 'unknown';
    const result = trace.result === 'pass' ? chalk.green('pass') :
                   trace.result === 'fail' ? chalk.red('fail') :
                   chalk.gray(trace.result || 'unknown');

    p.log.info(`  ${chalk.white.bold(trace.workflow)} ${result}`);
    p.log.info(chalk.gray(`    ${date} | level: ${trace.level}`));
  }

  p.log.info('');
  p.log.info(chalk.gray(`Total: ${traces.length} trace(s)`));
  p.outro('');
}
