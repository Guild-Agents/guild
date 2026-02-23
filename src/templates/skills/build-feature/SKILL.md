---
name: build-feature
description: "Pipeline completo: evaluacion -> spec -> implementacion -> review -> QA"
user-invocable: true
---

# Build Feature

Pipeline completo para construir una feature de punta a punta con todos los agentes del equipo. Cada fase invoca un agente especializado usando el tool `Task`.

## Cuando usarlo

- Para implementar una feature nueva que requiere el ciclo completo
- Cuando quieres que la feature pase por evaluacion, especificacion, implementacion, review y QA

## Uso

`/build-feature [descripcion de la feature]`

## Parallel Execution: Worktree Isolation

When multiple build-feature pipelines run in parallel, each MUST use its own git worktree to avoid branch conflicts:

```bash
git worktree add .claude/worktrees/[branch-name] -b [branch-name] develop
```

All file operations within the pipeline must use the worktree directory as the working directory. After the PR is merged, clean up with:

```bash
git worktree remove .claude/worktrees/[branch-name]
```

When running a single build-feature, a simple `git checkout -b` is sufficient.

## Pipeline de 6 fases

### Fase 1 — Evaluacion (Advisor)

**Agente:** Lee `.claude/agents/advisor.md` via Task tool
**Input:** La descripcion de la feature proporcionada por el usuario
**Proceso:**

1. El Advisor evalua la feature contra la vision del proyecto
2. Identifica riesgos, dependencias y conflictos con funcionalidad existente
3. Emite evaluacion: Aprobado / Rechazado / Requiere ajustes

**Output:** Evaluacion con razonamiento y riesgos identificados
**Condicion de salida:** Si el Advisor rechaza la feature, el pipeline se detiene aqui. Informa al usuario el motivo y sugiere ajustes si los hay.

### Fase 2 — Especificacion (Product Owner)

**Agente:** Lee `.claude/agents/product-owner.md` via Task tool
**Input:** La feature aprobada por el Advisor + sus observaciones
**Proceso:**

1. El Product Owner descompone la feature en tareas concretas
2. Define criterios de aceptacion verificables para cada tarea
3. Estima esfuerzo y sugiere orden de implementacion

**Output:** Lista de tareas con criterios de aceptacion, estimacion y orden

### Fase 3 — Approach tecnico (Tech Lead)

**Agente:** Lee `.claude/agents/tech-lead.md` via Task tool
**Input:** Tareas del Product Owner + criterios de aceptacion
**Proceso:**

1. El Tech Lead define el approach de implementacion
2. Identifica archivos a modificar, patrones a seguir, interfaces
3. Anticipa riesgos tecnicos y propone mitigaciones

**Output:** Plan tecnico con archivos, patrones, interfaces y riesgos

### Fase 4 — Implementacion (Developer)

**Agente:** Lee `.claude/agents/developer.md` via Task tool
**Input:** Plan tecnico del Tech Lead + criterios de aceptacion del PO
**Proceso:**

1. El Developer implementa siguiendo el plan tecnico
2. Escribe tests unitarios como parte de la implementacion
3. Hace commits atomicos con mensajes descriptivos
4. Verifica que los tests pasan

**Output:** Codigo implementado + tests + commits realizados

### Fase 5 — Review (Code Reviewer)

**Agente:** Lee `.claude/agents/code-reviewer.md` via Task tool
**Input:** Los cambios implementados (git diff)
**Proceso:**

1. El Code Reviewer revisa calidad, patrones, seguridad y tests
2. Clasifica hallazgos como Blocker, Warning o Suggestion

**Output:** Reporte de review con hallazgos clasificados
**Condicion de loop:** Si hay hallazgos de tipo Blocker, vuelve a **Fase 4** para que el Developer los corrija. Maximo 2 iteraciones de review-fix.

### Fase 6 — QA

**Agente:** Lee `.claude/agents/qa.md` via Task tool
**Input:** Criterios de aceptacion del PO + codigo implementado
**Proceso:**

1. QA ejecuta los tests y valida criterios de aceptacion
2. Prueba edge cases y escenarios de error
3. Si encuentra bugs, reporta con pasos de reproduccion

**Output:** Reporte QA con resultado por cada criterio de aceptacion
**Condicion de loop:** Si hay bugs:

1. Invoca agente Bugfix (lee `.claude/agents/bugfix.md` via Task tool) para corregir
2. Vuelve a **Fase 5** (Review) para verificar el fix
3. Maximo 2 ciclos de bugfix-review-QA

## Checkpoint Commits

After each phase completes, create a checkpoint commit to preserve progress. This ensures work survives session interruptions.

```bash
git add -A
git commit -m "wip: [feature-name] phase N complete — [phase-name]"
```

Pattern for each phase:

- After Phase 1: `wip: [feature] phase 1 — advisor approved`
- After Phase 2: `wip: [feature] phase 2 — PO spec ready`
- After Phase 3: `wip: [feature] phase 3 — tech approach defined`
- After Phase 4: `wip: [feature] phase 4 — implementation done`
- After Phase 5: `wip: [feature] phase 5 — review passed`
- After Phase 6: `wip: [feature] phase 6 — QA passed`

Also update SESSION.md at each phase transition:

```text
- [timestamp] | build-feature | Phase N ([phase-name]) complete for [feature]
```

## Finalizacion

Al completar todas las fases exitosamente:

1. Presenta resumen del pipeline:
   - Feature implementada
   - Archivos modificados/creados
   - Tests ejecutados y resultado
   - Issues de review resueltos
   - Resultado QA final

2. Actualiza `SESSION.md` con:
   - Feature completada
   - Decisiones tomadas durante el pipeline
   - Proximos pasos si los hay

3. Close the GitHub Issue (if applicable):
   - Do NOT use `Closes #N` in PR description (only works when merging to default branch)
   - After the PR is merged, run: `gh issue close N --comment "Resolved in PR #X"`

## Subagent Configuration

When spawning agents via the Task tool, use these `subagent_type` values:

| Guild Agent Role | subagent_type to use |
| --- | --- |
| advisor, product-owner, tech-lead | `"general-purpose"` |
| developer, bugfix | `"general-purpose"` |
| code-reviewer, qa | `"general-purpose"` |

**IMPORTANT:** Guild agent role names (advisor, developer, etc.) are NOT valid Claude Code subagent_types. Always use `"general-purpose"` for agents that need full tool access (Read, Write, Edit, Bash, Grep, Glob, etc.). Never use `"Bash"` alone — it lacks file editing tools.

Example Task invocation:

```text
Task tool with:
  subagent_type: "general-purpose"
  prompt: "Read .claude/agents/developer.md and assume that role. Then: [task description]"
```

## Example Session

```text
User: /build-feature add dark mode toggle to settings page

Phase 1 — Advisor: Approved. Low risk, aligns with UX roadmap.
Phase 2 — PO: 3 tasks defined with acceptance criteria.
Phase 3 — Tech Lead: Use CSS variables + context provider pattern.
Phase 4 — Developer: Implemented ThemeContext, toggle component, CSS vars.
Phase 5 — Review: Passed. 1 suggestion (memoize context value).
Phase 6 — QA: All 3 acceptance criteria verified. 0 bugs.

Feature complete. PR ready for merge.
```

## Notas

- Si el usuario quiere saltar fases (ej: "ya la evaluo, implementa directo"), permite saltar a Fase 4 pero advierte que se pierde validacion
- El pipeline es secuencial: cada fase depende del output de la anterior
- Los loops de review/QA tienen limite para evitar ciclos infinitos
