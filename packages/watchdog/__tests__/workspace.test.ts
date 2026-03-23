import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  writeEvent,
  isDuplicate,
  loadHeartbeatState,
  saveHeartbeatState,
  loadWorkspaceFile,
} from '../src/workspace.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, '__tmp_workspace__');

describe('workspace', () => {
  beforeEach(() => {
    mkdirSync(path.join(TEST_DIR, 'events'), { recursive: true });
    mkdirSync(path.join(TEST_DIR, 'stats'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('writeEvent', () => {
    it('writes markdown event file to events/', () => {
      const filePath = writeEvent(TEST_DIR, 'github-ci', 'action', '# CI Failed');
      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, 'utf8')).toContain('CI Failed');
    });
  });

  describe('isDuplicate', () => {
    it('returns false when no events exist', () => {
      expect(isDuplicate(TEST_DIR, 'github-ci', 4)).toBe(false);
    });

    it('returns true when recent event with same source exists', () => {
      writeEvent(TEST_DIR, 'github-ci', 'action', '# CI Failed');
      expect(isDuplicate(TEST_DIR, 'github-ci', 4)).toBe(true);
    });
  });

  describe('heartbeat state', () => {
    it('returns null when no state file exists', () => {
      const state = loadHeartbeatState(TEST_DIR);
      expect(state).toBeNull();
    });

    it('round-trips state through save and load', () => {
      const state = {
        currentInterval: 1800000,
        lastCheckTimestamp: Date.now(),
        lastActivityTimestamp: Date.now(),
        consecutiveOkCount: 3,
      };
      saveHeartbeatState(TEST_DIR, state);
      const loaded = loadHeartbeatState(TEST_DIR);
      expect(loaded).toEqual(state);
    });

    it('returns null on corrupt state file', () => {
      writeFileSync(path.join(TEST_DIR, 'heartbeat-state.json'), 'not json', 'utf8');
      const state = loadHeartbeatState(TEST_DIR);
      expect(state).toBeNull();
    });
  });

  describe('loadWorkspaceFile', () => {
    it('reads a markdown file from workspace', () => {
      writeFileSync(path.join(TEST_DIR, 'SOUL.md'), '# Soul', 'utf8');
      expect(loadWorkspaceFile(TEST_DIR, 'SOUL.md')).toBe('# Soul');
    });

    it('returns empty string for missing file', () => {
      expect(loadWorkspaceFile(TEST_DIR, 'MISSING.md')).toBe('');
    });
  });
});
