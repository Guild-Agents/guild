# Guild ⚔️

**A multi-agent framework for Claude Code.**

Guild turns any software project into a team of specialized AI agents — each with a clear role, composable expertise, and a defined workflow from idea to PR.

```bash
npm install -g guild-agents
guild init
```

---

## Why Guild

Working with Claude Code without structure leads to inconsistent results. You forget to reload context, skip the planning phase, or end up with an AI that knows the codebase but not the business rules.

Guild enforces discipline by default:

- **Specialized agents** — Advisor, Tech Lead, Product Owner, Developer, DBA, QA, Bug Fixer, Code Review. Each with a clear role and boundaries.
- **Persistent state** — Everything lives in markdown files. Any agent can pick up exactly where the last session left off.
- **Composable expertise** — Agents learn new stacks. Add Redis expertise to your DBA, or React to your Developer, without losing what they already know.
- **Full workflow** — From idea evaluation to PR, the entire development cycle is covered.

---

## Quick Start

### Install

```bash
npm install -g guild-agents
```

### Initialize a project

```bash
cd my-project
guild init
```

Guild will ask about your project's domain, stack, and architecture, then:
- Generate `PROJECT.md`, `SESSION.md`, and `CLAUDE.md`
- Set up 8 specialized agents in `.claude/agents/`
- Copy slash commands to `.claude/commands/`
- Configure GitHub Issues integration (optional)

### Specialize your agents

Open Claude Code in your project and run:

```
/guild-specialize
```

This makes Claude read `PROJECT.md` and generate deep expertise files for each agent tailored to your specific stack and domain.

### Start building

```
/feature Build a user authentication system
```

The Advisor evaluates the idea, the Product Owner documents the tasks, the Tech Lead defines the technical approach, and the Developer implements with tests. QA validates, Bug Fixer investigates issues, and Code Review approves the PR.

---

## How it works

### Agent team

| Agent | Role | Hands off to |
|---|---|---|
| **Advisor** | Domain coherence — is this the right thing to build? | Product Owner |
| **Product Owner** | What & priority — clear acceptance criteria | Tech Lead |
| **Tech Lead** | How — architecture, patterns, technical direction | Developer |
| **Developer** | Implementation + unit tests | QA |
| **DBA** | Database design, migrations, query optimization | Developer |
| **QA** | Functional validation (black box) | Bug Fixer or Code Review |
| **Bug Fixer** | Bug investigation from symptoms, not intent | QA |
| **Code Review** | Code quality, security, test coverage | Developer or PR approval |

### Composable expertise

Each agent has a `base.md` (cross-project behavior) and can be enhanced with technology-specific expertise:

```bash
guild mode developer +react +vite    # add React and Vite expertise
guild mode dba +redis                # add Redis expertise to DBA
guild upskill tech-lead microservices # add microservices knowledge
```

Expertise files accumulate — adding PostgreSQL to a DBA that already knows Supabase doesn't erase Supabase knowledge. Git tracks the full history.

### Persistent state between sessions

```
PROJECT.md     ← project config, active agent modes
SESSION.md     ← current task, active agent, next steps
tasks/
  backlog/     ← TASK-001.md, TASK-002.md
  in-progress/ ← TASK-003.md
  in-review/   ← TASK-004.md
  done/        ← TASK-005.md
```

Start any session with `/session-start` — Claude reads the state files and resumes exactly where you left off.

---

## CLI Commands

```bash
guild init                         # Interactive project onboarding
guild mode <agent> [+mode -mode]   # Change active modes for an agent
guild upskill <agent> <expertise>  # Add expertise to an existing agent
guild new-agent <name>             # Create a new specialized agent
guild sync                         # Sync task state with GitHub Issues
guild status                       # Project overview
```

---

## Contributing

Guild has two types of contributions — both are valuable:

**Expertise files** (`src/templates/agents/*/expertise/`) — Share your real-world knowledge of a specific technology. If you're experienced with Redis, Django, Playwright, or any other stack, your expertise makes Guild's agents smarter for everyone. No JavaScript required.

**CLI code** (`src/`, `bin/`) — Bug fixes, new commands, improvements to the onboarding flow. Requires Node.js knowledge and tests.

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details.

---

## Requirements

- Node.js >= 18
- Claude Code
- `gh` CLI (optional, for GitHub Issues integration)

---

## License

MIT — see [LICENSE](LICENSE)
