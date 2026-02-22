/**
 * status.js — Muestra el estado actual del proyecto
 */

import chalk from 'chalk';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export async function runStatus() {
  if (!existsSync('PROJECT.md')) {
    console.error(chalk.red('Guild no está instalado en este proyecto. Ejecuta: guild init'));
    process.exit(1);
  }

  console.log('');
  console.log(chalk.bold.cyan('⚔️  Guild Status'));
  console.log('');

  // Proyecto
  console.log(chalk.bold('Proyecto'));
  const projectMd = readFileSync('PROJECT.md', 'utf8');
  const nameMatch = projectMd.match(/\*\*Nombre:\*\*\s*(.+)/);
  const domainMatch = projectMd.match(/\*\*Dominio:\*\*\s*(.+)/);
  if (nameMatch) console.log(chalk.white(`  ${nameMatch[1].trim()}`));
  if (domainMatch) console.log(chalk.gray(`  ${domainMatch[1].trim()}`));
  console.log('');

  // Tareas
  console.log(chalk.bold('Tareas'));
  const taskDirs = {
    'backlog': 'tasks/backlog',
    'in-progress': 'tasks/in-progress',
    'in-review': 'tasks/in-review',
    'done': 'tasks/done',
  };

  for (const [label, dir] of Object.entries(taskDirs)) {
    if (existsSync(dir)) {
      const files = readdirSync(dir).filter(f => f.endsWith('.md') && f !== '.gitkeep');
      const color = label === 'in-progress' ? chalk.blue
        : label === 'in-review' ? chalk.yellow
        : label === 'done' ? chalk.green
        : chalk.gray;
      console.log(`  ${color(`${label}:`)} ${files.length > 0 ? files.join(', ') : chalk.gray('vacío')}`);
    }
  }
  console.log('');

  // Sesión activa
  if (existsSync('SESSION.md')) {
    console.log(chalk.bold('Sesión activa'));
    const sessionMd = readFileSync('SESSION.md', 'utf8');
    const taskMatch = sessionMd.match(/\*\*Tarea en curso:\*\*\s*(.+)/);
    const agentMatch = sessionMd.match(/\*\*Agente activo:\*\*\s*(.+)/);
    const stateMatch = sessionMd.match(/\*\*Estado:\*\*\s*(.+)/);
    if (taskMatch) console.log(chalk.white(`  Tarea: ${taskMatch[1].trim()}`));
    if (agentMatch) console.log(chalk.white(`  Agente: ${agentMatch[1].trim()}`));
    if (stateMatch) console.log(chalk.gray(`  ${stateMatch[1].trim()}`));
    console.log('');
  }

  // Agentes y modos
  console.log(chalk.bold('Agentes activos'));
  const modesSection = projectMd.match(/## Agentes activos y sus modos\n([\s\S]+?)(?=\n##|$)/);
  if (modesSection) {
    const lines = modesSection[1].trim().split('\n');
    for (const line of lines) {
      console.log(chalk.gray('  ' + line.replace(/\*\*/g, '')));
    }
  }
  console.log('');
}
