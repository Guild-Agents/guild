# SESSION.md

## Sesión activa
- **Fecha:** 2026-02-22
- **Tarea en curso:** —
- **GitHub Issue:** —
- **Agente activo:** Developer
- **Estado:** Fase 2 completada. Todos los comandos CLI implementados y verificados.

## Contexto relevante
- **npm:** paquete `guild-agents` publicado (v0.0.1 placeholder)
- **GitHub:** org `guild-agents`, rama `develop`, 2 commits limpios
- **CI:** en rojo (0/4) — esperado, los tests son Fase 4
- **Comando CLI:** `guild` — paquete npm `guild-agents`, comando `guild`
- **Permisos:** `.claude/settings.json` configurado — auto-approve dev, bloquea git push y rm -rf
- **Fase 1 completada:** generators.js, files.js y mode.js sin TODOs. `guild init` corre end-to-end.
- **Fase 2 completada:** status.js, upskill.js, new-agent.js, sync.js — todos implementados y verificados
- **Fase 3 parcial:** todos los slash commands de agentes y session-end.md ya existen en templates/commands/. Hook on-mode-change.sh también existe.
- **ESLint:** falta configuración (eslint.config.js no existe) — pendiente para Fase 4

## Decisiones tomadas
- Org GitHub: `guild-agents` (guild-ai no disponible)
- Paquete npm: `guild-agents`, comando CLI: `guild`
- Permisos Claude Code: auto-approve para desarrollo, confirmación manual para git push
- Guild se construye con sus propios agentes — dogfooding desde el día 1
- status.js usa Clack (p.intro/p.outro/p.log) para output consistente con el resto del CLI
- upskill.js busca templates en src/templates/ antes de crear placeholders
- new-agent.js valida nombres (solo lowercase + guiones), crea slash command automáticamente
- sync.js compara estado local (carpetas tasks/) con labels en GitHub Issues

## Próximos pasos
1. **Fase 3** — verificar que todos los slash commands de agentes funcionan correctamente (ya están creados en templates/)
2. **Fase 4** — tests Vitest + ESLint config, 80% cobertura mínima (apaga el CI)
3. **Fase 5** — README final para lanzamiento público
