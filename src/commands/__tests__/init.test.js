import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { copyTemplates, getAgentNames } from '../../utils/files.js';
import { generateClaudeMd, generateProjectMd, generateSessionMd } from '../../utils/generators.js';

const TEST_DIR = join(import.meta.dirname, '__tmp_init_e2e__');

function makeProjectData(overrides = {}) {
  return {
    name: 'e2e-test-project',
    type: 'webapp',
    stack: 'React + Vite, Node.js, PostgreSQL',
    github: { repoUrl: 'https://github.com/test/e2e' },
    hasExistingCode: true,
    ...overrides,
  };
}

describe('guild init — E2E', () => {
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

  it('creates the complete Guild v1 structure', async () => {
    const data = makeProjectData();

    await copyTemplates();
    await generateClaudeMd(data);
    await generateProjectMd(data);
    await generateSessionMd();

    expect(existsSync('CLAUDE.md')).toBe(true);
    expect(existsSync('PROJECT.md')).toBe(true);
    expect(existsSync('SESSION.md')).toBe(true);
    expect(existsSync(join('.claude', 'agents'))).toBe(true);
    expect(existsSync(join('.claude', 'skills'))).toBe(true);
  });

  it('copies all 9 agent templates', async () => {
    await copyTemplates();

    const agentDir = join('.claude', 'agents');
    const agents = readdirSync(agentDir).filter(f => f.endsWith('.md'));

    expect(agents).toHaveLength(getAgentNames().length);

    for (const name of getAgentNames()) {
      expect(existsSync(join(agentDir, `${name}.md`))).toBe(true);
    }
  });

  it('copies all skill templates with SKILL.md', async () => {
    await copyTemplates();

    const skillsDir = join('.claude', 'skills');
    const skills = readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    expect(skills.length).toBeGreaterThanOrEqual(10);

    for (const skill of skills) {
      expect(existsSync(join(skillsDir, skill, 'SKILL.md'))).toBe(true);
    }
  });

  it('generates coherent CLAUDE.md with project data', async () => {
    const data = makeProjectData();
    await generateClaudeMd(data);

    const content = readFileSync('CLAUDE.md', 'utf8');

    // Project identity
    expect(content).toContain('# e2e-test-project');
    expect(content).toContain('React + Vite, Node.js, PostgreSQL');

    // Required sections exist
    expect(content).toContain('## Framework');
    expect(content).toContain('## Stack');
    expect(content).toContain('## Global rules');
    expect(content).toContain('## Available skills');
    expect(content).toContain('## Subagent rules');

    // Skills are listed
    expect(content).toContain('/build-feature');
    expect(content).toContain('/guild-specialize');
    expect(content).toContain('/session-start');
  });

  it('generates PROJECT.md with all metadata', async () => {
    const data = makeProjectData();
    await generateProjectMd(data);

    const content = readFileSync('PROJECT.md', 'utf8');

    expect(content).toContain('**Name:** e2e-test-project');
    expect(content).toContain('**Type:** webapp');
    expect(content).toContain('**Stack:** React + Vite, Node.js, PostgreSQL');
    expect(content).toContain('**Repository:** https://github.com/test/e2e');
    expect(content).toContain('**Existing code:** Yes');
  });

  it('generates SESSION.md with current date and next steps', async () => {
    await generateSessionMd();

    const content = readFileSync('SESSION.md', 'utf8');
    const today = new Date().toISOString().split('T')[0];

    expect(content).toContain(`**Date:** ${today}`);
    expect(content).toContain('/guild-specialize');
    expect(content).toContain('/build-feature');
  });

  it('full init simulation produces a valid Guild project', async () => {
    const data = makeProjectData({ name: 'full-sim', type: 'api', stack: 'Express, PostgreSQL' });

    // Simulate the full init sequence
    await copyTemplates();
    await generateClaudeMd(data);
    await generateProjectMd(data);
    await generateSessionMd();

    // Verify the project is structurally valid
    const claudeMd = readFileSync('CLAUDE.md', 'utf8');
    const projectMd = readFileSync('PROJECT.md', 'utf8');
    const sessionMd = readFileSync('SESSION.md', 'utf8');

    // CLAUDE.md references the project name
    expect(claudeMd).toContain('# full-sim');

    // PROJECT.md has the correct type
    expect(projectMd).toContain('**Type:** api');

    // SESSION.md is valid
    expect(sessionMd).toContain('## Active session');

    // Agent files are not empty
    const agentPath = join('.claude', 'agents', 'advisor.md');
    const advisorContent = readFileSync(agentPath, 'utf8');
    expect(advisorContent.length).toBeGreaterThan(100);
    expect(advisorContent).toContain('# Advisor');
  });
});
