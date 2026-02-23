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

## Notas

- Si el usuario quiere saltar fases (ej: "ya la evaluo, implementa directo"), permite saltar a Fase 4 pero advierte que se pierde validacion
- El pipeline es secuencial: cada fase depende del output de la anterior
- Los loops de review/QA tienen limite para evitar ciclos infinitos
