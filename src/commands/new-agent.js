/**
 * new-agent.js — Crea un nuevo agente especializado
 *
 * Flujo:
 * 1. Validar nombre (lowercase, guiones, sin espacios)
 * 2. Verificar que el agente NO existe ya
 * 3. Pedir descripción del rol y responsabilidades
 * 4. Crear estructura de carpetas
 * 5. Generar base.md con placeholder
 * 6. Copiar expertises iniciales si se especificaron
 * 7. Agregar agente a PROJECT.md
 * 8. Generar active.md via composeAgent()
 * 9. Crear slash command en .claude/commands/[nombre].md
 * 10. Confirmar al usuario
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { composeAgent } from '../utils/composer.js';

const AGENTS_DIR = join('.claude', 'agents');
const COMMANDS_DIR = join('.claude', 'commands');

export async function runNewAgent(agentName, options = {}) {
  p.intro(chalk.bold.cyan(`⚔️  Guild — Nuevo agente`));

  // 1. Validar nombre
  if (!isValidAgentName(agentName)) {
    p.log.error(`Nombre inválido: "${agentName}". Solo lowercase, números y guiones.`);
    p.log.info('Ejemplo: guild new-agent security-auditor');
    process.exit(1);
  }

  // 2. Verificar que Guild está instalado
  if (!existsSync(AGENTS_DIR)) {
    p.log.error('Guild no está instalado. Ejecuta: guild init');
    process.exit(1);
  }

  // 3. Verificar que el agente NO existe
  const agentDir = join(AGENTS_DIR, agentName);
  if (existsSync(agentDir)) {
    p.log.error(`El agente "${agentName}" ya existe.`);
    process.exit(1);
  }

  // 4. Recopilar información del nuevo agente
  const role = await p.text({
    message: `¿Cuál es el rol de "${agentName}"? (descripción breve)`,
    placeholder: 'ej: Experto en seguridad y auditoría de código',
    validate: (val) => !val ? 'La descripción del rol es requerida' : undefined,
  });

  if (p.isCancel(role)) { p.cancel('Cancelado.'); process.exit(0); }

  const responsibilities = await p.text({
    message: '¿Cuáles son sus responsabilidades principales?',
    placeholder: 'ej: Auditar vulnerabilidades, revisar dependencias, proponer fixes de seguridad',
  });

  if (p.isCancel(responsibilities)) { p.cancel('Cancelado.'); process.exit(0); }

  const spinner = p.spinner();
  spinner.start(`Creando agente "${agentName}"...`);

  try {
    // 5. Crear estructura de carpetas
    mkdirSync(join(agentDir, 'expertise'), { recursive: true });

    // 6. Crear base.md placeholder
    const baseMd = generateBaseMd(agentName, role, responsibilities);
    writeFileSync(join(agentDir, 'base.md'), baseMd, 'utf8');

    // 7. Crear placeholders de expertises si se especificaron
    const expertises = options.expertise || [];
    for (const exp of expertises) {
      const expPath = join(agentDir, 'expertise', `${exp}.md`);
      writeFileSync(expPath, `# Expertise: ${exp}\n<!-- Pendiente: generar con /guild-specialize -->\n`, 'utf8');
    }

    // 8. Generar active.md via composeAgent()
    await composeAgent(agentName, expertises);

    // 9. Agregar agente a PROJECT.md
    addAgentToProjectMd(agentName, expertises);

    // 10. Crear slash command
    createSlashCommand(agentName, role);

    // 11. Agregar instrucciones en SESSION.md
    addNewAgentNote(agentName, role, expertises);

    spinner.stop(`Agente "${agentName}" creado.`);

    p.log.success(`Directorio: ${agentDir}`);
    if (expertises.length > 0) {
      p.log.info(`Expertises: ${expertises.join(', ')}`);
    }

    p.note(
      `Abre Claude Code y ejecuta /guild-specialize\n\n` +
      `Claude generará las instrucciones completas para "${agentName}"\n` +
      `basándose en el rol, responsabilidades y PROJECT.md.\n\n` +
      `Luego actívalo con: /${agentName}`,
      'Especialización pendiente'
    );

    p.outro(chalk.bold.cyan(`⚔️  Agente ${agentName} listo.`));
  } catch (error) {
    spinner.stop('Error al crear agente.');
    p.log.error(error.message);
    process.exit(1);
  }
}

function isValidAgentName(name) {
  return /^[a-z][a-z0-9-]*$/.test(name);
}

function generateBaseMd(name, role, responsibilities) {
  return `# ${name} — Base
<!-- PENDIENTE: Generar con /guild-specialize en Claude Code -->

## Rol
${role}

## Responsabilidades
${responsibilities}

## Lo que NO haces
[Definir con /guild-specialize — importante para evitar solapamientos]

## Proceso
[Definir con /guild-specialize]

## Criterios de calidad
[Definir con /guild-specialize]

## Reglas de comportamiento
- Siempre leer PROJECT.md al inicio de la sesión
- Siempre leer SESSION.md al inicio de la sesión
- Al cerrar sesión, actualizar SESSION.md con el estado actual
`;
}

function createSlashCommand(agentName, role) {
  mkdirSync(COMMANDS_DIR, { recursive: true });

  const content = `# /${agentName}

Activa el agente ${agentName} para esta sesión.

## Instrucciones para Claude

1. Lee \`.claude/agents/${agentName}/active.md\` — estas son tus instrucciones como ${agentName}
2. Lee \`PROJECT.md\` — entiende el contexto del proyecto
3. Lee \`SESSION.md\` — retoma el contexto de la sesión actual
4. Confirma al desarrollador que estás listo como ${agentName} y pregunta qué necesita

## Cuándo usar este agente
${role}
`;

  writeFileSync(join(COMMANDS_DIR, `${agentName}.md`), content, 'utf8');
}

function addAgentToProjectMd(agentName, expertises) {
  if (!existsSync('PROJECT.md')) return;

  const content = readFileSync('PROJECT.md', 'utf8');
  const modesStr = expertises.length > 0 ? expertises.join(', ') : 'base';
  const newLine = `- **${agentName}:** ${modesStr}`;

  // Insertar antes de la sección "## Integración GitHub" o al final de "## Agentes activos"
  const githubSectionIndex = content.indexOf('## Integración GitHub');
  if (githubSectionIndex !== -1) {
    const updated = content.slice(0, githubSectionIndex) + newLine + '\n\n' + content.slice(githubSectionIndex);
    writeFileSync('PROJECT.md', updated, 'utf8');
  } else {
    // Agregar al final del archivo
    writeFileSync('PROJECT.md', content + '\n' + newLine + '\n', 'utf8');
  }
}

function addNewAgentNote(agentName, role, expertises) {
  const sessionPath = 'SESSION.md';
  if (!existsSync(sessionPath)) return;

  const content = readFileSync(sessionPath, 'utf8');
  const note = `- Nuevo agente "${agentName}" creado (${role}) — ejecutar /guild-specialize para completar base.md`;

  const updated = content.replace(
    /(## Contexto relevante\n(?:- .+\n)*)/,
    `$1${note}\n`
  );

  writeFileSync(sessionPath, updated, 'utf8');
}
