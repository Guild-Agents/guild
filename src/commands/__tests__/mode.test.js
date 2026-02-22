import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { parseModeArgs, getAvailableAgents, getCurrentModes } from '../mode.js';

const TEST_DIR = join(import.meta.dirname, '__tmp_mode__');
const AGENTS_DIR = join('.claude', 'agents');

function setup() {
  process.chdir(TEST_DIR);
}

describe('parseModeArgs', () => {
  it('parses + prefix as toAdd', () => {
    const result = parseModeArgs(['+react', '+vite']);
    expect(result.toAdd).toEqual(['react', 'vite']);
    expect(result.toRemove).toEqual([]);
    expect(result.exactSet).toEqual([]);
  });

  it('parses - prefix as toRemove', () => {
    const result = parseModeArgs(['-angular', '-vue']);
    expect(result.toRemove).toEqual(['angular', 'vue']);
    expect(result.toAdd).toEqual([]);
    expect(result.exactSet).toEqual([]);
  });

  it('parses bare args as exactSet', () => {
    const result = parseModeArgs(['react', 'vite']);
    expect(result.exactSet).toEqual(['react', 'vite']);
    expect(result.toAdd).toEqual([]);
    expect(result.toRemove).toEqual([]);
  });

  it('handles mixed args correctly', () => {
    const result = parseModeArgs(['+react', '-angular', 'vite']);
    expect(result.toAdd).toEqual(['react']);
    expect(result.toRemove).toEqual(['angular']);
    expect(result.exactSet).toEqual(['vite']);
  });

  it('handles empty args', () => {
    const result = parseModeArgs([]);
    expect(result.toAdd).toEqual([]);
    expect(result.toRemove).toEqual([]);
    expect(result.exactSet).toEqual([]);
  });
});

describe('getAvailableAgents', () => {
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

  it('returns empty when agents dir does not exist', () => {
    expect(getAvailableAgents()).toEqual([]);
  });

  it('returns agent directory names', () => {
    mkdirSync(join(AGENTS_DIR, 'developer'), { recursive: true });
    mkdirSync(join(AGENTS_DIR, 'qa'), { recursive: true });

    const agents = getAvailableAgents();
    expect(agents).toContain('developer');
    expect(agents).toContain('qa');
  });

  it('ignores files, only returns directories', () => {
    mkdirSync(AGENTS_DIR, { recursive: true });
    mkdirSync(join(AGENTS_DIR, 'developer'), { recursive: true });
    writeFileSync(join(AGENTS_DIR, 'README.md'), 'ignore me', 'utf8');

    const agents = getAvailableAgents();
    expect(agents).toEqual(['developer']);
  });
});

describe('getCurrentModes', () => {
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

  it('returns empty when PROJECT.md does not exist', () => {
    expect(getCurrentModes('developer')).toEqual([]);
  });

  it('parses comma-separated modes', () => {
    writeFileSync('PROJECT.md', '- **developer:** react, vite, node\n', 'utf8');
    expect(getCurrentModes('developer')).toEqual(['react', 'vite', 'node']);
  });

  it('returns empty for "base"', () => {
    writeFileSync('PROJECT.md', '- **product-owner:** base\n', 'utf8');
    expect(getCurrentModes('product-owner')).toEqual([]);
  });

  it('returns empty for placeholder text', () => {
    writeFileSync('PROJECT.md', '- **advisor:** _dominio a especializar con /guild-specialize_\n', 'utf8');
    expect(getCurrentModes('advisor')).toEqual([]);
  });

  it('returns empty for N/A', () => {
    writeFileSync('PROJECT.md', '- **dba:** N/A — no usa base de datos\n', 'utf8');
    expect(getCurrentModes('dba')).toEqual([]);
  });

  it('returns empty for "—"', () => {
    writeFileSync('PROJECT.md', '- **dba:** —\n', 'utf8');
    expect(getCurrentModes('dba')).toEqual([]);
  });

  it('strips annotation suffixes like "(hereda del developer)"', () => {
    writeFileSync('PROJECT.md', '- **bug-fixer:** react, vite (hereda del developer)\n', 'utf8');
    expect(getCurrentModes('bug-fixer')).toEqual(['react', 'vite']);
  });

  it('returns empty for agent not found in PROJECT.md', () => {
    writeFileSync('PROJECT.md', '- **developer:** react\n', 'utf8');
    expect(getCurrentModes('nonexistent')).toEqual([]);
  });
});
