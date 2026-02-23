#!/usr/bin/env node

/**
 * Guild v1 — CLI entry point
 * Usage:
 *   guild init           — onboarding interactivo v1
 *   guild new-agent      — crear un nuevo agente
 *   guild status         — ver estado del proyecto
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
  .description('Inicializar Guild v1 en el proyecto actual')
  .action(async () => {
    try {
      const { runInit } = await import('../src/commands/init.js');
      await runInit();
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

// guild new-agent
program
  .command('new-agent')
  .description('Crear un nuevo agente')
  .argument('<name>', 'Nombre del agente (lowercase, guiones)')
  .action(async (name) => {
    try {
      const { runNewAgent } = await import('../src/commands/new-agent.js');
      await runNewAgent(name);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

// guild status
program
  .command('status')
  .description('Ver estado del proyecto Guild')
  .action(async () => {
    try {
      const { runStatus } = await import('../src/commands/status.js');
      await runStatus();
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

program.parse();
