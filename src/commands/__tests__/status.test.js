import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('runStatus', () => {
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

  it('should throw when no Guild project found', async () => {
    process.chdir(tempDir);
    const { runStatus } = await import('../status.js');
    await expect(runStatus()).rejects.toThrow('Guild project not found');
  });

  it('should not throw when PROJECT.md exists', async () => {
    process.chdir(tempDir);
    writeFileSync(join(tempDir, 'PROJECT.md'), '**Name:** TestProject\n**Stack:** Node.js');
    mkdirSync(join(tempDir, '.claude', 'agents'), { recursive: true });
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true });
    const { runStatus } = await import('../status.js');
    await expect(runStatus()).resolves.not.toThrow();
  });
});
