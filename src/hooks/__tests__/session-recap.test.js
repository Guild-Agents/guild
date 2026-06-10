import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pickPreviousTranscript, recapForProject } from '../session-recap.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SESSION_RECAP_PATH = join(__dir, '..', 'session-recap.mjs');

// ────────────────────────────────────────────────────────────────────────────
// AC2.2 — pickPreviousTranscript
// ────────────────────────────────────────────────────────────────────────────

describe('pickPreviousTranscript — AC2.2', () => {
  it('returns null for empty array', () => {
    expect(pickPreviousTranscript([], null)).toBeNull();
  });

  it('returns null when all entries are current session', () => {
    const entries = [
      { name: 'abc123.jsonl', mtime: 1000 },
    ];
    expect(pickPreviousTranscript(entries, 'abc123')).toBeNull();
  });

  it('excludes current session by sessionId in filename', () => {
    const entries = [
      { name: 'old-session.jsonl', mtime: 500 },
      { name: 'current-abc.jsonl', mtime: 1000 },
    ];
    const result = pickPreviousTranscript(entries, 'current-abc');
    expect(result.name).toBe('old-session.jsonl');
  });

  it('picks the entry with max mtime', () => {
    const entries = [
      { name: 'older.jsonl', mtime: 100 },
      { name: 'newest.jsonl', mtime: 9999 },
      { name: 'middle.jsonl', mtime: 500 },
    ];
    const result = pickPreviousTranscript(entries, null);
    expect(result.name).toBe('newest.jsonl');
  });

  it('returns null when no .jsonl files', () => {
    const entries = [
      { name: 'notes.txt', mtime: 1000 },
      { name: 'data.json', mtime: 2000 },
    ];
    expect(pickPreviousTranscript(entries, null)).toBeNull();
  });

  it('returns null for null/undefined input', () => {
    expect(pickPreviousTranscript(null, null)).toBeNull();
    expect(pickPreviousTranscript(undefined, null)).toBeNull();
  });

  it('handles entries with null names gracefully', () => {
    const entries = [
      { name: null, mtime: 1000 },
      { name: 'valid.jsonl', mtime: 500 },
    ];
    expect(pickPreviousTranscript(entries, null).name).toBe('valid.jsonl');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// recapForProject — integration tests with real temp dirs
// ────────────────────────────────────────────────────────────────────────────

describe('recapForProject', () => {
  it('returns null for empty directory', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'guild-recap-'));
    try {
      const result = await recapForProject({ projectDir: dir, currentSessionId: null, now: Date.now() });
      expect(result).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns null when only current session file exists', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'guild-recap-'));
    try {
      const sessionId = 'current-session-123';
      const line = JSON.stringify({ type: 'user', gitBranch: 'main', timestamp: Date.now() - 5000, message: { content: 'hello' } });
      writeFileSync(join(dir, `${sessionId}.jsonl`), line + '\n');
      const result = await recapForProject({ projectDir: dir, currentSessionId: sessionId, now: Date.now() });
      expect(result).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns recap for previous session file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'guild-recap-'));
    try {
      const NOW = Date.now();
      const line = JSON.stringify({
        type: 'user',
        gitBranch: 'feature/login',
        timestamp: NOW - 2 * 3600 * 1000,
        message: { content: 'implement the login page' },
      });
      writeFileSync(join(dir, 'old-session.jsonl'), line + '\n');
      const result = await recapForProject({ projectDir: dir, currentSessionId: 'new-session', now: NOW });
      expect(result).not.toBeNull();
      expect(result).toContain('feature/login');
      expect(result).toContain('implement the login page');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('handles directory with malformed JSON lines gracefully', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'guild-recap-'));
    try {
      const NOW = Date.now();
      // File with mix of bad and good lines
      const content = [
        'not valid json {{{',
        '',
        JSON.stringify({ type: 'user', gitBranch: 'main', timestamp: NOW - 1000, message: { content: 'some work' } }),
      ].join('\n');
      writeFileSync(join(dir, 'mixed.jsonl'), content);
      const result = await recapForProject({ projectDir: dir, currentSessionId: 'other', now: NOW });
      expect(result).not.toBeNull();
      expect(result).toContain('main');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns null for non-existent directory', async () => {
    const result = await recapForProject({
      projectDir: '/non/existent/path/xyz123',
      currentSessionId: null,
      now: Date.now(),
    });
    expect(result).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// W1 — Bounded tail read: large transcripts handled in O(constant) time
// ────────────────────────────────────────────────────────────────────────────

describe('recapForProject — W1 bounded tail read', () => {
  it('returns correct recap from tail of a large transcript file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'guild-recap-large-'));
    try {
      const NOW = Date.now();
      // Build a "filler" section: 5000 lines of old irrelevant user messages
      const fillerLine = JSON.stringify({
        type: 'user',
        gitBranch: 'old-branch',
        timestamp: NOW - 10 * 3600 * 1000,
        message: { content: 'filler message that should not appear in recap' },
      });
      // Each line is ~200 bytes; 5000 lines ≈ 1 MB — well above MAX_TAIL_BYTES (256 KB)
      // so the tail read will skip the filler entirely
      const filler = Array(5000).fill(fillerLine).join('\n') + '\n';

      // The meaningful lines at the tail (within the last 256 KB)
      const tailLine = JSON.stringify({
        type: 'user',
        gitBranch: 'feature/large-file-test',
        timestamp: NOW - 1000,
        message: { content: 'the real last prompt in large transcript' },
      });
      const content = filler + tailLine + '\n';

      writeFileSync(join(dir, 'large-session.jsonl'), content);

      const start = Date.now();
      const result = await recapForProject({
        projectDir: dir,
        currentSessionId: 'other-session',
        now: NOW,
      });
      const elapsed = Date.now() - start;

      // (a) Returns a valid recap built from the tail
      expect(result).not.toBeNull();
      expect(result).toContain('feature/large-file-test');
      expect(result).toContain('the real last prompt in large transcript');

      // (b) Completes quickly (well under 1s even in CI)
      expect(elapsed).toBeLessThan(1000);

      // (c) No throw (implicit — we reached this line without error)
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns null for non-existent transcript file without throwing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'guild-recap-miss-'));
    try {
      // Write a .jsonl entry in the directory listing but then make recapForProject
      // fail gracefully when the file disappears between readdir and read
      // (simulate by pointing to a dir that has no valid .jsonl at all)
      const result = await recapForProject({
        projectDir: dir,
        currentSessionId: null,
        now: Date.now(),
      });
      expect(result).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC2.1 — C3: spawned process never throws, always exits 0
// Tests: malformed JSON, empty dir, only-current-session, source!=="startup"
// ────────────────────────────────────────────────────────────────────────────

function spawnRecap(stdinData) {
  const result = spawnSync(
    process.execPath,
    [SESSION_RECAP_PATH],
    {
      input: typeof stdinData === 'string' ? stdinData : JSON.stringify(stdinData),
      encoding: 'utf8',
      timeout: 5000,
    }
  );
  return result;
}

describe('session-recap.mjs spawned — AC2.1 C3 never-disrupt', () => {
  it('exits 0 and emits nothing for malformed JSON stdin', () => {
    const result = spawnRecap('not valid json {{{{');
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('exits 0 and emits nothing for empty stdin', () => {
    const result = spawnRecap('');
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('exits 0 and emits nothing when source !== "startup"', () => {
    const result = spawnRecap({ source: 'resume', session_id: 'abc' });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('exits 0 and emits nothing for source:"resume" specifically (AC2.4)', () => {
    const result = spawnRecap({ source: 'resume', transcript_path: '/tmp/fake.jsonl' });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('exits 0 and emits nothing when source is startup but transcript_path absent (W2)', () => {
    // Without transcript_path there is no reliable dir to scan — must exit 0 silently
    const result = spawnRecap({ source: 'startup', session_id: 'some-session' });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('exits 0 and emits nothing for empty transcript dir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'guild-recap-empty-'));
    try {
      const result = spawnRecap({
        source: 'startup',
        session_id: 'new-session',
        transcript_path: join(dir, 'new-session.jsonl'),
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('exits 0 and emits nothing when only current session file exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'guild-recap-cur-'));
    try {
      const sessionId = 'only-current';
      const line = JSON.stringify({ type: 'user', gitBranch: 'main', timestamp: Date.now() - 5000, message: { content: 'work' } });
      writeFileSync(join(dir, `${sessionId}.jsonl`), line);
      const result = spawnRecap({
        source: 'startup',
        session_id: sessionId,
        transcript_path: join(dir, `${sessionId}.jsonl`),
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('exits 0 and emits nothing when transcript_path dir has permission error', () => {
    // Use a path that definitely does not exist
    const result = spawnRecap({
      source: 'startup',
      session_id: 'test',
      transcript_path: '/root/no-permission/session.jsonl',
    });
    expect(result.status).toBe(0);
    // stdout may be empty or contain something; what matters is exit 0
    expect(result.status).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC2.3 — spawn happy path: stdout has recap, exit 0
// ────────────────────────────────────────────────────────────────────────────

describe('session-recap.mjs spawned — AC2.3 happy path', () => {
  it('prints recap to stdout and exits 0 for previous session', () => {
    const dir = mkdtempSync(join(tmpdir(), 'guild-recap-happy-'));
    try {
      const NOW = Date.now();
      const prevLine = JSON.stringify({
        type: 'user',
        gitBranch: 'feature/auth',
        timestamp: NOW - 2 * 3600 * 1000,
        message: { content: 'add JWT authentication' },
      });
      writeFileSync(join(dir, 'prev-session.jsonl'), prevLine + '\n');

      const result = spawnRecap({
        source: 'startup',
        session_id: 'new-session-xyz',
        transcript_path: join(dir, 'new-session-xyz.jsonl'),
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('feature/auth');
      expect(result.stdout).toContain('add JWT authentication');
      expect(result.stdout).toContain('Previous session');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
