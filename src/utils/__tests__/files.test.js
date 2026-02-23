import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { copyTemplates, getAgentNames } from '../files.js';

const TEST_DIR = join(import.meta.dirname, '__tmp_files__');

describe('getAgentNames', () => {
  it('returns 8 v1 agent names', () => {
    const names = getAgentNames();
    expect(names).toHaveLength(8);
    expect(names).toContain('advisor');
    expect(names).toContain('product-owner');
    expect(names).toContain('tech-lead');
    expect(names).toContain('developer');
    expect(names).toContain('code-reviewer');
    expect(names).toContain('qa');
    expect(names).toContain('bugfix');
    expect(names).toContain('db-migration');
  });

  it('does not contain v0 agent names', () => {
    const names = getAgentNames();
    expect(names).not.toContain('code-review');
    expect(names).not.toContain('bug-fixer');
    expect(names).not.toContain('dba');
  });
});

describe('copyTemplates', () => {
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('creates .claude/agents/ with 8 flat .md files', async () => {
    await copyTemplates();
    const agentsDir = join('.claude', 'agents');
    expect(existsSync(agentsDir)).toBe(true);

    const files = readdirSync(agentsDir);
    expect(files).toHaveLength(8);
    for (const name of getAgentNames()) {
      expect(files).toContain(`${name}.md`);
    }
  });

  it('creates .claude/skills/ with 10 skill directories', async () => {
    await copyTemplates();
    const skillsDir = join('.claude', 'skills');
    expect(existsSync(skillsDir)).toBe(true);

    const expectedSkills = [
      'guild-specialize', 'build-feature', 'council', 'new-feature',
      'qa-cycle', 'review', 'status', 'dev-flow', 'session-start', 'session-end',
    ];
    for (const skill of expectedSkills) {
      expect(existsSync(join(skillsDir, skill, 'SKILL.md'))).toBe(true);
    }
  });

  it('does not create v0 directories', async () => {
    await copyTemplates();
    expect(existsSync('tasks')).toBe(false);
    expect(existsSync(join('.claude', 'commands'))).toBe(false);
    expect(existsSync(join('.claude', 'hooks'))).toBe(false);
  });

  it('does not create agent subdirectories', async () => {
    await copyTemplates();
    // Agents should be flat files, not directories
    for (const name of getAgentNames()) {
      const agentPath = join('.claude', 'agents', name);
      // Should not be a directory
      expect(existsSync(join(agentPath, 'base.md'))).toBe(false);
    }
  });
});
