---
name: council
description: "Convenes multiple agents to debate an important decision"
user-invocable: true
---

# Council

Convenes a council of specialized agents to debate an important decision. Each agent contributes their independent perspective and the result is a synthesis of the debate.

Agents are invoked IN PARALLEL using the `Task` tool to obtain independent perspectives without bias.

## When to use

- Before making an important architectural decision
- To evaluate the scope of a feature with multiple perspectives
- To decide whether to address technical debt and how to prioritize it
- When you need multiple viewpoints on a complex problem

## Usage

`/council [question or decision to debate]`

Optionally you can specify the type: `/council architecture [question]`

## Council Types

### 1. Council Architecture

**Participants:** Tech Lead + Advisor + Developer
**When it applies:** Decisions about architecture, patterns, large refactors, new technologies

Invokes all 3 agents IN PARALLEL using Task tool:

- Task 1: Reads `.claude/agents/tech-lead.md` — architecture and technical coherence perspective
- Task 2: Reads `.claude/agents/advisor.md` — feasibility and business risk perspective
- Task 3: Reads `.claude/agents/developer.md` — implementability and pragmatism perspective

### 2. Council Feature-Scope

**Participants:** Advisor + Product Owner + Tech Lead
**When it applies:** Defining feature scope, prioritizing functionality, evaluating product proposals

Invokes all 3 agents IN PARALLEL using Task tool:

- Task 1: Reads `.claude/agents/advisor.md` — domain and strategic vision perspective
- Task 2: Reads `.claude/agents/product-owner.md` — user value and scope perspective
- Task 3: Reads `.claude/agents/tech-lead.md` — technical feasibility and effort perspective

### 3. Council Tech-Debt

**Participants:** Tech Lead + Developer + Code Reviewer
**When it applies:** Deciding whether to address technical debt, planning refactors, evaluating codebase quality

Invokes all 3 agents IN PARALLEL using Task tool:

- Task 1: Reads `.claude/agents/tech-lead.md` — architectural impact perspective
- Task 2: Reads `.claude/agents/developer.md` — implementation cost perspective
- Task 3: Reads `.claude/agents/code-reviewer.md` — quality and risk perspective

## Process

### Step 1 — Identify council type

Analyze the user's question and determine which council type applies:

- If it mentions architecture, patterns, technologies -> **architecture**
- If it mentions features, priorities, scope, users -> **feature-scope**
- If it mentions technical debt, refactor, quality, maintainability -> **tech-debt**
- If unclear, ask the user

### Step 2 — Convene agents

Invoke the 3 corresponding agents IN PARALLEL using Task tool. Each agent:

1. Reads their `.claude/agents/[name].md` file to assume their role
2. Reads `CLAUDE.md` and `SESSION.md` for project context
3. Analyzes the question from their specialized perspective
4. States their position with concrete arguments

### Step 3 — Present debate

Present the perspectives of all 3 agents in a structured format:

```text
## Council: [type]
Question: [the user's question]

### [Agent 1] — [position]
[main arguments]

### [Agent 2] — [position]
[main arguments]

### [Agent 3] — [position]
[main arguments]

### Synthesis
- Points of agreement: [...]
- Points of disagreement: [...]
- Identified risks: [...]
```

### Step 4 — Request decision

Present clear options to the user based on the debate:

- Option A: [summary of one position]
- Option B: [summary of another position]
- Option C: [compromise or alternative]

Ask the user to decide. If the user decides, document the decision in SESSION.md.

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

## Notes

- Agents must be invoked in parallel to prevent one from influencing another
- Each perspective must be independent — not "responding" to another agent
- The synthesis is done by you (the skill), not by the agents
- If all 3 agents agree, indicate consensus and suggest taking action
