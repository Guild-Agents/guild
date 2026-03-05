import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, realpathSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { findWorkspaceRoot, loadWorkspace, resolveWorkspaceAgents, generateWorkspaceContext } from '../workspace.js';

describe('findWorkspaceRoot', () => {
  let testDir;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-ws-find-')));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns null when no guild-workspace.json found', () => {
    const result = findWorkspaceRoot(testDir);
    expect(result).toBeNull();
  });

  it('finds workspace root in current directory', () => {
    writeFileSync(join(testDir, 'guild-workspace.json'), '{}');
    const result = findWorkspaceRoot(testDir);
    expect(result).toBe(testDir);
  });

  it('finds workspace root from nested member directory', () => {
    writeFileSync(join(testDir, 'guild-workspace.json'), '{}');
    const nested = join(testDir, 'packages', 'app', 'src');
    mkdirSync(nested, { recursive: true });
    const result = findWorkspaceRoot(nested);
    expect(result).toBe(testDir);
  });
});

describe('loadWorkspace', () => {
  let testDir;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-ws-load-')));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns null when no workspace file exists', () => {
    const result = loadWorkspace(testDir);
    expect(result).toBeNull();
  });

  it('loads and parses guild-workspace.json', () => {
    const config = {
      name: 'my-workspace',
      members: [
        { name: 'app', path: 'packages/app' },
      ],
    };
    writeFileSync(join(testDir, 'guild-workspace.json'), JSON.stringify(config));

    const result = loadWorkspace(testDir);
    expect(result).not.toBeNull();
    expect(result.name).toBe('my-workspace');
    expect(result.root).toBe(testDir);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].name).toBe('app');
  });

  it('resolves member paths relative to workspace root', () => {
    const config = {
      members: [
        { name: 'app', path: 'packages/app' },
        { name: 'lib', path: 'packages/lib' },
      ],
    };
    writeFileSync(join(testDir, 'guild-workspace.json'), JSON.stringify(config));

    const result = loadWorkspace(testDir);
    expect(result.members[0].absolutePath).toBe(join(testDir, 'packages', 'app'));
    expect(result.members[1].absolutePath).toBe(join(testDir, 'packages', 'lib'));
  });
});

describe('resolveWorkspaceAgents', () => {
  let testDir;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-ws-agents-')));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns only local agents when no workspace exists', () => {
    const localDir = join(testDir, 'local-agents');
    mkdirSync(localDir, { recursive: true });
    writeFileSync(join(localDir, 'developer.md'), '# Developer');

    const result = resolveWorkspaceAgents(null, localDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('developer');
    expect(result[0].source).toBe('local');
  });

  it('merges shared and local agents with local-wins', () => {
    const sharedDir = join(testDir, 'shared-agents');
    const localDir = join(testDir, 'local-agents');
    mkdirSync(sharedDir, { recursive: true });
    mkdirSync(localDir, { recursive: true });

    writeFileSync(join(sharedDir, 'advisor.md'), '# Shared Advisor');
    writeFileSync(join(sharedDir, 'developer.md'), '# Shared Developer');
    writeFileSync(join(localDir, 'developer.md'), '# Local Developer');
    writeFileSync(join(localDir, 'qa.md'), '# Local QA');

    const workspace = {
      root: testDir,
      shared: { agents: 'shared-agents' },
    };

    const result = resolveWorkspaceAgents(workspace, localDir);
    expect(result).toHaveLength(3);

    const advisor = result.find(a => a.name === 'advisor');
    expect(advisor.source).toBe('workspace');
    expect(advisor.path).toBe(join(sharedDir, 'advisor.md'));

    const developer = result.find(a => a.name === 'developer');
    expect(developer.source).toBe('local');
    expect(developer.path).toBe(join(localDir, 'developer.md'));

    const qa = result.find(a => a.name === 'qa');
    expect(qa.source).toBe('local');
  });

  it('returns empty array when no agents exist', () => {
    const localDir = join(testDir, 'nonexistent');
    const result = resolveWorkspaceAgents(null, localDir);
    expect(result).toEqual([]);
  });
});

describe('generateWorkspaceContext', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-ws-test-')));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('generates context section from other members PROJECT.md', () => {
    const config = {
      name: 'my-product',
      members: [
        { name: 'backend', path: './backend' },
        { name: 'frontend', path: './frontend' },
      ],
      shared: { agents: '.guild/agents', skills: '.guild/skills' },
    };
    writeFileSync(join(tempDir, 'guild-workspace.json'), JSON.stringify(config));

    const backendDir = join(tempDir, 'backend');
    const frontendDir = join(tempDir, 'frontend');
    mkdirSync(backendDir, { recursive: true });
    mkdirSync(frontendDir, { recursive: true });
    writeFileSync(join(backendDir, 'PROJECT.md'), '# PROJECT.md\n## Project\n- **Stack:** Express, PostgreSQL');
    writeFileSync(join(frontendDir, 'PROJECT.md'), '# PROJECT.md\n## Project\n- **Stack:** React, Vite');

    const workspace = loadWorkspace(tempDir);
    const result = generateWorkspaceContext(workspace, 'backend');

    expect(result).toContain('## Workspace context');
    expect(result).toContain('my-product');
    expect(result).toContain('frontend');
    expect(result).toContain('React, Vite');
    expect(result).not.toContain('Express, PostgreSQL');
  });

  it('returns empty string when workspace is null', () => {
    const result = generateWorkspaceContext(null, 'backend');
    expect(result).toBe('');
  });

  it('returns empty string when current member is the only member', () => {
    const config = {
      name: 'solo',
      members: [{ name: 'app', path: './app' }],
      shared: { agents: '.guild/agents', skills: '.guild/skills' },
    };
    writeFileSync(join(tempDir, 'guild-workspace.json'), JSON.stringify(config));
    mkdirSync(join(tempDir, 'app'), { recursive: true });
    writeFileSync(join(tempDir, 'app', 'PROJECT.md'), '# PROJECT.md\n## Project\n- **Stack:** Node');

    const workspace = loadWorkspace(tempDir);
    const result = generateWorkspaceContext(workspace, 'app');
    expect(result).toBe('');
  });
});
