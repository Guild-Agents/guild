# Contributing to Guild

Thanks for your interest in contributing. This document explains the process depending on the type of contribution.

## Types of Contribution

| Type | What it covers | Process |
|---|---|---|
| **Templates** | `src/templates/agents/`, `src/templates/skills/` | Content-focused — improve agent definitions or skill workflows |
| **CLI** | `src/`, `bin/`, `package.json`, tests | Full process — requires tests and technical review |

If you're new to the project, **templates are the best starting point**. Improving an agent's identity or refining a skill workflow directly impacts every project that uses Guild.

## Setup

### Requirements

- Node.js >= 20
- npm >= 9
- Git

### Local development

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USER/guild.git
cd guild
npm install

# Verify everything works
npm test
node bin/guild.js --version
```

### Branches

Guild uses simplified GitFlow:

```
main      ← production, always stable, tagged with npm versions
develop   ← integration, all PRs target this branch
```

Always create your branch from `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/descriptive-name   # new feature
git checkout -b fix/bug-name               # bugfix
```

## Template Contributions

For files in `src/templates/agents/` and `src/templates/skills/`.

### Agents

Each agent is a flat `.md` file that defines identity, responsibilities, and process. The 9 agents live in `src/templates/agents/`:

```
advisor.md, product-owner.md, tech-lead.md, developer.md,
code-reviewer.md, qa.md, bugfix.md, db-migration.md, platform-expert.md
```

When improving an agent, focus on making instructions clear and actionable. Agents should define what they do, when they act, and how they interact with other agents.

### Skills

Each skill is a `SKILL.md` file inside `src/templates/skills/<skill-name>/`. Skills define workflows that orchestrate agents through structured processes.

The 10 skills:

```
guild-specialize, build-feature, new-feature, council, qa-cycle,
review, dev-flow, status, session-start, session-end
```

When improving a skill, focus on the workflow steps, agent coordination, and clear exit criteria.

### Process

1. Check that the improvement doesn't conflict with existing behavior
2. Edit the relevant `.md` file
3. Open a PR targeting `develop`

No tests are required for template changes. The CI verifies basic markdown formatting.

## CLI Contributions

For changes in `src/`, `bin/`, `package.json`, or project infrastructure.

### 1. Open an issue first

For new features or significant changes, open an issue before writing code. Describe what you want to do and why. This avoids working on something that doesn't align with the project direction.

For small bugfixes, you can go straight to a PR.

### 2. Implement with tests

Guild uses [Vitest](https://vitest.dev/). Every behavior change must have corresponding tests.

```bash
npm test              # run all tests
npm run test:watch    # watch mode during development
npm run lint          # check code style
```

### 3. Code conventions

- ESModules (`import`/`export`), no CommonJS
- `path.join()` for building paths, never string concatenation
- Async/await, no callbacks
- Descriptive names — code should read as prose
- No unnecessary comments — if code needs a comment to be understood, refactor first
- Errors with helpful messages — users need to know what to do when something fails

### 4. Open the PR

Target branch: `develop`. CI must pass (lint + tests) before review.

```bash
git push origin feature/descriptive-name
# Then open the PR on GitHub targeting develop
```

## Conventional Commits

Guild uses [Conventional Commits](https://www.conventionalcommits.org/) for a clean history and automatic changelog generation.

```
feat: add guild status command
fix: handle missing git config gracefully in init
docs: rewrite README for v1 architecture
chore: upgrade @clack/prompts to 0.9.1
refactor: simplify skill template generation
```

Valid prefixes: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`

## Release Process

Releases are managed by the maintainer. If your PR is merged into `develop`, it will be included in the next release. Versioning follows [Semantic Versioning](https://semver.org/):

- **Patch** `0.x.X` — bugfixes
- **Minor** `0.X.0` — new features without breaking changes
- **Major** `X.0.0` — breaking changes

## Questions

Open a [Discussion](https://github.com/guild-agents/guild/discussions) on GitHub. Issues are for bugs and concrete feature requests — discussions are for questions, ideas, and general feedback.

## Code of Conduct

Guild follows the [Contributor Covenant](https://www.contributor-covenant.org/). Be respectful, constructive, and assume good faith.
