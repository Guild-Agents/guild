---
name: guild-specialize
description: "Enriquece CLAUDE.md explorando el proyecto y especializa los agentes al stack real"
user-invocable: true
---

# Guild Specialize

Explora el proyecto real del usuario y enriquece toda la configuracion de Guild con informacion concreta del stack, arquitectura y convenciones detectadas.

Este skill se ejecuta una vez despues de `guild init`. Transforma los placeholders genericos en informacion real del proyecto.

## Cuando usarlo

- Inmediatamente despues de ejecutar `guild init`
- Cuando se agrega un stack nuevo al proyecto (nueva base de datos, nuevo framework)
- Cuando la estructura del proyecto cambio significativamente

## Proceso

### Paso 1 — Leer contexto base

Lee los archivos de configuracion de Guild:

- `CLAUDE.md` — instrucciones actuales (contiene placeholders `[PENDIENTE: guild-specialize]`)
- `PROJECT.md` — identidad y stack declarado durante init
- `SESSION.md` — estado de sesion actual

### Paso 2 — Explorar el proyecto real

Investiga la estructura real del proyecto buscando:

**Dependencias y versiones:**

- `package.json` (Node.js/frontend)
- `pom.xml` o `build.gradle` (Java)
- `requirements.txt` o `pyproject.toml` (Python)
- `Gemfile` (Ruby)
- `go.mod` (Go)
- `Cargo.toml` (Rust)

**Arquitectura y estructura:**

- Carpetas `src/`, `app/`, `lib/`, `pkg/`, `internal/`
- Patron de organizacion: por capas, por features, por dominio
- Entry points del proyecto

**Configuracion y convenciones:**

- `tsconfig.json`, `eslint.config.*`, `.prettierrc`
- `.env.example`, `.env.local` (variables de entorno — NO leer `.env` real)
- `Dockerfile`, `docker-compose.yml`
- CI/CD: `.github/workflows/`, `.gitlab-ci.yml`

**Base de datos y migraciones:**

- Carpeta `migrations/`, `db/`, `prisma/`, `drizzle/`
- ORM o query builder configurado
- Schema existente

**Documentacion existente:**

- `README.md` — vision general del proyecto
- Documentacion interna en `docs/`

### Paso 3 — Enriquecer CLAUDE.md

Reemplaza todos los placeholders `[PENDIENTE: guild-specialize]` en CLAUDE.md con informacion real:

- **Stack con versiones exactas**: extraidas de los archivos de dependencias
- **Estructura de carpetas explicada**: que hace cada carpeta principal
- **Convenciones de codigo detectadas**: linter, formatter, estilo de imports
- **Patrones de arquitectura identificados**: MVC, hexagonal, modular, etc.
- **Variables de entorno conocidas**: listadas desde `.env.example`
- **Limitaciones y deuda tecnica visible**: dependencias desactualizadas, TODOs encontrados
- **Comandos utiles del proyecto**: scripts de npm/make/cargo detectados

### Paso 4 — Especializar agentes

Para cada agente en `.claude/agents/*.md`, agrega contexto especifico del proyecto:

- **advisor.md**: dominio real del proyecto, usuarios objetivo
- **tech-lead.md**: stack especifico, patrones detectados, decisiones de arquitectura
- **product-owner.md**: funcionalidades existentes, backlog visible
- **developer.md**: convenciones de codigo, framework principal, estructura de archivos
- **code-reviewer.md**: reglas de lint, patrones del proyecto, anti-patrones a vigilar
- **qa.md**: framework de testing, comandos para ejecutar tests, cobertura actual
- **bugfix.md**: stack de debugging, logs, herramientas disponibles
- **db-migration.md**: ORM, herramienta de migraciones, schema actual (si aplica)

Usa el tool `Task` para invocar cada agente leyendo su `.claude/agents/[nombre].md` si necesitas perspectiva especializada para enriquecer su configuracion.

### Paso 5 — Confirmar

Presenta un resumen de lo detectado:

```text
Guild v1 especializado para [nombre-proyecto]

Stack detectado:
- [lista de tecnologias con versiones]

Arquitectura:
- [patron identificado]
- [estructura principal]

Agentes actualizados:
- [lista de agentes con su especializacion aplicada]

Ejecuta /status para ver el estado completo.
```

### Paso 6 — Commit enrichment immediately

**CRITICAL:** After enriching CLAUDE.md and agent files, commit the changes immediately as their own atomic commit. Do NOT leave them as unstaged changes — they are vulnerable to `git stash` and other operations.

```bash
git add CLAUDE.md .claude/agents/*.md
git commit -m "chore: enrich CLAUDE.md and agents via guild-specialize"
```

This ensures enrichment survives any subsequent git operations (stash, checkout, rebase).

## Example Session

```text
User: /guild-specialize

Guild Specialize analyzing project...

Stack detected:
- Node.js 20.11.0, TypeScript 5.3.3
- React 18.2.0, Next.js 14.1.0
- PostgreSQL via Prisma 5.9.0

Architecture:
- Next.js App Router (src/app/)
- API routes in src/app/api/
- Shared components in src/components/

Agents updated:
- developer.md: Specialized for Next.js + TypeScript
- qa.md: Configured for Vitest + Playwright
- db-migration.md: Configured for Prisma

Run /status to see the full state.
```

## Notas importantes

- NUNCA leas archivos `.env` reales — solo `.env.example` o `.env.local`
- Si no puedes detectar algo con certeza, pregunta al usuario en vez de asumir
- Prioriza precision sobre completitud — es mejor decir "no detectado" que inventar
- Los agentes deben quedar especializados al stack real, no generico
- NEVER use `git stash` in automated pipelines — use `wip:` commits instead
- CLAUDE.md changes must always be committed separately from feature code
