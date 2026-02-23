/**
 * generators.js — Genera los archivos de estado del proyecto (v1)
 */

import { writeFileSync } from 'fs';

/**
 * Genera PROJECT.md con los datos del onboarding.
 * V1: solo metadata cruda — CLAUDE.md tiene el contexto enriquecido.
 */
export async function generateProjectMd(data) {
  const date = new Date().toISOString().split('T')[0];

  let content = `# PROJECT.md
> Generado por Guild v1 el ${date}

## Proyecto
- **Nombre:** ${data.name}
- **Tipo:** ${data.type}
- **Stack:** ${data.stack}
- **Codigo existente:** ${data.hasExistingCode ? 'Si' : 'No'}
`;

  if (data.github?.repoUrl) {
    content += `
## GitHub
- **Repositorio:** ${data.github.repoUrl}
`;
  }

  writeFileSync('PROJECT.md', content, 'utf8');
}

/**
 * Genera CLAUDE.md — documento central con placeholders para guild-specialize.
 */
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

## Subagent rules
- Guild agent roles (advisor, developer, tech-lead, etc.) are NOT Claude Code subagent_types
- Always use \`subagent_type: "general-purpose"\` when spawning agents via Task tool
- CLAUDE.md and SESSION.md changes must be committed separately from feature code
- No \`git stash\` in automated pipelines — use \`wip:\` commits instead
- Parallel agents must use git worktrees for isolation

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

/**
 * Genera SESSION.md inicial.
 */
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
