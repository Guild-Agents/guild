import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { generateProjectMd, generateSessionMd, generateClaudeMd } from '../generators.js';

const TEST_DIR = join(import.meta.dirname, '__tmp_generators__');

function setup() {
  process.chdir(TEST_DIR);
}

function makeProjectData(overrides = {}) {
  return {
    name: 'test-project',
    type: 'fullstack',
    stack: 'React + Vite, Node.js + Express, postgres, redis',
    github: { repoUrl: 'https://github.com/test/repo' },
    hasExistingCode: false,
    ...overrides,
  };
}

describe('generateProjectMd', () => {
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    mkdirSync(TEST_DIR, { recursive: true });
    setup();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('generates PROJECT.md with project identity', async () => {
    await generateProjectMd(makeProjectData());
    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Nombre:** test-project');
    expect(content).toContain('**Tipo:** fullstack');
    expect(content).toContain('**Stack:** React + Vite, Node.js + Express, postgres, redis');
  });

  it('generates PROJECT.md with GitHub repo when provided', async () => {
    await generateProjectMd(makeProjectData());
    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Repositorio:** https://github.com/test/repo');
  });

  it('handles project with no repo', async () => {
    await generateProjectMd(makeProjectData({ github: null }));
    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).not.toContain('**Repositorio:**');
  });

  it('marks existing code status correctly', async () => {
    await generateProjectMd(makeProjectData({ hasExistingCode: true }));
    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Codigo existente:** Si');
  });

  it('marks new project status correctly', async () => {
    await generateProjectMd(makeProjectData({ hasExistingCode: false }));
    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Codigo existente:** No');
  });

  it('does not contain v0 concepts', async () => {
    await generateProjectMd(makeProjectData());
    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).not.toContain('Agentes activos');
    expect(content).not.toContain('Estrategia de testing');
    expect(content).not.toContain('Decisiones arquitectonicas');
  });
});

describe('generateClaudeMd', () => {
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    mkdirSync(TEST_DIR, { recursive: true });
    setup();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('generates CLAUDE.md with project name as title', async () => {
    await generateClaudeMd(makeProjectData());
    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).toContain('# test-project');
  });

  it('includes Guild framework reference', async () => {
    await generateClaudeMd(makeProjectData());
    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).toContain('Guild');
    expect(content).toContain('SESSION.md');
  });

  it('includes PENDIENTE placeholders for guild-specialize', async () => {
    await generateClaudeMd(makeProjectData());
    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).toContain('[PENDIENTE: guild-specialize]');
  });

  it('lists skills instead of slash commands', async () => {
    await generateClaudeMd(makeProjectData());
    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).toContain('/build-feature');
    expect(content).toContain('/council');
    expect(content).toContain('/guild-specialize');
    expect(content).toContain('/session-start');
    expect(content).toContain('/session-end');
  });

  it('does not reference v0 concepts', async () => {
    await generateClaudeMd(makeProjectData());
    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).not.toContain('active.md');
    expect(content).not.toContain('composer');
    expect(content).not.toContain('guild mode');
    expect(content).not.toContain('expertise');
  });

  it('includes stack in content', async () => {
    await generateClaudeMd(makeProjectData());
    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).toContain('React + Vite, Node.js + Express, postgres, redis');
  });
});

describe('generateSessionMd', () => {
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    mkdirSync(TEST_DIR, { recursive: true });
    setup();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('generates SESSION.md with correct structure', async () => {
    await generateSessionMd();
    const content = readFileSync('SESSION.md', 'utf8');
    expect(content).toContain('# SESSION.md');
    expect(content).toContain('## Sesion activa');
    expect(content).toContain('**Tarea en curso:**');
  });

  it('includes current date', async () => {
    await generateSessionMd();
    const content = readFileSync('SESSION.md', 'utf8');
    const today = new Date().toISOString().split('T')[0];
    expect(content).toContain(`**Fecha:** ${today}`);
  });

  it('references guild-specialize as next step', async () => {
    await generateSessionMd();
    const content = readFileSync('SESSION.md', 'utf8');
    expect(content).toContain('/guild-specialize');
  });

  it('does not reference v0 tasks directory', async () => {
    await generateSessionMd();
    const content = readFileSync('SESSION.md', 'utf8');
    expect(content).not.toContain('tasks/');
  });
});
