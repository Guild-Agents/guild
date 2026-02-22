# Changelog

Todos los cambios notables de Guild AI se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/)
y el versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

### Added
- Estructura inicial del CLI con comandos: `init`, `mode`, `upskill`, `new-agent`, `sync`, `status`
- Onboarding interactivo con Clack
- 8 agentes base: Advisor, Tech Lead, Product Owner, Developer, DBA, QA, Bug Fixer, Code Review
- Sistema de expertises composables por agente
- Composición automática de `active.md` desde `base.md` + expertises
- Integración con GitHub Issues via `gh` CLI
- Slash commands: `/feature`, `/session-start`, `/session-end`, `/guild-specialize`
- Templates de PROJECT.md, SESSION.md, CLAUDE.md y TASK-XXX.md
- Gestión de estado entre sesiones via archivos markdown
- Sincronización de estado de tareas con GitHub Issues

---

<!-- Ejemplo de formato para futuras releases:

## [0.2.0] - 2026-04-01

### Added
- Comando `guild status` con vista resumen del proyecto
- Expertise: developer/nextjs
- Expertise: dba/redis

### Fixed
- Composición de active.md cuando el agente no tiene modos activos

### Changed
- El comando `guild mode` ahora acepta modos sin prefijo + para set exacto

## [0.1.0] - 2026-03-01

### Added
- Primera release pública
-->
