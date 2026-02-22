/**
 * guild mode — Cambiar modos activos de un agente
 *
 * Uso:
 *   guild mode developer +react +vite -angular
 *   guild mode dba +postgres +redis
 *   guild mode tech-lead react-architecture   (define modos exactos)
 *
 * Flujo:
 * 1. Validar que el agente existe en .claude/agents/
 * 2. Parsear los modos (+ para agregar, - para quitar, sin prefijo = set exacto)
 * 3. Verificar que los archivos de expertise existen
 * 4. Actualizar PROJECT.md con los nuevos modos
 * 5. Ejecutar composer para regenerar active.md
 * 6. Confirmar al usuario
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { composeAgent } from '../utils/composer.js';
import { updateProjectMdModes } from '../utils/generators.js';

const AGENTS_DIR = '.claude/agents';

export async function runMode(agentName, modeArgs) {
  // Verificar que Guild está instalado
  if (!existsSync(AGENTS_DIR)) {
    console.error(chalk.red('Guild no está instalado en este proyecto. Ejecuta: guild init'));
    process.exit(1);
  }

  // Verificar que el agente existe
  const agentDir = join(AGENTS_DIR, agentName);
  if (!existsSync(agentDir)) {
    console.error(chalk.red(`Agente "${agentName}" no encontrado en ${AGENTS_DIR}`));
    console.log(chalk.gray('Agentes disponibles:'), getAvailableAgents());
    process.exit(1);
  }

  // Parsear modos: +react = agregar, -angular = quitar, react = set exacto
  const { toAdd, toRemove, exactSet } = parseModeArgs(modeArgs);

  // Leer modos actuales de PROJECT.md
  const currentModes = getCurrentModes(agentName);

  // Calcular nuevos modos
  let newModes;
  if (exactSet.length > 0) {
    newModes = exactSet;
  } else {
    newModes = [...currentModes];
    toAdd.forEach(m => { if (!newModes.includes(m)) newModes.push(m); });
    toRemove.forEach(m => { newModes = newModes.filter(x => x !== m); });
  }

  // Verificar que los archivos de expertise existen
  const missing = [];
  for (const mode of newModes) {
    const expertisePath = join(agentDir, 'expertise', `${mode}.md`);
    if (!existsSync(expertisePath)) {
      missing.push(mode);
    }
  }

  if (missing.length > 0) {
    console.log(chalk.yellow(`⚠️  Las siguientes expertises no existen para "${agentName}":`));
    missing.forEach(m => console.log(chalk.gray(`   - ${m}`)));
    console.log('');

    const createMissing = await p.confirm({
      message: `¿Deseas crear estas expertises con Claude Code? (se agregará una instrucción en SESSION.md)`,
      initialValue: true,
    });

    if (p.isCancel(createMissing)) { process.exit(0); }

    if (createMissing) {
      // Agregar nota en SESSION.md para que Claude Code genere las expertises faltantes
      await addUpskillNote(agentName, missing);
      console.log(chalk.cyan(`\nNota agregada en SESSION.md. Claude Code generará las expertises al iniciar la sesión.`));
    } else {
      // Filtrar los modos que no existen
      newModes = newModes.filter(m => !missing.includes(m));
    }
  }

  const spinner = p.spinner();
  spinner.start(`Recomponiendo agente ${agentName}...`);

  try {
    // Actualizar PROJECT.md
    await updateProjectMdModes(agentName, newModes);

    // Regenerar active.md
    await composeAgent(agentName, newModes);

    spinner.stop(`Agente ${agentName} recompuesto.`);

    console.log('');
    console.log(chalk.bold(`⚔️  ${agentName}`), chalk.gray('→'), chalk.cyan(newModes.join(', ') || 'solo base'));
    console.log(chalk.gray(`   active.md actualizado en ${join(agentDir, 'active.md')}`));
  } catch (error) {
    spinner.stop('Error al recomponer el agente.');
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function parseModeArgs(args) {
  const toAdd = [];
  const toRemove = [];
  const exactSet = [];

  for (const arg of args) {
    if (arg.startsWith('+')) {
      toAdd.push(arg.slice(1));
    } else if (arg.startsWith('-')) {
      toRemove.push(arg.slice(1));
    } else {
      exactSet.push(arg);
    }
  }

  return { toAdd, toRemove, exactSet };
}

function getAvailableAgents() {
  // TODO: leer .claude/agents/ y retornar lista
  return ['advisor', 'tech-lead', 'product-owner', 'developer', 'dba', 'qa', 'bug-fixer', 'code-review'];
}

function getCurrentModes(agentName) {
  // TODO: leer PROJECT.md y extraer modos del agente
  return [];
}

async function addUpskillNote(agentName, expertises) {
  // TODO: agregar nota en SESSION.md
}
