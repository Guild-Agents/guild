---
name: new-feature
description: "Crea branch y scaffold para una nueva feature"
user-invocable: true
---

# New Feature

Prepara el entorno para trabajar en una nueva feature: crea branch, actualiza SESSION.md y opcionalmente crea un GitHub Issue.

## Cuando usarlo

- Al iniciar una feature nueva antes de escribir codigo
- Cuando quieres dejar registrado el contexto de la feature en SESSION.md

## Uso

`/new-feature [nombre-de-la-feature]`

## Proceso

### Paso 1 — Obtener nombre

Si el usuario no proporciono nombre, preguntale:

- Nombre corto para la feature (se usara en el nombre del branch)
- Descripcion breve (1-2 oraciones)

### Paso 2 — Crear branch con worktree isolation

When running in parallel with other agents, use git worktrees for isolation. When running standalone, a simple branch is sufficient.

**For parallel execution (multiple build-features at once):**

```bash
git worktree add .claude/worktrees/feature-[nombre] -b feature/[nombre-de-la-feature] develop
```

All subsequent operations should use `.claude/worktrees/feature-[nombre]` as the working directory.

**For standalone execution:**

```bash
git checkout -b feature/[nombre-de-la-feature]
```

Si el branch ya existe, pregunta si quiere cambiarse a el o crear uno nuevo.

**Cleanup:** At skill exit, if using worktrees, the caller is responsible for cleanup via `git worktree remove .claude/worktrees/feature-[nombre]` after the PR is merged.

### Paso 3 — Actualizar SESSION.md

Actualiza SESSION.md con el contexto de la nueva feature:

- **Fecha:** fecha actual
- **Tarea en curso:** nombre de la feature
- **Estado:** Feature iniciada — pendiente de implementacion

### Paso 4 — GitHub Issue (opcional)

Si el proyecto tiene integracion GitHub configurada en PROJECT.md:

1. Pregunta si quiere crear un GitHub Issue para la feature
2. Si acepta, crea el issue con `gh issue create`
3. Registra la URL del issue en SESSION.md

### Paso 5 — Confirmar

Confirma al usuario:

- Branch creado: `feature/[nombre]`
- SESSION.md actualizado
- GitHub Issue creado (si aplica)
- Sugiere: "Ejecuta /build-feature para implementar la feature completa"
