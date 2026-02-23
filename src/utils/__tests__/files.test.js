import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, rmSync, readdirSync, mkdtempSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { copyTemplates, getAgentNames, resolveProjectRoot } from '../files.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_AGENTS_DIR = join(__dirname, '..', '..', 'templates', 'agents');

const TEST_DIR = join(import.meta.dirname, '__tmp_files__');

describe('getAgentNames', () => {
  it('returns 9 v1 agent names', () => {
    const names = getAgentNames();
    expect(names).toHaveLength(9);
    expect(names).toContain('advisor');
    expect(names).toContain('product-owner');
    expect(names).toContain('tech-lead');
    expect(names).toContain('developer');
    expect(names).toContain('code-reviewer');
    expect(names).toContain('qa');
    expect(names).toContain('bugfix');
    expect(names).toContain('db-migration');
    expect(names).toContain('platform-expert');
  });

  it('does not contain v0 agent names', () => {
    const names = getAgentNames();
    expect(names).not.toContain('code-review');
    expect(names).not.toContain('bug-fixer');
    expect(names).not.toContain('dba');
  });
});

describe('copyTemplates', () => {
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('creates .claude/agents/ with 9 flat .md files', async () => {
    await copyTemplates();
    const agentsDir = join('.claude', 'agents');
    expect(existsSync(agentsDir)).toBe(true);

    const files = readdirSync(agentsDir);
    expect(files).toHaveLength(9);
    for (const name of getAgentNames()) {
      expect(files).toContain(`${name}.md`);
    }
  });

  it('creates .claude/skills/ with 10 skill directories', async () => {
    await copyTemplates();
    const skillsDir = join('.claude', 'skills');
    expect(existsSync(skillsDir)).toBe(true);

    const expectedSkills = [
      'guild-specialize', 'build-feature', 'council', 'new-feature',
      'qa-cycle', 'review', 'status', 'dev-flow', 'session-start', 'session-end',
    ];
    for (const skill of expectedSkills) {
      expect(existsSync(join(skillsDir, skill, 'SKILL.md'))).toBe(true);
    }
  });

  it('does not create v0 directories', async () => {
    await copyTemplates();
    expect(existsSync('tasks')).toBe(false);
    expect(existsSync(join('.claude', 'commands'))).toBe(false);
    expect(existsSync(join('.claude', 'hooks'))).toBe(false);
  });

  it('does not create agent subdirectories', async () => {
    await copyTemplates();
    // Agents should be flat files, not directories
    for (const name of getAgentNames()) {
      const agentPath = join('.claude', 'agents', name);
      // Should not be a directory
      expect(existsSync(join(agentPath, 'base.md'))).toBe(false);
    }
  });
});

// --- Agent template frontmatter validation ---

describe('agent template frontmatter', () => {
  /**
   * Parses YAML frontmatter from a markdown string.
   * Returns an object with the frontmatter fields.
   */
  function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const fields = {};
    for (const line of match[1].split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
        fields[key] = value;
      }
    }
    return fields;
  }

  it('every agent template has required frontmatter fields', () => {
    const requiredFields = ['name', 'description', 'tools', 'permissionMode'];

    for (const agentName of getAgentNames()) {
      const filePath = join(TEMPLATES_AGENTS_DIR, `${agentName}.md`);
      const content = readFileSync(filePath, 'utf8');
      const frontmatter = parseFrontmatter(content);

      for (const field of requiredFields) {
        expect(frontmatter[field], `${agentName}.md missing frontmatter field: ${field}`).toBeDefined();
        expect(frontmatter[field].length, `${agentName}.md has empty frontmatter field: ${field}`).toBeGreaterThan(0);
      }
    }
  });

  it('analysis agents use plan permission mode', () => {
    const analysisAgents = ['advisor', 'product-owner', 'tech-lead', 'code-reviewer'];

    for (const agentName of analysisAgents) {
      const filePath = join(TEMPLATES_AGENTS_DIR, `${agentName}.md`);
      const content = readFileSync(filePath, 'utf8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.permissionMode, `${agentName}.md should use plan mode`).toBe('plan');
      expect(frontmatter.tools, `${agentName}.md should have read-only tools`).not.toContain('Bash');
    }
  });

  it('implementation agents use bypassPermissions mode', () => {
    const implAgents = ['developer', 'bugfix', 'qa', 'db-migration', 'platform-expert'];

    for (const agentName of implAgents) {
      const filePath = join(TEMPLATES_AGENTS_DIR, `${agentName}.md`);
      const content = readFileSync(filePath, 'utf8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.permissionMode, `${agentName}.md should use bypassPermissions`).toBe('bypassPermissions');
      expect(frontmatter.tools, `${agentName}.md should have Bash access`).toContain('Bash');
    }
  });
});

// --- Tests for resolveProjectRoot ---

describe('resolveProjectRoot', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'guild-root-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return null when no project markers found', () => {
    const result = resolveProjectRoot(tempDir);
    expect(result).toBeNull();
  });

  it('should find root when .claude/ directory exists', () => {
    mkdirSync(join(tempDir, '.claude'));
    const result = resolveProjectRoot(tempDir);
    expect(result).toBe(tempDir);
  });

  it('should find root when PROJECT.md exists', () => {
    writeFileSync(join(tempDir, 'PROJECT.md'), '# Test');
    const result = resolveProjectRoot(tempDir);
    expect(result).toBe(tempDir);
  });

  it('should find root from nested subdirectory', () => {
    mkdirSync(join(tempDir, '.claude'));
    const nested = join(tempDir, 'sub1', 'sub2');
    mkdirSync(nested, { recursive: true });
    const result = resolveProjectRoot(nested);
    expect(result).toBe(tempDir);
  });

  it('should not throw when called without arguments', () => {
    expect(() => resolveProjectRoot()).not.toThrow();
  });
});
