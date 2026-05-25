# Guild

[![npm version](https://img.shields.io/npm/v/guild-agents)](https://www.npmjs.com/package/guild-agents)
[![CI](https://github.com/guild-agents/guild/actions/workflows/ci.yml/badge.svg)](https://github.com/guild-agents/guild/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

**Guild makes Claude Code think before it builds.**

Without Guild, Claude Code writes code immediately. No evaluation, no design, no review. With Guild, every feature goes through structured phases — evaluated by an advisor, designed by a tech lead, reviewed by a code reviewer, validated by QA — before anything ships. Everything is markdown in `.claude/`, tracked by git, works offline, zero infrastructure.

## The Problem

Without structure, Claude Code:

- Writes code before understanding the problem
- Has no design phase and no review gate
- Loses decisions between sessions
- Produces results that vary with every conversation

## How Guild Solves It

- **Spec before code**: `/build-feature` enforces evaluation, design, and review phases — code comes after the design doc
- **Independent perspectives**: `/council` spawns parallel agents that each analyze your idea independently, then synthesize into a decision
- **Session continuity**: `/session-start` and `/session-end` combine SESSION.md with Claude Code's memory system — you never lose context between sessions
- **Behavioral discipline**: `/tdd` and `/debug` prevent the most common LLM anti-patterns: code before tests, fixes before root cause analysis
- **Quality you can measure**: `guild eval` validates skill structure, trigger accuracy, and description quality with automated benchmarks

## Quick Start

```bash
npm install -g guild-agents
guild init
```

Then use skills as slash commands in Claude Code:

```text
/guild-specialize        # Learn your codebase, enrich CLAUDE.md
/council "Add JWT auth"  # Spec a feature through structured deliberation
/build-feature           # Implement from spec through the full pipeline
```

## The Pipeline

```text
You ──> /build-feature "Add JWT auth"
         │
         ▼
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ Evaluate │────>│  Design  │────>│  Build   │
    │ advisor  │     │ tech-lead│     │developer │
    └──────────┘     └──────────┘     └────┬─────┘
                                           │
                                     ┌─────┴─────┐
                                     ▼           ▼
                               ┌──────────┐┌──────────┐
                               │  Review  ││    QA    │
                               └──────────┘└──────────┘
```

Five phases: **evaluate**, **design**, **implement**, **review**, **validate**. Phases 1-2 happen before any code is written.

## Skills

10 skills, available as slash commands in Claude Code:

| Skill | What it does |
| --- | --- |
| `/build-feature` | Full pipeline: evaluate, design, implement, review, QA |
| `/council` | Multi-perspective deliberation — 3 agents debate independently, then synthesize |
| `/create-pr` | Structured pull request from current branch |
| `/qa-cycle` | QA and bugfix loop until clean |
| `/tdd` | TDD red-green-refactor — no code without a failing test |
| `/debug` | Systematic 4-phase debugging — no fixes without root cause |
| `/guild-specialize` | Explore your codebase, enrich CLAUDE.md with real conventions |
| `/re-specialize` | Incremental update of CLAUDE.md when your stack changes |
| `/session-start` | Resume work from SESSION.md + Claude Code memory |
| `/session-end` | Save state to SESSION.md + durable learnings to memory |

## Agents

6 specialized roles that give Claude Code distinct perspectives:

| Agent | Role |
| --- | --- |
| advisor | Evaluates ideas and provides strategic direction. First gate before any work begins |
| tech-lead | Breaks features into tasks. Defines technical approach and architecture |
| developer | Implements features following project conventions. Writes tests, makes atomic commits |
| code-reviewer | Reviews quality, patterns, and technical debt |
| qa | Testing, edge cases, regression. Validates the implementation meets acceptance criteria |
| bugfix | Diagnosis and bug resolution. Isolates root causes and applies targeted fixes |

Each agent is a flat `.md` file with identity, responsibilities, and boundaries. Claude Code reads them via its native Agent tool and assumes the role.

## CLI

```bash
guild init              # Interactive project onboarding
guild new-agent <name>  # Create a custom agent
guild status            # Show project status
guild doctor            # Diagnose setup
guild list              # List agents and skills
guild eval              # Run structural skill evaluations
guild eval --triggers   # Run trigger accuracy tests
guild eval --semantic   # LLM-based trigger tests (requires ANTHROPIC_API_KEY)
guild eval --suggest    # Description improvement suggestions
guild workspace init    # Create a multi-repo workspace
```

## Skill Evaluations

Guild includes a built-in framework for measuring skill quality:

- **Structural evals** -- assert workflow structure: steps exist, roles are correct, gates are present
- **Trigger tests** -- verify that user prompts route to the correct skill
- **Semantic matcher** -- LLM-based scoring for higher-fidelity trigger testing
- **Benchmarks** -- rolling history with per-skill accuracy, precision, recall, and regression detection

## How It Works

Guild installs agent definitions and skill workflows as markdown files in your project's `.claude/` directory. Claude Code discovers and executes them natively — no custom runtime, no extra process, no API calls. When you type `/build-feature`, Claude Code reads the skill, follows the phases, and spawns agents using its own Agent tool.

Guild defines **what** happens. Claude Code decides **how** to execute it.

## Session Continuity

Claude Code's native memory system remembers who you are, lessons learned, and project context — knowledge that lasts months. But it explicitly does not store ephemeral work state: what you were building, which branch, what phase, what's next. That's the gap Guild fills.

`/session-end` writes to **both layers**:

- **SESSION.md** — where you stopped: task, branch, phase, next steps (overwritten each session)
- **Claude Code memory** — what you learned: decisions, lessons, references (persists across sessions)

`/session-start` reads from **both** and presents a unified summary. You resume exactly where you left off, with full context of what you know and what you were doing.

## Guild Builds Itself

Every feature in Guild goes through the same spec-first pipeline that Guild installs in your project. Guild's own design decisions live in `docs/specs/`.

## Requirements

- Node.js >= 20
- Claude Code
- `gh` CLI (optional, for GitHub integration)

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for setup, branching, and contribution guidelines.

## License

MIT -- see [LICENSE](LICENSE).
