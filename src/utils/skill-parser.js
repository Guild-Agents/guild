/**
 * skill-parser.js — Parses SKILL.md frontmatter for the eval system.
 *
 * Extracted from workflow-parser.js. Contains only the parsing functions
 * needed by eval-runner.js and trigger-runner.js.
 */

import YAML from 'yaml';

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
 * @param {string} yamlString - Raw YAML frontmatter
 * @returns {object} Parsed frontmatter object
 */
export function parseYamlFrontmatter(yamlString) {
  return YAML.parse(yamlString) || {};
}

function normalizeStep(raw) {
  return {
    id: raw.id,
    role: raw.role,
    intent: raw.intent,
    requires: raw.requires || [],
    produces: raw.produces || [],
    modelTier: raw['model-tier'] || undefined,
    gate: raw.gate || false,
  };
}

/**
 * Parses a SKILL.md file and extracts the skill definition.
 * @param {string} content - Raw content of SKILL.md
 * @returns {{ name: string, description: string, userInvocable: boolean, workflow: object|null, body: string }}
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
