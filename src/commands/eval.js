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
import { loadTriggers, runTriggerTests, computeAccuracy, loadAllSkillDescriptions } from '../utils/trigger-runner.js';

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

/**
 * Runs trigger evaluations.
 * @param {string} [skillName] - Specific skill or all
 */
export async function runEvalTriggers(skillName) {
  const allSkills = loadAllSkillDescriptions();

  const skills = skillName
    ? [skillName]
    : readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(name => loadTriggers(name) !== null);

  p.intro(chalk.bold.cyan(`Guild Trigger Tests — ${skillName || 'all skills'}`));

  let totalSkills = 0;
  let totalTests = 0;
  let totalCorrect = 0;

  for (const skill of skills) {
    const triggers = loadTriggers(skill);
    if (!triggers) {
      p.log.warn(`${skill}: no triggers.json`);
      continue;
    }

    const results = await runTriggerTests(triggers, allSkills);
    const acc = computeAccuracy(results);
    totalSkills++;
    totalTests += acc.total;
    totalCorrect += acc.tp + acc.tn;

    const icon = acc.accuracy === 1 ? chalk.green('✓') : acc.accuracy >= 0.75 ? chalk.yellow('~') : chalk.red('✗');
    p.log.info(`${icon} ${chalk.bold(skill)}  accuracy=${(acc.accuracy * 100).toFixed(0)}%  precision=${(acc.precision * 100).toFixed(0)}%  recall=${(acc.recall * 100).toFixed(0)}%`);

    // Show failures
    for (const r of results) {
      if (r.expected !== r.actual) {
        const label = r.expected ? chalk.red('MISS') : chalk.yellow('FALSE+');
        p.log.info(chalk.gray(`    ${label} "${r.prompt}" (score=${r.score.toFixed(2)}, rank=#${r.rank})`));
      }
    }
  }

  const overallAcc = totalTests > 0 ? ((totalCorrect / totalTests) * 100).toFixed(0) : 0;
  p.outro(`${totalSkills} skills, ${totalTests} tests, ${overallAcc}% overall accuracy`);
}
