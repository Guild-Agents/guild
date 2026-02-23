# Guild — Implementation Reference

> Architecture and implementation reference for Guild v1.
> Read this document to understand how the codebase is structured.

---

## What Guild does

Guild is an npm CLI that sets up a team of specialized AI agents and skill-based workflows in any project using Claude Code. The user runs `guild init`, answers a few questions, and gets a complete `.claude/` structure with agents, skills, and state files.

**Installation:**
```bash
npm install -g guild-agents
guild init
```

**Repository:** https://github.com/guild-agents/guild
**npm:** https://www.npmjs.com/package/guild-agents

---

## Architecture

### Core principle
**Agents = WHO, Skills = HOW.** Agents are flat `.md` files defining identity and process. Skills are `SKILL.md` workflows that orchestrate agents via the Task tool. All state lives in markdown files — no database, no server, no background processes.

### Data flow in `guild init`

```
User answers prompts (Clack)
         ↓
   projectData object
         ↓
    generateProjectMd()  → PROJECT.md
    generateSessionMd()  → SESSION.md
    generateClaudeMd()   → CLAUDE.md
    copyAgentTemplates() → .claude/agents/*.md (8 files)
    copySkillTemplates() → .claude/skills/*/SKILL.md (10 directories)
```

### Generated structure

When the user runs `guild init`, Guild creates:

```
user-project/
├── CLAUDE.md                     ← global instructions for Claude Code
├── PROJECT.md                    ← project configuration
├── SESSION.md                    ← active session state
└── .claude/
    ├── agents/
    │   ├── advisor.md
    │   ├── product-owner.md
    │   ├── tech-lead.md
    │   ├── developer.md
    │   ├── code-reviewer.md
    │   ├── qa.md
    │   ├── bugfix.md
    │   └── db-migration.md
    └── skills/
        ├── guild-specialize/SKILL.md
        ├── build-feature/SKILL.md
        ├── new-feature/SKILL.md
        ├── council/SKILL.md
        ├── qa-cycle/SKILL.md
        ├── review/SKILL.md
        ├── dev-flow/SKILL.md
        ├── status/SKILL.md
        ├── session-start/SKILL.md
        └── session-end/SKILL.md
```

---

## Project structure

```
guild/
├── bin/
│   └── guild.js                  ← CLI entry point (Commander)
├── src/
│   ├── commands/
│   │   ├── init.js               ← interactive onboarding
│   │   ├── new-agent.js          ← create custom agent
│   │   └── status.js             ← show project status
│   ├── utils/
│   │   ├── files.js              ← file operations, template copying
│   │   ├── generators.js         ← PROJECT.md, SESSION.md, CLAUDE.md generators
│   │   └── github.js             ← GitHub CLI integration
│   └── templates/
│       ├── agents/               ← 8 agent .md files
│       └── skills/               ← 10 skill directories with SKILL.md
├── .github/
│   ├── workflows/ci.yml
│   ├── ISSUE_TEMPLATE/
│   ├── pull_request_template.md
│   └── CONTRIBUTING.md
├── package.json
├── CHANGELOG.md
├── README.md
└── LICENSE
```

---

## State files

### PROJECT.md
Project metadata: name, domain, description, tech stack, architectural decisions, domain rules, testing strategy, GitHub integration.

### SESSION.md
Session continuity: date, current task, active agent, status, relevant context, next steps. Updated at the end of each session via `/session-end`.

### CLAUDE.md
Central enriched context: project rules, conventions, stack details. Initially generated with basic info, then enriched by `/guild-specialize` which reads the actual codebase.

---

## CLI commands

| Command | Description |
|---|---|
| `guild init` | Interactive onboarding — generates all files |
| `guild new-agent <name>` | Create a custom agent (.md file) |
| `guild status` | Show project status |

---

## Tech stack

- **Runtime:** Node.js >= 18 (native ESModules)
- **CLI prompts:** @clack/prompts ^0.9.0
- **CLI framework:** commander ^12.0.0
- **Colors:** chalk ^5.3.0, picocolors ^1.0.0
- **File utils:** fs-extra ^11.2.0
- **Testing:** Vitest
- **Lint:** ESLint (flat config)

## Code conventions

- ESModules (`import`/`export`), no CommonJS
- `path.join()` for building paths, never string concatenation
- Async/await, no callbacks
- Descriptive names — code should read as prose
- Errors with actionable messages for the end user

## Branching model

```
main      ← production, always stable, tagged with npm versions
develop   ← integration, all PRs target this branch
feature/  ← new features, branch from develop
fix/      ← bugfixes, branch from develop
```

---

## Testing

- **Framework:** Vitest
- **Minimum coverage:** 80% global
- **Critical modules:** generators.js, files.js

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run lint          # check code style
```

---

## Verification

```bash
# CLI installs and runs
npm install -g .
guild --version
guild --help

# guild init completes without errors
mkdir test-project && cd test-project
guild init

# Verify generated files
ls -la
ls -la .claude/agents/
ls -la .claude/skills/

# Tests pass
npm test
npm run lint
```
