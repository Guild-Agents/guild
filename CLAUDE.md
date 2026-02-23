# Guild AI — CLI Framework for Claude Code Agents

## Framework
This project uses Guild. Read SESSION.md at the start of each session.

## What is this project
Guild is an npm CLI (`npm install -g guild-agents`, command `guild`) that sets up a team of 9 specialized AI agents and 10 skills in any project using Claude Code. The main command is `guild init`, which launches an interactive onboarding and generates the entire required structure.

**Architecture v1:** Agents = WHO (flat identity in .md), Skills = HOW (workflows with SKILL.md). Native Claude Code composition — no composer.js, no active.md, no expertise/.

**The project uses its own agents to build itself.**

## Global rules
- Do not implement without a plan approved by Advisor and technical direction from the Tech Lead
- The Developer writes unit tests as part of the implementation
- Update SESSION.md at the end of each session
- ESModules throughout the codebase — no CommonJS, no require()
- Always use path.join() to build paths — never concatenate strings

## Development commands
```bash
npm test                    # tests (Vitest)
npm run lint                # full lint (ESLint + markdownlint)
npm run lint:js             # ESLint only (JS code)
npm run lint:md             # markdownlint only (.md templates)
node bin/guild.js --help    # verify CLI
node bin/guild.js init      # test onboarding v1
```

## CLI commands
- `guild init`       — interactive onboarding, generates v1 structure
- `guild new-agent`  — create custom agent (flat .md)
- `guild status`     — view project status
- `guild doctor`     — diagnose installation state
- `guild list`       — list installed agents and skills

## Team skills
- /guild-specialize  — enrich CLAUDE.md by exploring the actual project
- /build-feature     — full development pipeline
- /new-feature       — create branch and scaffold for a feature
- /council           — debate decisions with multiple agents
- /review            — code review on the current diff
- /qa-cycle          — QA + bugfix cycle
- /status            — view project status
- /dev-flow          — view current pipeline phase
- /session-start     — load context and resume work
- /session-end       — save state to SESSION.md

## Stack
Node.js 20+, ESModules, Commander.js, @clack/prompts, Vitest, ESLint

## Project structure
```
src/
  commands/       — init.js, new-agent.js, status.js, doctor.js, list.js
  utils/          — generators.js, files.js, github.js
  templates/
    agents/       — 9 .md files (advisor, developer, platform-expert, etc.)
    skills/       — 10 directories with SKILL.md
bin/
  guild.js        — entry point CLI (Commander)
```
