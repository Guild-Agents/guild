import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, readFileSync, rmSync, existsSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  readLearnings,
  writeLearnings,
  learningsExist,
  initLearnings,
  deleteLearnings,
} from '../learnings-io.js';
import { LEARNINGS_SECTIONS } from '../learnings.js';

let tempDir;
let filePath;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'guild-learnings-io-'));
  filePath = join(tempDir, 'learnings.md');
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// --- readLearnings ---

describe('readLearnings', () => {
  it('returns null when file does not exist', () => {
    expect(readLearnings(filePath)).toBeNull();
  });

  it('returns content when file exists', () => {
    writeFileSync(filePath, '# Test content', 'utf8');
    expect(readLearnings(filePath)).toBe('# Test content');
  });
});

// --- writeLearnings ---

describe('writeLearnings', () => {
  it('creates directory structure and writes file', () => {
    const nested = join(tempDir, 'a', 'b', 'learnings.md');
    writeLearnings('# Content', nested);
    expect(readFileSync(nested, 'utf8')).toBe('# Content');
  });

  it('overwrites existing file', () => {
    writeFileSync(filePath, 'old', 'utf8');
    writeLearnings('new', filePath);
    expect(readFileSync(filePath, 'utf8')).toBe('new');
  });
});

// --- learningsExist ---

describe('learningsExist', () => {
  it('returns false when file does not exist', () => {
    expect(learningsExist(filePath)).toBe(false);
  });

  it('returns true when file exists', () => {
    writeFileSync(filePath, '', 'utf8');
    expect(learningsExist(filePath)).toBe(true);
  });
});

// --- initLearnings ---

describe('initLearnings', () => {
  it('creates file when none exists', () => {
    const result = initLearnings('test-project', filePath);
    expect(result).toEqual({ created: true });
    expect(existsSync(filePath)).toBe(true);
  });

  it('does not overwrite existing file', () => {
    writeFileSync(filePath, 'existing content', 'utf8');
    const result = initLearnings('test-project', filePath);
    expect(result).toEqual({ created: false });
    expect(readFileSync(filePath, 'utf8')).toBe('existing content');
  });

  it('creates parent directories', () => {
    const nested = join(tempDir, 'deep', 'nested', 'learnings.md');
    initLearnings('test-project', nested);
    expect(existsSync(nested)).toBe(true);
  });

  it('creates content with all 5 sections', () => {
    initLearnings('test-project', filePath);
    const content = readFileSync(filePath, 'utf8');
    for (const section of LEARNINGS_SECTIONS) {
      expect(content).toContain(`## ${section}`);
    }
  });

  it('includes project name in header', () => {
    initLearnings('my-app', filePath);
    const content = readFileSync(filePath, 'utf8');
    expect(content).toContain('# Guild Learnings — my-app');
  });
});

// --- deleteLearnings ---

describe('deleteLearnings', () => {
  it('deletes existing file', () => {
    writeFileSync(filePath, 'content', 'utf8');
    const result = deleteLearnings(filePath);
    expect(result).toEqual({ deleted: true });
    expect(existsSync(filePath)).toBe(false);
  });

  it('returns false when file does not exist', () => {
    const result = deleteLearnings(filePath);
    expect(result).toEqual({ deleted: false });
  });
});
