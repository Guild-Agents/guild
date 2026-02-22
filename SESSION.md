# SESSION.md

## Sesión activa
- **Fecha:** 2026-02-22
- **Tarea en curso:** —
- **GitHub Issue:** —
- **Agente activo:** —
- **Estado:** Fase 1 completada y mergeada en develop. Listo para iniciar Fase 2.

## Contexto relevante
- **npm:** paquete `guild-agents` publicado (v0.0.1 placeholder)
- **GitHub:** org `guild-agents`, rama `develop`, 2 commits limpios
- **CI:** en rojo (0/4) — esperado, los tests son Fase 4
- **Comando CLI:** `guild` — paquete npm `guild-agents`, comando `guild`
- **Permisos:** `.claude/settings.json` configurado — auto-approve dev, bloquea git push y rm -rf
- **Fase 1 completada:** generators.js, files.js y mode.js sin TODOs. `guild init` corre end-to-end.

## Decisiones tomadas
- Org GitHub: `guild-agents` (guild-ai no disponible)
- Paquete npm: `guild-agents`, comando CLI: `guild`
- Permisos Claude Code: auto-approve para desarrollo, confirmación manual para git push
- Guild se construye con sus propios agentes — dogfooding desde el día 1

## Próximos pasos
1. **Fase 2** — comandos faltantes en este orden:
   - `src/commands/status.js`
   - `src/commands/upskill.js`
   - `src/commands/new-agent.js`
   - `src/commands/sync.js`
2. **Fase 3** — verificar slash commands de agentes
3. **Fase 4** — tests Vitest, 80% cobertura mínima (apaga el CI)
4. **Fase 5** — README final para lanzamiento público