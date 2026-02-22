/**
 * files.js — Utilidades de sistema de archivos para Guild
 */

import { mkdirSync, copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '../../src/templates');
const AGENTS_DIR = '.claude/agents';
const COMMANDS_DIR = '.claude/commands';
const HOOKS_DIR = '.claude/hooks';
const TASKS_DIRS = ['tasks/backlog', 'tasks/in-progress', 'tasks/in-review', 'tasks/done'];

/**
 * Crea la estructura de carpetas del proyecto y copia los templates de agentes.
 */
export async function copyAgentTemplates(_projectData) {
  // Crear directorios base
  const dirs = [
    AGENTS_DIR,
    COMMANDS_DIR,
    HOOKS_DIR,
    ...TASKS_DIRS,
    // Directorios por agente
    ...getAgentNames().flatMap(name => [
      join(AGENTS_DIR, name),
      join(AGENTS_DIR, name, 'expertise'),
    ]),
  ];

  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
  }

  // Copiar base.md de cada agente desde templates
  for (const agentName of getAgentNames()) {
    const src = join(TEMPLATES_DIR, 'agents', agentName, 'base.md');
    const dest = join(AGENTS_DIR, agentName, 'base.md');

    if (existsSync(src)) {
      copyFileSync(src, dest);
    }
  }

  // Copiar slash commands
  await copySlashCommands();

  // Copiar hook
  await copyHooks();

  // Crear .gitkeep en carpetas de tareas vacías
  for (const dir of TASKS_DIRS) {
    writeFileSync(join(dir, '.gitkeep'), '');
  }
}

/**
 * Copia los slash commands del framework al proyecto.
 */
async function copySlashCommands() {
  const commandsTemplate = join(TEMPLATES_DIR, 'commands');
  if (!existsSync(commandsTemplate)) return;

  const files = readdirSync(commandsTemplate);
  for (const file of files) {
    copyFileSync(join(commandsTemplate, file), join(COMMANDS_DIR, file));
  }
}

/**
 * Copia los hooks al proyecto.
 */
async function copyHooks() {
  const hooksTemplate = join(TEMPLATES_DIR, 'hooks');
  if (!existsSync(hooksTemplate)) return;

  const files = readdirSync(hooksTemplate);
  for (const file of files) {
    const dest = join(HOOKS_DIR, file);
    copyFileSync(join(hooksTemplate, file), dest);
    // Hacer el hook ejecutable
    try {
      const { chmodSync } = await import('fs');
      chmodSync(dest, '755');
    } catch {
      // Non-critical
    }
  }
}

/**
 * Lista los nombres de todos los agentes del framework.
 */
export function getAgentNames() {
  return [
    'advisor',
    'tech-lead',
    'product-owner',
    'developer',
    'dba',
    'qa',
    'bug-fixer',
    'code-review',
  ];
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
