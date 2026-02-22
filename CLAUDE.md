# Guild AI — CLI Framework para agentes de Claude Code

## Framework
Este proyecto usa Guild. Leer PROJECT.md y SESSION.md al inicio de cada sesión antes de cualquier acción.

## Qué es este proyecto
Guild es un CLI npm (`npm install -g guild-agents`, comando `guild`) que configura un equipo de agentes IA especializados en cualquier proyecto que use Claude Code. El comando principal es `guild init`, que lanza un onboarding interactivo y genera toda la estructura necesaria.

**El proyecto usa sus propios agentes para construirse a sí mismo.**

## Reglas globales
- Leer IMPLEMENTATION.md antes de empezar cualquier tarea nueva — tiene el mapa completo del proyecto
- No modificar active.md directamente — se regenera via composer.js
- No implementar sin plan aprobado por Advisor y dirección técnica del Tech Lead
- El Developer escribe tests unitarios como parte de la implementación
- Cobertura mínima antes de enviar a QA: 80% global, 90% en utils/
- Actualizar SESSION.md al cerrar cada sesión
- ESModules en todo el código — no CommonJS, no require()
- path.join() siempre para construir paths — nunca concatenar strings

## Comandos CLI de referencia
```bash
npm test                    # tests
npm run lint                # lint
node bin/guild.js --help    # verificar CLI
node bin/guild.js init      # probar onboarding
```

## Slash commands del equipo
- /advisor        — evaluar ideas y coherencia con el dominio developer tooling
- /tech-lead      — dirección técnica, arquitectura Node.js CLI
- /po             — documentar features, gestionar backlog
- /developer      — implementar (Node.js + ESModules + Clack)
- /qa             — validar con Vitest
- /bug-fixer      — investigar bugs
- /code-review    — revisar antes del PR
- /feature        — flujo completo de una feature
- /session-start  — retomar trabajo
- /session-end    — guardar estado

## Stack activo
Ver PROJECT.md → Agentes activos y sus modos
