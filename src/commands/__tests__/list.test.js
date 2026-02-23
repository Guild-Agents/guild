import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('runList', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'guild-list-'));
    originalCwd = process.cwd();
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should list agents and skills with descriptions', async () => {
    mkdirSync(join(tempDir, '.claude', 'agents'), { recursive: true });
    mkdirSync(join(tempDir, '.claude', 'skills', 'build-feature'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claude', 'agents', 'advisor.md'),
      '---\nname: advisor\ndescription: "Strategic advisor"\n---\n# Advisor'
    );
    writeFileSync(
      join(tempDir, '.claude', 'skills', 'build-feature', 'SKILL.md'),
      '---\nname: build-feature\ndescription: "Full pipeline"\n---\n# Build Feature'
    );

    process.chdir(tempDir);
    const { runList } = await import('../list.js');
    await expect(runList()).resolves.toBeUndefined();
  });

  it('should handle missing agents directory', async () => {
    mkdirSync(join(tempDir, '.claude', 'skills', 'test'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claude', 'skills', 'test', 'SKILL.md'),
      '---\nname: test\n---'
    );

    process.chdir(tempDir);
    const { runList } = await import('../list.js');
    await expect(runList()).resolves.toBeUndefined();
  });

  it('should handle missing skills directory', async () => {
    mkdirSync(join(tempDir, '.claude', 'agents'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claude', 'agents', 'advisor.md'),
      '---\nname: advisor\n---'
    );

    process.chdir(tempDir);
    const { runList } = await import('../list.js');
    await expect(runList()).resolves.toBeUndefined();
  });

  it('should handle empty directories', async () => {
    mkdirSync(join(tempDir, '.claude', 'agents'), { recursive: true });
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true });

    process.chdir(tempDir);
    const { runList } = await import('../list.js');
    await expect(runList()).resolves.toBeUndefined();
  });

  it('should handle agents without frontmatter', async () => {
    mkdirSync(join(tempDir, '.claude', 'agents'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claude', 'agents', 'custom.md'),
      '# Custom Agent\nNo frontmatter here'
    );

    process.chdir(tempDir);
    const { runList } = await import('../list.js');
    await expect(runList()).resolves.toBeUndefined();
  });
});
