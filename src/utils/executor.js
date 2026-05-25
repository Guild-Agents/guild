/**
 * executor.js — Execution loop for Guild workflow plans.
 *
 * Drives a plan to completion by iterating through steps, dispatching
 * agent steps to a provider function and system steps to local commands.
 * Supports parallel execution (v1.2) and delegation to sub-skills.
 */

import { execFile } from 'child_process';
import {
  advanceStep,
  getNextSteps,
  isPlanComplete,
  MAX_DELEGATION_DEPTH,
  createExecutionPlan,
} from './orchestrator.js';
import {
  buildStepContext,
  recordStepTrace,
  loadWorkflow,
  resolveStepDispatch,
} from './orchestrator-io.js';

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
    return { status: 'passed', output: `System step with delegation — handled by executeDelegation` };
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
 * Dispatches a single step (agent or system) and returns its result.
 *
 * @param {object} step - Step definition
 * @param {object} dispatch - Dispatch info for this step
 * @param {object} context - Execution context
 * @param {import('./orchestrator.js').ExecutionPlan} context.currentPlan - Current plan state
 * @param {Function} context.provider - Agent step provider
 * @param {string} context.projectRoot - Working directory
 * @param {string} context.skillBody - Skill body text
 * @param {object} context.executeOptions - Full options passed to execute()
 * @returns {Promise<{ status: string, output: string, outcome?: object, error?: string }>}
 */
async function dispatchStep(step, dispatch, context) {
  const { currentPlan, provider, projectRoot, skillBody, executeOptions } = context;

  if (step.role === 'system' && step.delegatesTo) {
    return executeDelegation(step, executeOptions);
  }

  if (step.role === 'system') {
    return executeSystemStep(step, { projectRoot });
  }

  const stepContext = buildStepContext(step, currentPlan, { skillBody });
  return provider(step, dispatch, stepContext);
}

/**
 * Executes a delegation step by loading and running the sub-skill.
 *
 * @param {object} step - Delegation step (with delegatesTo field)
 * @param {object} options - Execute options from parent
 * @returns {Promise<{ status: string, output: string, error?: string }>}
 */
async function executeDelegation(step, options) {
  const {
    provider,
    trace,
    projectRoot,
    profile = 'max',
    onStepStart,
    onStepEnd,
    delegationDepth = 0,
  } = options;

  if (delegationDepth >= MAX_DELEGATION_DEPTH) {
    return {
      status: 'failed',
      output: '',
      error: `Delegation depth limit (${MAX_DELEGATION_DEPTH}) exceeded at step "${step.id}" delegating to "${step.delegatesTo}"`,
    };
  }

  let subSkill;
  try {
    subSkill = loadWorkflow(step.delegatesTo);
  } catch (err) {
    return {
      status: 'failed',
      output: '',
      error: `Failed to load delegated skill "${step.delegatesTo}": ${err.message}`,
    };
  }

  const subPlan = createExecutionPlan(subSkill.workflow, {
    skillName: subSkill.name || step.delegatesTo,
  });

  const subDispatchMap = {};
  for (const group of subPlan.groups) {
    for (const s of group.steps) {
      subDispatchMap[s.id] = resolveStepDispatch(s, { profile, projectRoot });
    }
  }

  const finalSubPlan = await execute(subPlan, subDispatchMap, {
    provider,
    trace,
    projectRoot,
    skillBody: subSkill.body || '',
    onStepStart,
    onStepEnd,
    delegationDepth: delegationDepth + 1,
    profile,
  });

  if (finalSubPlan.status === 'completed') {
    return { status: 'passed', output: `Delegation to "${step.delegatesTo}" completed` };
  }

  return {
    status: 'failed',
    output: '',
    error: `Delegated skill "${step.delegatesTo}" ended with status: ${finalSubPlan.status}`,
  };
}

/**
 * Executes a workflow plan to completion.
 *
 * Drives the orchestrator state machine by repeatedly calling getNextSteps,
 * dispatching each step (agent via provider, system via local commands),
 * and advancing the plan with the result. Parallel groups are dispatched
 * concurrently via Promise.all.
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
 * @param {number} [options.delegationDepth=0] - Current delegation nesting depth
 * @param {string} [options.profile='max'] - Model profile for delegation dispatch
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

    if (steps.length === 0) {
      if (isPlanComplete(currentPlan)) break;
      if (++emptyIterations > MAX_EMPTY_ITERATIONS) {
        currentPlan = { ...currentPlan, status: 'aborted' };
        break;
      }
      continue;
    }
    emptyIterations = 0;

    const dispatchContext = {
      currentPlan,
      provider,
      projectRoot,
      skillBody,
      executeOptions: options,
    };

    const settled = await Promise.all(
      steps.map(async (step) => {
        const dispatch = dispatchInfoMap[step.id] || {};
        onStepStart?.(step, dispatch);
        const result = await dispatchStep(step, dispatch, dispatchContext);
        return { step, dispatch, result };
      })
    );

    for (const { step, dispatch, result } of settled) {
      currentPlan = advanceStep(currentPlan, step.id, result);

      if (trace) {
        recordStepTrace(trace, step, currentPlan.stepStates[step.id], dispatch);
      }

      onStepEnd?.(step, result);
    }
  }

  if (currentPlan.status === 'running' && isPlanComplete(currentPlan)) {
    currentPlan = { ...currentPlan, status: 'completed' };
  }

  return currentPlan;
}
