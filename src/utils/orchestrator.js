/**
 * orchestrator.js — Pure logic for the Guild runtime orchestrator.
 *
 * Contains all state-machine logic for managing workflow execution plans:
 * step state transitions, condition evaluation, retry logic, failure targets,
 * and delegation expansion. Zero I/O — pure functions only.
 */

import { resolveExecutionPlan } from './workflow-parser.js';
import { DEFAULT_FAILURE_STRATEGY } from './dispatch-protocol.js';

/**
 * Maximum total steps that can be executed before the circuit breaker trips.
 * Prevents infinite loops in runaway workflows.
 * @type {number}
 */
export const DEFAULT_CIRCUIT_BREAKER_LIMIT = 50;

/**
 * Maximum depth for delegation expansion (sub-workflow embedding).
 * Prevents infinite delegation chains.
 * @type {number}
 */
export const MAX_DELEGATION_DEPTH = 2;

/**
 * @typedef {Object} StepState
 * @property {'pending'|'running'|'passed'|'failed'|'skipped'} status - Current state
 * @property {number} attempts - Number of execution attempts so far
 * @property {object|null} outcome - Produced values from step execution
 * @property {string|null} error - Error message if step failed
 */

/**
 * @typedef {Object} ExecutionGroup
 * @property {object[]} steps - Steps in this group
 * @property {boolean} parallel - Whether steps run in parallel
 */

/**
 * @typedef {Object} ExecutionPlan
 * @property {string} skillName - Name of the skill being executed
 * @property {object} workflow - Parsed+validated workflow object
 * @property {ExecutionGroup[]} groups - Step groups from resolveExecutionPlan
 * @property {Object.<string, StepState>} stepStates - Keyed by step ID
 * @property {number} currentGroupIndex - Index into groups array
 * @property {number} totalStepsExecuted - Running total for circuit breaker
 * @property {number} circuitBreakerLimit - Max steps before abort
 * @property {'running'|'completed'|'aborted'|'circuit-breaker'} status - Plan status
 * @property {string|null} jumpToStepId - If set, getNextSteps returns only this step
 */

/**
 * @typedef {Object} StepResult
 * @property {'passed'|'failed'|'skipped'} status - Result of step execution
 * @property {object|null} outcome - Produced values (keyed by produces fields)
 * @property {string|null} error - Error message on failure
 */

/**
 * Creates a new execution plan from a parsed+validated workflow.
 *
 * @param {object} workflow - Parsed workflow from parseSkill().workflow
 * @param {object} [options={}] - Options
 * @param {string} [options.skillName=''] - Name of the skill
 * @param {number} [options.circuitBreakerLimit=DEFAULT_CIRCUIT_BREAKER_LIMIT] - Max total steps
 * @returns {ExecutionPlan}
 */
export function createExecutionPlan(workflow, options = {}) {
  const { skillName = '', circuitBreakerLimit = DEFAULT_CIRCUIT_BREAKER_LIMIT } = options;

  const { groups } = resolveExecutionPlan(workflow);

  const stepStates = {};
  for (const group of groups) {
    for (const step of group.steps) {
      stepStates[step.id] = {
        status: 'pending',
        attempts: 0,
        outcome: null,
        error: null,
      };
    }
  }

  return {
    skillName,
    workflow,
    groups,
    stepStates,
    currentGroupIndex: 0,
    totalStepsExecuted: 0,
    circuitBreakerLimit,
    status: 'running',
    jumpToStepId: null,
  };
}

/**
 * Advances the plan with the result of a step execution.
 * IMMUTABLE: returns a new plan object without mutating input.
 *
 * @param {ExecutionPlan} plan - Current plan
 * @param {string} stepId - ID of the step that completed
 * @param {StepResult} result - Execution result
 * @returns {ExecutionPlan} New plan with updated state
 * @throws {Error} If stepId doesn't exist in plan
 * @throws {Error} If circuit breaker limit is exceeded
 */
export function advanceStep(plan, stepId, result) {
  if (!(stepId in plan.stepStates)) {
    throw new Error(`Step "${stepId}" does not exist in plan for skill "${plan.skillName}"`);
  }

  const currentState = plan.stepStates[stepId];
  const newTotalStepsExecuted = plan.totalStepsExecuted + 1;

  // B2: if the step being advanced is the current jump target, clear the jump
  const clearJump = plan.jumpToStepId === stepId;

  if (newTotalStepsExecuted > plan.circuitBreakerLimit) {
    return {
      ...plan,
      totalStepsExecuted: newTotalStepsExecuted,
      status: 'circuit-breaker',
      jumpToStepId: clearJump ? null : plan.jumpToStepId,
      stepStates: {
        ...plan.stepStates,
        [stepId]: {
          ...currentState,
          status: result.status,
          outcome: result.outcome || null,
          error: result.error || null,
        },
      },
    };
  }

  // Find the step definition
  const step = findStepById(plan, stepId);

  // If failed: check retry first, then failure target
  if (result.status === 'failed') {
    if (shouldRetry(step, currentState)) {
      // Retry: increment attempts, reset to pending
      return {
        ...plan,
        totalStepsExecuted: newTotalStepsExecuted,
        jumpToStepId: clearJump ? null : plan.jumpToStepId,
        stepStates: {
          ...plan.stepStates,
          [stepId]: {
            ...currentState,
            status: 'pending',
            attempts: currentState.attempts + 1,
            outcome: null,
            error: null,
          },
        },
      };
    }

    // No retry — apply failure target
    const { action, targetId } = resolveFailureTarget(step, plan);

    const updatedStepState = {
      ...currentState,
      status: 'failed',
      outcome: result.outcome || null,
      error: result.error || null,
    };

    if (action === 'abort') {
      return {
        ...plan,
        totalStepsExecuted: newTotalStepsExecuted,
        status: 'aborted',
        jumpToStepId: clearJump ? null : plan.jumpToStepId,
        stepStates: {
          ...plan.stepStates,
          [stepId]: updatedStepState,
        },
      };
    }

    if (action === 'goto') {
      // B1: recalculate currentGroupIndex with updated step states
      const newStepStates = { ...plan.stepStates, [stepId]: updatedStepState };
      return {
        ...plan,
        totalStepsExecuted: newTotalStepsExecuted,
        currentGroupIndex: calcCurrentGroupIndex(plan.groups, newStepStates, plan.currentGroupIndex),
        jumpToStepId: targetId,
        stepStates: newStepStates,
      };
    }

    // 'continue' — just mark failed and keep running
    const continueStepStates = { ...plan.stepStates, [stepId]: updatedStepState };
    return {
      ...plan,
      totalStepsExecuted: newTotalStepsExecuted,
      currentGroupIndex: calcCurrentGroupIndex(plan.groups, continueStepStates, plan.currentGroupIndex),
      jumpToStepId: clearJump ? null : plan.jumpToStepId,
      stepStates: continueStepStates,
    };
  }

  // Passed or skipped
  const newStepStates = {
    ...plan.stepStates,
    [stepId]: {
      ...currentState,
      status: result.status,
      attempts: currentState.attempts + (result.status !== 'skipped' ? 1 : 0),
      outcome: result.outcome || null,
      error: result.error || null,
    },
  };

  return {
    ...plan,
    totalStepsExecuted: newTotalStepsExecuted,
    currentGroupIndex: calcCurrentGroupIndex(plan.groups, newStepStates, plan.currentGroupIndex),
    jumpToStepId: clearJump ? null : plan.jumpToStepId,
    stepStates: newStepStates,
  };
}

/**
 * Returns the next steps to execute from the plan, plus any steps whose conditions
 * evaluated to false and should be marked as skipped by the caller.
 *
 * The caller is responsible for calling advanceStep(plan, id, { status: 'skipped' })
 * for each ID in the returned `skipped` array so that isPlanComplete can work correctly.
 *
 * @param {ExecutionPlan} plan - Current plan
 * @returns {{ steps: object[], skipped: string[] }}
 *   steps  — step definitions ready to execute (may be empty)
 *   skipped — IDs of steps whose conditions were not met (caller must advance as skipped)
 */
export function getNextSteps(plan) {
  if (plan.status !== 'running') {
    return { steps: [], skipped: [] };
  }

  // Handle jump (goto target from failure)
  if (plan.jumpToStepId) {
    const targetStep = findStepById(plan, plan.jumpToStepId);
    if (!targetStep) {
      return { steps: [], skipped: [] };
    }
    return { steps: [targetStep], skipped: [] };
  }

  // Find current group
  if (plan.currentGroupIndex >= plan.groups.length) {
    return { steps: [], skipped: [] };
  }

  let groupIndex = plan.currentGroupIndex;

  // Scan forward through groups to find one with pending steps
  while (groupIndex < plan.groups.length) {
    const group = plan.groups[groupIndex];
    const { pending, skipped } = getPendingStepsInGroup(group, plan);

    const allDone = group.steps.every(step => {
      const state = plan.stepStates[step.id];
      return isTerminalStatus(state.status);
    });

    if (allDone) {
      groupIndex++;
      continue;
    }

    if (pending.length > 0 || skipped.length > 0) {
      return { steps: pending, skipped };
    }

    // Steps in group are not all done, but no pending/skipped — they are in-flight
    break;
  }

  return { steps: [], skipped: [] };
}

/**
 * Returns true if the plan is complete (all steps terminal, or plan aborted/circuit-breaker).
 *
 * @param {ExecutionPlan} plan - Current plan
 * @returns {boolean}
 */
export function isPlanComplete(plan) {
  if (plan.status === 'completed' || plan.status === 'aborted' || plan.status === 'circuit-breaker') {
    return true;
  }

  // Check if all steps are in terminal state
  for (const state of Object.values(plan.stepStates)) {
    if (!isTerminalStatus(state.status)) {
      return false;
    }
  }

  return true;
}

/**
 * Parses a condition string into a structured object.
 * Supports three formats:
 *   - `step.<id>.<field>` — truthy check
 *   - `step.<id>.<field> == <value>` — equality check
 *   - `step.<id>.<field> != <value>` — inequality check
 *
 * @param {string} conditionString - Raw condition string
 * @returns {{ stepId: string, field: string, operator: string|null, value: string|null } | null}
 */
export function parseCondition(conditionString) {
  if (!conditionString || typeof conditionString !== 'string') {
    return null;
  }

  const re = /^step\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)(?:\s+(==|!=)\s+(.+))?$/;
  const match = conditionString.trim().match(re);

  if (!match) {
    return null;
  }

  return {
    stepId: match[1],
    field: match[2],
    operator: match[3] || null,
    value: match[4] !== undefined ? match[4] : null,
  };
}

/**
 * Evaluates a parsed condition against step states.
 *
 * @param {{ stepId: string, field: string, operator: string|null, value: string|null }} parsed - Parsed condition
 * @param {Object.<string, StepState>} stepStates - Current step states
 * @returns {boolean}
 */
export function evaluateCondition(parsed, stepStates) {
  if (!parsed) return false;

  const state = stepStates[parsed.stepId];
  if (!state || !state.outcome) {
    return false;
  }

  const fieldValue = state.outcome[parsed.field];

  if (parsed.operator === null) {
    // Truthy check
    return !!fieldValue;
  }

  if (parsed.operator === '==') {
    return String(fieldValue) === String(parsed.value);
  }

  if (parsed.operator === '!=') {
    return String(fieldValue) !== String(parsed.value);
  }

  return false;
}

/**
 * Determines whether a failed step should be retried.
 *
 * @param {object} step - Step definition with optional retry config
 * @param {StepState} stepState - Current state of the step
 * @returns {boolean}
 */
export function shouldRetry(step, stepState) {
  if (!step.retry) {
    return false;
  }

  const maxAttempts = step.retry.max;
  if (maxAttempts === undefined || maxAttempts === null) {
    return false;
  }

  return stepState.attempts < maxAttempts;
}

/**
 * Resolves the failure target for a failed step.
 * Parses on-failure config and returns a normalized action.
 *
 * @param {object} step - Step definition with optional onFailure config
 * @param {ExecutionPlan} plan - Current plan (for goto target validation)
 * @returns {{ action: 'abort'|'continue'|'goto', targetId: string|null }}
 * @throws {Error} If goto target doesn't exist in plan
 */
export function resolveFailureTarget(step, plan) {
  const onFailure = step.onFailure || DEFAULT_FAILURE_STRATEGY;

  if (onFailure === 'abort') {
    return { action: 'abort', targetId: null };
  }

  if (onFailure === 'continue') {
    return { action: 'continue', targetId: null };
  }

  if (onFailure.startsWith('goto:')) {
    const targetId = onFailure.slice('goto:'.length);
    if (!(targetId in plan.stepStates)) {
      throw new Error(
        `Step "${step.id}" on-failure goto target "${targetId}" does not exist in plan for skill "${plan.skillName}"`
      );
    }
    return { action: 'goto', targetId };
  }

  // Unrecognized — default to abort
  return { action: 'abort', targetId: null };
}

/**
 * Expands a delegation step by prefixing all sub-step IDs and updating conditions.
 * Used when a step delegates-to a sub-workflow.
 *
 * @param {object} step - Delegation step (with delegatesTo field)
 * @param {object} subWorkflow - Parsed sub-workflow to embed
 * @param {number} currentDepth - Current recursion depth (starts at 0)
 * @param {object} [options={}] - Options
 * @param {number} [options.maxDepth=MAX_DELEGATION_DEPTH] - Max allowed depth
 * @returns {{ prefixedSteps: object[], subGroups: ExecutionGroup[] }}
 * @throws {Error} If currentDepth >= maxDepth
 */
export function expandDelegation(step, subWorkflow, currentDepth, options = {}) {
  const maxDepth = options.maxDepth !== undefined ? options.maxDepth : MAX_DELEGATION_DEPTH;

  if (currentDepth >= maxDepth) {
    throw new Error(
      `Delegation depth limit (${maxDepth}) exceeded when expanding step "${step.id}" delegating to "${step.delegatesTo}"`
    );
  }

  const prefix = `${step.id}.`;

  // Build a map from old ID to new prefixed ID
  const idMap = {};
  for (const subStep of subWorkflow.steps) {
    idMap[subStep.id] = `${prefix}${subStep.id}`;
  }

  // Prefix step IDs and update any internal condition references
  const prefixedSteps = subWorkflow.steps.map(subStep => {
    const prefixedId = idMap[subStep.id];

    let condition = subStep.condition;
    if (condition) {
      // Update step.<id>. references to use prefixed IDs
      condition = condition.replace(
        /\bstep\.([a-zA-Z0-9_-]+)\./g,
        (_match, refId) => {
          const prefixed = idMap[refId];
          return prefixed ? `step.${prefixed}.` : _match;
        }
      );
    }

    let onFailure = subStep.onFailure;
    if (onFailure && onFailure.startsWith('goto:')) {
      const gotoTarget = onFailure.slice('goto:'.length);
      if (idMap[gotoTarget]) {
        onFailure = `goto:${idMap[gotoTarget]}`;
      }
    }

    return {
      ...subStep,
      id: prefixedId,
      condition,
      onFailure,
    };
  });

  const { groups: subGroups } = resolveExecutionPlan({ ...subWorkflow, steps: prefixedSteps });

  return { prefixedSteps, subGroups };
}

// --- Private helpers ---

/**
 * Finds a step definition by ID across all groups in a plan.
 * @param {ExecutionPlan} plan
 * @param {string} stepId
 * @returns {object|null}
 */
function findStepById(plan, stepId) {
  for (const group of plan.groups) {
    for (const step of group.steps) {
      if (step.id === stepId) {
        return step;
      }
    }
  }
  return null;
}

/**
 * Returns true if the status is a terminal state (no further transitions expected).
 * @param {string} status
 * @returns {boolean}
 */
function isTerminalStatus(status) {
  return status === 'passed' || status === 'failed' || status === 'skipped';
}

/**
 * Calculates the new currentGroupIndex after a step state change.
 * Advances past any groups where all steps are already in a terminal state.
 *
 * @param {ExecutionGroup[]} groups - All groups in the plan
 * @param {Object.<string, StepState>} stepStates - Updated step states
 * @param {number} currentGroupIndex - Current group index (never go backwards)
 * @returns {number} Updated group index
 */
function calcCurrentGroupIndex(groups, stepStates, currentGroupIndex) {
  let idx = currentGroupIndex;
  while (idx < groups.length) {
    const group = groups[idx];
    const allDone = group.steps.every(s => {
      const st = stepStates[s.id];
      return st && isTerminalStatus(st.status);
    });
    if (!allDone) break;
    idx++;
  }
  return idx;
}

/**
 * Returns pending steps from a group and IDs of steps whose conditions were not met.
 * Steps with unmet conditions are returned as skipped IDs so the caller can advance
 * them as 'skipped', allowing isPlanComplete to work correctly.
 *
 * @param {ExecutionGroup} group
 * @param {ExecutionPlan} plan
 * @returns {{ pending: object[], skipped: string[] }}
 */
function getPendingStepsInGroup(group, plan) {
  const pending = [];
  const skipped = [];

  for (const step of group.steps) {
    const state = plan.stepStates[step.id];

    if (state.status !== 'pending') {
      continue;
    }

    // Evaluate condition
    if (step.condition) {
      const parsed = parseCondition(step.condition);
      if (parsed) {
        const conditionMet = evaluateCondition(parsed, plan.stepStates);
        if (!conditionMet) {
          // Condition not met — report as skipped so caller can advance it
          skipped.push(step.id);
          continue;
        }
      }
      // If condition is not in step.X.Y format (e.g., a simple flag), treat as truthy (v1)
    }

    pending.push(step);
  }

  return { pending, skipped };
}
