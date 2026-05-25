# Changelog

All notable changes to Guild are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versioning follows [Semantic Versioning](https://semver.org/).

---

## [2.1.0] - 2026-05-25

### Added

- **Claude Code plugin support**: Guild is now installable as a Claude Code plugin via `/plugin install Guild-Agents/guild`. Skills are namespaced as `/guild:build-feature`, `/guild:council`, etc.
- `.claude-plugin/plugin.json` manifest with metadata, keywords, and skill/agent paths
- `agents/` symlink at plugin root for native agent discovery

## [2.0.0] - 2026-05-25

### Removed

- **Orchestration runtime** (~9,500 lines): executor, orchestrator, dispatch, trace, accounting, pricing, learnings, skill-loader, and Claude Code provider. Guild no longer competes with Claude Code's native Agent/Task tools.
- **CLI commands**: `guild run`, `guild stats`, `guild logs`, `guild reset-learnings`
- **Skills**: `/review` (collides with Claude Code built-in `/code-review`), `/verify` (collides with built-in `/verify`), `/new-feature`, `/status`, `/dev-flow` (trivial operations Claude does natively)
- **Agents**: `product-owner` (redundant with advisor + tech-lead), `db-migration` (stack-specific, unused), `platform-expert` (volatile knowledge), `learnings-extractor` (orphaned after learnings system removal)

### Changed

- Guild is now a **template library + eval framework**, not a runtime. Claude Code executes skill workflows natively.
- `workflow-parser.js` replaced by minimal `skill-parser.js` for the eval system
- Workflow YAML simplified: removed executor-specific fields (`commands`, `on-failure`, `retry`, `condition`, `blocking`, `delegates-to`, `parallel`). Only `id`, `role`, `intent`, `requires`, `produces`, `gate`, `model-tier` remain.
- build-feature pipeline collapsed from 6 phases to 5 (Tech Lead absorbs specification duties)
- `/session-start` and `/session-end` now integrate with Claude Code's native memory system (SESSION.md for ephemeral state + memory for durable learnings)
- README and GitHub Pages rewritten for template library positioning

### Final state

- 6 agents, 10 skills, 242 tests, 7 CLI commands

## [1.5.0] - 2026-05-25

### Added

- **Parallel execution** in executor: groups marked with `parallel` in workflow YAML dispatch all steps concurrently via `Promise.all`
- **Delegation** in executor: steps with `delegates-to` load the sub-skill, create a sub-plan, and recursively execute with depth limiting (`MAX_DELEGATION_DEPTH=2`)

### Changed

- Dependabot updates: vitest 4.1.5, coverage-v8 4.1.5, markdownlint-cli2 0.22.1, eslint 10.3.0, yaml 2.8.4, softprops/action-gh-release v3
- Resolved `brace-expansion` vulnerability via `npm audit fix`
- SESSION.md removed from git tracking (stays local for /session-start and /session-end)

## [1.4.0] - 2026-03-31

### Added

- **Semantic matcher**: LLM-based trigger testing via Anthropic Haiku (`guild eval --semantic`)
- **Benchmark aggregation**: rolling 30-entry history with per-skill accuracy, precision, recall, and delta vs previous run. Regressions (>5% accuracy drop) flagged automatically.
- **Description analyzer**: keyword gap detection with improvement suggestions (`guild eval --suggest`)
- **Trigger tests** for all 15 skills (120 total test cases)
- `guild eval --triggers` for keyword-based trigger accuracy testing

## [1.3.0] - 2026-03-06

### Added

- **Cross-repo council** (PR #51): council skill auto-detects workspace membership and injects sibling context (CLAUDE.md, PROJECT.md, SESSION.md) into agent prompts
  - `collectMemberContext()` in workspace.js — reads sibling repo state, returns formatted markdown — 5 tests
  - Council SKILL.md updated with `workspace-context` step in workflow frontmatter
- **Cross-repo commands** (PR #52): run commands across workspace members
  - `guild workspace run <member> <preset>` — run test/lint/build in a specific member
  - `guild workspace run --all <preset>` — run in all members
  - `guild workspace run <member> --cmd "..."` — run custom commands
  - `runInMember()` and `runWorkspaceCommand()` with collect-all error handling — 8 tests
- **Skill Evaluation System** (PR #53): dry-run assertion framework for verifying skill template correctness
  - `evaluateAssertion()` engine with 7 assertion types: step-exists, step-role, step-model-tier, step-requires, step-parallel, gate-exists, step-count — 16 tests
  - `loadEvals()` and `runEvals()` parse SKILL.md workflows and run assertions from evals.json — 6 tests
  - Eval definitions for build-feature (6 evals) and council (4 evals)
  - `npm run eval` / `eval:build-feature` / `eval:council` scripts
  - Compatible with `anthropics/skills` eval format; internal development only

## [1.2.0] - 2026-03-06

### Added

- **Workspaces MVP**: multi-repo coordination via `guild-workspace.json` in a shared parent directory
  - `guild workspace init <name> <members...>` — create a workspace with member repos
  - `guild workspace add <path>` — add a member repo to an existing workspace
  - `guild workspace status` — show workspace members and state
  - Workspace resolver (`src/utils/workspace.js`) — findWorkspaceRoot, loadWorkspace, resolveWorkspaceAgents — 9 tests
  - Workspace context generator — cross-repo stack visibility injected into CLAUDE.md — 3 tests
  - Workspace-aware `guild init` — detects workspace membership automatically
  - CLI command functions with 7 tests
- **Zone parser** (`src/utils/zones.js`) — wrapZone, extractZones, replaceZone for protected auto-generated CLAUDE.md sections — 8 tests
- **`/re-specialize` skill** — incremental re-specialization of auto-generated CLAUDE.md zones without overwriting manual edits
- **`/tdd` skill** — TDD red-green-refactor discipline for implementation
- **`/debug` skill** — systematic 4-phase debugging workflow
- **`/verify` skill** — evidence-before-claims verification before completing work

### Changed

- `guild-specialize` skill updated with zone marker guidance
- CLAUDE.md generator emits zone markers on 4 auto-generated sections
- `guild init` passes workspace context to `generateClaudeMd()` when inside a workspace

## [1.1.0] - 2026-03-03

### Added

- **Runtime executor** (`src/utils/orchestrator.js`): real execution mode for `guild run` — executes skill workflows via Claude Code CLI provider (`claude -p`), with state machine, retry/failure handling, and execution tracing
- **Claude Code CLI provider** (`src/utils/claude-provider.js`): subprocess dispatch via `claude -p` with array args (no shell injection)
- **3 discipline skills** imported from Superpowers: `/tdd`, `/debug`, `/verify`
- `--dry-run` flag on `guild run` preserves v1.0 plan-only behavior as opt-in

### Fixed

- Guard null model in executor step resolution
- Additional test coverage for executor edge cases

## [1.0.0] - 2026-03-01

### Added

- **Runtime Orchestrator**: new module (`src/utils/orchestrator.js` + `orchestrator-io.js`) that executes declarative skill workflows — state machine, condition evaluation, retry/failure handling, dispatch resolution, delegation expansion, execution tracing (~2,300 lines, 109 tests)
- **`guild run <skill>`**: CLI command that previews a skill's execution plan (dry-run) — shows groups, steps, agents, models, conditions, gates, and dispatch info
- **`guild logs`**: CLI command to view execution traces; `guild logs clean` removes old traces (`--days N`, `--all`)
- **Model visibility**: all skill templates now show which model (opus/sonnet/haiku) each step uses, resolved from `model-tier` in workflow frontmatter
- **Pre-release publishing pipeline**: `npm run publish:snapshot`, `publish:beta`, `publish:stable` scripts with version management (#45)
- 10th agent: `learnings-extractor` — extracts compound learnings from pipeline executions

### Fixed

- Self-dependency removed from package.json (guild-agents was listing itself as a dependency)
- README.md: agent count corrected from 9 to 10, added `guild run`, `guild logs`, and `learnings-extractor`
- minimatch ReDoS vulnerability resolved (npm audit fix)
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

[Unreleased]: https://github.com/Guild-Agents/guild/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/Guild-Agents/guild/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Guild-Agents/guild/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Guild-Agents/guild/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Guild-Agents/guild/compare/v0.3.1...v1.0.0
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
