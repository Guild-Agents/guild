/**
 * doctor.js — Validates Guild setup and reports actionable fixes
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { resolveProjectRoot } from '../utils/files.js';
import { loadAllSkills } from '../utils/skill-loader.js';

export async function runDoctor() {
  const root = resolveProjectRoot();
  if (root) {
    process.chdir(root);
  }

  p.intro(chalk.bold.cyan('Guild — Doctor'));

  const checks = [];
  let healthy = true;

  // Check .claude/ directory
  if (existsSync('.claude')) {
    checks.push({ name: '.claude/ directory', pass: true });
  } else {
    checks.push({ name: '.claude/ directory', pass: false, fix: 'Run: guild init' });
    healthy = false;
  }

  // Check agents
  const agentsDir = join('.claude', 'agents');
  if (existsSync(agentsDir)) {
    const agents = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    if (agents.length > 0) {
      checks.push({ name: `Agents (${agents.length} found)`, pass: true });
    } else {
      checks.push({ name: 'Agents', pass: false, fix: 'Run: guild init (no agent .md files found in .claude/agents/)' });
      healthy = false;
    }
  } else {
    checks.push({ name: 'Agents directory', pass: false, fix: 'Run: guild init (missing .claude/agents/)' });
    healthy = false;
  }

  // Check skills
  const skillsDir = join('.claude', 'skills');
  if (existsSync(skillsDir)) {
    const skills = readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .filter(d => existsSync(join(skillsDir, d.name, 'SKILL.md')));
    if (skills.length > 0) {
      checks.push({ name: `Skills (${skills.length} found)`, pass: true });
    } else {
      checks.push({ name: 'Skills', pass: false, fix: 'Run: guild init (no SKILL.md files found in .claude/skills/)' });
      healthy = false;
    }
  } else {
    checks.push({ name: 'Skills directory', pass: false, fix: 'Run: guild init (missing .claude/skills/)' });
    healthy = false;
  }

  // Check CLAUDE.md
  if (existsSync('CLAUDE.md')) {
    checks.push({ name: 'CLAUDE.md', pass: true });
  } else {
    checks.push({ name: 'CLAUDE.md', pass: false, fix: 'Run: guild init (creates CLAUDE.md with project instructions)' });
    healthy = false;
  }

  // Check PROJECT.md
  if (existsSync('PROJECT.md')) {
    checks.push({ name: 'PROJECT.md', pass: true });
  } else {
    checks.push({ name: 'PROJECT.md', pass: false, fix: 'Run: guild init (creates PROJECT.md with project identity)' });
    healthy = false;
  }

  // Check SESSION.md
  if (existsSync('SESSION.md')) {
    checks.push({ name: 'SESSION.md', pass: true });
  } else {
    checks.push({ name: 'SESSION.md', pass: false, fix: 'Run: guild init (creates SESSION.md for session tracking)' });
    healthy = false;
  }

  // Check workflow validation in skills
  if (existsSync(skillsDir)) {
    const skills = loadAllSkills(skillsDir);
    let workflowCount = 0;
    let workflowErrors = 0;
    const errorDetails = [];

    for (const [name, skill] of skills) {
      if (skill.workflow) {
        workflowCount++;
        if (skill.errors.length > 0) {
          workflowErrors++;
          errorDetails.push(`${name}: ${skill.errors.join('; ')}`);
        }
      }

      // Check that agent references exist
      if (skill.workflow) {
        for (const step of skill.workflow.steps) {
          if (step.role !== 'system' && step.role !== 'dynamic') {
            const agentPath = join(agentsDir, `${step.role}.md`);
            if (!existsSync(agentPath)) {
              errorDetails.push(`${name}: step "${step.id}" references agent "${step.role}" — agent not found`);
              workflowErrors++;
            }
          }
        }
      }
    }

    if (workflowCount > 0 && workflowErrors === 0) {
      checks.push({ name: `Workflows (${workflowCount} valid)`, pass: true });
    } else if (workflowCount > 0 && workflowErrors > 0) {
      checks.push({
        name: `Workflows (${workflowErrors} issue(s))`,
        pass: false,
        fix: errorDetails.join('\n    '),
      });
      healthy = false;
    }
    // If workflowCount === 0, don't add a check (no workflows to validate)

    // Check for dual-format skills (workflow frontmatter + body step/phase headings)
    const STEP_PHASE_RE = /^#{1,3}\s.*(step|phase)/im;
    const dualFormatWarnings = [];

    for (const [name, skill] of skills) {
      if (skill.workflow && skill.body && STEP_PHASE_RE.test(skill.body)) {
        dualFormatWarnings.push(name);
      }
    }

    if (dualFormatWarnings.length > 0) {
      checks.push({
        name: `Dual-format skills (${dualFormatWarnings.length} warning(s))`,
        pass: true,
        warn: true,
        detail: `Skills with both workflow frontmatter and body step/phase headings: ${dualFormatWarnings.join(', ')}. Workflow steps take precedence — consider removing prose steps from body.`,
      });
    }
  }

  // Display results
  for (const check of checks) {
    if (check.warn) {
      p.log.warn(`${chalk.yellow('⚠')} ${check.name}`);
      if (check.detail) {
        p.log.info(chalk.gray(`  ${check.detail}`));
      }
    } else if (check.pass) {
      p.log.success(`${chalk.green('✓')} ${check.name}`);
    } else {
      p.log.error(`${chalk.red('✗')} ${check.name}`);
      p.log.info(chalk.gray(`  Fix: ${check.fix}`));
    }
  }

  const passed = checks.filter(c => c.pass).length;
  const total = checks.length;

  if (healthy) {
    p.outro(chalk.green(`All checks passed (${passed}/${total})`));
  } else {
    p.outro(chalk.red(`${total - passed} issue(s) found (${passed}/${total} passed)`));
    throw new Error('Guild setup has issues. Run the suggested fixes above.');
  }
}
