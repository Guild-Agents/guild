import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { composeAgent, composeAllAgents } from '../composer.js';

const TEST_DIR = join(import.meta.dirname, '__tmp_composer__');
const AGENTS_DIR = join('.claude', 'agents');

function setup() {
  process.chdir(TEST_DIR);
}

function createAgent(name, baseContent, expertises = {}) {
  const agentDir = join(AGENTS_DIR, name);
  mkdirSync(join(agentDir, 'expertise'), { recursive: true });
  writeFileSync(join(agentDir, 'base.md'), baseContent, 'utf8');
  for (const [expName, expContent] of Object.entries(expertises)) {
    writeFileSync(join(agentDir, 'expertise', `${expName}.md`), expContent, 'utf8');
  }
}

describe('composeAgent', () => {
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    mkdirSync(TEST_DIR, { recursive: true });
    setup();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('composes active.md from base.md only when no modes', async () => {
    createAgent('advisor', '# Advisor Base\nSome content');

    const result = await composeAgent('advisor', []);

    expect(result).toBe(join(AGENTS_DIR, 'advisor', 'active.md'));
    const content = readFileSync(result, 'utf8');
    expect(content).toContain('# Advisor Base');
    expect(content).toContain('Some content');
    expect(content).toContain('Modos activos: solo base');
    expect(content).toContain('No editar manualmente');
  });

  it('composes active.md with base + expertises', async () => {
    createAgent('developer', '# Developer Base', {
      react: '# React Expertise\nReact patterns',
      vite: '# Vite Expertise\nVite config',
    });

    await composeAgent('developer', ['react', 'vite']);

    const content = readFileSync(join(AGENTS_DIR, 'developer', 'active.md'), 'utf8');
    expect(content).toContain('# Developer Base');
    expect(content).toContain('# React Expertise');
    expect(content).toContain('# Vite Expertise');
    expect(content).toContain('Modos activos: react, vite');
  });

  it('skips missing expertise files silently', async () => {
    createAgent('developer', '# Developer Base', {
      react: '# React Expertise',
    });

    await composeAgent('developer', ['react', 'nonexistent']);

    const content = readFileSync(join(AGENTS_DIR, 'developer', 'active.md'), 'utf8');
    expect(content).toContain('# React Expertise');
    // Missing expertise is not included as content, but appears in modes footer
    expect(content).toContain('Modos activos: react, nonexistent');
    // The actual expertise content should NOT be in the file
    expect(content).not.toContain('# nonexistent Expertise');
  });

  it('throws error when base.md does not exist', async () => {
    mkdirSync(join(AGENTS_DIR, 'ghost'), { recursive: true });

    await expect(composeAgent('ghost')).rejects.toThrow('base.md no encontrado');
  });

  it('includes correct timestamp in footer', async () => {
    createAgent('qa', '# QA Base');

    await composeAgent('qa', []);

    const content = readFileSync(join(AGENTS_DIR, 'qa', 'active.md'), 'utf8');
    const today = new Date().toISOString().split('T')[0];
    expect(content).toContain(`Generado automáticamente por Guild — ${today}`);
  });

  it('separates expertises with --- dividers', async () => {
    createAgent('dev', '# Base', { a: '# A', b: '# B' });

    await composeAgent('dev', ['a', 'b']);

    const content = readFileSync(join(AGENTS_DIR, 'dev', 'active.md'), 'utf8');
    const parts = content.split('---');
    // base + divider before A + divider before B + footer divider = 4 parts minimum
    expect(parts.length).toBeGreaterThanOrEqual(4);
  });
});

describe('composeAllAgents', () => {
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    mkdirSync(TEST_DIR, { recursive: true });
    setup();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('composes all agents based on project data', async () => {
    createAgent('developer', '# Developer');
    createAgent('dba', '# DBA');
    createAgent('qa', '# QA');
    createAgent('bug-fixer', '# Bug Fixer');
    createAgent('code-review', '# Code Review');
    createAgent('tech-lead', '# Tech Lead');
    createAgent('advisor', '# Advisor');
    createAgent('product-owner', '# PO');

    const projectData = {
      stack: { type: 'backend', frontend: null, backend: 'node-express', db: ['postgres'] },
      testing: { framework: 'vitest' },
    };

    const results = await composeAllAgents(projectData);

    expect(results.length).toBe(8);
    const devResult = results.find(r => r.agent === 'developer');
    expect(devResult.modes).toEqual(['node', 'express']);
  });

  it('resolves developer modes from frontend + backend stack', async () => {
    createAgent('developer', '# Dev');
    createAgent('dba', '# DBA');
    createAgent('qa', '# QA');
    createAgent('bug-fixer', '# BF');
    createAgent('code-review', '# CR');
    createAgent('tech-lead', '# TL');
    createAgent('advisor', '# ADV');
    createAgent('product-owner', '# PO');

    const projectData = {
      stack: { type: 'fullstack', frontend: 'react-vite', backend: 'node-express', db: ['none'] },
      testing: { framework: 'vitest' },
    };

    const results = await composeAllAgents(projectData);

    const dev = results.find(r => r.agent === 'developer');
    expect(dev.modes).toEqual(['react', 'vite', 'node', 'express']);

    const bf = results.find(r => r.agent === 'bug-fixer');
    expect(bf.modes).toEqual(['react', 'vite', 'node', 'express']);

    const tl = results.find(r => r.agent === 'tech-lead');
    expect(tl.modes).toContain('react-architecture');
  });
});
