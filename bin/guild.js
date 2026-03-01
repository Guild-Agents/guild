#!/usr/bin/env node

/**
 * Guild v1 — CLI entry point
 * Usage:
 *   guild init           — interactive onboarding v1
 *   guild new-agent      — create a new agent
 *   guild status         — view project status
 *   guild doctor         — verify setup and report issues
 *   guild list           — list installed agents and skills
 */

import { program } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { parseVersion, getPreReleaseWarning } from '../src/utils/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const { channel } = parseVersion(pkg.version);
const prereleaseWarning = getPreReleaseWarning(pkg.version);
if (prereleaseWarning) {
  const color = channel === 'snapshot' ? chalk.red : chalk.yellow;
  console.error(color(`Guild v${pkg.version} -- ${prereleaseWarning}`));
}

program
  .name('guild')
  .description('Specification-driven development CLI for Claude Code')
  .version(pkg.version)
  .option('--verbose', 'Enable verbose logging (records decision trail)')
  .option('--debug', 'Enable debug logging (records full prompts and responses)');

// guild init
program
  .command('init')
  .description('Initialize Guild v1 in the current project')
  .action(async () => {
    try {
      const { runInit } = await import('../src/commands/init.js');
      await runInit();
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

// guild new-agent
program
  .command('new-agent')
  .description('Create a new agent')
  .argument('<name>', 'Agent name (lowercase, hyphens)')
  .action(async (name) => {
    try {
      const { runNewAgent } = await import('../src/commands/new-agent.js');
      await runNewAgent(name);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

// guild status
program
  .command('status')
  .description('View Guild project status')
  .action(async () => {
    try {
      const { runStatus } = await import('../src/commands/status.js');
      await runStatus();
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

// guild doctor
program
  .command('doctor')
  .description('Verify Guild setup and report issues')
  .action(async () => {
    try {
      const { runDoctor } = await import('../src/commands/doctor.js');
      await runDoctor();
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

// guild list
program
  .command('list')
  .description('List installed agents and skills')
  .action(async () => {
    try {
      const { runList } = await import('../src/commands/list.js');
      await runList();
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

// guild reset-learnings
program
  .command('reset-learnings')
  .description('Reset the compound learnings file')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const { runResetLearnings } = await import('../src/commands/reset-learnings.js');
      await runResetLearnings(options);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

// guild run
program
  .command('run')
  .description('Display the execution plan for a skill')
  .argument('<skill>', 'Skill name to run')
  .argument('[input]', 'Input text for the skill', '')
  .option('--profile <profile>', 'Model profile (max, balanced, fast)', 'max')
  .action(async (skill, input, options) => {
    try {
      const { runRun } = await import('../src/commands/run.js');
      await runRun(skill, input, options);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

// guild logs (list traces)
const logsCmd = program
  .command('logs')
  .description('View and manage execution traces')
  .action(async (options) => {
    try {
      const { runLogs } = await import('../src/commands/logs.js');
      await runLogs('list', options);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

// guild logs clean
logsCmd
  .command('clean')
  .description('Remove old execution traces')
  .option('--days <days>', 'Remove traces older than N days', '30')
  .option('--all', 'Remove all traces')
  .action(async (options) => {
    try {
      const { runLogs } = await import('../src/commands/logs.js');
      await runLogs('clean', options);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

program.parse();
