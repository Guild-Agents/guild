/**
 * new-agent.js — Creates a new v1 agent (plain file)
 *
 * Flow:
 * 1. Validate name (lowercase, hyphens, no spaces)
 * 2. Verify that Guild is installed
 * 3. Verify that the agent does NOT exist
 * 4. Ask for agent description
 * 5. Create .claude/agents/[name].md with placeholder
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ensureProjectRoot } from '../utils/files.js';

const AGENTS_DIR = join('.claude', 'agents');

export async function runNewAgent(agentName) {
  ensureProjectRoot();

  p.intro(chalk.bold.cyan('Guild — New agent'));

  // Validate name
  if (!isValidAgentName(agentName)) {
    throw new Error(`Invalid name: "${agentName}". Only lowercase, numbers, and hyphens allowed. Example: guild new-agent security-auditor`);
  }

  // Verify Guild is installed
  if (!existsSync(AGENTS_DIR)) {
    throw new Error('Guild is not installed. Run: guild init');
  }

  // Verify that the agent does NOT exist
  const agentPath = join(AGENTS_DIR, `${agentName}.md`);
  if (existsSync(agentPath)) {
    throw new Error(`Agent "${agentName}" already exists.`);
  }

  // Ask for description
  const description = await p.text({
    message: `What does "${agentName}" do? (short description):`,
    placeholder: 'e.g.: Evaluates trading opportunities based on technical analysis',
    validate: (val) => !val ? 'Description is required' : undefined,
  });
  if (p.isCancel(description)) { p.cancel('Cancelled.'); return; }

  // Create agent
  const spinner = p.spinner();
  spinner.start(`Creating agent "${agentName}"...`);

  try {
    const content = `---
name: ${agentName}
description: "${description}"
---

# ${agentName}

You are ${agentName} of [PROJECT].

## Responsibilities
[Define with /guild-specialize]

## What you do NOT do
[Define with /guild-specialize]

## Process
[Define with /guild-specialize]

## Behavioral rules
- Always read CLAUDE.md and SESSION.md at the start of the session
`;

    writeFileSync(agentPath, content, 'utf8');

    spinner.stop(`Agent "${agentName}" created.`);

    p.log.success(`File: ${agentPath}`);
    p.note(
      `Run /guild-specialize so that Claude\n` +
      `generates the full instructions for "${agentName}".`,
      'Specialization pending'
    );
    p.outro(chalk.bold.cyan(`Agent ${agentName} ready.`));
  } catch (error) {
    spinner.stop('Error creating agent.');
    throw error;
  }
}

function isValidAgentName(name) {
  return /^[a-z][a-z0-9-]*$/.test(name);
}
