---
name: session-start
description: "Carga contexto y retoma trabajo desde SESSION.md"
user-invocable: true
---

# Session Start

Carga el contexto del proyecto y retoma el trabajo desde donde se dejo en la sesion anterior. Este es el primer skill que debes ejecutar al iniciar una sesion de trabajo.

## Cuando usarlo

- Al inicio de cada sesion de trabajo con el proyecto
- Cuando quieres retomar el contexto despues de una pausa

## Uso

`/session-start`

## Proceso

### Paso 1 — Cargar contexto

Lee los archivos de estado de Guild:

- `CLAUDE.md` — instrucciones, convenciones y reglas del proyecto
- `SESSION.md` — estado de la ultima sesion, tarea en curso, proximos pasos
- `PROJECT.md` — identidad del proyecto, stack, agentes configurados

### Paso 2 — Detect resumable work

Check for `wip:` checkpoint commits on active branches:

```bash
git branch --list "feature/*" --list "fix/*" | while read branch; do
  git log --oneline "$branch" -1 | grep "^wip:" && echo "Resumable: $branch"
done
```

If `wip:` commits are found, present them to the user with the phase they were in when interrupted.

### Paso 3 — Presentar estado

Muestra un resumen de la sesion anterior:

- Fecha de la ultima sesion
- Tarea en curso (si existe)
- Estado en que quedo el trabajo
- Decisiones tomadas previamente
- Proximos pasos registrados
- **Resumable pipelines** (if wip: commits detected)

### Paso 4 — Sugerir como continuar

Si hay tarea en curso:

- Muestra el estado de la tarea
- Sugiere continuar con el skill apropiado (ej: `/build-feature` si esta en implementacion)
- Muestra los proximos pasos registrados en SESSION.md

Si no hay tarea en curso, sugiere opciones:

- `/build-feature [descripcion]` — para implementar una feature nueva
- `/new-feature [nombre]` — para preparar el entorno de una feature
- `/status` — para ver el estado general del proyecto
- `/council [pregunta]` — para debatir una decision importante

### Paso 5 — Actualizar sesion

Actualiza SESSION.md con la fecha actual para registrar que la sesion inicio.

## Example Session

```text
User: /session-start

Loading context...
Last session: 2026-02-22
Task in progress: user-preferences (Phase 4 — Implementation)
Resumable: feature/user-preferences (wip: phase 3 complete)

Suggested: Continue with /build-feature to resume implementation.
```
