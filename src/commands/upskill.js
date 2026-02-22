/**
 * upskill.js — Agrega nueva expertise a un agente existente
 *
 * Flujo:
 * 1. Verificar que el agente existe
 * 2. Verificar que la expertise no existe ya (o confirmar sobreescritura)
 * 3. Buscar template en src/templates/agents/[agente]/expertise/[expertise].md
 * 4. Si existe template: copiar al proyecto
 * 5. Si no existe template: crear placeholder para /guild-specialize
 * 6. Agregar nota en SESSION.md
 * 7. Actualizar modos en PROJECT.md
 * 8. Regenerar active.md via composeAgent()
 * 9. Confirmar al usuario
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { composeAgent } from '../utils/composer.js';
import { updateProjectMdModes } from '../utils/generators.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'templates');
const AGENTS_DIR = join('.claude', 'agents');

export async function runUpskill(agentName, expertiseName) {
  p.intro(chalk.bold.cyan(`⚔️  Guild — Upskill`));

  // 1. Verificar que Guild está instalado
  if (!existsSync(AGENTS_DIR)) {
    p.log.error('Guild no está instalado en este proyecto. Ejecuta: guild init');
    process.exit(1);
  }

  // 2. Verificar que el agente existe
  const agentDir = join(AGENTS_DIR, agentName);
  if (!existsSync(agentDir)) {
    p.log.error(`Agente "${agentName}" no encontrado.`);
    p.log.info('Agentes disponibles: advisor, tech-lead, product-owner, developer, dba, qa, bug-fixer, code-review');
    process.exit(1);
  }

  // 3. Verificar si la expertise ya existe
  const expertiseDir = join(agentDir, 'expertise');
  mkdirSync(expertiseDir, { recursive: true });
  const expertisePath = join(expertiseDir, `${expertiseName}.md`);

  if (existsSync(expertisePath)) {
    const overwrite = await p.confirm({
      message: `La expertise "${expertiseName}" ya existe para "${agentName}". ¿Sobreescribir?`,
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel('Upskill cancelado.');
      process.exit(0);
    }
  }

  const spinner = p.spinner();
  spinner.start(`Agregando expertise "${expertiseName}" a ${agentName}...`);

  try {
    // 4. Buscar template en src/templates/agents/[agente]/expertise/[expertise].md
    const templatePath = join(TEMPLATES_DIR, 'agents', agentName, 'expertise', `${expertiseName}.md`);

    if (existsSync(templatePath)) {
      // Template existe — copiar al proyecto
      copyFileSync(templatePath, expertisePath);
    } else {
      // No hay template — crear placeholder para /guild-specialize
      const placeholder = generateExpertisePlaceholder(agentName, expertiseName);
      writeFileSync(expertisePath, placeholder, 'utf8');
    }

    // 5. Leer modos actuales y agregar el nuevo
    const currentModes = getCurrentModes(agentName);
    if (!currentModes.includes(expertiseName)) {
      currentModes.push(expertiseName);
    }

    // 6. Actualizar PROJECT.md con los nuevos modos
    await updateProjectMdModes(agentName, currentModes);

    // 7. Regenerar active.md
    await composeAgent(agentName, currentModes);

    // 8. Agregar nota en SESSION.md
    addUpskillNote(agentName, expertiseName, expertisePath);

    spinner.stop(`Expertise "${expertiseName}" agregada a ${agentName}.`);

    // 9. Confirmar al usuario
    const hasTemplate = existsSync(templatePath);
    if (hasTemplate) {
      p.log.success(`Expertise copiada desde template del framework.`);
    } else {
      p.note(
        `El archivo de expertise fue creado como placeholder.\n\n` +
        `  Abre Claude Code y ejecuta /guild-specialize\n\n` +
        `Claude generará el contenido real de "${expertiseName}"\n` +
        `para "${agentName}" usando razonamiento profundo.`,
        'Especialización pendiente'
      );
    }

    p.log.info(chalk.gray(`Modos activos: ${currentModes.join(', ')}`));
    p.outro(chalk.bold.cyan(`⚔️  ${agentName} recompuesto.`));
  } catch (error) {
    spinner.stop('Error al agregar expertise.');
    p.log.error(error.message);
    process.exit(1);
  }
}

function generateExpertisePlaceholder(agentName, expertiseName) {
  return `# Expertise: ${expertiseName}
<!-- PENDIENTE: Generar con /guild-specialize en Claude Code -->
<!-- Creado por: guild upskill ${agentName} ${expertiseName} -->
<!-- Claude Code completará el contenido usando razonamiento profundo basado en PROJECT.md -->
`;
}

function getCurrentModes(agentName) {
  if (!existsSync('PROJECT.md')) return [];

  const content = readFileSync('PROJECT.md', 'utf8');
  const regex = new RegExp(`\\*\\*${agentName}:\\*\\*\\s*(.+)`, 'i');
  const match = content.match(regex);

  if (!match) return [];

  const modesStr = match[1].trim();
  const cleaned = modesStr.replace(/\(.*?\)/g, '').trim();
  if (cleaned.startsWith('_') || cleaned === 'base' || cleaned.startsWith('N/A') || cleaned === '—') return [];

  return cleaned.split(',').map(m => m.trim()).filter(Boolean);
}

function addUpskillNote(agentName, expertiseName, _expertisePath) {
  const sessionPath = 'SESSION.md';
  if (!existsSync(sessionPath)) return;

  const content = readFileSync(sessionPath, 'utf8');
  const note = `- Expertise "${expertiseName}" agregada a ${agentName} — requiere especialización con /guild-specialize`;

  const updated = content.replace(
    /(## Contexto relevante\n(?:- .+\n)*)/,
    `$1${note}\n`
  );

  writeFileSync(sessionPath, updated, 'utf8');
}
