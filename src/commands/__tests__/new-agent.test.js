import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('runNewAgent', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'guild-test-'));
    originalCwd = process.cwd();
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should throw with invalid agent name', async () => {
    process.chdir(tempDir);
    const { runNewAgent } = await import('../new-agent.js');
    await expect(runNewAgent('Invalid Name!')).rejects.toThrow('Nombre invalido');
  });

  it('should throw when .claude/agents/ does not exist', async () => {
    process.chdir(tempDir);
    const { runNewAgent } = await import('../new-agent.js');
    await expect(runNewAgent('valid-name')).rejects.toThrow('Guild no esta instalado');
  });

  it('should throw when agent already exists', async () => {
    process.chdir(tempDir);
    mkdirSync(join(tempDir, '.claude', 'agents'), { recursive: true });
    writeFileSync(join(tempDir, '.claude', 'agents', 'existing.md'), '# existing');
    const { runNewAgent } = await import('../new-agent.js');
    await expect(runNewAgent('existing')).rejects.toThrow('ya existe');
  });
});
