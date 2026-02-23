import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('runDoctor', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'guild-doctor-'));
    originalCwd = process.cwd();
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should pass all checks for a healthy project', async () => {
    // Setup a complete Guild project
    mkdirSync(join(tempDir, '.claude', 'agents'), { recursive: true });
    mkdirSync(join(tempDir, '.claude', 'skills', 'build-feature'), { recursive: true });
    writeFileSync(join(tempDir, '.claude', 'agents', 'advisor.md'), '---\nname: advisor\n---');
    writeFileSync(join(tempDir, '.claude', 'skills', 'build-feature', 'SKILL.md'), '---\nname: build-feature\n---');
    writeFileSync(join(tempDir, 'CLAUDE.md'), '# CLAUDE');
    writeFileSync(join(tempDir, 'PROJECT.md'), '# PROJECT');
    writeFileSync(join(tempDir, 'SESSION.md'), '# SESSION');

    process.chdir(tempDir);
    const { runDoctor } = await import('../doctor.js');
    // Should not throw for healthy project
    await expect(runDoctor()).resolves.toBeUndefined();
  });

  it('should throw when .claude directory is missing', async () => {
    writeFileSync(join(tempDir, 'CLAUDE.md'), '# CLAUDE');
    writeFileSync(join(tempDir, 'PROJECT.md'), '# PROJECT');
    writeFileSync(join(tempDir, 'SESSION.md'), '# SESSION');

    process.chdir(tempDir);
    const { runDoctor } = await import('../doctor.js');
    await expect(runDoctor()).rejects.toThrow('Guild setup has issues');
  });

  it('should throw when agents directory is empty', async () => {
    mkdirSync(join(tempDir, '.claude', 'agents'), { recursive: true });
    mkdirSync(join(tempDir, '.claude', 'skills', 'test-skill'), { recursive: true });
    writeFileSync(join(tempDir, '.claude', 'skills', 'test-skill', 'SKILL.md'), '---\nname: test\n---');
    writeFileSync(join(tempDir, 'CLAUDE.md'), '# CLAUDE');
    writeFileSync(join(tempDir, 'PROJECT.md'), '# PROJECT');
    writeFileSync(join(tempDir, 'SESSION.md'), '# SESSION');

    process.chdir(tempDir);
    const { runDoctor } = await import('../doctor.js');
    await expect(runDoctor()).rejects.toThrow('Guild setup has issues');
  });

  it('should throw when CLAUDE.md is missing', async () => {
    mkdirSync(join(tempDir, '.claude', 'agents'), { recursive: true });
    mkdirSync(join(tempDir, '.claude', 'skills', 'test-skill'), { recursive: true });
    writeFileSync(join(tempDir, '.claude', 'agents', 'advisor.md'), '---\nname: advisor\n---');
    writeFileSync(join(tempDir, '.claude', 'skills', 'test-skill', 'SKILL.md'), '---\nname: test\n---');
    writeFileSync(join(tempDir, 'PROJECT.md'), '# PROJECT');
    writeFileSync(join(tempDir, 'SESSION.md'), '# SESSION');

    process.chdir(tempDir);
    const { runDoctor } = await import('../doctor.js');
    await expect(runDoctor()).rejects.toThrow('Guild setup has issues');
  });

  it('should throw when PROJECT.md is missing', async () => {
    mkdirSync(join(tempDir, '.claude', 'agents'), { recursive: true });
    mkdirSync(join(tempDir, '.claude', 'skills', 'test-skill'), { recursive: true });
    writeFileSync(join(tempDir, '.claude', 'agents', 'advisor.md'), '---\nname: advisor\n---');
    writeFileSync(join(tempDir, '.claude', 'skills', 'test-skill', 'SKILL.md'), '---\nname: test\n---');
    writeFileSync(join(tempDir, 'CLAUDE.md'), '# CLAUDE');
    writeFileSync(join(tempDir, 'SESSION.md'), '# SESSION');

    process.chdir(tempDir);
    const { runDoctor } = await import('../doctor.js');
    await expect(runDoctor()).rejects.toThrow('Guild setup has issues');
  });
});
