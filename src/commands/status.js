/**
 * status.js — Muestra el estado actual del proyecto v1
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export async function runStatus() {
  if (!existsSync('PROJECT.md')) {
    throw new Error('Guild no esta instalado. Ejecuta: guild init');
  }

  const projectMd = readFileSync('PROJECT.md', 'utf8');
  const nameMatch = projectMd.match(/\*\*Nombre:\*\*\s*(.+)/);
  const stackMatch = projectMd.match(/\*\*Stack:\*\*\s*(.+)/);
  const projectName = nameMatch ? nameMatch[1].trim() : 'Proyecto';

  p.intro(chalk.bold.cyan(`Guild — ${projectName}`));

  if (stackMatch) {
    p.log.info(chalk.gray(`Stack: ${stackMatch[1].trim()}`));
  }

  // Sesion activa
  if (existsSync('SESSION.md')) {
    p.log.step('Sesion activa');
    const sessionMd = readFileSync('SESSION.md', 'utf8');
    const taskMatch = sessionMd.match(/\*\*Tarea en curso:\*\*\s*(.+)/);
    const stateMatch = sessionMd.match(/\*\*Estado:\*\*\s*(.+)/);
    if (taskMatch && taskMatch[1].trim() !== '—') p.log.info(`  Tarea: ${taskMatch[1].trim()}`);
    if (stateMatch) p.log.info(chalk.gray(`  ${stateMatch[1].trim()}`));
  }

  // Agentes
  const agentsDir = join('.claude', 'agents');
  if (existsSync(agentsDir)) {
    p.log.step('Agentes');
    const agents = readdirSync(agentsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));
    p.log.info(chalk.gray(`  ${agents.join(', ')}`));
  }

  // Skills
  const skillsDir = join('.claude', 'skills');
  if (existsSync(skillsDir)) {
    p.log.step('Skills');
    const skills = readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    p.log.info(chalk.gray(`  ${skills.join(', ')}`));
  }

  p.outro('');
}
