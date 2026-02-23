---
name: qa-cycle
description: "Ciclo QA + bugfix hasta que pase"
user-invocable: true
---

# QA Cycle

Ejecuta un ciclo de validacion QA seguido de bugfix hasta que todos los criterios pasen limpio. Util para validar implementaciones sin el pipeline completo de build-feature.

## Cuando usarlo

- Despues de implementar cambios que necesitan validacion
- Para verificar que una correccion de bug no introdujo regresiones
- Como ciclo final antes de crear un PR

## Uso

`/qa-cycle`

## Proceso

### Paso 1 — Validacion QA

Invoca el agente QA usando Task tool:

1. Lee `.claude/agents/qa.md` para asumir el rol de QA
2. Lee CLAUDE.md y SESSION.md para contexto
3. Revisa los criterios de aceptacion de la tarea en curso (si existen en SESSION.md)
4. Ejecuta los tests del proyecto
5. Valida edge cases y escenarios de error
6. Reporta resultados

### Paso 2 — Bugfix (si hay bugs)

Si QA reporta bugs, invoca el agente Bugfix usando Task tool:

1. Lee `.claude/agents/bugfix.md` para asumir el rol de Bugfix
2. Recibe el reporte de bugs de QA como input
3. Diagnostica la causa raiz de cada bug
4. Implementa la correccion minima
5. Verifica que el fix resuelve el problema

### Paso 3 — Re-validacion

Vuelve al Paso 1 para re-validar despues del bugfix.
Maximo 3 ciclos de QA-bugfix para evitar loops infinitos.

### Paso 4 — Resultado final

Presenta el resultado:

- **Aprobado**: Todos los criterios pasan, no hay bugs pendientes
- **Con advertencias**: Pasa pero hay warnings menores
- **Rechazado**: Hay bugs criticos que no se pudieron resolver — escalar al Tech Lead

Actualiza SESSION.md con el resultado del ciclo QA.

## Subagent Configuration

When spawning QA or Bugfix agents via the Task tool, always use `subagent_type: "general-purpose"`. Guild agent role names are NOT valid Claude Code subagent_types.
