# Guild

[![npm version](https://img.shields.io/npm/v/guild-agents)](https://www.npmjs.com/package/guild-agents)
[![CI](https://github.com/guild-agents/guild/actions/workflows/ci.yml/badge.svg)](https://github.com/guild-agents/guild/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

A multi-agent framework for Claude Code.

Sets up 8 specialized agents and 10 skill-based workflows as `.claude/` files in any project.

## Installation

```bash
npm install -g guild-agents
```

Or run directly without installing:

```bash
npx guild-agents init
```

## Quick Start

```bash
npx guild-agents init
```

Interactive onboarding asks for project name, type, stack, and repo details, then generates the full agent and skill structure.

Open Claude Code in your project and run:

```
/guild-specialize
```

This explores your actual codebase and enriches CLAUDE.md with real conventions, patterns, and stack details.

Then start building:

```
/build-feature Add user authentication with JWT
```

This runs the full pipeline: evaluation, spec, implementation, review, and QA.

`guild init` generates: CLAUDE.md, PROJECT.md, SESSION.md, `.claude/agents/` (8 agents), `.claude/skills/` (10 skills).

## How It Works

**Agents** are the WHO. Each agent is a flat `.md` file in `.claude/agents/` that defines identity, responsibilities, and process. Skills invoke agents via the Task tool when their expertise is needed.

**Skills** are the HOW. Each skill is a workflow defined in `.claude/skills/*/SKILL.md` and invoked as a slash command. Skills orchestrate one or more agents through a structured process.

**State** is maintained across sessions through three files:
- `CLAUDE.md` — central enriched context (stack, conventions, rules)
- `PROJECT.md` — project metadata (name, type, architecture)
- `SESSION.md` — session continuity (current task, progress, next steps)

After init, agents are generic. Running `/guild-specialize` reads the real codebase and tailors each agent to the project's specific stack and patterns.

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

## Requirements

- Node.js >= 18
- Claude Code
- `gh` CLI (optional, for GitHub integration)

## Contributing

Two types of contributions:

- **Agent and skill templates** (`src/templates/`) — improve agent definitions or skill workflows.
- **CLI code** (`src/`, `bin/`) — bug fixes, new commands, onboarding improvements.

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details.

## License

MIT — see [LICENSE](LICENSE).
