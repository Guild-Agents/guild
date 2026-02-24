/**
 * status.js — Shows the current project status v1
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ensureProjectRoot } from '../utils/files.js';

export async function runStatus() {
  ensureProjectRoot();

  const projectMd = readFileSync('PROJECT.md', 'utf8');
  const nameMatch = projectMd.match(/\*\*Name:\*\*\s*(.+)/);
  const stackMatch = projectMd.match(/\*\*Stack:\*\*\s*(.+)/);
  const projectName = nameMatch ? nameMatch[1].trim() : 'Project';

  p.intro(chalk.bold.cyan(`Guild — ${projectName}`));

  if (stackMatch) {
    p.log.info(chalk.gray(`Stack: ${stackMatch[1].trim()}`));
  }

  // Active session
  if (existsSync('SESSION.md')) {
    p.log.step('Active session');
    const sessionMd = readFileSync('SESSION.md', 'utf8');
    const taskMatch = sessionMd.match(/\*\*Current task:\*\*\s*(.+)/);
    const stateMatch = sessionMd.match(/\*\*Status:\*\*\s*(.+)/);
    if (taskMatch && taskMatch[1].trim() !== '—') p.log.info(`  Task: ${taskMatch[1].trim()}`);
    if (stateMatch) p.log.info(chalk.gray(`  ${stateMatch[1].trim()}`));
  }

  // Agents
  const agentsDir = join('.claude', 'agents');
  if (existsSync(agentsDir)) {
    p.log.step('Agents');
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
