/**
 * skill-loader.js — Loads and validates Guild skills from disk.
 *
 * Reads SKILL.md files from .claude/skills/ directories, parses them
 * using the workflow parser, and returns structured skill objects ready
 * for consumption by the dispatcher or doctor checks.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseSkill, validateWorkflow } from './workflow-parser.js';

/**
 * Loads a skill by name from the skills directory.
 * Resolves the SKILL.md file, parses it, and validates the workflow if present.
 *
 * @param {string} skillName - Name of the skill (directory name)
 * @param {string} [basePath='.claude/skills'] - Base path for skills
 * @returns {{ name: string, description: string, userInvocable: boolean, workflow: object|null, body: string, errors: string[] }}
 * @throws {Error} If skill directory or SKILL.md not found
 */
export function loadSkill(skillName, basePath = join('.claude', 'skills')) {
  const skillPath = join(basePath, skillName, 'SKILL.md');

  if (!existsSync(skillPath)) {
    throw new Error(`Skill not found: ${skillPath}`);
  }

  const content = readFileSync(skillPath, 'utf8');
  const skill = parseSkill(content);

  const errors = [];
  if (skill.workflow) {
    const validationErrors = validateWorkflow(skill.workflow);
    errors.push(...validationErrors);
  }

  return { ...skill, errors };
}

/**
 * Loads all skills from the skills directory.
 * Skills with invalid workflows are included with their errors populated.
 * Missing SKILL.md files are logged as warnings but not included.
 *
 * @param {string} [basePath='.claude/skills'] - Base path for skills
 * @returns {Map<string, { name: string, description: string, userInvocable: boolean, workflow: object|null, body: string, errors: string[] }>}
 */
export function loadAllSkills(basePath = join('.claude', 'skills')) {
  const skills = new Map();

  if (!existsSync(basePath)) {
    return skills;
  }

  const dirs = readdirSync(basePath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const dir of dirs) {
    const skillPath = join(basePath, dir, 'SKILL.md');
    if (!existsSync(skillPath)) {
      continue;
    }

    try {
      const skill = loadSkill(dir, basePath);
      skills.set(dir, skill);
    } catch (_err) {
      // Skip skills that fail to load entirely (malformed YAML, etc.)
      skills.set(dir, {
        name: dir,
        description: '',
        userInvocable: false,
        workflow: null,
        body: '',
        errors: [`Failed to load: ${_err.message}`],
      });
    }
  }

  return skills;
}
