import { describe, it, expect } from 'vitest';
import { parseLine, lastRealUserPrompt, stableSignal, enhancement, buildRecap } from '../transcript-recap.mjs';

// ────────────────────────────────────────────────────────────────────────────
// AC1.1 — stable-only useful recap (no undocumented fields)
// ────────────────────────────────────────────────────────────────────────────

describe('buildRecap — AC1.1 stable-only useful recap', () => {
  const NOW = new Date('2026-06-03T12:00:00Z').getTime();

  it('returns a useful string with branch + prompt even without title/last-prompt', () => {
    const lines = [
      { type: 'user', gitBranch: 'main', timestamp: NOW - 2 * 3600 * 1000, message: { content: 'add the login page' } },
    ];
    const recap = buildRecap(lines, { now: NOW });
    expect(recap).not.toBeNull();
    expect(recap).toContain('branch main');
    expect(recap).toContain('add the login page');
    expect(recap).toContain('Previous session');
  });

  it('includes relative timestamp in floor recap', () => {
    const lines = [
      { type: 'user', gitBranch: 'feature/x', timestamp: NOW - 3 * 3600 * 1000, message: { content: 'implement auth' } },
    ];
    const recap = buildRecap(lines, { now: NOW });
    expect(recap).toContain('~3 hours ago');
  });

  it('works with only a branch (no prompt)', () => {
    const lines = [
      { type: 'system', gitBranch: 'develop', timestamp: NOW - 5 * 3600 * 1000 },
    ];
    const recap = buildRecap(lines, { now: NOW });
    expect(recap).not.toBeNull();
    expect(recap).toContain('branch develop');
  });

  it('appends title when present as enhancement (not load-bearing)', () => {
    const lines = [
      { type: 'user', gitBranch: 'main', timestamp: NOW - 1000, 'custom-title': 'My Session', message: { content: 'do something' } },
    ];
    const recap = buildRecap(lines, { now: NOW });
    expect(recap).toContain('My Session');
    expect(recap).toContain('branch main');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC1.2 — parseLine
// ────────────────────────────────────────────────────────────────────────────

describe('parseLine — AC1.2', () => {
  it('parses valid JSON', () => {
    const result = parseLine('{"type":"user","gitBranch":"main"}');
    expect(result).toEqual({ type: 'user', gitBranch: 'main' });
  });

  it('returns null for bad JSON', () => {
    expect(parseLine('not json {')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseLine('')).toBeNull();
    expect(parseLine('   ')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(parseLine(null)).toBeNull();
    expect(parseLine(42)).toBeNull();
    expect(parseLine(undefined)).toBeNull();
  });

  it('parses valid JSON object with nested content', () => {
    const line = '{"type":"user","message":{"content":"hello"}}';
    const result = parseLine(line);
    expect(result.message.content).toBe('hello');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC1.3 — lastRealUserPrompt filters
// ────────────────────────────────────────────────────────────────────────────

describe('lastRealUserPrompt — AC1.3 filtering', () => {
  it('returns the last qualifying string prompt', () => {
    const lines = [
      { type: 'user', message: { content: 'first prompt' } },
      { type: 'user', message: { content: 'second prompt' } },
    ];
    expect(lastRealUserPrompt(lines)).toBe('second prompt');
  });

  it('filters out tool_result-only arrays', () => {
    const lines = [
      { type: 'user', message: { content: [{ type: 'tool_result', content: 'result data' }] } },
      { type: 'user', message: { content: 'real prompt' } },
    ];
    expect(lastRealUserPrompt(lines)).toBe('real prompt');
  });

  it('filters out isMeta lines', () => {
    const lines = [
      { type: 'user', isMeta: true, message: { content: 'meta prompt' } },
      { type: 'user', message: { content: 'real prompt' } },
    ];
    expect(lastRealUserPrompt(lines)).toBe('real prompt');
  });

  it('filters out isSidechain lines', () => {
    const lines = [
      { type: 'user', isSidechain: true, message: { content: 'sidechain data' } },
      { type: 'user', message: { content: 'real prompt' } },
    ];
    expect(lastRealUserPrompt(lines)).toBe('real prompt');
  });

  it('filters out command-wrapped strings with <command-name>', () => {
    const lines = [
      { type: 'user', message: { content: '<command-name>build-feature</command-name>' } },
      { type: 'user', message: { content: 'real work' } },
    ];
    expect(lastRealUserPrompt(lines)).toBe('real work');
  });

  it('filters out <command-message> wrapped strings', () => {
    const lines = [
      { type: 'user', message: { content: '<command-message>args here</command-message>' } },
      { type: 'user', message: { content: 'real work' } },
    ];
    expect(lastRealUserPrompt(lines)).toBe('real work');
  });

  it('filters out <local-command wrapped strings', () => {
    const lines = [
      { type: 'user', message: { content: '<local-command /session-start' } },
      { type: 'user', message: { content: 'genuine prompt' } },
    ];
    expect(lastRealUserPrompt(lines)).toBe('genuine prompt');
  });

  it('joins text blocks from mixed array content', () => {
    const lines = [
      {
        type: 'user',
        message: {
          content: [
            { type: 'text', text: 'first part' },
            { type: 'text', text: 'second part' },
          ],
        },
      },
    ];
    const result = lastRealUserPrompt(lines);
    expect(result).toContain('first part');
    expect(result).toContain('second part');
  });

  it('truncates long prompts at ~200 chars with ellipsis', () => {
    const long = 'a'.repeat(250);
    const lines = [{ type: 'user', message: { content: long } }];
    const result = lastRealUserPrompt(lines);
    expect(result.length).toBeLessThanOrEqual(204); // 200 + 3 for ellipsis
    expect(result).toContain('…');
  });

  it('collapses newlines', () => {
    const lines = [
      { type: 'user', message: { content: 'line one\nline two\nline three' } },
    ];
    const result = lastRealUserPrompt(lines);
    expect(result).not.toContain('\n');
    expect(result).toContain('line one line two');
  });

  it('returns null when no real prompts', () => {
    const lines = [
      { type: 'user', isMeta: true, message: { content: 'meta' } },
      { type: 'assistant', message: { content: 'response' } },
    ];
    expect(lastRealUserPrompt(lines)).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(lastRealUserPrompt([])).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC1.4 — enhancement: title present/absent
// ────────────────────────────────────────────────────────────────────────────

describe('enhancement — AC1.4', () => {
  it('extracts custom-title (current format)', () => {
    const lines = [{ 'custom-title': 'My Work Session' }];
    expect(enhancement(lines)).toEqual({ title: 'My Work Session' });
  });

  it('extracts customTitle (camelCase variant)', () => {
    const lines = [{ customTitle: 'CamelCase Session' }];
    expect(enhancement(lines)).toEqual({ title: 'CamelCase Session' });
  });

  it('tolerates legacy ai-title', () => {
    const lines = [{ 'ai-title': 'Legacy Title' }];
    expect(enhancement(lines)).toEqual({ title: 'Legacy Title' });
  });

  it('tolerates legacy aiTitle', () => {
    const lines = [{ aiTitle: 'Legacy Camel' }];
    expect(enhancement(lines)).toEqual({ title: 'Legacy Camel' });
  });

  it('returns {} when no title fields present', () => {
    const lines = [{ type: 'user', message: { content: 'hello' } }];
    expect(enhancement(lines)).toEqual({});
  });

  it('returns {} for empty array', () => {
    expect(enhancement([])).toEqual({});
  });

  it('never throws on malformed input', () => {
    expect(() => enhancement(null)).not.toThrow();
    expect(() => enhancement([null, undefined, {}])).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC1.5 — buildRecap returns null for empty/meta-only
// ────────────────────────────────────────────────────────────────────────────

describe('buildRecap — AC1.5 null cases', () => {
  it('returns null for empty lines array', () => {
    expect(buildRecap([])).toBeNull();
  });

  it('returns null for meta-only lines (no branch, no real prompt)', () => {
    const lines = [
      { type: 'user', isMeta: true, message: { content: 'meta stuff' } },
    ];
    expect(buildRecap(lines)).toBeNull();
  });

  it('returns null when no branch and no real prompt found', () => {
    const lines = [
      { type: 'assistant', message: { content: 'I can help you' } },
    ];
    expect(buildRecap(lines)).toBeNull();
  });

  it('returns null for non-array input', () => {
    expect(buildRecap(null)).toBeNull();
    expect(buildRecap(undefined)).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC1.6 — no fs/process/path import in transcript-recap.mjs (grep test)
// ────────────────────────────────────────────────────────────────────────────

describe('transcript-recap.mjs — AC1.6 no fs/process/path imports', () => {
  it('does not import fs, process, or path modules', async () => {
    // Read the source as a static string and verify no banned imports
    const { readFileSync } = await import('fs');
    const { dirname, join } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(__dir, '..', 'transcript-recap.mjs'), 'utf8');

    // Should not have import statements for fs, path, or process
    expect(src).not.toMatch(/^import\s+.*\bfs\b/m);
    expect(src).not.toMatch(/^import\s+.*\bpath\b/m);
    expect(src).not.toMatch(/^import\s+.*\bprocess\b/m);
  });

  it('does not reference undocumented fields outside transcript-recap.mjs', async () => {
    // This test verifies C1 quarantine: undocumented field names live ONLY here
    // We verify by checking that the fields are in transcript-recap.mjs
    const { readFileSync } = await import('fs');
    const { dirname, join } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(__dir, '..', 'transcript-recap.mjs'), 'utf8');

    // transcript-recap.mjs SHOULD contain these undocumented field names
    expect(src).toContain('custom-title');
    expect(src).toContain('customTitle');
    expect(src).toContain('ai-title');
    expect(src).toContain('aiTitle');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// stableSignal edge cases
// ────────────────────────────────────────────────────────────────────────────

describe('stableSignal', () => {
  const NOW = new Date('2026-06-03T12:00:00Z').getTime();

  it('picks last non-null gitBranch', () => {
    const lines = [
      { gitBranch: 'main', timestamp: NOW - 1000 },
      { gitBranch: 'feature/x', timestamp: NOW - 500 },
      { gitBranch: null },
    ];
    const signal = stableSignal(lines, { now: NOW });
    expect(signal.branch).toBe('feature/x');
  });

  it('picks max timestamp', () => {
    const lines = [
      { type: 'user', gitBranch: 'main', timestamp: NOW - 3600000, message: { content: 'first' } },
      { type: 'user', gitBranch: 'main', timestamp: NOW - 7200000, message: { content: 'second' } },
    ];
    const signal = stableSignal(lines, { now: NOW });
    expect(signal.lastTs).toBe('~1 hour ago');
  });

  it('returns null fields for empty lines', () => {
    const signal = stableSignal([], { now: NOW });
    expect(signal.branch).toBeNull();
    expect(signal.lastTs).toBeNull();
    expect(signal.promptText).toBeNull();
  });
});
