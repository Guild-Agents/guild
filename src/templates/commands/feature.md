# /feature

Inicia el flujo completo de desarrollo de una nueva feature.

## Uso
```
/feature [descripción de la idea]
```

## Flujo que ejecuta este comando

Este comando orquesta el flujo completo: Advisor → Product Owner → Tech Lead → Developer → QA → Bug Fixer → Code Review → PR.

### Paso 1 — Evaluación (Advisor)
Activa el Advisor para evaluar si la idea es coherente con el dominio del proyecto. El Advisor:
- Lee PROJECT.md
- Evalúa la idea
- Aprueba, rechaza o pide ajustes

Si el Advisor rechaza, detener el flujo y explicar al desarrollador el razonamiento.

### Paso 2 — Refinamiento (Advisor + Product Owner)
Si la idea fue aprobada, iterar con el Product Owner para:
- Definir el alcance exacto de la feature
- Identificar qué está dentro y fuera del MVP de esta feature
- Consultar al Advisor si hay ambigüedades de dominio

### Paso 3 — Documentación (Product Owner)
El Product Owner:
- Descompone la feature en tareas
- Escribe criterios de aceptación verificables
- Crea los TASK-XXX.md en tasks/backlog/
- Crea los GitHub Issues si está habilitado

### Paso 4 — Dirección técnica (Tech Lead)
El Tech Lead revisa cada tarea creada y agrega:
- Approach de implementación
- Interfaces clave
- Estructura de archivos sugerida
- Riesgos técnicos

### Paso 5 — Confirmación
Mostrar al desarrollador:
- Las tareas creadas con sus criterios de aceptación
- La dirección técnica del Tech Lead
- Preguntar si desea iniciar la implementación ahora o más tarde

Si confirma implementar ahora, continuar con el flujo de implementación.
