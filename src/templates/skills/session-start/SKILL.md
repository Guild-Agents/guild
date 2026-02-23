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

### Paso 2 — Presentar estado

Muestra un resumen de la sesion anterior:
- Fecha de la ultima sesion
- Tarea en curso (si existe)
- Estado en que quedo el trabajo
- Decisiones tomadas previamente
- Proximos pasos registrados

### Paso 3 — Sugerir como continuar

Si hay tarea en curso:
- Muestra el estado de la tarea
- Sugiere continuar con el skill apropiado (ej: `/build-feature` si esta en implementacion)
- Muestra los proximos pasos registrados en SESSION.md

Si no hay tarea en curso, sugiere opciones:
- `/build-feature [descripcion]` — para implementar una feature nueva
- `/new-feature [nombre]` — para preparar el entorno de una feature
- `/status` — para ver el estado general del proyecto
- `/council [pregunta]` — para debatir una decision importante

### Paso 4 — Actualizar sesion

Actualiza SESSION.md con la fecha actual para registrar que la sesion inicio.
