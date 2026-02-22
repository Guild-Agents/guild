/**
 * composer.js — Genera active.md para cada agente
 *
 * El active.md es la composición de:
 *   base.md + expertise/modo1.md + expertise/modo2.md + ...
 *
 * Este archivo NUNCA se edita manualmente — siempre se regenera aquí.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const AGENTS_DIR = '.claude/agents';

/**
 * Compone el active.md de un agente específico con los modos indicados.
 */
export async function composeAgent(agentName, modes = []) {
  const agentDir = join(AGENTS_DIR, agentName);
  const basePath = join(agentDir, 'base.md');
  const activePath = join(agentDir, 'active.md');

  if (!existsSync(basePath)) {
    throw new Error(`base.md no encontrado para agente "${agentName}" en ${basePath}`);
  }

  let content = readFileSync(basePath, 'utf8');

  for (const mode of modes) {
    const expertisePath = join(agentDir, 'expertise', `${mode}.md`);
    if (existsSync(expertisePath)) {
      const expertiseContent = readFileSync(expertisePath, 'utf8');
      content += `\n\n---\n\n${expertiseContent}`;
    }
  }

  // Agregar footer con metadatos de composición
  const timestamp = new Date().toISOString().split('T')[0];
  content += `\n\n---\n\n<!-- Generado automáticamente por Guild — ${timestamp} -->\n`;
  content += `<!-- Modos activos: ${modes.length > 0 ? modes.join(', ') : 'solo base'} -->\n`;
  content += `<!-- No editar manualmente — usar: guild mode ${agentName} [modos] -->\n`;

  writeFileSync(activePath, content, 'utf8');

  return activePath;
}

/**
 * Compone active.md para todos los agentes según PROJECT.md
 */
export async function composeAllAgents(projectData) {
  const agentModes = resolveAgentModes(projectData);

  const results = [];
  for (const [agentName, modes] of Object.entries(agentModes)) {
    const agentDir = join(AGENTS_DIR, agentName);
    if (existsSync(agentDir)) {
      const path = await composeAgent(agentName, modes);
      results.push({ agent: agentName, modes, path });
    }
  }

  return results;
}

/**
 * Resuelve qué modos activar para cada agente basado en el stack del proyecto.
 */
function resolveAgentModes(projectData) {
  const { stack } = projectData;
  const modes = {};

  // Developer — modos según stack frontend + backend
  const devModes = [];
  if (stack.frontend) {
    const frontendMap = {
      'react-vite': ['react', 'vite'],
      'nextjs': ['nextjs', 'react'],
      'react-native': ['react-native'],
      'angular': ['angular'],
      'vue': ['vue'],
      'svelte': ['svelte'],
    };
    devModes.push(...(frontendMap[stack.frontend] || []));
  }
  if (stack.backend) {
    const backendMap = {
      'node-express': ['node', 'express'],
      'node-fastify': ['node', 'fastify'],
      'java-spring': ['java-spring'],
      'python-fastapi': ['python', 'fastapi'],
      'python-django': ['python', 'django'],
    };
    devModes.push(...(backendMap[stack.backend] || []));
  }
  modes['developer'] = devModes;

  // DBA — modos según bases de datos
  if (stack.db && !stack.db.includes('none')) {
    modes['dba'] = stack.db;
  } else {
    modes['dba'] = [];
  }

  // QA — modos según framework de testing
  modes['qa'] = projectData.testing?.framework !== 'none'
    ? [projectData.testing?.framework].filter(Boolean)
    : [];

  // Bug Fixer hereda modos del developer
  modes['bug-fixer'] = devModes;

  // Code Review hereda modos del developer
  modes['code-review'] = devModes;

  // Tech Lead — modos según tipo de proyecto
  const tlModes = [];
  if (['react-vite', 'nextjs', 'react-native'].includes(stack.frontend)) tlModes.push('react-architecture');
  if (stack.type === 'mobile') tlModes.push('mobile');
  modes['tech-lead'] = tlModes;

  // Advisor — sin modos técnicos, su expertise es el dominio
  modes['advisor'] = [];

  // Product Owner — sin modos técnicos
  modes['product-owner'] = [];

  return modes;
}
