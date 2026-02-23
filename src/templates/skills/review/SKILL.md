---
name: review
description: "Code review standalone sobre el diff actual"
user-invocable: true
---

# Review

Ejecuta un code review independiente sobre los cambios actuales del proyecto. Invoca al agente Code Reviewer para analizar calidad, patrones, seguridad y deuda tecnica.

## Cuando usarlo

- Antes de crear un PR
- Para revisar cambios propios antes de pedir review a otros
- Cuando quieres una segunda opinion sobre el codigo que escribiste

## Uso

`/review`

## Proceso

### Paso 1 — Obtener diff

Obtiene los cambios actuales:

1. Primero intenta `git diff --staged` (cambios en staging)
2. Si no hay cambios en staging, usa `git diff` (cambios sin stage)
3. Si no hay ningun cambio, informa que no hay nada que revisar

### Paso 2 — Invocar Code Reviewer

Invoca al agente Code Reviewer usando Task tool:

1. Lee `.claude/agents/code-reviewer.md` para asumir el rol
2. Lee CLAUDE.md para entender las convenciones del proyecto
3. Revisa el diff completo
4. Clasifica cada hallazgo por severidad:
   - **Blocker**: Debe corregirse antes de merge
   - **Warning**: Deberia corregirse, introduce deuda tecnica
   - **Suggestion**: Mejora opcional

### Paso 3 — Presentar hallazgos

Presenta el reporte organizado por severidad:

- Cantidad total de hallazgos por tipo
- Detalle de cada hallazgo: archivo, descripcion, sugerencia de correccion
- Veredicto final: Aprobado / Aprobado con warnings / Bloqueado

Si hay blockers, sugiere corregirlos y ejecutar `/review` de nuevo.

## Example Session

```text
User: /review

Reviewing diff: 4 files changed, +127 -34

Findings:
- [Warning] src/api/users.js:45 — No input validation on email parameter
- [Suggestion] src/utils/format.js:12 — Consider using Intl.DateTimeFormat
- [Blocker] src/db/queries.js:78 — SQL injection vulnerability in raw query

1 blocker, 1 warning, 1 suggestion.
```
