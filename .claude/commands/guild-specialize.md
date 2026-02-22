# /guild-specialize

Especializa todos los agentes del equipo según el stack y dominio definidos en PROJECT.md.

Este comando debe ejecutarse una vez después del onboarding inicial (`guild init`) y cada vez que el stack o dominio del proyecto cambie significativamente.

## Qué hace este comando

Para cada agente, genera un archivo de expertise específico al proyecto usando razonamiento profundo. El resultado es un agente que no solo conoce su tecnología en general, sino que entiende cómo aplicarla en el contexto específico de este proyecto.

## Instrucciones para Claude

Lee PROJECT.md completamente antes de continuar.

Luego, para cada agente listado en "Agentes activos y sus modos", genera su expertise usando `think hard`:

### Advisor
Genera `.claude/agents/advisor/expertise/[dominio].md` donde `[dominio]` es una palabra clave del dominio del proyecto (ej: fintech, ecommerce, saas).

Piensa profundamente en: las reglas de negocio del dominio, los patrones típicos de ese sector, los anti-patrones comunes, las regulaciones relevantes si aplica, y cómo ese contexto debe influir en las decisiones de producto del proyecto específico descrito en PROJECT.md.

### Tech Lead
Genera `.claude/agents/tech-lead/expertise/[arquitectura].md` según el stack del proyecto.

Piensa profundamente en: los patrones arquitectónicos más adecuados para este stack, las decisiones ya tomadas en PROJECT.md y sus implicaciones, cómo estructurar el código de forma coherente, los riesgos técnicos típicos de este stack, y cómo el Tech Lead debe guiar al Developer en este contexto específico.

### Developer
Para cada modo activo listado en PROJECT.md bajo "developer", genera `.claude/agents/developer/expertise/[modo].md`.

Piensa profundamente en: los patrones idiomáticos de esa tecnología, las convenciones del proyecto específico, las mejores prácticas, los anti-patrones a evitar, y cómo ese stack se integra con el resto del sistema descrito en PROJECT.md.

### DBA
Para cada modo activo listado bajo "dba", genera `.claude/agents/dba/expertise/[modo].md`.

Piensa profundamente en: las convenciones de esa base de datos, las herramientas de migración del stack, los patrones de modelado de datos adecuados para el dominio del proyecto, los anti-patrones de performance, y las reglas de integridad relevantes para las reglas de negocio del proyecto.

### QA
Para cada modo activo listado bajo "qa", genera `.claude/agents/qa/expertise/[modo].md`.

Piensa profundamente en: cómo usar ese framework de testing efectivamente en el stack del proyecto, qué tipos de tests son más valiosos para este dominio, las convenciones de testing del stack, y cómo estructurar los tests para que sean mantenibles.

### Bug Fixer, Code Review
Estos agentes heredan las expertises del Developer. Ejecuta:
```
guild mode bug-fixer [modos del developer]
guild mode code-review [modos del developer]
```

## Al terminar

1. Ejecuta `guild mode [agente] [modos]` para cada agente para regenerar sus `active.md`
2. Actualiza SESSION.md indicando que la especialización fue completada
3. Confirma al desarrollador que el equipo está listo
