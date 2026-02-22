/**
 * new-agent.js — Crea un nuevo agente especializado
 *
 * Flujo:
 * 1. Pedir descripción del rol y responsabilidades
 * 2. Crear directorio del agente con estructura estándar
 * 3. Generar base.md con placeholder (Claude Code lo completará)
 * 4. Si se especifican expertises, crear sus placeholders también
 * 5. Agregar instrucción en SESSION.md para generación con Claude Code
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const AGENTS_DIR = '.claude/agents';

export async function runNewAgent(agentName, options = {}) {
  if (!existsSync(AGENTS_DIR)) {
    console.error(chalk.red('Guild no está instalado. Ejecuta: guild init'));
    process.exit(1);
  }

  const agentDir = join(AGENTS_DIR, agentName);
  if (existsSync(agentDir)) {
    console.error(chalk.red(`El agente "${agentName}" ya existe.`));
    process.exit(1);
  }

  // Recopilar información del nuevo agente
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

  // Crear estructura de carpetas
  mkdirSync(join(agentDir, 'expertise'), { recursive: true });

  // Crear base.md placeholder
  const baseMd = generateBaseMdPlaceholder(agentName, role, responsibilities);
  writeFileSync(join(agentDir, 'base.md'), baseMd, 'utf8');

  // Crear placeholders de expertises si se especificaron
  const expertises = options.expertise || [];
  for (const exp of expertises) {
    const expPath = join(agentDir, 'expertise', `${exp}.md`);
    writeFileSync(expPath, `# Expertise: ${exp}\n<!-- Pendiente: generar con /guild-specialize -->\n`, 'utf8');
  }

  // Crear active.md inicial (solo base por ahora)
  writeFileSync(join(agentDir, 'active.md'), baseMd, 'utf8');

  // Agregar instrucción en SESSION.md
  await addNewAgentInstructions(agentName, role, expertises);

  console.log('');
  console.log(chalk.bold.cyan(`⚔️  Nuevo agente creado: ${agentName}`));
  console.log(chalk.gray(`   Directorio: ${agentDir}`));
  console.log('');
  console.log(chalk.yellow('Próximo paso:'));
  console.log(chalk.white('  Ejecuta /guild-specialize en Claude Code'));
  console.log(chalk.white(`  Claude generará las instrucciones completas para "${agentName}"`));
  console.log(chalk.white('  basándose en el rol, responsabilidades y PROJECT.md'));
  console.log('');
  console.log(chalk.gray(`  Luego actívalo con: /agent:${agentName} en Claude Code`));
}

function generateBaseMdPlaceholder(name, role, responsibilities) {
  return `# ${name} — Base
<!-- PENDIENTE: Generar con /guild-specialize en Claude Code -->

## Rol (draft)
${role}

## Responsabilidades (draft)
${responsibilities}

<!-- Claude Code completará este archivo con instrucciones detalladas -->
<!-- usando razonamiento profundo basado en el rol, PROJECT.md y el workflow de Guild -->
`;
}

async function addNewAgentInstructions(agentName, role, expertises) {
  const sessionPath = 'SESSION.md';
  if (!existsSync(sessionPath)) return;

  const { readFileSync, writeFileSync } = await import('fs');
  const current = readFileSync(sessionPath, 'utf8');
  const note = `\n## Nuevo agente pendiente de especialización\n- Agente: ${agentName}\n- Rol: ${role}\n- Expertises: ${expertises.length > 0 ? expertises.join(', ') : 'ninguna por ahora'}\n- Acción: ejecutar /guild-specialize para generar base.md completo\n`;

  writeFileSync(sessionPath, current + note, 'utf8');
}
