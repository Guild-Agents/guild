/**
 * eval.js — Run skill structural evaluations.
 *
 * Usage:
 *   guild eval                — Run all skills that have evals
 *   guild eval build-feature  — Run evals for a specific skill
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEvals, runEvals } from '../utils/eval-runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'templates', 'skills');

/**
 * Runs skill evaluations.
 * @param {string} [skillName] - Specific skill to evaluate, or all if omitted
 */
export async function runEval(skillName) {
  const skills = skillName
    ? [skillName]
    : readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(name => loadEvals(name) !== null);

  p.intro(chalk.bold.cyan(`Guild Eval — ${skillName || 'all skills'}`));

  let totalPassed = 0;
  let totalFailed = 0;

  for (const skill of skills) {
    try {
      const results = runEvals(skill);
      for (const evalResult of results.results) {
        if (evalResult.passed) {
          p.log.success(`${chalk.gray(skill)} ${evalResult.description}`);
          totalPassed++;
        } else {
          p.log.error(`${chalk.gray(skill)} ${evalResult.description}`);
          for (const exp of evalResult.expectations.filter(e => !e.passed)) {
            p.log.info(chalk.red(`  ↳ ${exp.text}: ${exp.evidence}`));
          }
          totalFailed++;
        }
      }
    } catch (err) {
      p.log.error(`${skill}: ${err.message}`);
      totalFailed++;
    }
  }

  const summary = `${totalPassed + totalFailed} evals: ${chalk.green(`${totalPassed} passed`)}${totalFailed > 0 ? `, ${chalk.red(`${totalFailed} failed`)}` : ''}`;
  p.outro(summary);

  if (totalFailed > 0) process.exit(1);
}
