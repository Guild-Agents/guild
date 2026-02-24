---
name: guild-specialize
description: "Enriches CLAUDE.md by exploring the project and specializes agents to the real stack"
user-invocable: true
---

# Guild Specialize

Explores the user's real project and enriches the entire Guild configuration with concrete information about the detected stack, architecture, and conventions.

This skill runs once after `guild init`. It transforms generic placeholders into real project information.

## When to use

- Immediately after running `guild init`
- When a new stack is added to the project (new database, new framework)
- When the project structure has changed significantly

## Process

### Step 1 — Read base context

Read the Guild configuration files:

- `CLAUDE.md` — current instructions (contains `[PENDING: guild-specialize]` placeholders)
- `PROJECT.md` — identity and stack declared during init
- `SESSION.md` — current session state

### Step 2 — Explore the real project

Investigate the real project structure looking for:

**Dependencies and versions:**

- `package.json` (Node.js/frontend)
- `pom.xml` or `build.gradle` (Java)
- `requirements.txt` or `pyproject.toml` (Python)
- `Gemfile` (Ruby)
- `go.mod` (Go)
- `Cargo.toml` (Rust)

**Architecture and structure:**

- Folders `src/`, `app/`, `lib/`, `pkg/`, `internal/`
- Organization pattern: by layers, by features, by domain
- Project entry points

**Configuration and conventions:**

- `tsconfig.json`, `eslint.config.*`, `.prettierrc`
- `.env.example`, `.env.local` (environment variables — do NOT read real `.env`)
- `Dockerfile`, `docker-compose.yml`
- CI/CD: `.github/workflows/`, `.gitlab-ci.yml`

**Database and migrations:**

- Folder `migrations/`, `db/`, `prisma/`, `drizzle/`
- Configured ORM or query builder
- Existing schema

**Existing documentation:**

- `README.md` — project overview
- Internal documentation in `docs/`

### Step 3 — Enrich CLAUDE.md

Replace all `[PENDING: guild-specialize]` placeholders in CLAUDE.md with real information:

- **Stack with exact versions**: extracted from dependency files
- **Folder structure explained**: what each main folder does
- **Detected code conventions**: linter, formatter, import style
- **Identified architecture patterns**: MVC, hexagonal, modular, etc.
- **Known environment variables**: listed from `.env.example`
- **Visible limitations and technical debt**: outdated dependencies, TODOs found
- **Useful project commands**: detected npm/make/cargo scripts

### Step 4 — Specialize agents

For each agent in `.claude/agents/*.md`, add project-specific context:

- **advisor.md**: real project domain, target users
- **tech-lead.md**: specific stack, detected patterns, architecture decisions
- **product-owner.md**: existing functionality, visible backlog
- **developer.md**: code conventions, main framework, file structure
- **code-reviewer.md**: lint rules, project patterns, anti-patterns to watch
- **qa.md**: testing framework, commands to run tests, current coverage
- **bugfix.md**: debugging stack, logs, available tools
- **db-migration.md**: ORM, migration tool, current schema (if applicable)
- **platform-expert.md**: Claude Code version, known permission bugs, hook configuration

Use the `Task` tool to invoke each agent by reading their `.claude/agents/[name].md` if you need a specialized perspective to enrich their configuration.

### Step 5 — Confirm

Present a summary of what was detected:

```text
Guild v1 specialized for [project-name]

Detected stack:
- [list of technologies with versions]

Architecture:
- [identified pattern]
- [main structure]

Updated agents:
- [list of agents with their applied specialization]

Run /status to see the full state.
```

### Step 6 — Commit enrichment immediately

**CRITICAL:** After enriching CLAUDE.md and agent files, commit the changes immediately as their own atomic commit. Do NOT leave them as unstaged changes — they are vulnerable to `git stash` and other operations.

```bash
git add CLAUDE.md .claude/agents/*.md
git commit -m "chore: enrich CLAUDE.md and agents via guild-specialize"
```

This ensures enrichment survives any subsequent git operations (stash, checkout, rebase).

## Example Session

```text
User: /guild-specialize

Guild Specialize analyzing project...

Stack detected:
- Node.js 20.11.0, TypeScript 5.3.3
- React 18.2.0, Next.js 14.1.0
- PostgreSQL via Prisma 5.9.0

Architecture:
- Next.js App Router (src/app/)
- API routes in src/app/api/
- Shared components in src/components/

Agents updated:
- developer.md: Specialized for Next.js + TypeScript
- qa.md: Configured for Vitest + Playwright
- db-migration.md: Configured for Prisma

Run /status to see the full state.
```

## Important Notes

- NEVER read real `.env` files — only `.env.example` or `.env.local`
- If you cannot detect something with certainty, ask the user instead of assuming
- Prioritize accuracy over completeness — it is better to say "not detected" than to fabricate
- Agents should be specialized to the real stack, not generic
- NEVER use `git stash` in automated pipelines — use `wip:` commits instead
- CLAUDE.md changes must always be committed separately from feature code
