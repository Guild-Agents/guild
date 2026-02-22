/**
 * upskill.js — Agrega nueva expertise a un agente existente
 *
 * Flujo:
 * 1. Verificar que el agente existe
 * 2. Verificar que la expertise no existe ya (o confirmar sobreescritura)
 * 3. Leer PROJECT.md para tener contexto del proyecto
 * 4. Generar el archivo de expertise (instrucción para Claude Code via SESSION.md)
 * 5. Actualizar PROJECT.md con el nuevo modo
 * 6. Regenerar active.md
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { composeAgent } from '../utils/composer.js';
import { updateProjectMdModes } from '../utils/generators.js';

const AGENTS_DIR = '.claude/agents';

export async function runUpskill(agentName, expertiseName) {
  if (!existsSync(AGENTS_DIR)) {
    console.error(chalk.red('Guild no está instalado en este proyecto. Ejecuta: guild init'));
    process.exit(1);
  }

  const agentDir = join(AGENTS_DIR, agentName);
  if (!existsSync(agentDir)) {
    console.error(chalk.red(`Agente "${agentName}" no encontrado.`));
    process.exit(1);
  }

  const expertisePath = join(agentDir, 'expertise', `${expertiseName}.md`);

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

  // Crear un placeholder que Claude Code reemplazará con contenido real
  const projectContext = existsSync('PROJECT.md') ? readFileSync('PROJECT.md', 'utf8') : '';
  const placeholder = generateExpertisePlaceholder(agentName, expertiseName, projectContext);
  writeFileSync(expertisePath, placeholder, 'utf8');

  // Agregar instrucción en SESSION.md para que Claude Code genere el contenido real
  await addUpskillInstructions(agentName, expertiseName, expertisePath);

  console.log('');
  console.log(chalk.bold.cyan('⚔️  Upskill iniciado'));
  console.log(chalk.gray(`   Expertise placeholder creado: ${expertisePath}`));
  console.log('');
  console.log(chalk.yellow('Próximo paso:'));
  console.log(chalk.white('  Abre Claude Code y ejecuta /guild-specialize'));
  console.log(chalk.white(`  Claude generará el contenido real de la expertise "${expertiseName}" para "${agentName}"`));
  console.log(chalk.white('  usando razonamiento profundo basado en PROJECT.md'));
}

function generateExpertisePlaceholder(agentName, expertiseName, projectContext) {
  return `# Expertise: ${expertiseName}
<!-- PENDIENTE: Generar con /guild-specialize en Claude Code -->
<!-- Este archivo fue creado por guild upskill ${agentName} ${expertiseName} -->
<!-- Claude Code completará el contenido usando razonamiento profundo basado en PROJECT.md -->
`;
}

async function addUpskillInstructions(agentName, expertiseName, expertisePath) {
  const sessionPath = 'SESSION.md';
  if (!existsSync(sessionPath)) return;

  const current = readFileSync(sessionPath, 'utf8');
  const note = `\n## Upskill pendiente\n- Agente: ${agentName}\n- Expertise: ${expertiseName}\n- Archivo: ${expertisePath}\n- Acción: ejecutar /guild-specialize para generar el contenido\n`;

  writeFileSync(sessionPath, current + note, 'utf8');
}
