---
name: dev-flow
description: "Muestra fase actual del pipeline y que sigue"
user-invocable: true
---

# Dev Flow

Muestra la fase actual del pipeline de desarrollo y sugiere el siguiente paso. Util para retomar trabajo cuando no recuerdas en que punto del flujo te quedaste.

## Cuando usarlo

- Cuando retomas trabajo y no recuerdas la fase actual
- Para ver el progreso del pipeline de build-feature
- Para decidir que skill ejecutar a continuacion

## Uso

`/dev-flow`

## Proceso

### Paso 1 — Leer estado

Lee `SESSION.md` para determinar:

- Si hay una feature en curso
- En que fase del pipeline se encuentra
- Que se completo y que falta

### Paso 2 — Determinar fase actual

Las fases del pipeline son:

1. **Evaluacion** (Advisor) — go/no-go
2. **Especificacion** (Product Owner) — criterios de aceptacion
3. **Approach tecnico** (Tech Lead) — plan de implementacion
4. **Implementacion** (Developer) — codigo y tests
5. **Review** (Code Reviewer) — revision de calidad
6. **QA** — validacion funcional

### Paso 3 — Presentar estado del flujo

```text
Dev Flow — [nombre de la feature]

[x] Fase 1 — Evaluacion (completada)
[x] Fase 2 — Especificacion (completada)
[ ] Fase 3 — Approach tecnico (pendiente) <-- estas aqui
[ ] Fase 4 — Implementacion
[ ] Fase 5 — Review
[ ] Fase 6 — QA

Siguiente paso: Ejecuta /build-feature para continuar desde la Fase 3.
```

Si no hay feature en curso, informa que no hay pipeline activo y sugiere `/new-feature` o `/build-feature`.
