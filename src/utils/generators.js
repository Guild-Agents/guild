/**
 * generators.js — Genera los archivos de estado del proyecto
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

/**
 * Genera PROJECT.md a partir de los datos del onboarding.
 */
export async function generateProjectMd(data) {
  const { identity, stack, architecture, domainRules, testing, github } = data;

  const stackLines = buildStackLines(stack);
  const agentModes = buildAgentModesSection(data);
  const date = new Date().toISOString().split('T')[0];

  const content = `# PROJECT.md
> Generado por Guild AI el ${date} — actualizar cuando el proyecto evolucione

## Identidad
- **Nombre:** ${identity.name}
- **Dominio:** ${identity.domain}
- **Descripción:** ${identity.description}
${identity.scope ? `- **Alcance inicial:** ${identity.scope}` : ''}

## Stack tecnológico
${stackLines}

## Decisiones arquitectónicas clave
${architecture || '- _Por definir con el Tech Lead_'}

## Reglas del dominio
${domainRules || '- _Por definir con el Advisor_'}

## Estrategia de testing
- **Framework:** ${testing.framework !== 'none' ? testing.framework : 'Sin definir'}
- **TDD:** ${testing.tdd ? 'Sí — escribir tests antes de implementar' : 'No'}
- **Cobertura mínima obligatoria:**
  - Lógica de negocio / dominio: 90%
  - Servicios y casos de uso: 80%
  - Utilidades y helpers: 75%
  - Componentes UI: 60%
  - **Global mínimo: 80%**
- **Regla clave:** cada criterio de aceptación debe tener al menos un test que lo valide directamente

## Agentes activos y sus modos
${agentModes}

## Integración GitHub
- **Habilitado:** ${github?.enabled ? 'Sí' : 'No'}
${github?.enabled ? `- **Repo:** ${github.repoUrl}` : ''}
${github?.enabled ? `- **Labels:** backlog, in-progress, in-review, done, bug, blocked` : ''}
`;

  writeFileSync('PROJECT.md', content, 'utf8');
}

/**
 * Genera SESSION.md inicial.
 */
export async function generateSessionMd(projectName) {
  const date = new Date().toISOString().split('T')[0];

  const content = `# SESSION.md

## Sesión activa
- **Fecha:** ${date}
- **Tarea en curso:** —
- **GitHub Issue:** —
- **Agente activo:** —
- **Estado:** Proyecto recién inicializado con Guild

## Contexto relevante
- Onboarding completado. Ver PROJECT.md para detalles del proyecto.
- Agentes especializados pendientes — ejecutar /guild-specialize en Claude Code.

## Próximos pasos
1. Abrir Claude Code y ejecutar /guild-specialize para especializar los agentes
2. Definir la primera feature con el Advisor y el Product Owner
3. El Tech Lead revisará y enriquecerá las tareas con dirección técnica
`;

  writeFileSync('SESSION.md', content, 'utf8');
}

/**
 * Genera CLAUDE.md del proyecto.
 */
export async function generateClaudeMd(data) {
  const { identity, stack } = data;

  const content = `# ${identity.name}

## Framework
Este proyecto usa Guild AI. Leer PROJECT.md y SESSION.md al inicio
de cada sesión antes de cualquier acción.

## Reglas globales
- No modificar active.md directamente — se regenera con: guild mode [agente] [modos]
- No implementar sin un plan aprobado por el Advisor y dirección técnica del Tech Lead
- El Developer escribe tests unitarios como parte de la implementación
- Verificar coberturas mínimas antes de enviar a QA (ver PROJECT.md)
- Sincronizar estado con GitHub Issues en cada transición de tarea
- Actualizar SESSION.md al cerrar cada sesión

## Slash commands
- /advisor        — activar el Advisor para evaluar ideas
- /tech-lead      — activar el Tech Lead para dirección técnica
- /po             — activar el Product Owner para documentar tareas
- /developer      — activar el Developer para implementar
- /dba            — activar el DBA para consultas de base de datos
- /qa             — activar QA para validar una tarea
- /bug-fixer      — activar el Bug Fixer para investigar bugs
- /code-review    — activar Code Review antes de un PR
- /feature        — iniciar el flujo completo de una nueva feature
- /session-start  — leer estado y retomar trabajo
- /session-end    — guardar estado antes de cerrar
- /guild-specialize — especializar agentes según PROJECT.md (usar tras el onboarding)

## Stack activo
Ver PROJECT.md → Agentes activos y sus modos
`;

  writeFileSync('CLAUDE.md', content, 'utf8');
}

/**
 * Actualiza los modos de un agente en PROJECT.md.
 */
export async function updateProjectMdModes(agentName, newModes) {
  if (!existsSync('PROJECT.md')) return;

  const content = readFileSync('PROJECT.md', 'utf8');
  const modeStr = newModes.length > 0 ? newModes.join(', ') : 'solo base';

  // Reemplazar la línea del agente en la sección de modos
  const regex = new RegExp(`(- \\*\\*${agentName}:\\*\\*).*`, 'g');
  const updated = content.replace(regex, `$1 ${modeStr}`);

  writeFileSync('PROJECT.md', updated, 'utf8');
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildStackLines(stack) {
  const lines = [];

  if (stack.frontend) {
    const labels = {
      'react-vite': 'React + Vite',
      'nextjs': 'Next.js',
      'react-native': 'React Native / Expo',
      'angular': 'Angular',
      'vue': 'Vue.js',
      'svelte': 'Svelte / SvelteKit',
    };
    lines.push(`- **Frontend:** ${labels[stack.frontend] || stack.frontend}`);
  }

  if (stack.backend) {
    const labels = {
      'node-express': 'Node.js + Express',
      'node-fastify': 'Node.js + Fastify',
      'java-spring': 'Java + Spring Boot',
      'python-fastapi': 'Python + FastAPI',
      'python-django': 'Python + Django',
    };
    lines.push(`- **Backend:** ${labels[stack.backend] || stack.backend}`);
  }

  if (stack.db && !stack.db.includes('none') && stack.db.length > 0) {
    lines.push(`- **Base de datos:** ${stack.db.join(', ')}`);
  }

  if (stack.details) {
    lines.push(`- **Detalles adicionales:** ${stack.details}`);
  }

  return lines.join('\n') || '- _Por definir_';
}

function buildAgentModesSection(data) {
  const { stack, testing } = data;

  const devModes = resolveDevModes(stack);
  const dbModes = stack.db?.filter(d => d !== 'none') || [];
  const qaModes = testing?.framework !== 'none' ? [testing?.framework] : [];

  return [
    `- **advisor:** _dominio a especializar con /guild-specialize_`,
    `- **tech-lead:** _arquitectura a especializar con /guild-specialize_`,
    `- **product-owner:** base`,
    `- **developer:** ${devModes.join(', ') || 'base'}`,
    `- **dba:** ${dbModes.join(', ') || 'base'}`,
    `- **qa:** ${qaModes.join(', ') || 'base'}`,
    `- **bug-fixer:** ${devModes.join(', ') || 'base'} (hereda del developer)`,
    `- **code-review:** ${devModes.join(', ') || 'base'} (hereda del developer)`,
  ].join('\n');
}

function resolveDevModes(stack) {
  const modes = [];
  const frontendMap = {
    'react-vite': ['react', 'vite'],
    'nextjs': ['nextjs', 'react'],
    'react-native': ['react-native'],
    'angular': ['angular'],
    'vue': ['vue'],
    'svelte': ['svelte'],
  };
  const backendMap = {
    'node-express': ['node', 'express'],
    'node-fastify': ['node', 'fastify'],
    'java-spring': ['java-spring'],
    'python-fastapi': ['python', 'fastapi'],
    'python-django': ['python', 'django'],
  };

  if (stack.frontend && frontendMap[stack.frontend]) {
    modes.push(...frontendMap[stack.frontend]);
  }
  if (stack.backend && backendMap[stack.backend]) {
    modes.push(...backendMap[stack.backend]);
  }

  return modes;
}
