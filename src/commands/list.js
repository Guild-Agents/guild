/**
 * list.js — Lists installed agents and skills with descriptions
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseFrontmatter } from '../utils/files.js';

export async function runList() {
  p.intro(chalk.bold.cyan('Guild — Agents & Skills'));

  // List agents
  const agentsDir = join('.claude', 'agents');
  p.log.step('Agents');

  if (existsSync(agentsDir)) {
    const agentFiles = readdirSync(agentsDir).filter(f => f.endsWith('.md')).sort();
    if (agentFiles.length > 0) {
      for (const file of agentFiles) {
        const content = readFileSync(join(agentsDir, file), 'utf8');
        const fm = parseFrontmatter(content);
        const name = fm.name || file.replace('.md', '');
        const desc = fm.description || chalk.gray('(no description)');
        p.log.info(`  ${chalk.bold(name)} — ${desc}`);
      }
    } else {
      p.log.info(chalk.gray('  No agents found'));
    }
  } else {
    p.log.info(chalk.gray('  No agents directory (.claude/agents/)'));
  }

  // List skills
  const skillsDir = join('.claude', 'skills');
  p.log.step('Skills');

  if (existsSync(skillsDir)) {
    const skillDirs = readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();
    if (skillDirs.length > 0) {
      for (const dir of skillDirs) {
        const skillFile = join(skillsDir, dir, 'SKILL.md');
        if (existsSync(skillFile)) {
          const content = readFileSync(skillFile, 'utf8');
          const fm = parseFrontmatter(content);
          const name = fm.name || dir;
          const desc = fm.description || chalk.gray('(no description)');
          p.log.info(`  ${chalk.bold(name)} — ${desc}`);
        } else {
          p.log.info(`  ${chalk.bold(dir)} — ${chalk.gray('(missing SKILL.md)')}`);
        }
      }
    } else {
      p.log.info(chalk.gray('  No skills found'));
    }
  } else {
    p.log.info(chalk.gray('  No skills directory (.claude/skills/)'));
  }

  p.outro('');
}
