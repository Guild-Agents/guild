# Guild v0 → v1 Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Guild from v0 (composer-based expertise system) to v1 (flat agents + Claude Code Skills) while preserving git history.

**Architecture:** Replace the `composer.js` composition system (`base.md + expertise/*.md → active.md`) with flat agent files and Claude Code native Skills (`SKILL.md`). Agents become identity-only documents (WHO), Skills become workflow documents (HOW). `CLAUDE.md` replaces `PROJECT.md` as the enriched central context document.

**Tech Stack:** Node.js 20+, ESModules, Commander.js, @clack/prompts, Vitest

---

## Decisions Record

These ambiguities were resolved before planning:

| Decision | Resolution |
|----------|-----------|
| Implementation phases | Use the 6 concrete phases from V1.md (Cleanup → Templates → Skills → CLI → CLAUDE.md → Verification) |
| Skills scope | 3 fully defined (build-feature, council, guild-specialize) + 7 functional placeholders |
| guild-specialize tools | `Read, Bash, Write` — no Task needed |
| guild update | Out of scope for v1.0 |
| code-review rename | → `code-reviewer` (agent = WHO, not WHAT) |
| PROJECT.md scope | Raw onboarding metadata only; CLAUDE.md holds enriched context |
| github.js | Keep (useful, non-blocking) |
| hooks, tasks/, v0 tests | Delete |

---

## Task 1: Delete v0 files

**Files:**
- Delete: `src/utils/composer.js`
- Delete: `src/utils/__tests__/composer.test.js`
- Delete: `src/commands/mode.js`
- Delete: `src/commands/__tests__/mode.test.js`
- Delete: `src/commands/sync.js`
- Delete: `src/commands/upskill.js`
- Delete: `src/templates/commands/` (entire directory — 12 files)
- Delete: `src/templates/hooks/` (entire directory)

**Step 1: Delete v0-only source files**

```bash
rm src/utils/composer.js
rm src/commands/mode.js
rm src/commands/sync.js
rm src/commands/upskill.js
```

**Step 2: Delete v0-only test files**

```bash
rm src/utils/__tests__/composer.test.js
rm src/commands/__tests__/mode.test.js
```

**Step 3: Delete v0 template directories (replaced by skills)**

```bash
rm -rf src/templates/commands/
rm -rf src/templates/hooks/
```

**Step 4: Delete v0 agent subdirectory structure**

The v0 structure `src/templates/agents/[name]/base.md` becomes flat `src/templates/agents/[name].md` in v1. Remove the old structure:

```bash
rm -rf src/templates/agents/advisor/
rm -rf src/templates/agents/tech-lead/
rm -rf src/templates/agents/product-owner/
rm -rf src/templates/agents/developer/
rm -rf src/templates/agents/dba/
rm -rf src/templates/agents/qa/
rm -rf src/templates/agents/bug-fixer/
rm -rf src/templates/agents/code-review/
```

**Step 5: Verify no dangling imports**

```bash
grep -r "composer" src/ --include="*.js" -l
grep -r "mode\.js" src/ --include="*.js" -l
grep -r "sync\.js" src/ --include="*.js" -l
grep -r "upskill" src/ --include="*.js" -l
grep -r "active\.md" src/ --include="*.js" -l
```

Expected: Only results should be in files we'll modify in later tasks (init.js, new-agent.js).

**Step 6: Run tests to confirm nothing else breaks**

```bash
npm test
```

Expected: Tests should fail for the deleted imports — that's correct. The generators.test.js should still pass since it doesn't depend on composer.

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove v0 composer, expertise, and mode system"
```

---

## Task 2: Create v1 agent templates

**Files:**
- Create: `src/templates/agents/advisor.md`
- Create: `src/templates/agents/product-owner.md`
- Create: `src/templates/agents/tech-lead.md`
- Create: `src/templates/agents/developer.md`
- Create: `src/templates/agents/code-reviewer.md`
- Create: `src/templates/agents/qa.md`
- Create: `src/templates/agents/bugfix.md`
- Create: `src/templates/agents/db-migration.md`

Each agent is a flat markdown file. The content is adapted from the v0 `base.md` templates with these changes:
- Remove ALL references to `active.md`, `expertise/`, `TASK-XXX.md`, `tasks/` directories
- Remove ALL references to `guild mode`, `composer`, modes
- Remove GitHub Issue sync instructions from individual agents
- Replace "Lee PROJECT.md" with "Lee CLAUDE.md" as the primary context source
- Keep core role, responsibilities, process, and behavioral rules
- Add `[PROYECTO]` placeholder where project-specific context should go
- Keep the agent prompts in Spanish (matching v0 convention)

**Key renames from v0:**
- `code-review` → `code-reviewer` (agent = identity/WHO)
- `bug-fixer` → `bugfix` (matches blueprint)
- `dba` → `db-migration` (matches blueprint, more focused scope)

**Step 1: Create `src/templates/agents/advisor.md`**

Adapt from v0's `src/templates/agents/advisor/base.md`. Remove expertise/mode references. Core content stays: domain evaluation process, approval criteria, response format.

```markdown
---
name: advisor
description: "Evalua ideas y da direccion estrategica antes de comprometer trabajo"
---

Eres el Advisor de [PROYECTO]. Tu rol es evaluar ideas desde una perspectiva
estrategica y tecnica antes de que el equipo invierta tiempo.

## Responsabilidades
- Evaluar la coherencia de nuevas ideas con el dominio del proyecto
- Identificar riesgos de negocio antes de que se conviertan en problemas tecnicos
- Iterar con el Product Owner para refinar el alcance de features
- Resolver ambiguedades de dominio cuando cualquier otro agente las encuentre
- Velar por la consistencia de las reglas de dominio en el tiempo

## Lo que NO haces
- No defines arquitectura tecnica (eso es el Tech Lead)
- No priorizas tareas (eso es el Product Owner)
- No evaluas calidad de codigo (eso es el Code Reviewer)
- No implementas nada

## Proceso de evaluacion

Cuando evaluas una idea:

1. Lee CLAUDE.md — entiende el dominio, las reglas de negocio y las restricciones actuales
2. Evalua coherencia — es esta idea consistente con el dominio y los usuarios del proyecto?
3. Identifica riesgos — hay implicaciones de negocio, legales, o de usuario que no son obvias?
4. Sugiere ajustes — si la idea es buena pero el enfoque no, propon alternativas
5. Documenta tu razonamiento — explica tu evaluacion con argumentos de negocio, no tecnicos

## Criterios de aprobacion

Apruebas cuando:
- Es coherente con el dominio y los objetivos del proyecto
- Respeta las reglas de negocio establecidas
- Agrega valor real para los usuarios
- No introduce riesgos de negocio no justificados

Rechazas o pides reformulacion cuando:
- Contradice las reglas del dominio sin una razon valida
- No aporta valor claro al usuario
- Introduce complejidad de negocio que no se justifica

## Formato de respuesta

**Evaluacion:** [APROBADO / APROBADO CON AJUSTES / RECHAZADO]
**Razonamiento:** [explicacion desde la perspectiva del negocio y el usuario]
**Ajustes sugeridos:** [si aplica]
**Riesgos identificados:** [si aplica]

## Reglas de comportamiento
- Siempre leer CLAUDE.md y SESSION.md al inicio de la sesion
- Razonar desde el negocio y el usuario, nunca desde la tecnologia
- Ser directo — si una idea no tiene sentido, decirlo con claridad y argumentos
```

**Step 2: Create remaining 7 agent templates**

Apply the same adaptation pattern for each agent. The key content per agent:

- **`product-owner.md`** — Converts approved ideas into concrete tasks. Writes acceptance criteria. No references to TASK-XXX.md file system, just describes task creation as a concept.
- **`tech-lead.md`** — Defines technical approach. Reviews architecture. Identifies implementation risks. No references to TASK-XXX.md sections.
- **`developer.md`** — Implements features with TDD. Follows CLAUDE.md conventions. Atomic commits. No references to tasks/ directory or GitHub sync.
- **`code-reviewer.md`** — Reviews code quality, security, patterns, test coverage. Output: issues by severity (blocker/warning/suggestion).
- **`qa.md`** — Tests edge cases, regression, acceptance criteria. Reports bugs with exact reproduction.
- **`bugfix.md`** — Diagnoses and resolves bugs. Process: reproduce → root cause → minimal fix → verify.
- **`db-migration.md`** — Schema changes, safe migrations. Always: up + down, verify existing data, consider production performance.

Each file follows the same structure:
```yaml
---
name: [agent-name]
description: "[one-line description]"
---
```
Followed by role description, responsibilities, "Lo que NO haces", process, quality criteria, behavioral rules.

**Step 3: Verify all 8 templates exist**

```bash
ls -la src/templates/agents/*.md
```

Expected: 8 files (advisor.md, product-owner.md, tech-lead.md, developer.md, code-reviewer.md, qa.md, bugfix.md, db-migration.md)

**Step 4: Commit**

```bash
git add src/templates/agents/
git commit -m "feat: add v1 flat agent templates"
```

---

## Task 3: Create v1 skill templates

**Files:**
- Create: `src/templates/skills/guild-specialize/SKILL.md`
- Create: `src/templates/skills/build-feature/SKILL.md`
- Create: `src/templates/skills/council/SKILL.md`
- Create: `src/templates/skills/new-feature/SKILL.md`
- Create: `src/templates/skills/qa-cycle/SKILL.md`
- Create: `src/templates/skills/review/SKILL.md`
- Create: `src/templates/skills/status/SKILL.md`
- Create: `src/templates/skills/dev-flow/SKILL.md`
- Create: `src/templates/skills/session-start/SKILL.md`
- Create: `src/templates/skills/session-end/SKILL.md`

Each SKILL.md uses Claude Code's skill format with YAML frontmatter.

### Step 1: Create directory structure

```bash
mkdir -p src/templates/skills/{guild-specialize,build-feature,council,new-feature,qa-cycle,review,status,dev-flow,session-start,session-end}
```

### Step 2: Create `guild-specialize/SKILL.md`

This is the most important skill — runs post-init to enrich CLAUDE.md with real project data.

```yaml
---
name: guild-specialize
description: "Enriquece CLAUDE.md explorando el proyecto y especializa los agentes al stack real"
user-invocable: true
---
```

Content: Instructions to read PROJECT.md, explore project structure (package.json, src/, config files, migrations, README), then:
1. Generate enriched CLAUDE.md replacing all `[PENDIENTE: guild-specialize]` placeholders with real data (exact versions, folder structure, detected conventions, architecture patterns, env vars, technical debt)
2. Update each agent .md in `.claude/agents/` adding project-specific context
3. Confirm completion

### Step 3: Create `build-feature/SKILL.md`

The main pipeline skill. Uses Task tool to orchestrate 6 phases:
1. Advisor evaluates (go/no-go)
2. Product Owner specs (acceptance criteria + tasks)
3. Tech Lead defines approach
4. Developer implements
5. Code Reviewer reviews (loop back to 4 if blockers)
6. QA validates (if bugs → bugfix → re-review)

Each phase uses `Task` tool reading the appropriate agent from `.claude/agents/`.

```yaml
---
name: build-feature
description: "Pipeline completo: evaluacion → spec → implementacion → review → QA"
user-invocable: true
---
```

### Step 4: Create `council/SKILL.md`

Party mode — invokes multiple agents in parallel for debate.

```yaml
---
name: council
description: "Convoca multiples agentes para debatir una decision importante"
user-invocable: true
---
```

Three council types:
- `council architecture` — Tech Lead + Advisor + Developer
- `council feature-scope` — Advisor + Product Owner + Tech Lead
- `council tech-debt` — Tech Lead + Developer + Code Reviewer

### Step 5: Create 7 functional placeholder skills

Each gets proper frontmatter and minimal but functional instructions:

**`new-feature/SKILL.md`**
```yaml
---
name: new-feature
description: "Crea branch y scaffold para una nueva feature"
user-invocable: true
---
```
Instructions: create git branch, update SESSION.md with feature context, optionally create GitHub Issue.

**`qa-cycle/SKILL.md`**
```yaml
---
name: qa-cycle
description: "Ciclo QA + bugfix hasta que pase"
user-invocable: true
---
```
Instructions: invoke QA agent, if bugs found invoke bugfix agent, repeat until clean.

**`review/SKILL.md`**
```yaml
---
name: review
description: "Code review standalone sobre el diff actual"
user-invocable: true
---
```
Instructions: read code-reviewer agent, review current git diff, output findings.

**`status/SKILL.md`**
```yaml
---
name: status
description: "Muestra estado actual del proyecto y sesion"
user-invocable: true
---
```
Instructions: read CLAUDE.md, PROJECT.md, SESSION.md, show summary.

**`dev-flow/SKILL.md`**
```yaml
---
name: dev-flow
description: "Muestra fase actual del pipeline y que sigue"
user-invocable: true
---
```
Instructions: read SESSION.md, determine current phase, show next steps.

**`session-start/SKILL.md`**
```yaml
---
name: session-start
description: "Carga contexto y retoma trabajo desde SESSION.md"
user-invocable: true
---
```
Instructions: read CLAUDE.md + SESSION.md, resume from last state.

**`session-end/SKILL.md`**
```yaml
---
name: session-end
description: "Guarda estado actual en SESSION.md"
user-invocable: true
---
```
Instructions: update SESSION.md with current date, task, agent, context, next steps.

### Step 6: Verify structure

```bash
find src/templates/skills -name "SKILL.md" | sort
```

Expected: 10 SKILL.md files.

### Step 7: Commit

```bash
git add src/templates/skills/
git commit -m "feat: add v1 skill templates"
```

---

## Task 4: Rewrite `generators.js` for v1

**Files:**
- Modify: `src/utils/generators.js`
- Modify: `src/utils/__tests__/generators.test.js`

The generators need to produce v1 output:
- `PROJECT.md` — simplified, only onboarding metadata
- `SESSION.md` — similar structure, updated references
- `CLAUDE.md` — new central doc with `[PENDIENTE: guild-specialize]` placeholders, skill references instead of slash commands

### Step 1: Write failing tests for v1 `generateProjectMd`

Update `src/utils/__tests__/generators.test.js`. The v1 PROJECT.md is simpler — just identity, type, stack, repo URL. No architecture, domain rules, testing, agent modes sections.

```javascript
// In the generateProjectMd describe block, replace existing tests:

it('generates PROJECT.md with project identity', async () => {
  await generateProjectMd(makeProjectData());
  const content = readFileSync('PROJECT.md', 'utf8');
  expect(content).toContain('**Nombre:** test-project');
  expect(content).toContain('**Tipo:** fullstack');
  expect(content).toContain('**Stack:** React + Vite, Node.js + Express, postgres, redis');
});

it('generates PROJECT.md with GitHub repo when provided', async () => {
  await generateProjectMd(makeProjectData());
  const content = readFileSync('PROJECT.md', 'utf8');
  expect(content).toContain('**Repositorio:** https://github.com/test/repo');
});

it('handles project with no repo', async () => {
  await generateProjectMd(makeProjectData({ github: null }));
  const content = readFileSync('PROJECT.md', 'utf8');
  expect(content).not.toContain('**Repositorio:**');
});

it('marks existing code status', async () => {
  await generateProjectMd(makeProjectData({ hasExistingCode: true }));
  const content = readFileSync('PROJECT.md', 'utf8');
  expect(content).toContain('**Codigo existente:** Si');
});
```

### Step 2: Run tests to verify they fail

```bash
npm test -- src/utils/__tests__/generators.test.js
```

Expected: FAIL — the old generateProjectMd produces different output.

### Step 3: Write failing tests for v1 `generateClaudeMd`

The v1 CLAUDE.md is the central enrichable document with placeholders:

```javascript
it('generates CLAUDE.md with project name', async () => {
  await generateClaudeMd(makeProjectData());
  const content = readFileSync('CLAUDE.md', 'utf8');
  expect(content).toContain('# test-project');
});

it('includes Guild framework reference', async () => {
  await generateClaudeMd(makeProjectData());
  const content = readFileSync('CLAUDE.md', 'utf8');
  expect(content).toContain('Guild');
  expect(content).toContain('SESSION.md');
});

it('includes PENDIENTE placeholders for guild-specialize', async () => {
  await generateClaudeMd(makeProjectData());
  const content = readFileSync('CLAUDE.md', 'utf8');
  expect(content).toContain('[PENDIENTE: guild-specialize]');
});

it('lists skills instead of slash commands', async () => {
  await generateClaudeMd(makeProjectData());
  const content = readFileSync('CLAUDE.md', 'utf8');
  expect(content).toContain('/build-feature');
  expect(content).toContain('/council');
  expect(content).toContain('/guild-specialize');
  expect(content).toContain('/session-start');
  expect(content).toContain('/session-end');
  // Should NOT contain old v0 agent-activation commands
  expect(content).not.toContain('activar el Advisor');
  expect(content).not.toContain('active.md');
});

it('does not reference v0 concepts', async () => {
  await generateClaudeMd(makeProjectData());
  const content = readFileSync('CLAUDE.md', 'utf8');
  expect(content).not.toContain('active.md');
  expect(content).not.toContain('composer');
  expect(content).not.toContain('guild mode');
  expect(content).not.toContain('expertise');
});
```

### Step 4: Write failing tests for v1 `generateSessionMd`

```javascript
it('generates SESSION.md referencing guild-specialize', async () => {
  await generateSessionMd(makeProjectData());
  const content = readFileSync('SESSION.md', 'utf8');
  expect(content).toContain('/guild-specialize');
  // Should NOT reference tasks/ directory
  expect(content).not.toContain('tasks/');
});
```

### Step 5: Run all generator tests to confirm failures

```bash
npm test -- src/utils/__tests__/generators.test.js
```

### Step 6: Update `makeProjectData` helper for v1

```javascript
function makeProjectData(overrides = {}) {
  return {
    name: 'test-project',
    type: 'fullstack',
    stack: 'React + Vite, Node.js + Express, postgres, redis',
    github: { repoUrl: 'https://github.com/test/repo' },
    hasExistingCode: false,
    ...overrides,
  };
}
```

Note: v1 onboarding collects simpler data — no architecture, domain rules, testing framework, or agent modes. Those are discovered by `/guild-specialize`.

### Step 7: Implement v1 `generateProjectMd`

Rewrite the function. The v1 PROJECT.md is lean:

```javascript
export async function generateProjectMd(data) {
  const date = new Date().toISOString().split('T')[0];

  let content = `# PROJECT.md
> Generado por Guild v1 el ${date}

## Proyecto
- **Nombre:** ${data.name}
- **Tipo:** ${data.type}
- **Stack:** ${data.stack}
${data.hasExistingCode ? '- **Codigo existente:** Si' : '- **Codigo existente:** No — proyecto nuevo'}
`;

  if (data.github?.repoUrl) {
    content += `\n## GitHub\n- **Repositorio:** ${data.github.repoUrl}\n`;
  }

  writeFileSync('PROJECT.md', content, 'utf8');
}
```

### Step 8: Implement v1 `generateClaudeMd`

The CLAUDE.md is now the rich central document with placeholders:

```javascript
export async function generateClaudeMd(data) {
  const content = `# ${data.name}

## Framework
Este proyecto usa Guild. Leer SESSION.md al inicio de cada sesion.

## Stack
${data.stack}

## Estructura del proyecto
[PENDIENTE: guild-specialize]

## Convenciones de codigo
[PENDIENTE: guild-specialize]

## Patrones de arquitectura
[PENDIENTE: guild-specialize]

## Variables de entorno
[PENDIENTE: guild-specialize]

## Reglas globales
- No implementar sin plan aprobado
- Actualizar SESSION.md al cerrar cada sesion
- ESModules en todo el codigo
- path.join() siempre para construir paths

## Skills disponibles
- /guild-specialize  — enriquecer CLAUDE.md explorando el proyecto real
- /build-feature     — pipeline completo de desarrollo
- /new-feature       — crear branch y scaffold para feature
- /council           — debatir decisiones con multiples agentes
- /review            — code review sobre el diff actual
- /qa-cycle          — ciclo QA + bugfix
- /status            — ver estado del proyecto
- /dev-flow          — ver fase actual del pipeline
- /session-start     — cargar contexto y retomar trabajo
- /session-end       — guardar estado en SESSION.md
`;

  writeFileSync('CLAUDE.md', content, 'utf8');
}
```

### Step 9: Implement v1 `generateSessionMd`

```javascript
export async function generateSessionMd() {
  const date = new Date().toISOString().split('T')[0];

  const content = `# SESSION.md

## Sesion activa
- **Fecha:** ${date}
- **Tarea en curso:** —
- **Agente activo:** —
- **Estado:** Proyecto recien inicializado con Guild v1

## Contexto relevante
- Onboarding completado. Ver PROJECT.md para datos del proyecto.
- CLAUDE.md tiene placeholders — ejecutar /guild-specialize para enriquecer.

## Proximos pasos
1. Abrir Claude Code y ejecutar /guild-specialize
2. Definir la primera feature con /build-feature
`;

  writeFileSync('SESSION.md', content, 'utf8');
}
```

### Step 10: Remove `updateProjectMdModes` and `buildAgentModesSection`

These functions are v0-only (modes system). Delete them and their tests.

Remove:
- `updateProjectMdModes` function
- `buildAgentModesSection` function
- `resolveDevModes` function
- `buildStackLines` function (replaced by simpler stack string from onboarding)
- All tests for `updateProjectMdModes`

### Step 11: Run tests

```bash
npm test -- src/utils/__tests__/generators.test.js
```

Expected: All new tests PASS.

### Step 12: Commit

```bash
git add src/utils/generators.js src/utils/__tests__/generators.test.js
git commit -m "feat: rewrite generators for v1 structure"
```

---

## Task 5: Rewrite `files.js` for v1

**Files:**
- Modify: `src/utils/files.js`
- Create: `src/utils/__tests__/files.test.js`

The v1 `files.js` needs to:
- Create `.claude/agents/` with 8 flat .md files (no subdirectories)
- Create `.claude/skills/` with 10 skill directories containing SKILL.md
- No longer create `tasks/`, `.claude/commands/`, `.claude/hooks/`
- Return updated agent names list (code-reviewer, bugfix, db-migration)

### Step 1: Write failing tests

Create `src/utils/__tests__/files.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { copyTemplates, getAgentNames } from '../files.js';

const TEST_DIR = join(import.meta.dirname, '__tmp_files__');

describe('getAgentNames', () => {
  it('returns 8 v1 agent names', () => {
    const names = getAgentNames();
    expect(names).toHaveLength(8);
    expect(names).toContain('advisor');
    expect(names).toContain('code-reviewer');
    expect(names).toContain('bugfix');
    expect(names).toContain('db-migration');
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

  it('creates .claude/agents/ with flat .md files', async () => {
    await copyTemplates();
    for (const name of getAgentNames()) {
      expect(existsSync(join('.claude', 'agents', `${name}.md`))).toBe(true);
    }
  });

  it('does not create agent subdirectories', async () => {
    await copyTemplates();
    // Should NOT have .claude/agents/advisor/ directory
    expect(existsSync(join('.claude', 'agents', 'advisor'))).toBe(false);
  });

  it('creates .claude/skills/ with 10 skill directories', async () => {
    await copyTemplates();
    const expectedSkills = [
      'guild-specialize', 'build-feature', 'council', 'new-feature',
      'qa-cycle', 'review', 'status', 'dev-flow', 'session-start', 'session-end',
    ];
    for (const skill of expectedSkills) {
      expect(existsSync(join('.claude', 'skills', skill, 'SKILL.md'))).toBe(true);
    }
  });

  it('does not create tasks/ directory', async () => {
    await copyTemplates();
    expect(existsSync('tasks')).toBe(false);
  });

  it('does not create .claude/commands/ directory', async () => {
    await copyTemplates();
    expect(existsSync(join('.claude', 'commands'))).toBe(false);
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npm test -- src/utils/__tests__/files.test.js
```

### Step 3: Implement v1 `files.js`

Rewrite to produce v1 structure:

```javascript
import { mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '../../src/templates');
const AGENTS_DIR = '.claude/agents';
const SKILLS_DIR = '.claude/skills';

export function getAgentNames() {
  return [
    'advisor',
    'product-owner',
    'tech-lead',
    'developer',
    'code-reviewer',
    'qa',
    'bugfix',
    'db-migration',
  ];
}

export async function copyTemplates() {
  // Create directories
  mkdirSync(AGENTS_DIR, { recursive: true });
  mkdirSync(SKILLS_DIR, { recursive: true });

  // Copy flat agent templates
  for (const name of getAgentNames()) {
    const src = join(TEMPLATES_DIR, 'agents', `${name}.md`);
    const dest = join(AGENTS_DIR, `${name}.md`);
    if (existsSync(src)) {
      copyFileSync(src, dest);
    }
  }

  // Copy skill templates
  const skillsTemplate = join(TEMPLATES_DIR, 'skills');
  if (existsSync(skillsTemplate)) {
    const skills = readdirSync(skillsTemplate, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const skill of skills) {
      const skillDir = join(SKILLS_DIR, skill);
      mkdirSync(skillDir, { recursive: true });

      const src = join(skillsTemplate, skill, 'SKILL.md');
      const dest = join(skillDir, 'SKILL.md');
      if (existsSync(src)) {
        copyFileSync(src, dest);
      }
    }
  }
}

export function readProjectMd() {
  const path = 'PROJECT.md';
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

export function readSessionMd() {
  const path = 'SESSION.md';
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}
```

Note: `readProjectMd` and `readSessionMd` stay unchanged. The old `copyAgentTemplates` is renamed to `copyTemplates` (simpler name, new signature).

### Step 4: Run tests

```bash
npm test -- src/utils/__tests__/files.test.js
```

Expected: PASS

### Step 5: Commit

```bash
git add src/utils/files.js src/utils/__tests__/files.test.js
git commit -m "feat: rewrite files.js for v1 flat agents and skills"
```

---

## Task 6: Rewrite `init.js` for v1 onboarding

**Files:**
- Modify: `src/commands/init.js`

The v1 onboarding is simpler — fewer questions, delegates deep analysis to `/guild-specialize`:

1. Project name
2. Project type (web app, API, CLI, mobile, fullstack)
3. Stack (free text)
4. Has GitHub repo? (yes + URL / no)
5. Has existing code? (yes / no)

Then generates: PROJECT.md, CLAUDE.md, SESSION.md, .claude/agents/, .claude/skills/

### Step 1: Rewrite `init.js`

```javascript
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { generateProjectMd, generateSessionMd, generateClaudeMd } from '../utils/generators.js';
import { copyTemplates } from '../utils/files.js';

export async function runInit() {
  console.log('');
  p.intro(chalk.bold.cyan('Guild v1 — Nuevo proyecto'));

  // Check existing installation
  if (existsSync('.claude/agents')) {
    const overwrite = await p.confirm({
      message: 'Guild ya esta instalado en este proyecto. Reinicializar?',
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel('Cancelado.');
      process.exit(0);
    }
  }

  // Collect project data
  const name = await p.text({
    message: 'Nombre del proyecto:',
    placeholder: 'mi-proyecto',
    validate: (val) => {
      if (!val) return 'El nombre es requerido';
    },
  });
  if (p.isCancel(name)) { p.cancel('Cancelado.'); process.exit(0); }

  const type = await p.select({
    message: 'Tipo de proyecto:',
    options: [
      { value: 'webapp', label: 'Web app (React/Vue/Angular)' },
      { value: 'api', label: 'API / Backend service' },
      { value: 'cli', label: 'CLI tool' },
      { value: 'mobile', label: 'Mobile (React Native)' },
      { value: 'fullstack', label: 'Otro / Fullstack' },
    ],
  });
  if (p.isCancel(type)) { p.cancel('Cancelado.'); process.exit(0); }

  const stack = await p.text({
    message: 'Stack principal:',
    placeholder: 'ej: Next.js, Supabase, Vercel',
    validate: (val) => {
      if (!val) return 'El stack es requerido';
    },
  });
  if (p.isCancel(stack)) { p.cancel('Cancelado.'); process.exit(0); }

  let github = null;
  const hasRepo = await p.confirm({
    message: 'Tiene repositorio GitHub?',
    initialValue: true,
  });
  if (!p.isCancel(hasRepo) && hasRepo) {
    const repoUrl = await p.text({
      message: 'URL del repositorio:',
      placeholder: 'https://github.com/org/repo',
      validate: (val) => {
        if (!val) return 'La URL es requerida';
        if (!val.includes('github.com')) return 'Debe ser una URL de GitHub';
      },
    });
    if (!p.isCancel(repoUrl)) {
      github = { repoUrl };
    }
  }

  const hasExistingCode = await p.confirm({
    message: 'Tiene codigo existente?',
    initialValue: true,
  });

  // Generate everything
  const spinner = p.spinner();
  spinner.start('Generando estructura Guild v1...');

  const projectData = {
    name,
    type,
    stack,
    github,
    hasExistingCode: !p.isCancel(hasExistingCode) && hasExistingCode,
  };

  try {
    await copyTemplates();
    spinner.message('Generando CLAUDE.md...');
    await generateClaudeMd(projectData);
    spinner.message('Generando PROJECT.md...');
    await generateProjectMd(projectData);
    spinner.message('Generando SESSION.md...');
    await generateSessionMd();
    spinner.stop('Estructura creada.');
  } catch (error) {
    spinner.stop('Error durante la inicializacion.');
    p.log.error(error.message);
    process.exit(1);
  }

  // Summary
  p.log.success('CLAUDE.md');
  p.log.success('PROJECT.md');
  p.log.success('SESSION.md');
  p.log.success('.claude/agents/    (8 agentes base)');
  p.log.success('.claude/skills/    (10 skills)');

  p.note(
    'Abre Claude Code en este directorio y ejecuta:\n\n' +
    '  /guild-specialize\n\n' +
    'Este skill explorara tu codigo y enriquecera CLAUDE.md\n' +
    'con la informacion real del proyecto.',
    'Siguiente paso'
  );

  p.outro(chalk.bold.cyan('Guild v1 listo.'));
}
```

### Step 2: Run the full test suite

```bash
npm test
```

### Step 3: Commit

```bash
git add src/commands/init.js
git commit -m "feat: rewrite init.js for v1 onboarding"
```

---

## Task 7: Adapt `new-agent.js` for v1

**Files:**
- Modify: `src/commands/new-agent.js`

Changes:
- Remove import of `composeAgent` (composer is gone)
- Create flat `.md` file instead of subdirectory structure
- No expertise, no active.md generation
- No slash command creation (skills handle agent activation)
- Keep: name validation, role prompt, PROJECT.md update, SESSION.md note

### Step 1: Rewrite `new-agent.js`

```javascript
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const AGENTS_DIR = join('.claude', 'agents');

export async function runNewAgent(agentName) {
  p.intro(chalk.bold.cyan('Guild — Nuevo agente'));

  if (!isValidAgentName(agentName)) {
    p.log.error(`Nombre invalido: "${agentName}". Solo lowercase, numeros y guiones.`);
    process.exit(1);
  }

  if (!existsSync(AGENTS_DIR)) {
    p.log.error('Guild no esta instalado. Ejecuta: guild init');
    process.exit(1);
  }

  const agentPath = join(AGENTS_DIR, `${agentName}.md`);
  if (existsSync(agentPath)) {
    p.log.error(`El agente "${agentName}" ya existe.`);
    process.exit(1);
  }

  const description = await p.text({
    message: `Que hace "${agentName}"? (descripcion corta):`,
    placeholder: 'ej: Evalua oportunidades de trading basado en analisis tecnico',
    validate: (val) => !val ? 'La descripcion es requerida' : undefined,
  });
  if (p.isCancel(description)) { p.cancel('Cancelado.'); process.exit(0); }

  const spinner = p.spinner();
  spinner.start(`Creando agente "${agentName}"...`);

  try {
    const content = `---
name: ${agentName}
description: "${description}"
---

Eres ${agentName} de [PROYECTO].

## Responsabilidades
[Definir con /guild-specialize]

## Lo que NO haces
[Definir con /guild-specialize]

## Proceso
[Definir con /guild-specialize]

## Reglas de comportamiento
- Siempre leer CLAUDE.md y SESSION.md al inicio de la sesion
`;

    writeFileSync(agentPath, content, 'utf8');

    spinner.stop(`Agente "${agentName}" creado.`);

    p.log.success(`Archivo: ${agentPath}`);
    p.note(
      `Ejecuta /guild-specialize para que Claude\n` +
      `genere las instrucciones completas de "${agentName}".`,
      'Especializacion pendiente'
    );
    p.outro(chalk.bold.cyan(`Agente ${agentName} listo.`));
  } catch (error) {
    spinner.stop('Error al crear agente.');
    p.log.error(error.message);
    process.exit(1);
  }
}

function isValidAgentName(name) {
  return /^[a-z][a-z0-9-]*$/.test(name);
}
```

### Step 2: Commit

```bash
git add src/commands/new-agent.js
git commit -m "feat: simplify new-agent for v1 (flat file, no expertise)"
```

---

## Task 8: Adapt `status.js` and `bin/guild.js`

**Files:**
- Modify: `src/commands/status.js`
- Modify: `bin/guild.js`

### Step 1: Simplify `status.js`

Remove task counting (tasks/ is gone). Show: project name, stack, session state, agents list, skills.

```javascript
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export async function runStatus() {
  if (!existsSync('PROJECT.md')) {
    p.log.error('Guild no esta instalado. Ejecuta: guild init');
    process.exit(1);
  }

  const projectMd = readFileSync('PROJECT.md', 'utf8');
  const nameMatch = projectMd.match(/\*\*Nombre:\*\*\s*(.+)/);
  const stackMatch = projectMd.match(/\*\*Stack:\*\*\s*(.+)/);
  const projectName = nameMatch ? nameMatch[1].trim() : 'Proyecto';

  p.intro(chalk.bold.cyan(`Guild — ${projectName}`));

  if (stackMatch) {
    p.log.info(chalk.gray(`Stack: ${stackMatch[1].trim()}`));
  }

  // Session
  if (existsSync('SESSION.md')) {
    p.log.step('Sesion activa');
    const sessionMd = readFileSync('SESSION.md', 'utf8');
    const taskMatch = sessionMd.match(/\*\*Tarea en curso:\*\*\s*(.+)/);
    const stateMatch = sessionMd.match(/\*\*Estado:\*\*\s*(.+)/);
    if (taskMatch && taskMatch[1].trim() !== '—') p.log.info(`  Tarea: ${taskMatch[1].trim()}`);
    if (stateMatch) p.log.info(chalk.gray(`  ${stateMatch[1].trim()}`));
  }

  // Agents
  const agentsDir = join('.claude', 'agents');
  if (existsSync(agentsDir)) {
    p.log.step('Agentes');
    const agents = readdirSync(agentsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
    p.log.info(chalk.gray(`  ${agents.join(', ')}`));
  }

  // Skills
  const skillsDir = join('.claude', 'skills');
  if (existsSync(skillsDir)) {
    p.log.step('Skills');
    const skills = readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    p.log.info(chalk.gray(`  ${skills.join(', ')}`));
  }

  p.outro('');
}
```

### Step 2: Update `bin/guild.js`

Remove v0 commands (mode, upskill, sync). Keep: init, new-agent, status. Remove `--skip-github` option from init (v1 handles GitHub inline). Remove `--expertise` option from new-agent.

```javascript
#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

program
  .name('guild')
  .description('Multi-agent framework for Claude Code')
  .version(pkg.version);

program
  .command('init')
  .description('Inicializar Guild v1 en el proyecto actual')
  .action(async () => {
    const { runInit } = await import('../src/commands/init.js');
    await runInit();
  });

program
  .command('new-agent')
  .description('Crear un nuevo agente')
  .argument('<name>', 'Nombre del agente (lowercase, guiones)')
  .action(async (name) => {
    const { runNewAgent } = await import('../src/commands/new-agent.js');
    await runNewAgent(name);
  });

program
  .command('status')
  .description('Ver estado del proyecto Guild')
  .action(async () => {
    const { runStatus } = await import('../src/commands/status.js');
    await runStatus();
  });

program.parse();
```

### Step 3: Run tests

```bash
npm test
```

### Step 4: Commit

```bash
git add bin/guild.js src/commands/status.js
git commit -m "feat: update CLI and status for v1"
```

---

## Task 9: Update root CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (root of repo)

Update to reflect v1 architecture. Remove references to active.md, composer, expertise, modes, tasks/. Reference skills instead of slash commands.

### Step 1: Rewrite CLAUDE.md

Key sections:
- What Guild is (v1 description)
- Global rules (v1 — no active.md, no composer)
- CLI commands (init, new-agent, status)
- Skills reference (10 skills)
- Stack

### Step 2: Commit

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for v1 architecture"
```

---

## Task 10: Verification

### Step 1: Run full test suite

```bash
npm test
```

Expected: All tests pass.

### Step 2: Run linter

```bash
npm run lint
```

Expected: 0 errors, 0 warnings.

### Step 3: Test `guild init` in temporary directory

```bash
mkdir /tmp/guild-v1-test && cd /tmp/guild-v1-test
node /path/to/guild/bin/guild.js init
```

Walk through the onboarding. Verify generated structure:

```bash
ls -la
ls -la .claude/agents/
ls -la .claude/skills/
cat CLAUDE.md
cat PROJECT.md
cat SESSION.md
```

Expected:
```
proyecto/
├── CLAUDE.md
├── PROJECT.md
├── SESSION.md
└── .claude/
    ├── agents/ (8 .md files)
    └── skills/ (10 directories with SKILL.md)
```

Verify:
- No references to `active.md` anywhere
- No `tasks/` directory
- No `.claude/commands/` directory
- No `.claude/hooks/` directory
- CLAUDE.md has `[PENDIENTE: guild-specialize]` placeholders
- All 8 agents present with correct names (code-reviewer, bugfix, db-migration)
- All 10 skills present with valid SKILL.md

### Step 4: Test `guild new-agent` in the same directory

```bash
node /path/to/guild/bin/guild.js new-agent trading-advisor
```

Verify:
- Creates `.claude/agents/trading-advisor.md` (flat file)
- Does NOT create `.claude/agents/trading-advisor/` directory
- File has proper frontmatter and placeholder structure

### Step 5: Test `guild status`

```bash
node /path/to/guild/bin/guild.js status
```

Verify: Shows project name, stack, session state, agents list, skills list.

### Step 6: Cleanup test directory

```bash
rm -rf /tmp/guild-v1-test
```

### Step 7: Final commit (if any verification fixes needed)

```bash
npm test && npm run lint
git add -A
git commit -m "fix: verification fixes for v1"
```

---

## Summary of commits

1. `chore: remove v0 composer, expertise, and mode system`
2. `feat: add v1 flat agent templates`
3. `feat: add v1 skill templates`
4. `feat: rewrite generators for v1 structure`
5. `feat: rewrite files.js for v1 flat agents and skills`
6. `feat: rewrite init.js for v1 onboarding`
7. `feat: simplify new-agent for v1 (flat file, no expertise)`
8. `feat: update CLI and status for v1`
9. `docs: update CLAUDE.md for v1 architecture`
10. `fix: verification fixes for v1` (if needed)

## Out of scope (v1.1+)
- `guild update` command
- `claude skills install guild-agents` distribution
- npm publish
- Real-world project testing
- Enriching skill placeholder content based on usage feedback
