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

Six phases: **evaluate**, **specify**, **plan**, **implement**, **review**, **validate**. Phases 1-3 happen before any code is written.

## Skills Reference

All 11 skills, grouped by function:

| Skill | Group | Description |
| --- | --- | --- |
| `/build-feature` | Pipeline | Full pipeline: evaluate, spec, implement, review, QA |
| `/new-feature` | Pipeline | Create branch and scaffold for a new feature |
| `/create-pr` | Pipeline | Create a structured pull request from current branch |
| `/council` | Decision | Multi-perspective deliberation on a decision or feature |
| `/review` | Quality | Code review on the current diff |
| `/qa-cycle` | Quality | QA and bugfix loop until clean |
| `/guild-specialize` | Context | Explore codebase, enrich CLAUDE.md with real conventions |
| `/session-start` | Context | Load context and resume work |
| `/session-end` | Context | Save state to SESSION.md |
| `/status` | Context | Project and session state overview |
| `/dev-flow` | Context | Show current pipeline phase and next step |

## CLI Commands

```bash
guild init              # Interactive project onboarding
guild new-agent <name>  # Create a custom agent
guild status            # Show project status
guild doctor            # Diagnose setup
guild list              # List agents and skills
guild run <skill>       # Preview a skill's execution plan (dry-run)
guild logs              # View execution traces
guild logs clean        # Remove old traces (--days N, --all)
```

## Under the Hood

Guild coordinates 10 specialized agents through the pipeline. Each agent handles one phase.

| Agent | Role |
| --- | --- |
| advisor | Evaluates ideas and provides strategic direction |
| product-owner | Turns approved ideas into concrete tasks |
| tech-lead | Defines technical approach and architecture |
| developer | Implements features following project conventions |
| code-reviewer | Reviews quality, patterns, and technical debt |
| qa | Testing, edge cases, regression validation |
| bugfix | Bug diagnosis and resolution |
| db-migration | Schema changes and safe migrations |
| platform-expert | Diagnoses Claude Code integration issues |
| learnings-extractor | Extracts compound learnings from pipeline executions |

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
