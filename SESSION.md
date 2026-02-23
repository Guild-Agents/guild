# SESSION.md

## Active session
- **Date:** 2026-02-22
- **Current task:** —
- **GitHub Issue:** —
- **Active agent:** —
- **Status:** v1 rewrite complete. Documentation updated for open source.

## Relevant context
- **npm:** package `guild-agents` published (v0.0.1 placeholder, update to 0.1.0 for release)
- **GitHub:** org `guild-agents`, branch `develop`
- **CI:** pending verification — tests with Vitest (42 tests passing locally)
- **CLI command:** `guild` — npm package `guild-agents`
- **v1 architecture:** flat agents (.md), skills (SKILL.md), no expertise system, no composer, no active.md

## Decisions made
- Vitest replaces Jest (package.json updated)
- ESLint 10 with flat config (eslint.config.js)
- v1 architecture: agents as flat .md files, skills as SKILL.md workflows
- Removed v0 concepts: expertise/, active.md, composer.js, tasks/, modes, guild mode, guild upskill, guild sync

## Next steps
1. Merge develop → main for release
2. Publish npm: `npm publish` (update version to 0.1.0)
3. Verify CI on GitHub Actions
