# SESSION.md

## Active session
- **Date:** 2026-03-31
- **Current task:** none
- **Branch:** `feature/eval-enhancements` (PR #66 open, CI green)
- **Active agent:** none
- **Status:** Eval enhancements complete, awaiting merge

## What happened this session

### Eval Enhancements (PR #66)
- **Semantic matcher** (`src/utils/semantic-matcher.js`) — Haiku-based trigger scoring via Anthropic API, configurable model via `GUILD_SEMANTIC_MODEL` env var, JSON parse with fallback
- **Benchmark aggregation** (`src/utils/benchmark.js`) — auto-records every trigger run to `benchmarks/benchmark.json` (30-entry FIFO rotation), generates `benchmarks/benchmark.md` with per-skill metrics and deltas, regression detection (>5% drop + 2+ flips)
- **Description analyzer** (`src/utils/description-analyzer.js`) — keyword gap analysis on failed triggers, high/medium confidence ranking
- **CLI integration** — `guild eval --semantic`, `guild eval --suggest` flags, benchmark auto-recording on every trigger run
- **README updated** — new CLI commands section, Skill Evaluations section
- 9 commits, 626 tests passing, 0 new npm dependencies
- Design spec: `docs/superpowers/specs/2026-03-31-eval-enhancements-design.md`
- Implementation plan: `docs/superpowers/plans/2026-03-31-eval-enhancements.md`

### Code review findings addressed
- Regression threshold boundary fix (`>=` → `>` for exact 5% inclusion)
- `fetch` global added to ESLint config (Node 20+ native)
- `benchmark.json` added to `.gitignore`

## Key decisions
- Haiku for semantic scoring (cheap, fast, sufficient for binary classification)
- Model configurable via `GUILD_SEMANTIC_MODEL` env var (not hardcoded)
- Keyword matcher remains default (free, fast, CI-friendly); semantic is opt-in
- Benchmark retention: 30 entries max, FIFO rotation, git history as full archive
- Regression threshold: >5% accuracy drop AND 2+ tests flipped (filters single-flip noise)
- Description suggestions are read-only console output (no auto-modification of skill files)

## Technical context
- **Version**: 1.3.0
- **Tests**: 626 passing (36 files)
- **Evals**: 56 structural assertions + 120 trigger tests = 176 total
- **Agents**: 10 templates
- **Skills**: 15 templates (12 workflow + 3 discipline), all deployed
- **Node**: v24.12.0 local, CI matrix 22.x/24.x
- **Vulnerabilities**: 0

## Next steps
1. **Merge PR #66** — eval enhancements into develop
2. **Backlog**: MCP server, Agent Teams v2, Multi-Runtime v3
