import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, rmSync, readdirSync, mkdtempSync, writeFileSync, readFileSync, realpathSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { copyTemplates, ensureProjectRoot, getAgentNames, getSkillNames, parseFrontmatter, resolveProjectRoot } from '../files.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_AGENTS_DIR = join(__dirname, '..', '..', 'templates', 'agents');

const TEST_DIR = join(import.meta.dirname, '__tmp_files__');

describe('getAgentNames', () => {
  it('reads agent names from the templates directory', () => {
    const names = getAgentNames();
    // Should match the .md files in src/templates/agents/
    expect(names).toHaveLength(10);
    expect(names).toContain('advisor');
    expect(names).toContain('product-owner');
    expect(names).toContain('tech-lead');
    expect(names).toContain('developer');
    expect(names).toContain('code-reviewer');
    expect(names).toContain('qa');
    expect(names).toContain('bugfix');
    expect(names).toContain('db-migration');
    expect(names).toContain('platform-expert');
    expect(names).toContain('learnings-extractor');
  });

  it('returns names sorted alphabetically', () => {
    const names = getAgentNames();
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it('does not contain v0 agent names', () => {
    const names = getAgentNames();
    expect(names).not.toContain('code-review');
    expect(names).not.toContain('bug-fixer');
    expect(names).not.toContain('dba');
  });
});

describe('getSkillNames', () => {
  it('reads skill names from the templates directory', () => {
    const names = getSkillNames();
    // Should match the directories in src/templates/skills/
    expect(names).toHaveLength(14);
    expect(names).toContain('build-feature');
    expect(names).toContain('council');
    expect(names).toContain('create-pr');
    expect(names).toContain('debug');
    expect(names).toContain('dev-flow');
    expect(names).toContain('guild-specialize');
    expect(names).toContain('new-feature');
    expect(names).toContain('qa-cycle');
    expect(names).toContain('review');
    expect(names).toContain('session-end');
    expect(names).toContain('session-start');
    expect(names).toContain('tdd');
    expect(names).toContain('verify');
    expect(names).toContain('status');
  });

  it('returns names sorted alphabetically', () => {
    const names = getSkillNames();
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
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

  it('creates .claude/agents/ with 10 flat .md files', async () => {
    await copyTemplates();
    const agentsDir = join('.claude', 'agents');
    expect(existsSync(agentsDir)).toBe(true);

    const files = readdirSync(agentsDir);
    expect(files).toHaveLength(10);
    for (const name of getAgentNames()) {
      expect(files).toContain(`${name}.md`);
    }
  });

  it('creates .claude/skills/ with 11 skill directories', async () => {
    await copyTemplates();
    const skillsDir = join('.claude', 'skills');
    expect(existsSync(skillsDir)).toBe(true);

    const expectedSkills = [
      'guild-specialize', 'build-feature', 'council', 'create-pr', 'new-feature',
      'qa-cycle', 'review', 'status', 'dev-flow', 'session-start', 'session-end',
    ];
    for (const skill of expectedSkills) {
      expect(existsSync(join(skillsDir, skill, 'SKILL.md'))).toBe(true);
    }
  });

  it('creates docs/specs/ directory with .gitkeep', async () => {
    await copyTemplates();
    expect(existsSync(join('docs', 'specs'))).toBe(true);
    expect(existsSync(join('docs', 'specs', '.gitkeep'))).toBe(true);
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

// --- Tests for parseFrontmatter ---

describe('parseFrontmatter', () => {
  it('parses standard frontmatter', () => {
    const content = '---\nname: advisor\ndescription: "Strategic advisor"\n---\n# Content';
    const result = parseFrontmatter(content);
    expect(result.name).toBe('advisor');
    expect(result.description).toBe('Strategic advisor');
  });

  it('returns empty object for no frontmatter', () => {
    const result = parseFrontmatter('# Just a heading');
    expect(result).toEqual({});
  });

  it('handles single-quoted values', () => {
    const content = "---\nname: 'test'\n---";
    const result = parseFrontmatter(content);
    expect(result.name).toBe('test');
  });

  it('handles values with colons', () => {
    const content = '---\ndescription: "Key: value pair"\n---';
    const result = parseFrontmatter(content);
    expect(result.description).toBe('Key: value pair');
  });

  it('handles unquoted values', () => {
    const content = '---\npermissionMode: plan\n---';
    const result = parseFrontmatter(content);
    expect(result.permissionMode).toBe('plan');
  });

  it('handles empty values', () => {
    const content = '---\nname:\n---';
    const result = parseFrontmatter(content);
    expect(result.name).toBe('');
  });

  it('ignores lines without colons', () => {
    const content = '---\nname: test\njust a line\n---';
    const result = parseFrontmatter(content);
    expect(result.name).toBe('test');
    expect(Object.keys(result)).toHaveLength(1);
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

// --- Tests for ensureProjectRoot ---

describe('ensureProjectRoot', () => {
  let originalCwd;
  let tempDir;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-ensure-test-')));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns the project root path when markers exist', () => {
    mkdirSync(join(tempDir, '.claude'));
    writeFileSync(join(tempDir, 'PROJECT.md'), '# Test');
    process.chdir(tempDir);

    const result = ensureProjectRoot();
    expect(result).toBe(tempDir);
  });

  it('throws with clear message when no project markers exist', () => {
    process.chdir(tempDir);

    expect(() => ensureProjectRoot()).toThrow('Guild project not found. Run `guild init` to initialize.');
  });

  it('changes process.cwd() to the project root', () => {
    mkdirSync(join(tempDir, '.claude'));
    const nested = join(tempDir, 'sub1', 'sub2');
    mkdirSync(nested, { recursive: true });
    process.chdir(nested);

    ensureProjectRoot();
    expect(process.cwd()).toBe(tempDir);
  });
});
