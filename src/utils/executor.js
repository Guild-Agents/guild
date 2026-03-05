/**
 * executor.js — Execution loop for Guild workflow plans.
 *
 * Drives a plan to completion by iterating through steps, dispatching
 * agent steps to a provider function and system steps to local commands.
 * Sequential execution only (v1.1); parallel groups deferred to v1.2.
 */

import { execFile } from 'child_process';
import {
  advanceStep,
  getNextSteps,
  isPlanComplete,
} from './orchestrator.js';
import { buildStepContext, recordStepTrace } from './orchestrator-io.js';

const SYSTEM_STEP_TIMEOUT = 120_000; // 2 minutes

/**
 * Promisified execFile wrapper that always resolves (never rejects).
 *
 * @param {string} cmd - Command to execute
 * @param {string[]} args - Arguments
 * @param {object} opts - execFile options
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number }>}
 */
function execFileAsync(cmd, args, opts) {
  return new Promise((resolve) => {
    execFile(cmd, args, opts, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || (error && error.message) || '',
        exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
      });
    });
  });
}

/**
 * Executes a system step by running its commands or handling delegation.
 *
 * @param {object} step - System step definition
 * @param {object} [options={}] - Options
 * @param {string} [options.projectRoot=process.cwd()] - Working directory for commands
 * @returns {Promise<{ status: string, output: string }>}
 */
async function executeSystemStep(step, options = {}) {
  const { projectRoot = process.cwd() } = options;

  if (step.commands && step.commands.length > 0) {
    const outputs = [];
    for (const cmd of step.commands) {
      // v1.1: simple split — commands with quoted args or shell features
      // are not supported. Use simple commands like "npm test".
      const [bin, ...args] = cmd.split(' ');
      const result = await execFileAsync(bin, args, {
        cwd: projectRoot,
        timeout: SYSTEM_STEP_TIMEOUT,
      });

      if (result.exitCode !== 0) {
        return {
          status: 'failed',
          output: result.stderr || result.stdout || `Command failed: ${cmd}`,
        };
      }
      outputs.push(result.stdout);
    }
    return { status: 'passed', output: outputs.join('\n') };
  }

  if (step.delegatesTo) {
    return { status: 'passed', output: `Delegation to "${step.delegatesTo}" skipped (v1.1)` };
  }

  return { status: 'passed', output: 'System step completed' };
}

/**
 * Finds a step definition by ID across all groups in a plan.
 *
 * @param {object} plan - Execution plan
 * @param {string} stepId - Step ID to find
 * @returns {object|null}
 */
function findStepInPlan(plan, stepId) {
  for (const group of plan.groups) {
    for (const step of group.steps) {
      if (step.id === stepId) return step;
    }
  }
  return null;
}

/**
 * Executes a workflow plan to completion.
 *
 * Drives the orchestrator state machine by repeatedly calling getNextSteps,
 * dispatching each step (agent via provider, system via local commands),
 * and advancing the plan with the result.
 *
 * @param {import('./orchestrator.js').ExecutionPlan} plan - Initial execution plan
 * @param {Object.<string, import('./orchestrator-io.js').StepDispatchInfo>} dispatchInfoMap - Dispatch info per step
 * @param {object} [options={}] - Options
 * @param {Function} options.provider - Agent step provider: (step, dispatch, context) => { status, output, outcome?, error?, tokens? }
 * @param {object} [options.trace] - Trace context for recording step executions
 * @param {string} [options.projectRoot] - Working directory for system commands
 * @param {string} [options.skillBody=''] - Skill body text for context building
 * @param {Function} [options.onStepStart] - Callback before each step: (step, dispatch) => void
 * @param {Function} [options.onStepEnd] - Callback after each step: (step, result) => void
 * @returns {Promise<import('./orchestrator.js').ExecutionPlan>} Final plan state
 */
export async function execute(plan, dispatchInfoMap, options = {}) {
  const {
    provider,
    trace,
    projectRoot,
    skillBody = '',
    onStepStart,
    onStepEnd,
  } = options;

  let currentPlan = plan;
  let emptyIterations = 0;
  const MAX_EMPTY_ITERATIONS = 100;

  while (!isPlanComplete(currentPlan)) {
    const { steps, skipped } = getNextSteps(currentPlan);

    // Advance skipped steps first
    for (const stepId of skipped) {
      currentPlan = advanceStep(currentPlan, stepId, { status: 'skipped' });

      if (trace) {
        const step = findStepInPlan(currentPlan, stepId);
        const dispatch = dispatchInfoMap[stepId] || {};
        if (step) {
          recordStepTrace(trace, step, currentPlan.stepStates[stepId], dispatch);
        }
      }
    }

    // If no executable steps remain, check completion again
    if (steps.length === 0) {
      if (isPlanComplete(currentPlan)) break;
      if (++emptyIterations > MAX_EMPTY_ITERATIONS) {
        currentPlan = { ...currentPlan, status: 'aborted' };
        break;
      }
      continue;
    }
    emptyIterations = 0;

    // v1.1: sequential execution — one step at a time
    const step = steps[0];
    const dispatch = dispatchInfoMap[step.id] || {};

    onStepStart?.(step, dispatch);

    let result;
    if (step.role === 'system') {
      result = await executeSystemStep(step, { projectRoot });
    } else {
      const context = buildStepContext(step, currentPlan, { skillBody });
      result = await provider(step, dispatch, context);
    }

    currentPlan = advanceStep(currentPlan, step.id, result);

    if (trace) {
      recordStepTrace(trace, step, currentPlan.stepStates[step.id], dispatch);
    }

    onStepEnd?.(step, result);
  }

  // Mark plan as completed if all steps reached terminal state and plan is still running
  if (currentPlan.status === 'running' && isPlanComplete(currentPlan)) {
    currentPlan = { ...currentPlan, status: 'completed' };
  }

  return currentPlan;
}
