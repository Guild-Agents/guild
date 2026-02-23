# Guild

[![npm version](https://img.shields.io/npm/v/guild-agents)](https://www.npmjs.com/package/guild-agents)
[![CI](https://github.com/guild-agents/guild/actions/workflows/ci.yml/badge.svg)](https://github.com/guild-agents/guild/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Claude Code is powerful but chaotic. Guild gives it structure.

Guild is an npm CLI that sets up 9 specialized agents and 10 skill-based workflows as `.claude/` files in any project. Agents define **who** does the work. Skills define **how** it gets done. Everything is markdown, tracked by git, works offline.

## Why Guild?

- **Structure over chaos.** Claude Code without guidance produces inconsistent results. Guild gives every task a clear owner and a repeatable process.
- **Agents = WHO, Skills = HOW.** Agents are flat `.md` files with identity and expertise. Skills are workflow definitions invoked as slash commands. Clean separation, no magic.
- **State that persists.** Context lives in `CLAUDE.md`, `PROJECT.md`, and `SESSION.md` -- tracked by git, readable by humans, never lost between sessions.
- **Zero infrastructure.** No servers, no APIs, no config files. Just markdown files that Claude Code reads natively.

## How It Works

```
You ──> /build-feature "Add JWT auth"
         │
         ▼
    ┌─────────┐     ┌───────────────┐     ┌───────────────┐
    │ Advisor  │────>│  Tech Lead    │────>│  Developer    │
    │ evaluate │     │  plan         │     │  implement    │
    └─────────┘     └───────────────┘     └───────┬───────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    ▼             ▼             ▼
                              ┌──────────┐ ┌──────────┐ ┌──────────┐
                              │ Reviewer │ │    QA    │ │  Bugfix  │
                              │ review   │ │  test    │ │  fix     │
                              └──────────┘ └──────────┘ └──────────┘
```

Skills orchestrate agents through structured pipelines. You invoke a skill as a slash command, and it coordinates the right agents in the right order.

## Quick Start

```bash
npm install -g guild-agents
guild init
```

The interactive onboarding asks for project name, type, stack, and repo details, then generates the full structure: 9 agents, 10 skills, and 3 state files.

Next, let Guild learn your codebase:

```
/guild-specialize
```

This explores your actual code and enriches `CLAUDE.md` with real conventions, patterns, and stack details. Every agent now understands your project.

Then build something:

```
/build-feature Add user authentication with JWT
```

This runs the full pipeline -- advisor evaluation, tech lead planning, developer implementation, code review, and QA -- all coordinated automatically.

## Agents

| Agent | Role |
|---|---|
| advisor | Evaluates ideas and provides strategic direction |
| product-owner | Turns approved ideas into concrete tasks |
| tech-lead | Defines technical approach and architecture |
| developer | Implements features following project conventions |
| code-reviewer | Reviews quality, patterns, and technical debt |
| qa | Testing, edge cases, regression validation |
| bugfix | Bug diagnosis and resolution |
| db-migration | Schema changes and safe migrations |
| platform-expert | Diagnoses and resolves Claude Code integration issues |

## Skills

| Skill | Description |
|---|---|
| `/guild-specialize` | Explores codebase, enriches CLAUDE.md with real stack and conventions |
| `/build-feature` | Full pipeline: evaluation, spec, implementation, review, QA |
| `/new-feature` | Creates branch and scaffold for a new feature |
| `/council` | Convenes multiple agents to debate a decision |
| `/qa-cycle` | QA and bugfix loop until clean |
| `/review` | Code review on the current diff |
| `/dev-flow` | Shows current pipeline phase and next step |
| `/status` | Project and session state overview |
| `/session-start` | Loads context and resumes work |
| `/session-end` | Saves state to SESSION.md |

## CLI Commands

```bash
guild init                  # Interactive project onboarding
guild new-agent <name>      # Create a custom agent
guild status                # Show project status
guild doctor                # Diagnose installation state
guild list                  # List installed agents and skills
```

## Generated Structure

Running `guild init` creates the following in your project root:

```
CLAUDE.md
PROJECT.md
SESSION.md
.claude/
  agents/
    advisor.md
    product-owner.md
    tech-lead.md
    developer.md
    code-reviewer.md
    qa.md
    bugfix.md
    db-migration.md
    platform-expert.md
  skills/
    guild-specialize/SKILL.md
    build-feature/SKILL.md
    new-feature/SKILL.md
    council/SKILL.md
    qa-cycle/SKILL.md
    review/SKILL.md
    dev-flow/SKILL.md
    status/SKILL.md
    session-start/SKILL.md
    session-end/SKILL.md
```

All files are markdown, tracked by git, and work fully offline.

## Guild Builds Itself

This project uses its own agents and skills to develop itself. Every feature, review, and bugfix goes through the same pipelines that Guild installs in your project.

## Requirements

- Node.js >= 20
- Claude Code
- `gh` CLI (optional, for GitHub integration)

## Contributing

Two types of contributions:

- **Agent and skill templates** (`src/templates/`) -- improve agent definitions or skill workflows.
- **CLI code** (`src/`, `bin/`) -- bug fixes, new commands, onboarding improvements.

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details.

## License

MIT -- see [LICENSE](LICENSE).
