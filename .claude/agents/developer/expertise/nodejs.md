# Expertise: Node.js + ESModules — CLI Development

## Contexto de esta expertise
Aplica en toda implementación de código en Guild: comandos CLI, utilidades de filesystem, generadores de archivos, integración con GitHub CLI, y cualquier módulo JavaScript del proyecto.

## Patrones idiomáticos para este proyecto

### Estructura de un command handler

Los command handlers orquestan — no implementan lógica de negocio:

```javascript
// src/commands/upskill.js
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import { composeAgent } from '../utils/composer.js';
import { updateProjectMdModes } from '../utils/generators.js';

export async function runUpskill(agentName, expertiseName) {
  // 1. Validaciones con mensajes accionables
  if (!existsSync('.claude/agents')) {
    p.log.error('Guild no está instalado en este proyecto. Ejecuta: guild init');
    process.exit(1);
  }

  const agentDir = join('.claude/agents', agentName);
  if (!existsSync(agentDir)) {
    p.log.error(`Agente "${agentName}" no encontrado.`);
    p.log.info(`Agentes disponibles: advisor, tech-lead, product-owner, developer, dba, qa, bug-fixer, code-review`);
    process.exit(1);
  }

  // 2. Lógica de negocio en utils
  const expertisePath = join(agentDir, 'expertise', `${expertiseName}.md`);
  const templatePath = join(getTemplatesDir(), 'agents', agentName, 'expertise', `${expertiseName}.md`);

  // 3. Interacción con usuario via Clack
  const spinner = p.spinner();
  spinner.start(`Agregando expertise "${expertiseName}" a ${agentName}...`);

  try {
    await addExpertise(agentDir, expertiseName, templatePath);
    await updateProjectMdModes(agentName, await getUpdatedModes(agentName, expertiseName));
    await composeAgent(agentName, await getCurrentModes(agentName));
    spinner.stop(`Expertise "${expertiseName}" agregada.`);
  } catch (error) {
    spinner.stop('Error al agregar expertise.');
    p.log.error(error.message);
    process.exit(1);
  }
}
```

### Estructura de un util

Los utils son funciones puras que el Developer puede testear:

```javascript
// src/utils/composer.js
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Compone active.md de un agente concatenando base.md + expertises.
 * @param {string} agentName - Nombre del agente
 * @param {string[]} modes - Lista de modos/expertises a activar
 * @returns {string} Path del active.md generado
 */
export async function composeAgent(agentName, modes = []) {
  const agentDir = join('.claude/agents', agentName);
  const basePath = join(agentDir, 'base.md');
  const activePath = join(agentDir, 'active.md');

  if (!existsSync(basePath)) {
    throw new Error(`base.md no encontrado para agente "${agentName}" en ${basePath}`);
  }

  let content = readFileSync(basePath, 'utf8');

  for (const mode of modes) {
    const expertisePath = join(agentDir, 'expertise', `${mode}.md`);
    if (existsSync(expertisePath)) {
      content += `\n\n---\n\n${readFileSync(expertisePath, 'utf8')}`;
    }
  }

  const timestamp = new Date().toISOString().split('T')[0];
  content += `\n\n---\n\n<!-- Guild — ${timestamp} | modos: ${modes.join(', ') || 'base'} -->\n`;

  writeFileSync(activePath, content, 'utf8');
  return activePath;
}
```

### Lectura y escritura de PROJECT.md

PROJECT.md es markdown con secciones estructuradas. El Developer debe parsearlo con regex cuidadosos — no hay un parser de markdown instalado:

```javascript
/**
 * Lee los modos activos de un agente desde PROJECT.md
 */
export function getAgentModes(agentName) {
  if (!existsSync('PROJECT.md')) return [];

  const content = readFileSync('PROJECT.md', 'utf8');
  const regex = new RegExp(`\\*\\*${agentName}:\\*\\*\\s*(.+)`, 'i');
  const match = content.match(regex);

  if (!match) return [];

  const modesStr = match[1].trim();
  if (modesStr.startsWith('_') || modesStr === 'base' || modesStr === 'N/A') return [];

  return modesStr.split(',').map(m => m.trim()).filter(Boolean);
}

/**
 * Actualiza los modos de un agente en PROJECT.md
 */
export function updateAgentModes(agentName, newModes) {
  if (!existsSync('PROJECT.md')) return;

  const content = readFileSync('PROJECT.md', 'utf8');
  const modeStr = newModes.length > 0 ? newModes.join(', ') : 'base';
  const updated = content.replace(
    new RegExp(`(\\*\\*${agentName}:\\*\\*).*`, 'i'),
    `$1 ${modeStr}`
  );
  writeFileSync('PROJECT.md', updated, 'utf8');
}
```

### Paths — siempre con path.join()

```javascript
// ✅ Correcto — funciona en Windows y Unix
import { join } from 'path';
const agentDir = join('.claude', 'agents', agentName);
const expertisePath = join(agentDir, 'expertise', `${mode}.md`);

// ❌ Incorrecto — falla en Windows
const agentDir = `.claude/agents/${agentName}`;
```

### Encontrar el directorio de templates desde el CLI

```javascript
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

function getTemplatesDir() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, '../../src/templates');
}
```

### Operaciones de filesystem más comunes en Guild

```javascript
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

// Crear directorio recursivamente (no falla si ya existe)
mkdirSync(join('.claude', 'agents', agentName, 'expertise'), { recursive: true });

// Leer archivo con encoding
const content = readFileSync('PROJECT.md', 'utf8');

// Escribir archivo
writeFileSync(join('.claude', 'agents', agentName, 'active.md'), content, 'utf8');

// Verificar existencia antes de leer
if (existsSync(filePath)) {
  const content = readFileSync(filePath, 'utf8');
}

// Listar archivos de un directorio
const expertiseFiles = readdirSync(expertiseDir)
  .filter(f => f.endsWith('.md'))
  .map(f => f.replace('.md', ''));
```

## Reglas para este proyecto

### Siempre
- Usar `path.join()` para construir paths, nunca concatenar strings
- Incluir JSDoc en funciones de utils — son la API pública del proyecto
- Manejar el caso en que `PROJECT.md` o `SESSION.md` no existen — Guild puede ejecutarse en un directorio recién clonado
- Verificar que `guild init` ya fue ejecutado antes de cualquier operación que asuma la estructura de `.claude/`
- Usar `fs-extra` para operaciones complejas (`copy`, `ensureDir`, `remove`)

### Nunca
- Usar `require()` o `module.exports`
- Usar `__dirname` sin el patrón ESM
- Concatenar paths con `/` o `\`
- Hardcodear paths absolutos
- Leer archivos del proyecto del usuario que Guild no haya creado
- Usar `console.log` — siempre `p.log.*` de Clack en command handlers, o sin output en utils

## Anti-patrones específicos de este proyecto

**No asumir que el CWD es el proyecto del usuario.** Guild se ejecuta desde `node_modules/.bin/guild` — el CWD es donde el usuario lo ejecuta, que sí es el proyecto. Pero en tests, el CWD puede ser diferente.

**No modificar el `active.md` directamente.** Siempre llamar a `composeAgent()`. Hay mucha tentación de editar `active.md` directamente porque es el archivo que Claude Code lee — pero si alguien lo edita a mano y luego corre `guild mode`, se pierde el cambio.

**No silenciar errores de GitHub CLI.** Si `gh` falla, loguear el error pero no abortar — la integración con GitHub es opcional y no debe bloquear el workflow de Guild.

**No asumir que los archivos de template existen.** Los templates de expertises para stacks específicos pueden no estar incluidos en la instalación base. El Developer debe manejar el caso en que el template no existe y crear el archivo vacío con la estructura del template.
