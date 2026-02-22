# /session-start

Retoma el trabajo desde el punto exacto donde se dejó.

## Instrucciones para Claude

Ejecuta estos pasos en orden al inicio de cada sesión:

1. **Lee PROJECT.md** — recuerda el stack, las reglas del dominio y los agentes activos
2. **Lee SESSION.md** — identifica la tarea en curso, el agente activo y los próximos pasos
3. **Lee la tarea activa** si hay una en curso (tasks/in-progress/TASK-XXX.md)
4. **Carga el agente activo** según SESSION.md — lee su active.md
5. **Resume el trabajo** desde donde quedó, siguiendo los próximos pasos documentados

Si no hay tarea en curso, pregunta al desarrollador qué quiere hacer:
- Iniciar una nueva feature → `/feature`
- Tomar la siguiente tarea del backlog → mostrar tasks/backlog/ ordenado por prioridad
- Revisar el estado del proyecto → `/guild-status`
