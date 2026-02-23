/**
 * files.js — Utilidades de sistema de archivos para Guild v1
 */

import { mkdirSync, copyFileSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'templates');
const AGENTS_DIR = join('.claude', 'agents');
const SKILLS_DIR = join('.claude', 'skills');

/**
 * Lista los nombres de los 8 agentes v1.
 */
export function getAgentNames() {
  return [
    'advisor',
    'product-owner',
    'tech-lead',
    'developer',
    'code-reviewer',
    'qa',
    'bugfix',
    'db-migration',
  ];
}

/**
 * Copia los templates de agentes y skills al proyecto del usuario.
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
 * Lee el contenido de PROJECT.md si existe.
 */
export function readProjectMd() {
  const path = 'PROJECT.md';
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

/**
 * Lee el contenido de SESSION.md si existe.
 */
export function readSessionMd() {
  const path = 'SESSION.md';
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

/**
 * Resuelve la raiz del proyecto Guild caminando hacia arriba desde startDir.
 * Busca .claude/ o PROJECT.md como marcadores de un proyecto Guild.
 * Retorna la ruta absoluta del proyecto o null si no se encuentra.
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
