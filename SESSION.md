# SESSION.md

## Sesión activa
- **Fecha:** 2026-02-22
- **Tarea en curso:** —
- **GitHub Issue:** —
- **Agente activo:** —
- **Estado:** Proyecto inicializado. Estructura base creada. Pendiente completar implementación según IMPLEMENTATION.md.

## Contexto relevante
- El paquete npm `guild-agents` está reservado en npmjs.com (versión 0.0.1 placeholder)
- La org de GitHub es `guild-agents` (no `guild-ai` que no estaba disponible)
- El comando CLI es `guild` — el nombre del paquete npm y el comando son distintos
- Los esqueletos de todos los comandos están creados con TODOs pendientes
- Los 8 agentes tienen sus base.md completos en src/templates/agents/
- Todos los slash commands están creados en src/templates/commands/
- Ver IMPLEMENTATION.md para el orden exacto de implementación recomendado

## Próximos pasos
1. Leer IMPLEMENTATION.md completo antes de escribir código
2. Completar TODOs en generators.js (generateSessionMd, generateClaudeMd)
3. Completar TODOs en files.js (copySlashCommands, copyHooks)
4. Completar TODOs en mode.js (getCurrentModes, addUpskillNote)
5. Verificar que `guild init` corre de punta a punta sin errores
