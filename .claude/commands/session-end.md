# /session-end

Guarda el estado actual antes de cerrar la sesión.

## Instrucciones para Claude

Ejecuta estos pasos en orden al cerrar cada sesión:

1. **Actualiza TASK-XXX.md** si hay una tarea en curso:
   - Agrega una entrada al log de progreso con la fecha y lo que se hizo
   - Actualiza los criterios de aceptación completados (marca los checkboxes)
   - Actualiza el campo "Último update"

2. **Actualiza SESSION.md** con:
   - Fecha actual
   - Tarea en curso y su estado exacto
   - Agente activo
   - Contexto relevante generado en esta sesión (decisiones tomadas, cambios importantes)
   - Próximos pasos concretos para retomar el trabajo

3. **Sincroniza con GitHub** si hay cambios de estado pendientes

4. **Confirma al desarrollador** que el estado fue guardado y los próximos pasos están documentados
