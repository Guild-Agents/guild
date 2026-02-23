# PROJECT.md — Guild

> Project configuration for building Guild using Guild.

## Identity
- **Name:** guild
- **Domain:** Developer tooling — frameworks and tools to enhance AI-assisted development workflows
- **Description:** An installable npm CLI that sets up a team of specialized AI agents in projects using Claude Code. Guild standardizes how developers work with AI agents: onboarding, specialization, feature pipelines, and session state management.
- **Scope:** Functional CLI with `guild init`, `guild new-agent`, `guild status`. 8 flat agent templates and 10 skill workflows. Published on npm as `guild-agents`.

## Tech stack
- **Runtime:** Node.js 20+ (native ESModules — `import`/`export`, no CommonJS)
- **CLI prompts:** @clack/prompts ^0.9.0
- **CLI framework:** commander ^12.0.0
- **Terminal colors:** chalk ^5.3.0, picocolors ^1.0.0
- **File utilities:** fs-extra ^11.2.0
- **Testing:** Vitest
- **Lint:** ESLint (flat config)
- **Package manager:** npm
- **Target:** Node.js >= 18, macOS + Linux + Windows

## Key architectural decisions
- ESModules throughout — no CommonJS, no require()
- Async/await for all I/O — never callbacks
- No database — all state lives in markdown files in the user's project
- No server — Guild is a pure CLI, no background processes
- Strict separation: `src/commands/` orchestrates, `src/utils/` executes, `src/templates/` contains files copied to the user's project
- Agents are flat `.md` files (identity + responsibilities + process). Skills are `SKILL.md` workflows that orchestrate agents.
- Commander for parsing commands, Clack for user interaction — never mix responsibilities
- Errors with actionable messages: users must always know what to do when something fails
- `path.join()` for building paths — never string concatenation

## Domain rules
- Guild NEVER modifies user project files other than those it created (CLAUDE.md, PROJECT.md, SESSION.md, .claude/)
- The npm package name is `guild-agents`, the CLI command is `guild`
- Strict Semantic Versioning: breaking changes = major, features = minor, fixes = patch
- Every public behavior change requires a CHANGELOG.md update
- Agent and skill templates are the project's core asset — quality over quantity
- Guild must work offline — no network dependencies at runtime except the optional GitHub CLI integration

## Testing strategy
- **Framework:** Vitest
- **TDD:** Yes — write tests before implementation in utils modules
- **Minimum coverage:**
  - Business logic / domain (generators): 90%
  - CLI commands (commands/): 80%
  - Utilities (utils/): 80%
  - Global minimum: 80%

## Agents
- advisor, product-owner, tech-lead, developer, code-reviewer, qa, bugfix, db-migration

## GitHub integration
- **Enabled:** Yes
- **Repo:** https://github.com/guild-agents/guild
- **Branches:** main (production) + develop (integration)
- **Labels:** backlog, in-progress, in-review, done, bug, blocked, templates
- **PR workflow:** feature/* and fix/* → develop → release → main
