---
name: council
description: "Convoca multiples agentes para debatir una decision importante"
user-invocable: true
---

# Council

Convoca un consejo de agentes especializados para debatir una decision importante. Cada agente aporta su perspectiva independiente y el resultado es una sintesis del debate.

Los agentes se invocan EN PARALELO usando el tool `Task` para obtener perspectivas independientes sin sesgo.

## Cuando usarlo

- Antes de tomar una decision arquitectonica importante
- Para evaluar el scope de una feature con multiples perspectivas
- Para decidir si abordar deuda tecnica y como priorizarla
- Cuando necesitas multiples puntos de vista sobre un problema complejo

## Uso

`/council [pregunta o decision a debatir]`

Opcionalmente puedes especificar el tipo: `/council architecture [pregunta]`

## Tipos de consejo

### 1. Council Architecture

**Participantes:** Tech Lead + Advisor + Developer
**Cuando aplica:** Decisiones sobre arquitectura, patrones, refactors grandes, tecnologias nuevas

Invoca los 3 agentes EN PARALELO usando Task tool:

- Task 1: Lee `.claude/agents/tech-lead.md` — perspectiva de arquitectura y coherencia tecnica
- Task 2: Lee `.claude/agents/advisor.md` — perspectiva de viabilidad y riesgos de negocio
- Task 3: Lee `.claude/agents/developer.md` — perspectiva de implementabilidad y pragmatismo

### 2. Council Feature-Scope

**Participantes:** Advisor + Product Owner + Tech Lead
**Cuando aplica:** Definir alcance de features, priorizar funcionalidades, evaluar propuestas de producto

Invoca los 3 agentes EN PARALELO usando Task tool:

- Task 1: Lee `.claude/agents/advisor.md` — perspectiva de dominio y vision estrategica
- Task 2: Lee `.claude/agents/product-owner.md` — perspectiva de valor para el usuario y scope
- Task 3: Lee `.claude/agents/tech-lead.md` — perspectiva de viabilidad tecnica y esfuerzo

### 3. Council Tech-Debt

**Participantes:** Tech Lead + Developer + Code Reviewer
**Cuando aplica:** Decidir si abordar deuda tecnica, planificar refactors, evaluar calidad del codebase

Invoca los 3 agentes EN PARALELO usando Task tool:

- Task 1: Lee `.claude/agents/tech-lead.md` — perspectiva de impacto arquitectonico
- Task 2: Lee `.claude/agents/developer.md` — perspectiva de costo de implementacion
- Task 3: Lee `.claude/agents/code-reviewer.md` — perspectiva de calidad y riesgos

## Proceso

### Paso 1 — Identificar tipo de consejo

Analiza la pregunta del usuario y determina que tipo de consejo aplica:

- Si menciona arquitectura, patrones, tecnologias → **architecture**
- Si menciona features, prioridades, scope, usuarios → **feature-scope**
- Si menciona deuda tecnica, refactor, calidad, mantenibilidad → **tech-debt**
- Si no es claro, pregunta al usuario

### Paso 2 — Convocar agentes

Invoca los 3 agentes correspondientes EN PARALELO usando Task tool. Cada agente:

1. Lee su archivo `.claude/agents/[nombre].md` para asumir su rol
2. Lee `CLAUDE.md` y `SESSION.md` para contexto del proyecto
3. Analiza la pregunta desde su perspectiva especializada
4. Emite su posicion con argumentos concretos

### Paso 3 — Presentar debate

Presenta las perspectivas de los 3 agentes de forma estructurada:

```text
## Council: [tipo]
Pregunta: [la pregunta del usuario]

### [Agente 1] — [posicion]
[argumentos principales]

### [Agente 2] — [posicion]
[argumentos principales]

### [Agente 3] — [posicion]
[argumentos principales]

### Sintesis
- Puntos de acuerdo: [...]
- Puntos de desacuerdo: [...]
- Riesgos identificados: [...]
```

### Paso 4 — Solicitar decision

Presenta opciones claras al usuario basadas en el debate:

- Opcion A: [resumen de una posicion]
- Opcion B: [resumen de otra posicion]
- Opcion C: [compromiso o alternativa]

Pide al usuario que decida. Si el usuario decide, documenta la decision en SESSION.md.

## Subagent Configuration

When spawning council agents via the Task tool, always use `subagent_type: "general-purpose"`. Guild agent role names (advisor, developer, tech-lead, etc.) are NOT valid Claude Code subagent_types.

Example:

```text
Task tool with:
  subagent_type: "general-purpose"
  prompt: "Read .claude/agents/tech-lead.md and assume that role. Then: [debate question]"
```

## Example Session

```text
User: /council Should we migrate from REST to GraphQL?

Council: Architecture

Tech Lead — Recommends GraphQL for complex queries, keep REST for simple CRUD.
Advisor — Risk is high mid-project. Suggests incremental adoption.
Developer — Prefers REST simplicity. GraphQL adds tooling overhead.

Consensus: Incremental adoption. New endpoints in GraphQL, existing stay REST.
```

## Notas

- Los agentes deben ser invocados en paralelo para evitar que uno influencie al otro
- Cada perspectiva debe ser independiente — no "responder" a otro agente
- La sintesis la haces tu (el skill), no los agentes
- Si los 3 agentes estan de acuerdo, indica que hay consenso y sugiere actuar
