# Changelog

All notable changes to Guild are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Fixed

- CHANGELOG.md: added missing v0.3.0 entry and enriched v0.3.1 with granular details
- GitHub release notes updated for v0.3.0 and v0.3.1 with full descriptions

## [0.3.1] - 2026-02-24

### Added

- `/council` Step 5: after user decisions, offers to write the design doc to `docs/specs/<spec-id>.md` with bare key-value frontmatter (`spec-id`, `status`, `date`, `council-type`)
- `/build-feature` Pipeline Trace: appends structured trace to spec file on completion — records phase verdicts, agent outputs, test/lint results, commit hashes, and timing per phase
- Standard spec template at `src/templates/specs/SPEC_TEMPLATE.md` with 10 required sections: Context, Decision, Constraints, Acceptance Criteria, Technical Approach, Trade-offs Considered, Unresolved Questions, Test Strategy, Council Perspectives, Points of Dissent
- `guild init` creates `docs/specs/` directory with `.gitkeep` for SDD spec artifacts
- `ensureProjectRoot()` helper in `src/utils/files.js` — wraps `resolveProjectRoot()` with a throwing variant + `process.chdir()` so CLI commands resolve the project root from subdirectories
- DevOps agent showcase spec (`docs/specs/devops-agent.md`) demonstrating the design doc format with all 10 sections filled
- `/create-pr` added to CONTRIBUTING.md skill list (was missing since v0.3.0)
- 3 new tests for `ensureProjectRoot()` in `files.test.js` (returns root, throws when missing, changes cwd)
- 1 new test for `docs/specs/` directory creation in `files.test.js`
- 1 new test for post-init onboarding `/council` mention in `init.test.js`
- 1 new test for SESSION.md `/council` next step in `generators.test.js`

### Fixed

- `guild status`, `guild doctor`, `guild list`, and `guild new-agent` now work when invoked from subdirectories — each command calls `ensureProjectRoot()` as first action
- `resolveProjectRoot()` was implemented with full test coverage but never called by any command (dead code since v0.1.0)
- `guild doctor` imports `resolveProjectRoot` (not `ensureProjectRoot`) and gracefully handles `null` return instead of throwing
- Skill count corrected from 10 to 11 across README.md, CONTRIBUTING.md, and GitHub Pages `docs/index.html`
- CONTRIBUTING.md markdownlint issues resolved: table separator alignment, fenced code block language specifiers

### Changed

- **SDD Identity Pivot**: Guild repositioned from "multi-agent framework" to "Specification-Driven Development" — the spec process is the product, agents are an implementation detail
- README.md fully rewritten (160 → 126 lines): "Guild makes Claude Code think before it builds" tagline, ASCII pipeline diagram, skills grouped by function (Pipeline/Decision/Quality/Context), agents demoted to "Under the Hood" section
- GitHub Pages (`docs/index.html`): ~20 text locations updated — hero subtitle, meta description, OG tags, pipeline section with 6 phases, value propositions reframed around specs, agent section retitled "Under the Hood"
- `docs/og-image.svg`: subtitle changed to "Specification-Driven Development", tagline to "Think before you build"
- `docs/sitemap.xml`: `<lastmod>` dates updated to 2026-02-24
- Post-init onboarding in `src/commands/init.js`: `relevantSkills` reordered to include `/council` as key step, `quickStart` teaches understand → spec → build flow, outro changed to "Guild ready — spec before you build"
- `src/utils/generators.js`: SESSION.md template "Next steps" updated to 3-step flow mentioning `/council`, CLAUDE.md project structure includes `docs/specs/`
- `package.json` description: "Specification-driven development CLI for Claude Code — think before you build"
- `bin/guild.js` Commander.js `.description()` updated from "Multi-agent framework" to match
- `package.json` keywords: added `specification-driven`, `spec-driven`, `spec-first`, `design-docs`; removed `multi-agent`, `ai-agents`, `framework`

## [0.3.0] - 2026-02-24

### Added

- GitHub Pages landing page for guildagents.dev (`docs/index.html`, `docs/styles.css`) — hero, feature grid, pipeline visualization, agent showcase, installation section
- SEO foundation: `docs/sitemap.xml`, `docs/robots.txt`, structured data (JSON-LD), Open Graph and Twitter Card meta tags, `docs/og-image.svg`
- GitHub Pages deployment workflow (`.github/workflows/pages.yml`)
- `/create-pr` skill — creates structured pull requests with summary, test plan, and linked issues; closes the pipeline loop after `/build-feature`
- E2E tests for `guild init` pipeline in `init.test.js` — verifies full onboarding flow end-to-end
- `parseFrontmatter()` exported from `src/utils/files.js` as shared utility for YAML frontmatter parsing
- `getAgentNames()` and `getSkillNames()` helpers in `src/utils/files.js` for dynamic template discovery
- Build-feature progress indicators: `[1/6] Advisor — Evaluating feature...` format with round tracking for review/QA loops

### Changed

- Post-init onboarding: contextual quick-start suggestions based on detected project stack, inferred CLAUDE.md content from `package.json` and project structure
- `guild init` summary uses dynamic `getAgentNames().length` instead of hardcoded "8 base agents"
- `guild list` and `guild status` use `parseFrontmatter()` instead of inline regex parsing

### Fixed

- Skill count updated from 10 to 11 in test assertions after `/create-pr` addition
- Copyright year in GitHub Pages footer updated to 2026
- ESLint bumped from 10.0.1 to 10.0.2 (#37, #44)

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

[Unreleased]: https://github.com/Guild-Agents/guild/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/Guild-Agents/guild/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Guild-Agents/guild/compare/v0.2.9...v0.3.0
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
