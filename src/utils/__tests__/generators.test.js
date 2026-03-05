import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { generateProjectMd, generateSessionMd, generateClaudeMd, inferCodeConventions, inferEnvVars } from '../generators.js';

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
    expect(content).toContain('**Name:** test-project');
    expect(content).toContain('**Type:** fullstack');
    expect(content).toContain('**Stack:** React + Vite, Node.js + Express, postgres, redis');
  });

  it('generates PROJECT.md with GitHub repo when provided', async () => {
    await generateProjectMd(makeProjectData());
    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Repository:** https://github.com/test/repo');
  });

  it('handles project with no repo', async () => {
    await generateProjectMd(makeProjectData({ github: null }));
    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).not.toContain('**Repository:**');
  });

  it('marks existing code status correctly', async () => {
    await generateProjectMd(makeProjectData({ hasExistingCode: true }));
    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Existing code:** Yes');
  });

  it('marks new project status correctly', async () => {
    await generateProjectMd(makeProjectData({ hasExistingCode: false }));
    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Existing code:** No');
  });

  it('does not contain v0 concepts', async () => {
    await generateProjectMd(makeProjectData());
    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).not.toContain('Active agents');
    expect(content).not.toContain('Testing strategy');
    expect(content).not.toContain('Architectural decisions');
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

  it('wraps auto-generated sections with guild zone markers', async () => {
    await generateClaudeMd(makeProjectData());
    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).toContain('<!-- guild:auto-start:structure -->');
    expect(content).toContain('<!-- guild:auto-end:structure -->');
    expect(content).toContain('<!-- guild:auto-start:architecture -->');
    expect(content).toContain('<!-- guild:auto-end:architecture -->');
    expect(content).toContain('<!-- guild:auto-start:conventions -->');
    expect(content).toContain('<!-- guild:auto-end:conventions -->');
    expect(content).toContain('<!-- guild:auto-start:env-vars -->');
    expect(content).toContain('<!-- guild:auto-end:env-vars -->');
  });

  it('does not wrap user-owned sections with markers', async () => {
    await generateClaudeMd(makeProjectData());
    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).not.toContain('guild:auto-start:global-rules');
    expect(content).not.toContain('guild:auto-start:subagent-rules');
    expect(content).not.toContain('guild:auto-start:skills');
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

  it('generates inferred Code conventions instead of placeholder', async () => {
    await generateClaudeMd(makeProjectData({ type: 'webapp', stack: 'React + Vite' }));
    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).toContain('## Code conventions');
    expect(content).not.toMatch(/## Code conventions\n\[PENDING/);
    expect(content).toContain('PascalCase');
  });

  it('generates inferred Environment variables instead of placeholder', async () => {
    await generateClaudeMd(makeProjectData({ type: 'api', stack: 'Express, PostgreSQL, Redis' }));
    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).toContain('## Environment variables');
    expect(content).not.toMatch(/## Environment variables\n\[PENDING/);
    expect(content).toContain('DATABASE_URL');
    expect(content).toContain('REDIS_URL');
  });
});

describe('inferCodeConventions', () => {
  it('infers React conventions from stack', () => {
    const result = inferCodeConventions('webapp', 'React + Vite, TailwindCSS');
    expect(result).toContain('PascalCase');
    expect(result).toContain('CSS Modules or Tailwind');
  });

  it('infers Express conventions from stack', () => {
    const result = inferCodeConventions('api', 'Node.js + Express, PostgreSQL');
    expect(result).toContain('Controllers/routes');
    expect(result).toContain('Async/await');
  });

  it('infers TypeScript conventions from stack', () => {
    const result = inferCodeConventions('webapp', 'Next.js, TypeScript, Prisma');
    expect(result).toContain('Strict TypeScript');
    expect(result).toContain('PascalCase');
  });

  it('falls back to type-specific conventions for CLI', () => {
    const result = inferCodeConventions('cli', 'custom-framework');
    expect(result).toContain('Commander.js');
    expect(result).toContain('ESModules');
  });

  it('falls back to generic conventions for unknown stack', () => {
    const result = inferCodeConventions('fullstack', 'custom-framework');
    expect(result).toContain('naming conventions');
  });

  it('deduplicates accumulated rules', () => {
    const result = inferCodeConventions('webapp', 'React, Next.js');
    const lines = result.split('\n');
    const unique = [...new Set(lines)];
    expect(lines).toEqual(unique);
  });

  it('falls back to generic conventions for mobile with unknown stack', () => {
    const result = inferCodeConventions('mobile', 'custom-framework');
    expect(result).toContain('naming conventions');
  });
});

describe('inferEnvVars', () => {
  it('infers Supabase env vars from stack', () => {
    const result = inferEnvVars('webapp', 'Next.js, Supabase');
    expect(result).toContain('SUPABASE_URL');
    expect(result).toContain('SUPABASE_ANON_KEY');
  });

  it('infers Postgres env vars from stack', () => {
    const result = inferEnvVars('api', 'Express, PostgreSQL');
    expect(result).toContain('DATABASE_URL');
  });

  it('accumulates multiple stack matches', () => {
    const result = inferEnvVars('api', 'Express, PostgreSQL, Redis, Stripe');
    expect(result).toContain('DATABASE_URL');
    expect(result).toContain('REDIS_URL');
    expect(result).toContain('STRIPE_SECRET_KEY');
  });

  it('falls back to webapp vars when no stack match', () => {
    const result = inferEnvVars('webapp', 'custom-framework');
    expect(result).toContain('NODE_ENV');
    expect(result).toContain('API_URL');
  });

  it('falls back to api vars when no stack match', () => {
    const result = inferEnvVars('api', 'custom-framework');
    expect(result).toContain('NODE_ENV');
    expect(result).toContain('PORT');
  });

  it('falls back to NODE_ENV for unknown type', () => {
    const result = inferEnvVars('other', 'custom-framework');
    expect(result).toContain('NODE_ENV');
  });

  it('deduplicates accumulated vars', () => {
    const result = inferEnvVars('api', 'Supabase, PostgreSQL');
    const lines = result.split('\n');
    const unique = [...new Set(lines)];
    expect(lines).toEqual(unique);
  });

  it('infers Firebase env vars from stack', () => {
    const result = inferEnvVars('webapp', 'React + Firebase');
    expect(result).toContain('FIREBASE_API_KEY');
    expect(result).toContain('FIREBASE_PROJECT_ID');
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
    expect(content).toContain('## Active session');
    expect(content).toContain('**Current task:**');
  });

  it('includes current date', async () => {
    await generateSessionMd();
    const content = readFileSync('SESSION.md', 'utf8');
    const today = new Date().toISOString().split('T')[0];
    expect(content).toContain(`**Date:** ${today}`);
  });

  it('references guild-specialize as next step', async () => {
    await generateSessionMd();
    const content = readFileSync('SESSION.md', 'utf8');
    expect(content).toContain('/guild-specialize');
  });

  it('references council as next step', async () => {
    await generateSessionMd();
    const content = readFileSync('SESSION.md', 'utf8');
    expect(content).toContain('/council');
  });

  it('does not reference v0 tasks directory', async () => {
    await generateSessionMd();
    const content = readFileSync('SESSION.md', 'utf8');
    expect(content).not.toContain('tasks/');
  });
});
