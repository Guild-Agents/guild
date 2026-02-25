/**
 * dispatch.js — Validation and resolution utilities for the Guild dispatch protocol.
 *
 * Provides functions to validate workflow step configurations, resolve agent
 * metadata from frontmatter, determine effective model tiers, and resolve
 * tiers to concrete model IDs.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseFrontmatter } from './files.js';
import { parseSkill } from './workflow-parser.js';
import {
  MODEL_TIERS,
  FAILURE_STRATEGIES,
  DEFAULT_AGENT_TIERS,
  DEFAULT_MODEL_PROFILES,
  FALLBACK_CHAIN,
} from './dispatch-protocol.js';

/**
 * Validates a workflow step configuration object.
 * @param {object} config - Step config with role, intent, model-tier, etc.
 * @returns {string[]} Array of error messages (empty means valid)
 */
export function validateStepConfig(config) {
  const errors = [];

  if (!config.role) {
    errors.push('Missing required field: role');
  }

  if (!config.intent) {
    errors.push('Missing required field: intent');
  }

  if (config['model-tier'] && !MODEL_TIERS.includes(config['model-tier'])) {
    errors.push(`Invalid model-tier: "${config['model-tier']}". Must be one of: ${MODEL_TIERS.join(', ')}`);
  }

  if (config['on-failure']) {
    const isGoto = config['on-failure'].startsWith('goto:');
    if (!FAILURE_STRATEGIES.includes(config['on-failure']) && !isGoto) {
      errors.push(`Invalid on-failure: "${config['on-failure']}". Must be one of: ${FAILURE_STRATEGIES.join(', ')}, or goto:<step-id>`);
    }
  }

  if (config['max-retries'] !== undefined) {
    const val = config['max-retries'];
    if (!Number.isInteger(val) || val < 1) {
      errors.push(`Invalid max-retries: ${val}. Must be a positive integer`);
    }
  }

  return errors;
}

/**
 * Reads agent metadata from the agent's markdown frontmatter.
 * @param {string} role - Agent role name (e.g., 'tech-lead')
 * @param {string} [projectRoot=process.cwd()] - Project root directory
 * @returns {{ name: string, role: string, defaultTier: string|undefined, [key: string]: unknown } | null}
 */
export function resolveAgentMetadata(role, projectRoot = process.cwd()) {
  const agentPath = join(projectRoot, '.claude', 'agents', `${role}.md`);

  if (!existsSync(agentPath)) {
    return null;
  }

  const content = readFileSync(agentPath, 'utf8');
  const frontmatter = parseFrontmatter(content);

  return {
    ...frontmatter,
    role,
    defaultTier: frontmatter['default-tier'] || undefined,
  };
}

/**
 * Resolves the effective model tier for a workflow step using the precedence chain:
 * 1. stepConfig['model-tier'] (explicit in workflow step)
 * 2. agentMetadata.defaultTier (from agent frontmatter)
 * 3. DEFAULT_AGENT_TIERS[role] (hardcoded defaults)
 * 4. 'execution' (ultimate fallback)
 *
 * @param {object} stepConfig - Workflow step with role and optional model-tier
 * @param {object|null} [agentMetadata=null] - Agent metadata from resolveAgentMetadata
 * @returns {string} One of MODEL_TIERS values
 */
export function resolveEffectiveTier(stepConfig, agentMetadata = null) {
  if (stepConfig['model-tier'] && MODEL_TIERS.includes(stepConfig['model-tier'])) {
    return stepConfig['model-tier'];
  }

  if (agentMetadata?.defaultTier && MODEL_TIERS.includes(agentMetadata.defaultTier)) {
    return agentMetadata.defaultTier;
  }

  const defaultTier = DEFAULT_AGENT_TIERS[stepConfig.role];
  if (defaultTier) {
    return defaultTier;
  }

  return 'execution';
}

/**
 * Resolves a model tier to a concrete model ID using a profile.
 * Applies the fallback chain if the tier is not found in the profile.
 *
 * @param {string} tier - One of MODEL_TIERS
 * @param {string|Record<string, string>} profile - Profile name ('max', 'pro') or custom mapping
 * @returns {string} Concrete model ID (e.g., 'claude-opus-4-6')
 * @throws {Error} If no model can be resolved after exhausting the fallback chain
 */
export function resolveModel(tier, profile) {
  const profileMap = typeof profile === 'string'
    ? DEFAULT_MODEL_PROFILES[profile]
    : profile;

  if (!profileMap) {
    throw new Error(`Unknown profile: "${profile}". Available: ${Object.keys(DEFAULT_MODEL_PROFILES).join(', ')}`);
  }

  let currentTier = tier;
  const visited = new Set();

  while (currentTier) {
    if (visited.has(currentTier)) {
      break;
    }
    visited.add(currentTier);

    if (profileMap[currentTier]) {
      return profileMap[currentTier];
    }

    currentTier = FALLBACK_CHAIN[currentTier];
  }

  throw new Error(`Cannot resolve model for tier "${tier}": no model available in profile after fallback chain`);
}

/**
 * Extracts dispatch configuration from skill markdown content.
 * Precedence: workflow steps (frontmatter) > null (legacy prose).
 *
 * Dependency direction: dispatch.js imports from workflow-parser.js.
 * Do not reverse this — workflow-parser.js must not import from dispatch.js.
 *
 * @param {string} skillMarkdown - Raw SKILL.md content
 * @returns {{ source: 'workflow', steps: Array<object> } | { source: null }}
 * @throws {Error} If YAML frontmatter is malformed (propagated from parseSkill)
 */
export function extractDispatchConfigs(skillMarkdown) {
  if (!skillMarkdown) {
    return { source: null };
  }

  const skill = parseSkill(skillMarkdown);

  if (skill.workflow && Array.isArray(skill.workflow.steps) && skill.workflow.steps.length > 0) {
    return {
      source: 'workflow',
      steps: skill.workflow.steps,
    };
  }

  return { source: null };
}
