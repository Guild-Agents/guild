import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, mkdtempSync, writeFileSync, existsSync, realpathSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('runResetLearnings', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-reset-learnings-')));
    originalCwd = process.cwd();
    // Create a minimal Guild project structure so ensureProjectRoot finds it
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  function createLearningsFile() {
    const dir = join(tempDir, '.claude', 'guild');
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, 'learnings.md');
    writeFileSync(filePath, '# Guild Learnings\n\nTest content', 'utf8');
    return filePath;
  }

  it('with --force deletes existing learnings file', async () => {
    const filePath = createLearningsFile();
    process.chdir(tempDir);

    const { runResetLearnings } = await import('../reset-learnings.js');
    await runResetLearnings({ force: true });

    expect(existsSync(filePath)).toBe(false);
  });

  it('with --force and no learnings file shows info message', async () => {
    process.chdir(tempDir);
    const prompts = await import('@clack/prompts');

    const { runResetLearnings } = await import('../reset-learnings.js');
    await runResetLearnings({ force: true });

    expect(prompts.log.info).toHaveBeenCalledWith(
      expect.stringContaining('No learnings file found'),
    );
  });

  it('prompts for confirmation when --force is not set', async () => {
    createLearningsFile();
    process.chdir(tempDir);
    const prompts = await import('@clack/prompts');
    prompts.confirm.mockResolvedValueOnce(true);

    const { runResetLearnings } = await import('../reset-learnings.js');
    await runResetLearnings({});

    expect(prompts.confirm).toHaveBeenCalled();
  });

  it('deletes file when user confirms', async () => {
    const filePath = createLearningsFile();
    process.chdir(tempDir);
    const prompts = await import('@clack/prompts');
    prompts.confirm.mockResolvedValueOnce(true);

    const { runResetLearnings } = await import('../reset-learnings.js');
    await runResetLearnings({});

    expect(existsSync(filePath)).toBe(false);
  });

  it('does not delete when user cancels', async () => {
    const filePath = createLearningsFile();
    process.chdir(tempDir);
    const prompts = await import('@clack/prompts');
    prompts.confirm.mockResolvedValueOnce(false);

    const { runResetLearnings } = await import('../reset-learnings.js');
    await runResetLearnings({});

    expect(existsSync(filePath)).toBe(true);
  });

  it('throws when not in a Guild project', async () => {
    // Use tempDir without .claude/ marker — remove it so ensureProjectRoot fails
    rmSync(join(tempDir, '.claude'), { recursive: true, force: true });
    process.chdir(tempDir);

    const { runResetLearnings } = await import('../reset-learnings.js');
    await expect(runResetLearnings({ force: true })).rejects.toThrow('Guild project not found');
  });
});
