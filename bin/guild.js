#!/usr/bin/env node

/**
 * Guild AI — CLI entry point
 * Usage:
 *   guild init           — onboarding interactivo del proyecto
 *   guild mode           — cambiar modos de un agente
 *   guild upskill        — agregar expertise a un agente
 *   guild new-agent      — crear un nuevo agente
 *   guild sync           — sincronizar estado con GitHub Issues
 */

import { program } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

program
  .name('guild')
  .description('Multi-agent framework for Claude Code')
  .version(pkg.version);

// guild init
program
  .command('init')
  .description('Inicializar Guild en el proyecto actual con onboarding interactivo')
  .option('--skip-github', 'Omitir configuración de GitHub Issues')
  .action(async (options) => {
    const { runInit } = await import('../src/commands/init.js');
    await runInit(options);
  });

// guild mode
program
  .command('mode')
  .description('Cambiar los modos activos de un agente')
  .argument('<agent>', 'Nombre del agente (ej: developer, dba, qa)')
  .argument('<modes...>', 'Modos a activar/desactivar (ej: +react -angular postgres)')
  .action(async (agent, modes) => {
    const { runMode } = await import('../src/commands/mode.js');
    await runMode(agent, modes);
  });

// guild upskill
program
  .command('upskill')
  .description('Agregar nueva expertise a un agente existente')
  .argument('<agent>', 'Nombre del agente')
  .argument('<expertise>', 'Nombre de la expertise a agregar')
  .action(async (agent, expertise) => {
    const { runUpskill } = await import('../src/commands/upskill.js');
    await runUpskill(agent, expertise);
  });

// guild new-agent
program
  .command('new-agent')
  .description('Crear un nuevo agente especializado')
  .argument('<name>', 'Nombre del nuevo agente')
  .option('--expertise <items...>', 'Expertises iniciales del agente')
  .action(async (name, options) => {
    const { runNewAgent } = await import('../src/commands/new-agent.js');
    await runNewAgent(name, options);
  });

// guild sync
program
  .command('sync')
  .description('Sincronizar estado de tareas con GitHub Issues')
  .action(async () => {
    const { runSync } = await import('../src/commands/sync.js');
    await runSync();
  });

// guild status
program
  .command('status')
  .description('Ver estado actual del proyecto, tareas y agentes activos')
  .action(async () => {
    const { runStatus } = await import('../src/commands/status.js');
    await runStatus();
  });

program.parse();
