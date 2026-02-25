# guild

## Framework
This project uses Guild. Read SESSION.md at the start of each session.

## Stack
npm, chalk, clack, claude code, node, javascript

## Project structure
```
bin/guild.js                          # CLI entry point (Commander.js)
src/
  commands/                           # CLI commands (one file per command)
    init.js                           #   guild init — interactive onboarding
    new-agent.js                      #   guild new-agent <name>
    status.js                         #   guild status
    doctor.js                         #   guild doctor — setup verification
    list.js                           #   guild list — agents & skills
    __tests__/                        #   Co-located tests (*.test.js)
  utils/                              # Shared utilities
    files.js                          #   File I/O, template copying, frontmatter parsing
    generators.js                     #   Generates CLAUDE.md, PROJECT.md, SESSION.md
    github.js                         #   GitHub CLI (gh) integration
    __tests__/                        #   Co-located tests
  templates/                          # Scaffolding templates copied to user projects
    agents/*.md                       #   Agent definitions (9 agents)
    skills/*/SKILL.md                 #   Skill definitions (11 skills)
CLAUDE.md                             # Project instructions (enriched by guild-specialize)
PROJECT.md                            # Project identity and stack
SESSION.md                            # Session state — persists across conversations
.claude/agents/*.md                   # Active agent definitions
.claude/skills/*/SKILL.md             # Active skill definitions
.github/workflows/ci.yml              # CI: lint + test on Node 20.x, 22.x
.github/workflows/release.yml         # Release: npm publish on v* tags
```

## Code conventions
- Commander.js command pattern
- ESModules throughout

## Architecture patterns
- **CLI framework**: Commander.js with lazy dynamic imports in each `.action()` handler
- **Command pattern**: Each command in `src/commands/<name>.js` exports an async `run<Name>()` function
- **Interactive UI**: @clack/prompts (intro, outro, spinner, confirm, text, select, log)
- **Template scaffolding**: `src/templates/` holds source-of-truth agent/skill files; `copyTemplates()` copies them to `.claude/`
- **Frontmatter metadata**: Agent and skill `.md` files use YAML frontmatter parsed by `parseFrontmatter()` in `files.js`
- **ESModules `__dirname`**: `dirname(fileURLToPath(import.meta.url))` pattern throughout
- **GitHub integration**: Optional `gh` CLI wrapping via `execFileSync` with array args (no shell injection)
- **Self-referential**: Guild uses its own agents and skills to develop itself

## Stack with versions
- **Node.js** >= 20 (engine requirement), local: v24.12.0
- **Commander.js** 14.0.3 — CLI framework
- **@clack/prompts** 1.0.1 — interactive terminal prompts
- **chalk** 5.3.0 — terminal colors
- **Vitest** 4.0.18 — test runner + coverage (@vitest/coverage-v8)
- **ESLint** 10.0.1 — flat config, ECMAScript 2022
- **markdownlint-cli2** 0.21.0 — linting for template markdown files

## Useful commands
- `npm test` — run all tests (vitest run)
- `npm run test:watch` — watch mode
- `npm run test:coverage` — tests with coverage report
- `npm run lint` — ESLint + markdownlint-cli2
- `npm run lint:js` — ESLint only
- `npm run lint:md` — markdownlint only
- `npm run dev` — run CLI locally (`node bin/guild.js`)

## CI/CD
- **CI** (`.github/workflows/ci.yml`): lint + test on push/PR to develop/main, matrix Node 20.x/22.x, security audit
- **Release** (`.github/workflows/release.yml`): on `v*` tag — test, lint, `npm publish`, GitHub release

## ESLint rules
- Flat config in `eslint.config.js`
- `prefer-const: error`, `no-var: error`, `no-console: off`
- `no-unused-vars: warn` (ignores `_`-prefixed args)
- ECMAScript 2022, sourceType: module

## Test conventions
- Vitest with co-located `__tests__/*.test.js` files next to source
- Coverage includes `src/**/*.js`, excludes `__tests__/` and `.claude/worktrees/`
- Tests should be self-contained; no external mocking libraries

## Environment variables
- `NODE_ENV`

## Global rules
- Do not implement without an approved plan
- Update SESSION.md at the end of each session
- ESModules throughout the codebase
- Always use path.join() to build paths

## Subagent rules
- Guild agent roles (advisor, developer, tech-lead, etc.) are NOT Claude Code subagent_types
- Always use `subagent_type: "general-purpose"` when spawning agents via Task tool
- CLAUDE.md and SESSION.md changes must be committed separately from feature code
- No `git stash` in automated pipelines — use `wip:` commits instead
- Parallel agents must use git worktrees for isolation

## Available skills
- /guild-specialize  — enrich CLAUDE.md by exploring the actual project
- /build-feature     — full development pipeline
- /new-feature       — create branch and scaffold for a feature
- /create-pr         — create a structured pull request from current branch
- /council           — debate decisions with multiple agents
- /review            — code review on the current diff
- /qa-cycle          — QA + bugfix cycle
- /status            — view project status
- /dev-flow          — view current pipeline phase
- /session-start     — load context and resume work
- /session-end       — save state to SESSION.md
