/**
 * workflow-parser.js — Parser and validator for Guild declarative workflows.
 *
 * Parses SKILL.md files with nested YAML frontmatter (workflow definitions)
 * using a full YAML parser. Validates workflow structure against the schema.
 * Backward compatible: skills without a `workflow` key return workflow: null.
 */

import YAML from 'yaml';
import { MODEL_TIERS } from './dispatch-protocol.js';

/**
 * Extracts the raw YAML frontmatter string and body from markdown content.
 * @param {string} content - Raw markdown content
 * @returns {{ yaml: string, body: string } | null} Null if no frontmatter found
 */
export function extractFrontmatterBlock(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return {
    yaml: match[1],
    body: content.slice(match[0].length).trim(),
  };
}

/**
 * Parses YAML frontmatter with full nested structure support.
 * Uses the `yaml` npm package for spec-compliant parsing.
 * @param {string} yamlString - Raw YAML frontmatter
 * @returns {object} Parsed frontmatter object
 */
export function parseYamlFrontmatter(yamlString) {
  return YAML.parse(yamlString) || {};
}

/**
 * Normalizes a raw workflow step from YAML into a consistent object shape.
 * Converts kebab-case keys to camelCase where appropriate.
 * @param {object} raw - Raw step object from YAML
 * @returns {object} Normalized step
 */
function normalizeStep(raw) {
  return {
    id: raw.id,
    role: raw.role,
    intent: raw.intent,
    requires: raw.requires || [],
    produces: raw.produces || [],
    modelTier: raw['model-tier'] || undefined,
    blocking: raw.blocking !== undefined ? raw.blocking : true,
    onFailure: raw['on-failure'] || 'abort',
    gate: raw.gate || false,
    retry: raw.retry || undefined,
    condition: raw.condition || undefined,
    parallel: raw.parallel || undefined,
    commands: raw.commands || undefined,
    delegatesTo: raw['delegates-to'] || undefined,
  };
}

/**
 * Parses a SKILL.md file and extracts the workflow definition.
 * If no `workflow` key exists in frontmatter, returns { workflow: null }
 * to indicate the Skill uses prose-based execution (backward compatible).
 *
 * @param {string} content - Raw content of SKILL.md
 * @returns {{ name: string, description: string, userInvocable: boolean, workflow: object|null, body: string }}
 * @throws {Error} If YAML frontmatter is malformed
 */
export function parseSkill(content) {
  const block = extractFrontmatterBlock(content);
  if (!block) {
    return {
      name: '',
      description: '',
      userInvocable: false,
      workflow: null,
      body: content,
    };
  }

  const frontmatter = parseYamlFrontmatter(block.yaml);

  const skill = {
    name: frontmatter.name || '',
    description: frontmatter.description || '',
    userInvocable: frontmatter['user-invocable'] === true,
    workflow: null,
    body: block.body,
  };

  if (frontmatter.workflow) {
    const raw = frontmatter.workflow;
    skill.workflow = {
      version: raw.version,
      steps: Array.isArray(raw.steps)
        ? raw.steps.map(normalizeStep)
        : [],
    };
  }

  return skill;
}

/**
 * Validates a workflow definition against the schema.
 * Returns an array of validation errors (empty if valid).
 *
 * @param {object} workflow - Parsed workflow object with version and steps
 * @returns {string[]} Array of error messages
 */
export function validateWorkflow(workflow) {
  const errors = [];

  if (workflow.version !== 1) {
    errors.push(`Unsupported workflow version: ${workflow.version}. This Guild version supports workflow version 1.`);
  }

  if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
    errors.push('Workflow must have at least one step.');
    return errors;
  }

  const ids = new Set();

  for (const step of workflow.steps) {
    // Required fields
    if (!step.id) {
      errors.push('Step missing required field: id');
      continue;
    }

    if (ids.has(step.id)) {
      errors.push(`Duplicate step id: "${step.id}"`);
    }
    ids.add(step.id);

    if (!step.role) {
      errors.push(`Step "${step.id}" missing required field: role`);
    }

    if (!step.intent) {
      errors.push(`Step "${step.id}" missing required field: intent`);
    }

    // Valid model-tier
    if (step.modelTier && !MODEL_TIERS.includes(step.modelTier)) {
      errors.push(`Step "${step.id}" has invalid model-tier: "${step.modelTier}"`);
    }

    // Valid on-failure
    if (step.onFailure) {
      const validValues = ['abort', 'continue'];
      const isGoto = step.onFailure.startsWith('goto:');
      if (!validValues.includes(step.onFailure) && !isGoto) {
        errors.push(`Step "${step.id}" has invalid on-failure: "${step.onFailure}"`);
      }
    }

    // Retry limits
    if (step.retry) {
      if (step.retry.max !== undefined && step.retry.max > 10) {
        errors.push(`Step "${step.id}" retry.max exceeds limit of 10`);
      }
      if (step.retry.max !== undefined && step.retry.max < 1) {
        errors.push(`Step "${step.id}" retry.max must be at least 1`);
      }
    }

    // System step validation
    if (step.role === 'system') {
      if (!step.commands && !step.delegatesTo && !step.gate) {
        errors.push(`System step "${step.id}" must have commands, delegates-to, or gate`);
      }
    }
  }

  // Validate goto targets exist
  for (const step of workflow.steps) {
    if (step.onFailure && step.onFailure.startsWith('goto:')) {
      const target = step.onFailure.split(':')[1];
      if (!ids.has(target)) {
        errors.push(`Step "${step.id}" on-failure goto target "${target}" does not exist`);
      }
    }
  }

  return errors;
}

/**
 * Resolves the execution order of steps considering conditions,
 * dependencies (requires/produces), and parallel groups.
 * Returns a flat execution plan with groupings.
 *
 * @param {object} workflow - Validated workflow
 * @returns {{ groups: Array<{ steps: object[], parallel: boolean }> }} Ordered execution plan
 */
export function resolveExecutionPlan(workflow) {
  const groups = [];
  let i = 0;
  const steps = workflow.steps;

  while (i < steps.length) {
    const step = steps[i];

    // Check if this step has parallel peers
    if (step.parallel && step.parallel.length > 0) {
      const parallelIds = new Set([step.id, ...step.parallel]);
      const parallelSteps = [];

      // Collect all steps in this parallel group
      while (i < steps.length && parallelIds.has(steps[i].id)) {
        parallelSteps.push(steps[i]);
        i++;
      }

      groups.push({ steps: parallelSteps, parallel: true });
    } else {
      groups.push({ steps: [step], parallel: false });
      i++;
    }
  }

  return { groups };
}
