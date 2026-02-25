import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { loadSkill, loadAllSkills } from '../skill-loader.js';

const TEST_DIR = join(import.meta.dirname, '__fixtures__', 'skills-test');

function writeSkill(name, content) {
  const dir = join(TEST_DIR, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), content, 'utf8');
}

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('loadSkill', () => {
  it('loads a simple skill without workflow', () => {
    writeSkill('review', '---\nname: review\ndescription: "Code review"\nuser-invocable: true\n---\n\n# Review\n\nBody.');

    const skill = loadSkill('review', TEST_DIR);
    expect(skill.name).toBe('review');
    expect(skill.description).toBe('Code review');
    expect(skill.userInvocable).toBe(true);
    expect(skill.workflow).toBeNull();
    expect(skill.errors).toEqual([]);
  });

  it('loads a skill with valid workflow', () => {
    const content = [
      '---',
      'name: test-skill',
      'description: "Test"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: step1',
      '      role: advisor',
      '      intent: "Evaluate"',
      '      model-tier: reasoning',
      '---',
      '',
      '# Test Skill',
    ].join('\n');
    writeSkill('test-skill', content);

    const skill = loadSkill('test-skill', TEST_DIR);
    expect(skill.workflow).not.toBeNull();
    expect(skill.workflow.steps).toHaveLength(1);
    expect(skill.errors).toEqual([]);
  });

  it('reports validation errors for invalid workflow', () => {
    const content = [
      '---',
      'name: bad-skill',
      'description: "Bad"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: step1',
      '      role: advisor',
      '      intent: "Evaluate"',
      '    - id: step1',
      '      role: developer',
      '      intent: "Implement"',
      '---',
      '',
    ].join('\n');
    writeSkill('bad-skill', content);

    const skill = loadSkill('bad-skill', TEST_DIR);
    expect(skill.errors).toContainEqual(expect.stringContaining('Duplicate step id'));
  });

  it('throws for nonexistent skill', () => {
    expect(() => loadSkill('nonexistent', TEST_DIR)).toThrow('Skill not found');
  });
});

describe('loadAllSkills', () => {
  it('loads all skills from directory', () => {
    writeSkill('alpha', '---\nname: alpha\ndescription: "Alpha"\nuser-invocable: true\n---\n\nBody.');
    writeSkill('beta', '---\nname: beta\ndescription: "Beta"\nuser-invocable: false\n---\n\nBody.');

    const skills = loadAllSkills(TEST_DIR);
    expect(skills.size).toBe(2);
    expect(skills.has('alpha')).toBe(true);
    expect(skills.has('beta')).toBe(true);
    expect(skills.get('alpha').name).toBe('alpha');
    expect(skills.get('beta').userInvocable).toBe(false);
  });

  it('returns empty map for nonexistent directory', () => {
    const skills = loadAllSkills('/tmp/nonexistent-dir-guild-test');
    expect(skills.size).toBe(0);
  });

  it('skips directories without SKILL.md', () => {
    mkdirSync(join(TEST_DIR, 'empty-dir'), { recursive: true });
    writeSkill('valid', '---\nname: valid\ndescription: "Valid"\nuser-invocable: true\n---\n\nBody.');

    const skills = loadAllSkills(TEST_DIR);
    expect(skills.size).toBe(1);
    expect(skills.has('valid')).toBe(true);
  });

  it('includes skills with validation errors', () => {
    const badContent = [
      '---',
      'name: bad',
      'description: "Bad"',
      'user-invocable: true',
      'workflow:',
      '  version: 99',
      '  steps:',
      '    - id: s1',
      '      role: advisor',
      '      intent: "x"',
      '---',
      '',
    ].join('\n');
    writeSkill('bad', badContent);

    const skills = loadAllSkills(TEST_DIR);
    expect(skills.size).toBe(1);
    expect(skills.get('bad').errors.length).toBeGreaterThan(0);
  });
});

describe('loadSkill — integration with real templates', () => {
  const templatesPath = join(import.meta.dirname, '..', '..', 'templates', 'skills');

  it('loads build-feature template', () => {
    const skill = loadSkill('build-feature', templatesPath);
    expect(skill.name).toBe('build-feature');
    expect(skill.userInvocable).toBe(true);
    expect(skill.errors).toEqual([]);
  });

  it('loads review template', () => {
    const skill = loadSkill('review', templatesPath);
    expect(skill.name).toBe('review');
    expect(skill.errors).toEqual([]);
  });

  it('loads all templates without fatal errors', () => {
    const skills = loadAllSkills(templatesPath);
    expect(skills.size).toBeGreaterThan(0);

    for (const [name, skill] of skills) {
      // Skills without workflows should have no errors
      if (!skill.workflow) {
        expect(skill.errors).toEqual([]);
      }
      expect(skill.name).toBe(name);
    }
  });
});
