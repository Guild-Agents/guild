/**
 * reset-learnings.js — Resets the compound learnings file
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { join } from 'path';
import { ensureProjectRoot } from '../utils/files.js';
import { learningsExist, deleteLearnings } from '../utils/learnings-io.js';
import { GUILD_LEARNINGS_PATH } from '../utils/learnings.js';

/**
 * Runs the `guild reset-learnings` command.
 * @param {object} [options]
 * @param {boolean} [options.force] - Skip confirmation prompt
 */
export async function runResetLearnings(options = {}) {
  const root = ensureProjectRoot();
  const filePath = join(root, GUILD_LEARNINGS_PATH);

  p.intro(chalk.bold.cyan('Guild — Reset Learnings'));

  if (!learningsExist(filePath)) {
    p.log.info('No learnings file found. Nothing to reset.');
    p.outro('Done.');
    return;
  }

  if (!options.force) {
    const confirmed = await p.confirm({
      message: 'This will delete all accumulated learnings. Continue?',
      initialValue: false,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Reset cancelled.');
      return;
    }
  }

  deleteLearnings(filePath);
  p.log.success(`${chalk.green('✓')} Learnings file deleted.`);
  p.outro('Learnings have been reset. They will be regenerated on the next workflow execution.');
}
