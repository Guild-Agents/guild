/**
 * new-agent.js — Crea un nuevo agente v1 (archivo plano)
 *
 * Flujo:
 * 1. Validar nombre (lowercase, guiones, sin espacios)
 * 2. Verificar que Guild esta instalado
 * 3. Verificar que el agente NO existe
 * 4. Pedir descripcion del agente
 * 5. Crear .claude/agents/[nombre].md con placeholder
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const AGENTS_DIR = join('.claude', 'agents');

export async function runNewAgent(agentName) {
  p.intro(chalk.bold.cyan('Guild — Nuevo agente'));

  // Validar nombre
  if (!isValidAgentName(agentName)) {
    p.log.error(`Nombre invalido: "${agentName}". Solo lowercase, numeros y guiones.`);
    p.log.info('Ejemplo: guild new-agent security-auditor');
    process.exit(1);
  }

  // Verificar Guild instalado
  if (!existsSync(AGENTS_DIR)) {
    p.log.error('Guild no esta instalado. Ejecuta: guild init');
    process.exit(1);
  }

  // Verificar que el agente NO existe
  const agentPath = join(AGENTS_DIR, `${agentName}.md`);
  if (existsSync(agentPath)) {
    p.log.error(`El agente "${agentName}" ya existe.`);
    process.exit(1);
  }

  // Pedir descripcion
  const description = await p.text({
    message: `Que hace "${agentName}"? (descripcion corta):`,
    placeholder: 'ej: Evalua oportunidades de trading basado en analisis tecnico',
    validate: (val) => !val ? 'La descripcion es requerida' : undefined,
  });
  if (p.isCancel(description)) { p.cancel('Cancelado.'); process.exit(0); }

  // Crear agente
  const spinner = p.spinner();
  spinner.start(`Creando agente "${agentName}"...`);

  try {
    const content = `---
name: ${agentName}
description: "${description}"
---

# ${agentName}

Eres ${agentName} de [PROYECTO].

## Responsabilidades
[Definir con /guild-specialize]

## Lo que NO haces
[Definir con /guild-specialize]

## Proceso
[Definir con /guild-specialize]

## Reglas de comportamiento
- Siempre lee CLAUDE.md y SESSION.md al inicio de la sesion
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
