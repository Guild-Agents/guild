# Guild

[![npm version](https://img.shields.io/npm/v/guild-agents)](https://www.npmjs.com/package/guild-agents)
[![CI](https://github.com/guild-agents/guild/actions/workflows/ci.yml/badge.svg)](https://github.com/guild-agents/guild/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

**Guild makes Claude Code think before it builds.**

Guild is a spec-driven development CLI for Claude Code. It installs structured design and development workflows as `.claude/` markdown files in any project. Before code is written, features are evaluated, debated by independent AI perspectives, and specified in a design doc. Everything is markdown, tracked by git, works offline, zero infrastructure.

## The Problem

Without structure, Claude Code:

- Writes code before understanding the problem
- Has no design phase and no review gate
- Loses decisions between sessions
- Produces results that vary with every conversation

## How Guild Solves It

- **Spec before code**: every feature starts with a design doc
- **Structured deliberation**: `/council` runs parallel independent analysis -- multiple perspectives evaluate independently, then synthesize
- **Decisions that persist**: design docs, session state, and project context live in git-tracked markdown
- **Zero infrastructure**: no servers, no APIs, just markdown files and Claude Code

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
You ──> /council "Add JWT auth"
         │
         ▼
    ┌──────────┐     ┌──────────────┐     ┌──────────┐
    │ Evaluate │────>│  Design Doc  │────>│  Build   │
    │ debate   │     │  spec        │     │ implement│
    └──────────┘     └──────────────┘     └────┬─────┘
                                               │
                                         ┌─────┴─────┐
                                         ▼           ▼
                                   ┌──────────┐┌──────────┐
                                   │  Review  ││    QA    │
                                   └──────────┘└──────────┘
```

Five phases: **evaluate**, **design**, **implement**, **review**, **validate**. Phases 1-2 happen before any code is written.

## Skills Reference

All 10 skills, grouped by function:

| Skill | Group | Description |
| --- | --- | --- |
| `/build-feature` | Pipeline | Full pipeline: evaluate, spec, implement, review, QA |
| `/create-pr` | Pipeline | Create a structured pull request from current branch |
| `/council` | Decision | Multi-perspective deliberation on a decision or feature |
| `/qa-cycle` | Quality | QA and bugfix loop until clean |
| `/tdd` | Discipline | TDD red-green-refactor cycle |
| `/debug` | Discipline | Systematic 4-phase debugging |
| `/guild-specialize` | Context | Explore codebase, enrich CLAUDE.md with real conventions |
| `/re-specialize` | Context | Incremental update of auto-generated CLAUDE.md zones |
| `/session-start` | Context | Load context and resume work from SESSION.md + Claude Code memory |
| `/session-end` | Context | Save state to SESSION.md + durable learnings to memory |

## CLI Commands

```bash
guild init              # Interactive project onboarding
guild new-agent <name>  # Create a custom agent
guild status            # Show project status
guild doctor            # Diagnose setup
guild list              # List agents and skills
guild eval              # Run structural skill evaluations
guild eval --triggers   # Run trigger accuracy tests (keyword matcher)
guild eval --semantic   # Run trigger tests with LLM semantic matcher
guild eval --suggest    # Show description improvement suggestions
guild workspace init <name> <members...>  # Create a workspace
guild workspace add <path>                # Add a member repo
guild workspace status                    # Show workspace state
```

## Skill Evaluations

Guild includes a built-in evaluation framework for validating skill quality:

- **Structural evals** (`guild eval`) -- assert workflow structure: steps exist, roles are correct, gates are present
- **Trigger tests** (`guild eval --triggers`) -- verify that user prompts route to the correct skill using keyword overlap scoring
- **Semantic matcher** (`guild eval --semantic`) -- optional LLM-based scoring via Anthropic Haiku for higher-fidelity trigger testing (requires `ANTHROPIC_API_KEY`)
- **Description suggestions** (`guild eval --suggest`) -- analyzes keyword gaps in skill descriptions based on failed triggers

Every trigger run automatically records results to `benchmarks/benchmark.json` (rolling 30-entry history) and generates `benchmarks/benchmark.md` with per-skill accuracy, precision, recall, and delta vs previous run. Regressions (>5% accuracy drop with 2+ tests flipped) are flagged automatically.

## Under the Hood

Guild coordinates 6 specialized agents through the pipeline. Each agent handles one phase.

| Agent | Role |
| --- | --- |
| advisor | Evaluates ideas and provides strategic direction |
| tech-lead | Defines technical approach, tasks, and architecture |
| developer | Implements features following project conventions |
| code-reviewer | Reviews quality, patterns, and technical debt |
| qa | Testing, edge cases, regression validation |
| bugfix | Bug diagnosis and resolution |

Agents are flat `.md` files with identity and expertise. Skills orchestrate agents through structured pipelines. Everything lives in `.claude/`, readable by humans, tracked by git.

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
