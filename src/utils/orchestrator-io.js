/**
 * orchestrator-io.js — I/O layer for the Guild runtime orchestrator.
 *
 * Handles file I/O, skill loading, dispatch resolution, learnings injection,
 * and trace management. Depends on the pure orchestrator.js for plan logic.
 *
 * Re-exports all public functions from orchestrator.js for a single import point.
 */

import { join } from 'path';
import { loadSkill } from './skill-loader.js';
import { resolveAgentMetadata, resolveEffectiveTier, resolveModel } from './dispatch.js';
import { createTrace, recordStep, finalizeTrace } from './trace.js';
import { buildContextInjection } from './learnings.js';
import { readLearnings } from './learnings-io.js';
import {
  createExecutionPlan,
  advanceStep,
  getNextSteps,
  isPlanComplete,
  parseCondition,
  evaluateCondition,
  shouldRetry,
  resolveFailureTarget,
  expandDelegation,
} from './orchestrator.js';

// Re-export all public functions from orchestrator.js
export {
  createExecutionPlan,
  advanceStep,
  getNextSteps,
  isPlanComplete,
  parseCondition,
  evaluateCondition,
  shouldRetry,
  resolveFailureTarget,
  expandDelegation,
};

// Also re-export constants
export { DEFAULT_CIRCUIT_BREAKER_LIMIT, MAX_DELEGATION_DEPTH } from './orchestrator.js';

/**
 * @typedef {Object} StepDispatchInfo
 * @property {'system'|'agent'} role - Whether this is a system or agent step
 * @property {string|null} tier - Resolved model tier (null for system steps)
 * @property {string|null} model - Resolved concrete model ID (null for system steps)
 * @property {boolean} fallback - Whether a fallback model was used
 * @property {object|null} agentMetadata - Agent frontmatter metadata (null for system steps)
 */

/**
 * Resolves dispatch information for a workflow step.
 * System role steps return minimal dispatch info (no model).
 * Agent steps resolve tier and model using the dispatch utilities.
 *
 * @param {object} step - Workflow step definition
 * @param {object} [options={}] - Options
 * @param {string} [options.profile='max'] - Model profile name
 * @param {string} [options.projectRoot=process.cwd()] - Project root for agent lookup
 * @returns {StepDispatchInfo}
 */
export function resolveStepDispatch(step, options = {}) {
  const { profile = 'max', projectRoot = process.cwd() } = options;

  if (step.role === 'system') {
    return {
      role: 'system',
      tier: null,
      model: null,
      fallback: false,
      agentMetadata: null,
    };
  }

  const agentMetadata = resolveAgentMetadata(step.role, projectRoot);

  // Build a step config object compatible with resolveEffectiveTier
  const stepConfig = {
    role: step.role,
    'model-tier': step.modelTier,
  };

  const tier = resolveEffectiveTier(stepConfig, agentMetadata);

  // W4: resolveModel already handles the fallback chain internally;
  // a single try-catch is sufficient here.
  let model;
  let fallback;

  try {
    model = resolveModel(tier, profile);
    fallback = false;
  } catch {
    model = null;
    fallback = false;
  }

  return {
    role: 'agent',
    tier,
    model,
    fallback,
    agentMetadata,
  };
}

/**
 * Loads and validates a skill workflow from disk.
 *
 * @param {string} skillName - Name of the skill directory
 * @param {object} [options={}] - Options
 * @param {string} [options.basePath] - Override base path for skills directory
 * @returns {{ workflow: object, body: string, name: string }}
 * @throws {Error} If skill not found, has no workflow, or has validation errors
 */
export function loadWorkflow(skillName, options = {}) {
  const skill = options.basePath
    ? loadSkill(skillName, options.basePath)
    : loadSkill(skillName);

  if (!skill.workflow) {
    throw new Error(
      `Skill "${skillName}" has no workflow definition. Only skills with a workflow block can be orchestrated.`
    );
  }

  if (skill.errors && skill.errors.length > 0) {
    throw new Error(
      `Skill "${skillName}" has workflow validation errors:\n${skill.errors.join('\n')}`
    );
  }

  return {
    workflow: skill.workflow,
    body: skill.body,
    name: skill.name || skillName,
  };
}

/**
 * Builds the context string for a step's execution.
 * Combines step intent, learnings injection, skill body, and required step outcomes.
 *
 * @param {object} step - Workflow step definition
 * @param {import('./orchestrator.js').ExecutionPlan} plan - Current execution plan
 * @param {object} [options={}] - Options
 * @param {string} [options.learningsPath] - Override path for learnings file
 * @param {string} [options.skillBody=''] - Skill body (markdown prose)
 * @returns {string} Context string for the step
 */
export function buildStepContext(step, plan, options = {}) {
  const { skillBody = '' } = options;
  const parts = [];

  // Step intent
  parts.push(`## Task: ${step.intent}`);
  parts.push('');

  // Learnings injection (graceful degradation if reading fails)
  try {
    const learningsContent = readLearnings(options.learningsPath || undefined);
    if (learningsContent) {
      const injection = buildContextInjection(learningsContent);
      if (injection) {
        parts.push(injection);
        parts.push('');
      }
    }
  } catch {
    // Learnings reading failed — continue without them
  }

  // Skill body (prose instructions)
  if (skillBody && skillBody.trim()) {
    parts.push('## Skill Instructions');
    parts.push('');
    parts.push(skillBody.trim());
    parts.push('');
  }

  // Outcomes from required steps
  if (step.requires && step.requires.length > 0) {
    const requiredOutcomes = [];
    for (const requirement of step.requires) {
      // Find which step produces this requirement
      for (const group of plan.groups) {
        for (const s of group.steps) {
          const state = plan.stepStates[s.id];
          if (state && state.outcome && s.produces && s.produces.includes(requirement)) {
            if (state.outcome[requirement] !== undefined) {
              requiredOutcomes.push({ field: requirement, value: state.outcome[requirement], fromStep: s.id });
            }
          }
        }
      }
    }

    if (requiredOutcomes.length > 0) {
      parts.push('## Inputs from previous steps');
      parts.push('');
      for (const item of requiredOutcomes) {
        parts.push(`### ${item.field} (from step: ${item.fromStep})`);
        parts.push('');
        parts.push(String(item.value));
        parts.push('');
      }
    }
  }

  return parts.join('\n').trimEnd();
}

/**
 * Records a step execution in the trace context.
 *
 * @param {import('./trace.js').TraceContext} traceCtx - Active trace context
 * @param {object} step - Step definition
 * @param {import('./orchestrator.js').StepState} stepState - Final state of the step
 * @param {StepDispatchInfo} dispatchInfo - Resolved dispatch information
 * @returns {import('./trace.js').TraceContext} Updated trace context (same reference)
 */
export function recordStepTrace(traceCtx, step, stepState, dispatchInfo) {
  const started = new Date().toISOString();

  return recordStep(traceCtx, {
    role: step.role,
    intent: step.intent,
    tier: dispatchInfo.tier || 'system',
    model: dispatchInfo.model || 'none',
    fallback: dispatchInfo.fallback,
    started,
    // TODO(v2): capture actual wall-clock duration and token usage from step executor
    duration: 0,
    tokens: 0,
    result: stepState.status === 'passed' ? 'pass' : stepState.status === 'skipped' ? 'skip' : 'fail',
  });
}

/**
 * Finalizes a workflow trace and produces an execution summary.
 *
 * testsPass and lintPass are derived from gate steps whose intent contains
 * the keywords "test" or "lint" respectively. They can be overridden via
 * options when the caller has better information.
 *
 * @param {import('./trace.js').TraceContext} traceCtx - Completed trace context
 * @param {import('./orchestrator.js').ExecutionPlan} plan - Final execution plan
 * @param {object} [options={}] - Optional overrides
 * @param {boolean} [options.testsPass] - Override for testsPass (derived from gate steps if omitted)
 * @param {boolean} [options.lintPass] - Override for lintPass (derived from gate steps if omitted)
 * @returns {{ trace: object, executionSummary: string }}
 */
export function finalizeWorkflowTrace(traceCtx, plan, options = {}) {
  const allStates = Object.values(plan.stepStates);
  const anyFailed = allStates.some(s => s.status === 'failed');

  // Derive testsPass / lintPass from gate steps when not explicitly provided
  let testsPass = options.testsPass;
  let lintPass = options.lintPass;

  if (testsPass === undefined || lintPass === undefined) {
    for (const group of plan.groups) {
      for (const step of group.steps) {
        if (!step.gate) continue;
        const state = plan.stepStates[step.id];
        const passed = state && state.status === 'passed';
        const intent = (step.intent || '').toLowerCase();
        if (testsPass === undefined && intent.includes('test')) {
          testsPass = passed;
        }
        if (lintPass === undefined && intent.includes('lint')) {
          lintPass = passed;
        }
      }
    }
    // Fall back to true when no matching gate step found (v1 behaviour)
    if (testsPass === undefined) testsPass = true;
    if (lintPass === undefined) lintPass = true;
  }

  const summary = {
    result: anyFailed || plan.status === 'aborted' || plan.status === 'circuit-breaker' ? 'fail' : 'pass',
    testsPass,
    lintPass,
  };

  const trace = finalizeTrace(traceCtx, summary);

  return {
    trace,
    executionSummary: trace.executionSummary,
  };
}

/**
 * Main entry point for the orchestrator.
 * Loads the workflow, creates an execution plan, resolves dispatch for all steps,
 * and creates a trace context. In v1, this produces the plan only (no step execution).
 *
 * @param {string} skillName - Name of the skill to orchestrate
 * @param {string} [input=''] - User input / feature description
 * @param {object} [options={}] - Options
 * @param {string} [options.profile='max'] - Model profile
 * @param {string} [options.projectRoot=process.cwd()] - Project root
 * @param {string} [options.basePath] - Override skills base path
 * @param {string} [options.tracesDir] - Override traces directory
 * @param {string} [options.traceLevel='default'] - Trace level
 * @param {number} [options.circuitBreakerLimit] - Override circuit breaker limit
 * @returns {Promise<{
 *   plan: import('./orchestrator.js').ExecutionPlan,
 *   trace: import('./trace.js').TraceContext,
 *   dispatchInfoMap: Object.<string, StepDispatchInfo>,
 *   input: string
 * }>}
 */
export async function orchestrate(skillName, input = '', options = {}) {
  const {
    profile = 'max',
    projectRoot = process.cwd(),
    tracesDir,
    traceLevel = 'default',
    circuitBreakerLimit,
  } = options;

  // Load workflow
  const loadOpts = {};
  if (options.basePath) {
    loadOpts.basePath = options.basePath;
  }

  const { workflow, name } = loadWorkflow(skillName, loadOpts);

  // Create execution plan
  const planOptions = { skillName: name || skillName };
  if (circuitBreakerLimit !== undefined) {
    planOptions.circuitBreakerLimit = circuitBreakerLimit;
  }
  const plan = createExecutionPlan(workflow, planOptions);

  // Resolve dispatch info for all steps (for plan introspection/display)
  const dispatchInfoMap = {};
  for (const group of plan.groups) {
    for (const step of group.steps) {
      dispatchInfoMap[step.id] = resolveStepDispatch(step, { profile, projectRoot });
    }
  }

  // W8: return dispatchInfoMap and input as separate result fields instead of
  // mutating traceCtx, keeping the trace context pure.
  const traceDirResolved = tracesDir || join(projectRoot, '.claude', 'guild', 'traces');
  const traceCtx = createTrace(skillName, traceLevel, traceDirResolved);

  return { plan, trace: traceCtx, dispatchInfoMap, input };
}
