import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, realpathSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('guild workspace init', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-ws-cmd-')));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates guild-workspace.json with given name and members', async () => {
    const { createWorkspaceFile } = await import('../workspace.js');
    await createWorkspaceFile('my-product', ['./backend', './frontend']);
    expect(existsSync('guild-workspace.json')).toBe(true);
    const config = JSON.parse(readFileSync('guild-workspace.json', 'utf8'));
    expect(config.name).toBe('my-product');
    expect(config.members).toHaveLength(2);
    expect(config.members[0].path).toBe('./backend');
    expect(config.members[1].path).toBe('./frontend');
  });

  it('creates .guild/agents and .guild/skills directories', async () => {
    const { createWorkspaceFile } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./app']);
    expect(existsSync(join('.guild', 'agents'))).toBe(true);
    expect(existsSync(join('.guild', 'skills'))).toBe(true);
  });

  it('derives member name from path', async () => {
    const { createWorkspaceFile } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./my-backend']);
    const config = JSON.parse(readFileSync('guild-workspace.json', 'utf8'));
    expect(config.members[0].name).toBe('my-backend');
  });
});

describe('guild workspace add', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-ws-cmd-')));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('adds a member to existing workspace', async () => {
    const { createWorkspaceFile, addWorkspaceMember } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./api']);
    await addWorkspaceMember('./web');
    const config = JSON.parse(readFileSync('guild-workspace.json', 'utf8'));
    expect(config.members).toHaveLength(2);
    expect(config.members[1].name).toBe('web');
  });

  it('throws when no workspace exists', async () => {
    const { addWorkspaceMember } = await import('../workspace.js');
    await expect(addWorkspaceMember('./web')).rejects.toThrow('No workspace found');
  });

  it('throws when member already exists', async () => {
    const { createWorkspaceFile, addWorkspaceMember } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./api']);
    await expect(addWorkspaceMember('./api')).rejects.toThrow('already a member');
  });
});

describe('guild workspace status', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-ws-cmd-')));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns workspace info with member status', async () => {
    const { createWorkspaceFile, getWorkspaceStatus } = await import('../workspace.js');
    await createWorkspaceFile('my-product', ['./backend', './frontend']);
    mkdirSync(join('backend', '.claude'), { recursive: true });

    const status = await getWorkspaceStatus();
    expect(status.name).toBe('my-product');
    expect(status.members).toHaveLength(2);
    expect(status.members[0].initialized).toBe(true);
    expect(status.members[1].initialized).toBe(false);
  });
});

describe('guild workspace run', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-ws-cmd-')));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs a preset command in a specific member', async () => {
    const { createWorkspaceFile, runWorkspaceCommand } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./app']);
    mkdirSync(join(tempDir, 'app'), { recursive: true });
    writeFileSync(join(tempDir, 'app', 'package.json'), JSON.stringify({
      name: 'app',
      scripts: { test: 'echo ok' },
    }));

    const results = runWorkspaceCommand('app', 'test', {});
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('passed');
  });

  it('runs a custom command with --cmd', async () => {
    const { createWorkspaceFile, runWorkspaceCommand } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./app']);
    mkdirSync(join(tempDir, 'app'), { recursive: true });

    const results = runWorkspaceCommand('app', null, { cmd: 'node -e console.log(42)' });
    expect(results).toHaveLength(1);
    expect(results[0].output).toContain('42');
  });

  it('runs in all members with --all', async () => {
    const { createWorkspaceFile, runWorkspaceCommand } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./api', './web']);
    mkdirSync(join(tempDir, 'api'), { recursive: true });
    mkdirSync(join(tempDir, 'web'), { recursive: true });
    writeFileSync(join(tempDir, 'api', 'package.json'), JSON.stringify({
      name: 'api',
      scripts: { test: 'echo ok' },
    }));
    writeFileSync(join(tempDir, 'web', 'package.json'), JSON.stringify({
      name: 'web',
      scripts: { test: 'echo ok' },
    }));

    const results = runWorkspaceCommand(null, 'test', { all: true });
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('passed');
    expect(results[1].status).toBe('passed');
  });

  it('throws when member is not found', async () => {
    const { createWorkspaceFile, runWorkspaceCommand } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./app']);

    expect(() => runWorkspaceCommand('ghost', 'test', {})).toThrow('Available: app');
  });

  it('throws when no preset and no --cmd given', async () => {
    const { createWorkspaceFile, runWorkspaceCommand } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./app']);

    expect(() => runWorkspaceCommand('app', null, {})).toThrow('Unknown command');
  });
});
