import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Unit test for the dual-format detection heuristic (same regex as doctor.js)
describe('dual-format detection heuristic', () => {
  const STEP_PHASE_RE = /^#{1,3}\s.*(step|phase)/im;

  it('matches heading with "Step"', () => {
    expect(STEP_PHASE_RE.test('### Step 1 — Evaluate')).toBe(true);
  });

  it('matches heading with "Phase"', () => {
    expect(STEP_PHASE_RE.test('## Phase 2 — Implementation')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(STEP_PHASE_RE.test('### STEP 1')).toBe(true);
    expect(STEP_PHASE_RE.test('### phase 3')).toBe(true);
  });

  it('matches H1, H2, and H3 only', () => {
    expect(STEP_PHASE_RE.test('# Step 1')).toBe(true);
    expect(STEP_PHASE_RE.test('## Step 1')).toBe(true);
    expect(STEP_PHASE_RE.test('### Step 1')).toBe(true);
  });

  it('does not match H4+', () => {
    expect(STEP_PHASE_RE.test('#### Step 1')).toBe(false);
  });

  it('does not match plain text with step', () => {
    expect(STEP_PHASE_RE.test('This step is important')).toBe(false);
  });

  it('does not match body without step/phase headings', () => {
    const body = '## Notes\n\n- Some note\n- Another note';
    expect(STEP_PHASE_RE.test(body)).toBe(false);
  });

  it('matches within multiline content', () => {
    const body = '## Process\n\nSome text.\n\n### Step 1 — Do something\n\nMore text.';
    expect(STEP_PHASE_RE.test(body)).toBe(true);
  });
});

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
