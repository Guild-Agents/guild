import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  generateProjectMd,
  generateSessionMd,
  generateClaudeMd,
  updateProjectMdModes,
} from '../generators.js';

const TEST_DIR = join(import.meta.dirname, '__tmp_generators__');

function setup() {
  process.chdir(TEST_DIR);
}

function makeProjectData(overrides = {}) {
  return {
    identity: { name: 'test-project', domain: 'Testing domain', description: 'A test project', scope: 'MVP scope' },
    stack: { type: 'fullstack', frontend: 'react-vite', backend: 'node-express', db: ['postgres', 'redis'], details: 'Node 20' },
    architecture: 'Feature-based folders',
    domainRules: 'No global state',
    testing: { framework: 'vitest', tdd: true },
    github: { enabled: true, repoUrl: 'https://github.com/test/repo' },
    ...overrides,
  };
}

describe('generateProjectMd', () => {
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

  it('generates PROJECT.md with correct identity section', async () => {
    await generateProjectMd(makeProjectData());

    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Nombre:** test-project');
    expect(content).toContain('**Dominio:** Testing domain');
    expect(content).toContain('**Descripción:** A test project');
    expect(content).toContain('**Alcance inicial:** MVP scope');
  });

  it('generates correct stack section', async () => {
    await generateProjectMd(makeProjectData());

    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Frontend:** React + Vite');
    expect(content).toContain('**Backend:** Node.js + Express');
    expect(content).toContain('**Base de datos:** postgres, redis');
    expect(content).toContain('**Detalles adicionales:** Node 20');
  });

  it('generates testing section with TDD enabled', async () => {
    await generateProjectMd(makeProjectData());

    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Framework:** vitest');
    expect(content).toContain('**TDD:** Sí');
  });

  it('generates testing section with TDD disabled', async () => {
    await generateProjectMd(makeProjectData({ testing: { framework: 'jest', tdd: false } }));

    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**TDD:** No');
  });

  it('generates agent modes section', async () => {
    await generateProjectMd(makeProjectData());

    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**developer:** react, vite, node, express');
    expect(content).toContain('**dba:** postgres, redis');
    expect(content).toContain('**qa:** vitest');
    expect(content).toContain('**bug-fixer:** react, vite, node, express');
  });

  it('generates GitHub section when enabled', async () => {
    await generateProjectMd(makeProjectData());

    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Habilitado:** Sí');
    expect(content).toContain('**Repo:** https://github.com/test/repo');
  });

  it('generates GitHub section when disabled', async () => {
    await generateProjectMd(makeProjectData({ github: null }));

    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Habilitado:** No');
  });

  it('handles missing optional fields gracefully', async () => {
    const data = makeProjectData({
      identity: { name: 'minimal', domain: 'test', description: 'desc' },
      stack: { type: 'backend', frontend: null, backend: null, db: ['none'], details: null },
      architecture: null,
      domainRules: null,
    });

    await generateProjectMd(data);

    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**Nombre:** minimal');
    expect(content).toContain('Por definir con el Tech Lead');
    expect(content).toContain('Por definir con el Advisor');
  });
});

describe('generateSessionMd', () => {
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

  it('generates SESSION.md with correct structure', async () => {
    await generateSessionMd(makeProjectData());

    const content = readFileSync('SESSION.md', 'utf8');
    expect(content).toContain('# SESSION.md');
    expect(content).toContain('## Sesión activa');
    expect(content).toContain('**Tarea en curso:** —');
    expect(content).toContain('**Agente activo:** —');
    expect(content).toContain('Proyecto recién inicializado con Guild');
  });

  it('includes current date', async () => {
    await generateSessionMd(makeProjectData());

    const content = readFileSync('SESSION.md', 'utf8');
    const today = new Date().toISOString().split('T')[0];
    expect(content).toContain(`**Fecha:** ${today}`);
  });

  it('includes next steps', async () => {
    await generateSessionMd(makeProjectData());

    const content = readFileSync('SESSION.md', 'utf8');
    expect(content).toContain('## Próximos pasos');
    expect(content).toContain('/guild-specialize');
  });
});

describe('generateClaudeMd', () => {
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

  it('generates CLAUDE.md with project name as title', async () => {
    await generateClaudeMd(makeProjectData());

    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).toContain('# test-project');
  });

  it('includes Guild framework reference', async () => {
    await generateClaudeMd(makeProjectData());

    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).toContain('Guild AI');
    expect(content).toContain('PROJECT.md');
    expect(content).toContain('SESSION.md');
  });

  it('includes all slash commands', async () => {
    await generateClaudeMd(makeProjectData());

    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).toContain('/advisor');
    expect(content).toContain('/tech-lead');
    expect(content).toContain('/developer');
    expect(content).toContain('/qa');
    expect(content).toContain('/session-start');
    expect(content).toContain('/session-end');
    expect(content).toContain('/guild-specialize');
  });

  it('includes global rules', async () => {
    await generateClaudeMd(makeProjectData());

    const content = readFileSync('CLAUDE.md', 'utf8');
    expect(content).toContain('No modificar active.md');
    expect(content).toContain('Actualizar SESSION.md');
  });
});

describe('updateProjectMdModes', () => {
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

  it('updates agent modes in existing PROJECT.md', async () => {
    writeFileSync('PROJECT.md', '## Agentes activos y sus modos\n- **developer:** base\n- **qa:** vitest\n', 'utf8');

    await updateProjectMdModes('developer', ['react', 'vite']);

    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**developer:** react, vite');
    expect(content).toContain('**qa:** vitest');
  });

  it('sets "solo base" when modes are empty', async () => {
    writeFileSync('PROJECT.md', '- **developer:** react, vite\n', 'utf8');

    await updateProjectMdModes('developer', []);

    const content = readFileSync('PROJECT.md', 'utf8');
    expect(content).toContain('**developer:** solo base');
  });

  it('does nothing when PROJECT.md does not exist', async () => {
    // Should not throw
    await updateProjectMdModes('developer', ['react']);
  });
});
