---
name: session-end
description: "Guarda estado actual en SESSION.md"
user-invocable: true
---

# Session End

Guarda el estado actual del trabajo en SESSION.md para poder retomarlo en la siguiente sesion. Ejecuta este skill antes de cerrar la sesion de trabajo.

## Cuando usarlo

- Antes de cerrar la sesion de trabajo
- Cuando necesitas pausar y quieres guardar el contexto

## Uso

`/session-end`

## Proceso

### Paso 1 — Recopilar estado actual

Analiza el estado actual del trabajo:

- Que tarea estaba en curso
- En que fase del pipeline se encuentra (si aplica)
- Que archivos se modificaron (via `git status`)
- Que commits se hicieron en esta sesion

### Paso 2 — Actualizar SESSION.md

Actualiza SESSION.md con la siguiente informacion:

- **Fecha:** fecha actual
- **Tarea en curso:** nombre de la tarea o "ninguna"
- **GitHub Issue:** URL del issue asociado (si existe)
- **Agente activo:** ultimo agente utilizado o "ninguno"
- **Estado:** descripcion concreta de donde quedo el trabajo

**Contexto relevante:**

- Decisiones tomadas en esta sesion
- Problemas encontrados y como se resolvieron
- Informacion importante para retomar

**Proximos pasos:**

- Las 2-3 acciones concretas mas importantes al retomar
- Skill sugerido para continuar (ej: "ejecutar /build-feature para continuar desde Fase 4")

### Paso 3 — Commit WIP if uncommitted work exists

If there are uncommitted changes, create a checkpoint commit:

```bash
git add -A
git commit -m "wip: session paused — [brief description of current state]"
```

This ensures no work is lost between sessions. Never leave uncommitted changes across session boundaries.

## Example Session

```text
User: /session-end

Saving session state...
Task: user-preferences
Phase: 4 — Implementation (in progress)
Files modified: 3 files
WIP committed: wip: session paused — user-preferences phase 4

SESSION.md updated. Safe to close.
```

### Paso 4 — Confirmar

Confirma al usuario:

- SESSION.md actualizado con el estado actual
- WIP committed (if applicable)
- Proximos pasos registrados
- Puedes cerrar la sesion con seguridad
