---
name: status
description: "Muestra estado actual del proyecto y sesion"
user-invocable: true
---

# Status

Muestra un resumen completo del estado actual del proyecto, la sesion activa y los recursos disponibles de Guild.

## Cuando usarlo

- Al inicio de una sesion para orientarte
- Para verificar que Guild esta correctamente configurado
- Para ver que agentes y skills estan disponibles

## Uso

`/status`

## Proceso

### Paso 1 — Leer archivos de estado

Lee los archivos de configuracion de Guild:

- `CLAUDE.md` — instrucciones y convenciones del proyecto
- `PROJECT.md` — identidad, stack y agentes configurados
- `SESSION.md` — estado de la sesion actual

### Paso 2 — Presentar estado

Muestra el resumen con el siguiente formato:

```text
Guild v1 — [nombre del proyecto]

Sesion actual:
- Fecha: [fecha de SESSION.md]
- Tarea en curso: [tarea o "ninguna"]
- Estado: [estado actual]

Stack:
- [tecnologias listadas en PROJECT.md]

Agentes disponibles:
- [lista de archivos .md en .claude/agents/]

Skills disponibles:
- [lista de directorios en .claude/skills/]

Proximos pasos:
- [extraidos de SESSION.md]
```

### Paso 3 — Sugerir acciones

Si no hay tarea en curso, sugiere:

- `/build-feature` para implementar algo nuevo
- `/new-feature` para preparar el entorno de una feature
- `/council` para debatir una decision

Si hay tarea en curso, sugiere continuar con el skill apropiado segun el estado.

## Example Session

```text
User: /status

Guild — MyProject
Stack: Node.js 20, React 18, PostgreSQL

Session: 2026-02-23
Task: Implementing user preferences
State: Phase 4 — Developer implementing

Agents: advisor, product-owner, tech-lead, developer, code-reviewer, qa, bugfix, db-migration
Skills: guild-specialize, build-feature, new-feature, council, qa-cycle, review, dev-flow,
  status, session-start, session-end
```
