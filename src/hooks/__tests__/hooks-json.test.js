import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, '..', '..', '..');
const HOOKS_JSON_PATH = join(REPO_ROOT, 'hooks', 'hooks.json');

describe('hooks/hooks.json — AC3.1 valid structure', () => {
  let hooksJson;

  it('file exists and is valid JSON', () => {
    expect(existsSync(HOOKS_JSON_PATH)).toBe(true);
    const raw = readFileSync(HOOKS_JSON_PATH, 'utf8');
    hooksJson = JSON.parse(raw);
    expect(hooksJson).toBeDefined();
  });

  it('has SessionStart hook with startup matcher', () => {
    const raw = readFileSync(HOOKS_JSON_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.hooks).toBeDefined();
    expect(parsed.hooks.SessionStart).toBeDefined();
    expect(Array.isArray(parsed.hooks.SessionStart)).toBe(true);
    const entry = parsed.hooks.SessionStart[0];
    expect(entry.matcher).toBe('startup');
  });

  it('hook is type "command" with timeout 10', () => {
    const raw = readFileSync(HOOKS_JSON_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const entry = parsed.hooks.SessionStart[0];
    expect(Array.isArray(entry.hooks)).toBe(true);
    const hook = entry.hooks[0];
    expect(hook.type).toBe('command');
    expect(hook.timeout).toBe(10);
  });

  it('command uses ${CLAUDE_PLUGIN_ROOT} env var', () => {
    const raw = readFileSync(HOOKS_JSON_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const hook = parsed.hooks.SessionStart[0].hooks[0];
    expect(hook.command).toContain('${CLAUDE_PLUGIN_ROOT}');
    expect(hook.command).toContain('session-recap.mjs');
  });
});

describe('hooks/hooks.json — AC3.2 command path points at existing file', () => {
  it('session-recap.mjs exists at the expected repo-relative path', () => {
    // The command is: node "${CLAUDE_PLUGIN_ROOT}/src/hooks/session-recap.mjs"
    // Verify the file exists relative to repo root
    const hookFilePath = join(REPO_ROOT, 'src', 'hooks', 'session-recap.mjs');
    expect(existsSync(hookFilePath)).toBe(true);
  });
});
