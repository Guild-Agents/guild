# PROJECT.md — Guild AI
> Configuración del proyecto para construir Guild usando Guild

## Identidad
- **Nombre:** guild
- **Dominio:** Developer tooling — frameworks y herramientas para potenciar el workflow de desarrollo con IA
- **Descripción:** CLI npm instalable que configura un equipo de agentes IA especializados en proyectos que usan Claude Code. Guild es el framework que estandariza cómo los developers trabajan con agentes IA: onboarding, especialización, flujo de features, gestión de estado entre sesiones.
- **Alcance inicial:** CLI funcional con `guild init`, `guild mode`, `guild upskill`, `guild new-agent`, `guild sync`, `guild status`. Agentes base con expertise para el stack del proyecto. Slash commands para todos los agentes. Publicación en npm como `guild-agents`.

## Stack tecnológico
- **Runtime:** Node.js 20+ (ESModules nativos — `import`/`export`, sin CommonJS)
- **CLI prompts:** @clack/prompts ^0.9.0
- **CLI framework:** commander ^12.0.0
- **Colores terminal:** chalk ^5.3.0, picocolors ^1.0.0
- **File utilities:** fs-extra ^11.2.0
- **Testing:** Vitest
- **Lint:** ESLint (flat config)
- **Package manager:** npm
- **Target:** Node.js >= 18, macOS + Linux + Windows

## Decisiones arquitectónicas clave
- ESModules en todo el proyecto — no CommonJS, no require()
- Async/await en toda operación de I/O — nunca callbacks
- Sin base de datos — todo el estado vive en archivos markdown en el proyecto del usuario
- Sin servidor — Guild es un CLI puro, sin procesos en background
- Separación estricta: `src/commands/` orquesta, `src/utils/` ejecuta, `src/templates/` son los archivos que se copian al proyecto del usuario
- Los templates de agentes (base.md, expertise/*.md) son el producto principal — el CLI es el instalador
- Commander para parsear comandos, Clack para interacción con el usuario — nunca mezclar responsabilidades
- Errors con mensajes accionables: el usuario siempre debe saber qué hacer cuando algo falla

## Reglas del dominio
- Guild NUNCA modifica archivos del proyecto del usuario salvo los que él mismo creó (PROJECT.md, SESSION.md, CLAUDE.md, .claude/, tasks/)
- `active.md` de cada agente NUNCA se edita manualmente — siempre se regenera vía composer
- El nombre del paquete npm es `guild-agents`, el comando CLI es `guild`
- Semantic Versioning estricto: breaking changes = major, features = minor, fixes = patch
- Todo cambio de comportamiento público requiere actualización de CHANGELOG.md
- Los archivos de expertise son el activo más valioso del proyecto — calidad sobre cantidad
- Guild debe funcionar offline — sin dependencias de red en tiempo de ejecución salvo la integración opcional con GitHub CLI

## Estrategia de testing
- **Framework:** Vitest
- **TDD:** Sí — escribir tests antes de implementar en módulos de utils
- **Cobertura mínima obligatoria:**
  - Lógica de negocio / dominio (composer, generators): 90%
  - Comandos CLI (commands/): 80%
  - Utilidades (utils/): 80%
  - Global mínimo: 80%
- **Regla clave:** cada comportamiento documentado en IMPLEMENTATION.md debe tener al menos un test que lo valide

## Agentes activos y sus modos
- **advisor:** developer-tooling
- **tech-lead:** nodejs-cli
- **product-owner:** base
- **developer:** nodejs, clack
- **dba:** N/A — este proyecto no usa base de datos
- **qa:** vitest
- **bug-fixer:** nodejs, clack
- **code-review:** nodejs, clack

## Integración GitHub
- **Habilitado:** Sí
- **Repo:** https://github.com/guild-agents/guild
- **Branches:** main (producción) + develop (integración)
- **Labels:** backlog, in-progress, in-review, done, bug, blocked, expertise
- **PR workflow:** feature/* y fix/* → develop → release → main
