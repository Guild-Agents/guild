/**
 * guild init — Interactive onboarding v1
 *
 * Flow:
 * 1. Verify that a Guild installation does not already exist
 * 2. Collect: name, type, stack, GitHub, existing code
 * 3. Generate PROJECT.md, CLAUDE.md, SESSION.md
 * 4. Copy agents and skills
 * 5. Instructions for /guild-specialize
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { generateProjectMd, generateSessionMd, generateClaudeMd } from '../utils/generators.js';
import { copyTemplates, getAgentNames, getSkillNames } from '../utils/files.js';
import { loadWorkspace } from '../utils/workspace.js';

export async function runInit() {
  console.log('');
  p.intro(chalk.bold.cyan('Guild v1 — New project'));

  // Detect workspace membership
  const workspace = loadWorkspace();
  if (workspace) {
    p.log.info(chalk.gray(`Workspace detected: ${workspace.name} (${workspace.root})`));
  }

  // Check for existing installation
  if (existsSync('.claude/agents')) {
    const overwrite = await p.confirm({
      message: 'Guild is already installed in this project. Reinitialize?',
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel('Cancelled.');
      return;
    }
  }

  // ─── Name ─────────────────────────────────────────────────────────────────
  const name = await p.text({
    message: 'Project name:',
    placeholder: 'my-project',
    validate: (val) => {
      if (!val) return 'Name is required';
    },
  });
  if (p.isCancel(name)) { p.cancel('Cancelled.'); return; }

  // ─── Type ───────────────────────────────────────────────────────────────────
  const type = await p.select({
    message: 'Project type:',
    options: [
      { value: 'webapp', label: 'Web app (React/Vue/Angular)' },
      { value: 'api', label: 'API / Backend service' },
      { value: 'cli', label: 'CLI tool' },
      { value: 'mobile', label: 'Mobile (React Native)' },
      { value: 'fullstack', label: 'Other / Fullstack' },
    ],
  });
  if (p.isCancel(type)) { p.cancel('Cancelled.'); return; }

  // ─── Stack ──────────────────────────────────────────────────────────────────
  const stack = await p.text({
    message: 'Main stack:',
    placeholder: 'e.g.: Next.js, Supabase, Vercel',
    validate: (val) => {
      if (!val) return 'Stack is required';
    },
  });
  if (p.isCancel(stack)) { p.cancel('Cancelled.'); return; }

  // ─── GitHub ─────────────────────────────────────────────────────────────────
  let github = null;
  const hasRepo = await p.confirm({
    message: 'Has a GitHub repository?',
    initialValue: true,
  });

  if (!p.isCancel(hasRepo) && hasRepo) {
    const repoUrl = await p.text({
      message: 'Repository URL:',
      placeholder: 'https://github.com/org/repo',
      validate: (val) => {
        if (!val) return 'URL is required';
        if (!val.includes('github.com')) return 'Must be a GitHub URL';
      },
    });
    if (!p.isCancel(repoUrl)) {
      github = { repoUrl };
    }
  }

  // ─── Existing code ────────────────────────────────────────────────────────
  const hasExistingCode = await p.confirm({
    message: 'Has existing code?',
    initialValue: true,
  });

  // ─── Generation ───────────────────────────────────────────────────────────
  const spinner = p.spinner();
  spinner.start('Generating Guild v1 structure...');

  const projectData = {
    name,
    type,
    stack,
    github,
    hasExistingCode: !p.isCancel(hasExistingCode) && hasExistingCode,
  };

  try {
    await copyTemplates();
    spinner.message('Generating CLAUDE.md...');
    await generateClaudeMd(projectData, workspace, name);

    spinner.message('Generating PROJECT.md...');
    await generateProjectMd(projectData);

    spinner.message('Generating SESSION.md...');
    await generateSessionMd();

    spinner.stop('Structure created.');
  } catch (error) {
    spinner.stop('Error during initialization.');
    throw error;
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  const agentCount = getAgentNames().length;
  const skillCount = getSkillNames().length;
  p.log.success(`Created: CLAUDE.md, PROJECT.md, SESSION.md, ${agentCount} agents, ${skillCount} skills`);

  const relevantSkills = projectData.hasExistingCode
    ? ['/guild-specialize', '/council', '/build-feature']
    : ['/council', '/build-feature', '/new-feature'];
  p.log.info(`Start with: ${relevantSkills.join('  ')}`);

  const quickStart = projectData.hasExistingCode
    ? '1. Run /guild-specialize to analyze your codebase\n' +
      '2. Run /council to spec your first feature\n' +
      '3. Build it with /build-feature'
    : '1. Run /council to spec your first feature\n' +
      '2. Build it with /build-feature\n' +
      '3. Run /guild-specialize once you have code';

  p.note(quickStart, 'Quick start');

  p.outro(chalk.bold.cyan('Guild ready — spec before you build.'));
}
