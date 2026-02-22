/**
 * status.js — Muestra el estado actual del proyecto
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export async function runStatus() {
  if (!existsSync('PROJECT.md')) {
    p.log.error('Guild no está instalado en este proyecto. Ejecuta: guild init');
    process.exit(1);
  }

  const projectMd = readFileSync('PROJECT.md', 'utf8');

  // Proyecto
  const nameMatch = projectMd.match(/\*\*Nombre:\*\*\s*(.+)/);
  const domainMatch = projectMd.match(/\*\*Dominio:\*\*\s*(.+)/);
  const projectName = nameMatch ? nameMatch[1].trim() : 'Proyecto';

  p.intro(chalk.bold.cyan(`⚔️  Guild — ${projectName}`));

  if (domainMatch) {
    p.log.info(chalk.gray(domainMatch[1].trim()));
  }

  // Tareas
  p.log.step('Tareas');
  const taskDirs = {
    'backlog': join('tasks', 'backlog'),
    'in-progress': join('tasks', 'in-progress'),
    'in-review': join('tasks', 'in-review'),
    'done': join('tasks', 'done'),
  };

  for (const [label, dir] of Object.entries(taskDirs)) {
    if (existsSync(dir)) {
      const files = readdirSync(dir).filter(f => f.endsWith('.md') && f !== '.gitkeep');
      const count = files.length;
      const color = label === 'in-progress' ? chalk.blue
        : label === 'in-review' ? chalk.yellow
        : label === 'done' ? chalk.green
        : chalk.gray;

      if (count > 0) {
        p.log.info(`  ${color(label + ':')} ${count}  ${chalk.gray('→ ' + files.map(f => f.replace('.md', '')).join(', '))}`);
      } else {
        p.log.info(`  ${color(label + ':')} ${chalk.gray('vacío')}`);
      }
    }
  }

  // Sesión activa
  const sessionPath = 'SESSION.md';
  if (existsSync(sessionPath)) {
    p.log.step('Sesión activa');
    const sessionMd = readFileSync(sessionPath, 'utf8');
    const taskMatch = sessionMd.match(/\*\*Tarea en curso:\*\*\s*(.+)/);
    const agentMatch = sessionMd.match(/\*\*Agente activo:\*\*\s*(.+)/);
    const stateMatch = sessionMd.match(/\*\*Estado:\*\*\s*(.+)/);
    if (taskMatch && taskMatch[1].trim() !== '—') p.log.info(`  Tarea: ${taskMatch[1].trim()}`);
    if (agentMatch && agentMatch[1].trim() !== '—') p.log.info(`  Agente: ${agentMatch[1].trim()}`);
    if (stateMatch) p.log.info(chalk.gray(`  ${stateMatch[1].trim()}`));
  }

  // Agentes y modos
  p.log.step('Agentes activos');
  const modesSection = projectMd.match(/## Agentes activos y sus modos\n([\s\S]+?)(?=\n##|$)/);
  if (modesSection) {
    const lines = modesSection[1].trim().split('\n');
    for (const line of lines) {
      const cleaned = line.replace(/^-\s*/, '  ').replace(/\*\*/g, '');
      p.log.info(chalk.gray(cleaned));
    }
  }

  // GitHub
  const githubMatch = projectMd.match(/\*\*Habilitado:\*\*\s*(.+)/);
  if (githubMatch) {
    const enabled = githubMatch[1].trim() === 'Sí';
    p.log.step(`GitHub Issues: ${enabled ? chalk.green('habilitado') : chalk.gray('deshabilitado')}`);
  }

  p.outro('');
}
