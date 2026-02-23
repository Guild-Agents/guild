# Guild AI — CLI Framework para agentes de Claude Code

## Framework
Este proyecto usa Guild. Leer SESSION.md al inicio de cada sesion.

## Que es este proyecto
Guild es un CLI npm (`npm install -g guild-agents`, comando `guild`) que configura un equipo de 8 agentes IA especializados y 10 skills en cualquier proyecto que use Claude Code. El comando principal es `guild init`, que lanza un onboarding interactivo y genera toda la estructura necesaria.

**Arquitectura v1:** Agentes = WHO (identidad plana en .md), Skills = HOW (workflows con SKILL.md). Composicion nativa de Claude Code — sin composer.js, sin active.md, sin expertise/.

**El proyecto usa sus propios agentes para construirse a si mismo.**

## Reglas globales
- No implementar sin plan aprobado por Advisor y direccion tecnica del Tech Lead
- El Developer escribe tests unitarios como parte de la implementacion
- Actualizar SESSION.md al cerrar cada sesion
- ESModules en todo el codigo — no CommonJS, no require()
- path.join() siempre para construir paths — nunca concatenar strings

## Comandos CLI
```bash
npm test                    # tests (Vitest)
npm run lint                # lint (ESLint flat config)
node bin/guild.js --help    # verificar CLI
node bin/guild.js init      # probar onboarding v1
```

## CLI commands
- `guild init`       — onboarding interactivo, genera estructura v1
- `guild new-agent`  — crear agente personalizado (.md plano)
- `guild status`     — ver estado del proyecto

## Skills del equipo
- /guild-specialize  — enriquecer CLAUDE.md explorando el proyecto real
- /build-feature     — pipeline completo de desarrollo
- /new-feature       — crear branch y scaffold para feature
- /council           — debatir decisiones con multiples agentes
- /review            — code review sobre el diff actual
- /qa-cycle          — ciclo QA + bugfix
- /status            — ver estado del proyecto
- /dev-flow          — ver fase actual del pipeline
- /session-start     — cargar contexto y retomar trabajo
- /session-end       — guardar estado en SESSION.md

## Stack
Node.js 20+, ESModules, Commander.js, @clack/prompts, Vitest, ESLint

## Estructura del proyecto
```
src/
  commands/       — init.js, new-agent.js, status.js
  utils/          — generators.js, files.js, github.js
  templates/
    agents/       — 8 archivos .md (advisor, developer, etc.)
    skills/       — 10 directorios con SKILL.md
bin/
  guild.js        — entry point CLI (Commander)
```
