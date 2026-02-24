/**
 * files.js — File system utilities for Guild v1
 */

import { mkdirSync, copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'templates');
const AGENTS_DIR = join('.claude', 'agents');
const SKILLS_DIR = join('.claude', 'skills');

/**
 * Returns the names of the v1 agents by reading the templates directory.
 * Adding a new .md file to src/templates/agents/ automatically includes it.
 */
export function getAgentNames() {
  const agentsDir = join(TEMPLATES_DIR, 'agents');
  if (!existsSync(agentsDir)) {
    return [];
  }
  return readdirSync(agentsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''))
    .sort();
}

/**
 * Returns the names of the v1 skills by reading the templates directory.
 * Adding a new directory to src/templates/skills/ automatically includes it.
 */
export function getSkillNames() {
  const skillsDir = join(TEMPLATES_DIR, 'skills');
  if (!existsSync(skillsDir)) {
    return [];
  }
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();
}

/**
 * Parses YAML frontmatter from markdown content.
 * Returns an object with { name, description, ...other fields } or empty object if no frontmatter.
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) frontmatter[key] = value;
  }
  return frontmatter;
}

/**
 * Copies agent and skill templates to the user's project.
 */
export async function copyTemplates() {
  mkdirSync(AGENTS_DIR, { recursive: true });
  mkdirSync(SKILLS_DIR, { recursive: true });

  // Copy flat agent .md files
  for (const name of getAgentNames()) {
    const src = join(TEMPLATES_DIR, 'agents', `${name}.md`);
    const dest = join(AGENTS_DIR, `${name}.md`);
    if (existsSync(src)) {
      copyFileSync(src, dest);
    }
  }

  // Create docs/specs/ directory with .gitkeep
  const specsDir = join('docs', 'specs');
  mkdirSync(specsDir, { recursive: true });
  const gitkeep = join(specsDir, '.gitkeep');
  if (!existsSync(gitkeep)) {
    writeFileSync(gitkeep, '', 'utf8');
  }

  // Copy skill directories with SKILL.md
  const skillsTemplate = join(TEMPLATES_DIR, 'skills');
  if (existsSync(skillsTemplate)) {
    const skills = readdirSync(skillsTemplate, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const skill of skills) {
      const skillDir = join(SKILLS_DIR, skill);
      mkdirSync(skillDir, { recursive: true });

      const src = join(skillsTemplate, skill, 'SKILL.md');
      const dest = join(skillDir, 'SKILL.md');
      if (existsSync(src)) {
        copyFileSync(src, dest);
      }
    }
  }
}

/**
 * Reads the contents of PROJECT.md if it exists.
 */
export function readProjectMd() {
  const path = 'PROJECT.md';
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

/**
 * Reads the contents of SESSION.md if it exists.
 */
export function readSessionMd() {
  const path = 'SESSION.md';
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

/**
 * Resolves the Guild project root by walking up from startDir.
 * Looks for .claude/ or PROJECT.md as markers of a Guild project.
 * Returns the absolute path to the project or null if not found.
 */
export function resolveProjectRoot(startDir = process.cwd()) {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, '.claude')) || existsSync(join(dir, 'PROJECT.md'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      // Reached filesystem root without finding a project
      return null;
    }
    dir = parent;
  }
}
