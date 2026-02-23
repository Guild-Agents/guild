# Changelog

All notable changes to Guild are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

## [0.2.9] - 2026-02-23

### Fixed

- `guild init` summary showed "8 base agents" instead of 9 — now uses dynamic count from `getAgentNames().length`
- CLAUDE.md had duplicate `## CLI commands` heading — renamed first to `## Development commands`

## [0.2.8] - 2026-02-23

### Added

- Frontmatter validation test: ensures all 9 agent templates have `name`, `description`, `tools`, and `permissionMode`
- `platform-expert` agent added to `guild-specialize` specialization list and `status` example

### Fixed

- `platform-expert.md` now has complete frontmatter (`tools`, `permissionMode: bypassPermissions`) — was missing since v0.2.0
- Exclude all test files from npm package (`!src/**/__tests__/`) — 4 command test files were leaking
- README.md: corrected agent count (9, not 8), added missing CLI commands (`doctor`, `list`), fixed Node.js badge (>= 20)
- Translate remaining Spanish JSDoc comments in `files.js` to English
- Remove unused `picocolors` production dependency
- Fix stale header comment in `bin/guild.js` (listed 3 of 5 commands)
- Fill empty `author` field in `package.json`

### Changed

- README.md rewritten: problem-first lead, "Why Guild?" section, ASCII pipeline diagram, enriched Quick Start

## [0.2.7] - 2026-02-23

### Changed

- Translate entire codebase from Spanish to English for the open source community (#34)
- All 9 agent templates, 10 skill templates, CLI strings, and generated content now in English
- Vitest config excludes worktree directories from test execution

## [0.2.6] - 2026-02-23

### Added

- Test coverage reporting in CI via `@vitest/coverage-v8`
- Release automation workflow triggered by version tags (`.github/workflows/release.yml`)
- Vitest config file for coverage scope (`vitest.config.js`)

### Changed

- CI test step now runs with coverage (`npx vitest run --coverage`)

## [0.2.5] - 2026-02-23

### Added

- Security audit job in CI (`npm audit --audit-level=moderate`)
- Dependabot config for automated npm and GitHub Actions dependency PRs

### Changed

- Remove redundant `lint-markdown` standalone CI job (covered by `npm run lint` since v0.2.3)

### Fixed

- Add explicit `permissions: contents: read` to CI workflow (supply chain hardening)
- CHANGELOG.md rewritten with full version history (was stale since pre-release)
- CONTRIBUTING.md: Node >= 20 (was 18), 9 agents (was 8)

## [0.2.4] - 2026-02-23

### Fixed

- Bump minimum Node.js from 18 to 20 — ESLint v10 requires it (#24)
- Drop Node 18.x from CI matrix (EOL since April 2025)

## [0.2.3] - 2026-02-23

### Fixed

- Integrate markdownlint-cli2 as devDependency with unified `npm run lint` (#22)
- Add `lint:js` and `lint:md` scripts for running linters individually
- `prepublishOnly` now catches markdown lint errors before npm publish

## [0.2.2] - 2026-02-23

### Fixed

- Resolve MD029 lint errors in review skill template (ordered list renumbering)

## [0.2.1] - 2026-02-23

### Added

- Quality gates in build-feature pipeline: mandatory test+lint before review (gate pre-Review) and before finalization (gate final)
- Gates cannot be skipped even when users request phase skipping

### Changed

- build-feature Phase 6 now delegates to `/qa-cycle` instead of duplicating QA logic
- `/qa-cycle` runs test+lint as mandatory Step 1 before QA validation
- `/review` runs test+lint before invoking Code Reviewer, passing results as context

### Fixed

- Eliminated inconsistency between build-feature (2 cycles) and qa-cycle (3 cycles) loop limits

## [0.2.0] - 2026-02-23

### Added

- New command: `guild doctor` — diagnose installation with actionable fix suggestions
- New command: `guild list` — list installed agents and skills with descriptions from frontmatter
- New agent: Platform Expert — Claude Code platform integration specialist (permissions, hooks, subagent config)
- Example sessions for all 10 skill templates
- Worktree isolation for parallel agent pipelines
- Checkpoint commits with `wip:` convention in build-feature

### Fixed

- Subagent Bash access: all agent templates now include explicit `tools` and `permissionMode` frontmatter
- Execution agents (developer, bugfix, qa, db-migration) use `permissionMode: bypassPermissions`
- Analysis agents (advisor, tech-lead, code-reviewer) use `permissionMode: plan`
- Subagent type mapping documented in SKILL.md templates

### Removed

- Unused `fs-extra` dependency

## [0.1.0] - 2026-02-23

### Added

- CLI with commands: `init`, `new-agent`, `status`
- Interactive onboarding with Clack
- 8 agents as flat `.md` files: advisor, product-owner, tech-lead, developer, code-reviewer, qa, bugfix, db-migration
- 10 skill workflows: guild-specialize, build-feature, new-feature, council, qa-cycle, review, dev-flow, status, session-start, session-end
- State files: CLAUDE.md, PROJECT.md, SESSION.md
- Skills invoked as slash commands, orchestrating agents via Task tool
- `/guild-specialize` to explore codebase and enrich CLAUDE.md
- `/build-feature` full pipeline: evaluation, spec, implementation, review, QA
- GitHub integration via `gh` CLI (optional)

---

[Unreleased]: https://github.com/Guild-Agents/guild/compare/v0.2.9...HEAD
[0.2.9]: https://github.com/Guild-Agents/guild/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/Guild-Agents/guild/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/Guild-Agents/guild/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/Guild-Agents/guild/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/Guild-Agents/guild/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/Guild-Agents/guild/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/Guild-Agents/guild/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/Guild-Agents/guild/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/Guild-Agents/guild/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Guild-Agents/guild/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Guild-Agents/guild/releases/tag/v0.1.0
