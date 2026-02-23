# Changelog

All notable changes to Guild are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

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

<!-- Example format for future releases:

## [0.2.0] - 2026-04-01

### Added
- New skill: /deploy

### Fixed
- Init command handling when .claude/ directory already exists

### Changed
- Improved agent coordination in build-feature pipeline

## [0.1.0] - 2026-03-01

### Added
- First public release
-->
