/**
 * run.js — Executes a skill workflow (or displays the plan in dry-run mode)
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { ensureProjectRoot } from '../utils/files.js';
import { orchestrate, finalizeWorkflowTrace } from '../utils/orchestrator-io.js';
import { execute } from '../utils/executor.js';
import { createClaudeCodeProvider } from '../utils/providers/claude-code.js';

/**
 * Displays the execution plan without running it.
 * @param {object} plan
 * @param {object} dispatchInfoMap
 */
function displayPlan(plan, dispatchInfoMap) {
  for (let i = 0; i < plan.groups.length; i++) {
    const group = plan.groups[i];
    const label = group.parallel ? `Group ${i + 1} (parallel)` : `Group ${i + 1}`;
    p.log.step(chalk.bold(label));

    for (const step of group.steps) {
      const dispatch = dispatchInfoMap[step.id] || {};
      const roleLabel = step.role === 'system' ? chalk.yellow('system') : chalk.blue(step.role);
      const modelLabel = dispatch.model ? chalk.gray(` → ${dispatch.model}`) : '';
      const gateLabel = step.gate ? chalk.red(' GATE') : '';

      p.log.info(`  ${chalk.white.bold(step.id)} ${roleLabel}${modelLabel}${gateLabel}`);
      p.log.info(chalk.gray(`    ${step.intent}`));

      if (step.requires && step.requires.length > 0) {
        p.log.info(chalk.gray(`    requires: ${step.requires.join(', ')}`));
      }
      if (step.produces && step.produces.length > 0) {
        p.log.info(chalk.gray(`    produces: ${step.produces.join(', ')}`));
      }
      if (step.condition) {
        p.log.info(chalk.gray(`    condition: ${step.condition}`));
      }
      if (step.commands && step.commands.length > 0) {
        p.log.info(chalk.gray(`    commands: ${step.commands.join(', ')}`));
      }
    }
  }
}

/**
 * Runs the `guild run <skill>` command.
 *
 * @param {string} skillName - Name of the skill to run
 * @param {string} [input=''] - Optional input text for the skill
 * @param {object} [options={}] - Options
 * @param {string} [options.profile='max'] - Model profile
 * @param {boolean} [options.dryRun=false] - Show plan without executing
 */
export async function runRun(skillName, input = '', options = {}) {
  const root = ensureProjectRoot();
  const { profile = 'max', dryRun = false } = options;

  p.intro(chalk.bold.cyan(' Guild — Run: ' + skillName + ' '));

  const { plan, trace, dispatchInfoMap } = await orchestrate(skillName, input, {
    profile,
    projectRoot: root,
  });

  p.log.info(chalk.gray(`Profile: ${profile} | Steps: ${plan.totalSteps}`));

  if (dryRun) {
    displayPlan(plan, dispatchInfoMap);
    p.outro(chalk.gray('Plan generated (dry-run). No steps were executed.'));
    return;
  }

  // Real execution
  const provider = createClaudeCodeProvider({ projectRoot: root });

  const finalPlan = await execute(plan, dispatchInfoMap, {
    provider,
    skillBody: input,
    trace,
    projectRoot: root,

    onStepStart(step, dispatch) {
      const roleLabel = step.role === 'system' ? chalk.yellow('system') : chalk.blue(step.role);
      const modelLabel = dispatch.model ? chalk.gray(` (${dispatch.model})`) : '';
      p.log.step(`${chalk.bold(step.id)} ${roleLabel}${modelLabel}`);
    },

    onStepEnd(step, result) {
      const icon = result.status === 'passed' ? chalk.green('✓') : chalk.red('✗');
      p.log.info(`  ${icon} ${result.status}`);
    },
  });

  // Finalize trace
  const { executionSummary } = finalizeWorkflowTrace(trace, finalPlan);

  const statusLabel = finalPlan.status === 'completed'
    ? chalk.green('completed')
    : chalk.red(finalPlan.status);

  p.outro(`${statusLabel} | ${executionSummary}`);
}
