# SESSION.md

## Active session
- **Date:** 2026-02-24
- **Current task:** v0.3.1 released
- **Active agent:** None (session complete)
- **Status:** v0.3.1 "Spec Artifacts + SDD Identity" published to npm and GitHub

## What happened this session

### v0.3.1 fully spec'd, implemented, and released

1. **Council specs produced** — ran `/council` for all 9 v0.3.1 items in parallel, generating design docs in `docs/specs/`
2. **Parallel implementation** — 8 developer agents in worktrees implemented all 9 items simultaneously
3. **Merged and verified** — all 8 branches merged into main, 104 tests passing, 0 lint errors
4. **Released** — version bumped, CHANGELOG updated, tag `v0.3.1` pushed, all 3 CI workflows passed (Release, CI, Pages)

### Items shipped

| # | Item | Type |
|---|---|---|
| 1 | `/council` writes design docs to `docs/specs/` | SKILL.md |
| 2 | `/build-feature` saves pipeline trace to spec | SKILL.md |
| 3 | Spec template at `src/templates/specs/SPEC_TEMPLATE.md` | Template |
| 4 | `resolveProjectRoot` wired into CLI commands | Code fix |
| 5 | README.md rewritten for SDD positioning | Content |
| 6 | GitHub Pages updated for SDD positioning | Content |
| 7 | Post-init onboarding: understand/spec/build flow | Code |
| 8 | `docs/specs/` in `guild init` + devops-agent showcase | Code + Content |
| 9 | package.json + CLI description updated to SDD | Metadata |

## Key decisions made this session

### 1. Guild's identity is Specification-Driven Development (SDD)
- NOT "multi-agent framework" — the spec process IS the product
- Positioning: "Guild makes Claude Code think before it builds"
- The design doc is the core artifact, not the code
- Agents are an implementation detail, not the headline

### 2. Self-dependency is INTENTIONAL
- `guild-agents: ^0.3.0` in package.json is deliberate bootstrapping ("Guild Builds Itself")

### 3. Design doc format standardized
- Template at `src/templates/specs/SPEC_TEMPLATE.md`
- 10 required sections: Context, Decision, Constraints, Acceptance Criteria, Technical Approach, Trade-offs Considered, Unresolved Questions, Test Strategy, Council Perspectives, Points of Dissent
- Bare key-value frontmatter (spec-id, status, date, council-type)

### 4. Council produces persistent artifacts
- `/council` Step 5 offers to write spec to `docs/specs/` after user decisions
- `/build-feature` appends Pipeline Trace to the spec file
- Status lifecycle: draft → implementing → implemented

### 5. resolveProjectRoot was dead code
- Function existed with full test coverage but was never called
- Fixed with `ensureProjectRoot()` wrapper + `process.chdir()` pattern
- Doctor gets special graceful handling

### 6. SDD messaging across all touchpoints
- README: "Guild makes Claude Code think before it builds"
- npm description: "Specification-driven development CLI for Claude Code — think before you build"
- Post-init outro: "Guild ready — spec before you build"
- GitHub Pages: hero, meta tags, OG image, pipeline section all updated

## Pending items

### Untracked spec files in docs/specs/
9 council-generated spec documents exist but are not committed:
- `build-feature-trace.md`, `council-writes-specs.md`, `devops-agent-showcase.md`
- `github-pages-update.md`, `package-json-sdd.md`, `post-init-onboarding.md`
- `readme-rewrite.md`, `resolve-project-root.md`, `spec-template-format.md`

Decision deferred on how to handle these (commit as-is, curate, or regenerate via updated `/council`).

### Stale worktree branches
8 worktree branches remain in git (can be cleaned with `git branch -d`):
- `worktree-agent-a596c8fb`, `worktree-agent-a7e6940c`, `worktree-agent-af6c6296`
- `worktree-agent-a4860a3a`, `worktree-agent-af22f060`, `worktree-agent-a5ac9b1e`
- `worktree-agent-a7420d31`, `worktree-agent-ade3d736`

### OG image PNG not regenerated
`docs/og-image.svg` was updated but `docs/og-image.png` was not regenerated. Social media previews will show stale content until the PNG is re-rendered from the SVG.

## Approved Roadmap

### v0.3.1 — "Spec Artifacts + SDD Identity" (SHIPPED)

All 9 items completed and released.

### v0.4 — "Connected Pipeline + Methodology Docs"
1. `/spec` standalone skill (phases 1-3 without implementation)
2. Council → build-feature automatic handoff (spec as input)
3. `/create-pr` links spec in PR body
4. `guild sync` command (template update)
5. **Appetite gate**: `/build-feature --quick` bypasses council for small tasks
6. **SDD Methodology page** on guildagents.dev
7. Spec lifecycle tracking (draft → approved → implementing → implemented → superseded)

### v0.5 — "Spec Intelligence"
1. Spec-aware code review ("Spec Deviation" as finding category)
2. Spec cross-references and dependency tracking
3. Spec amendment protocol (Implementation Notes, append-only)
4. Onboarding with full SDD workflow
5. Contributing guide: "start with a spec, not a PR"

### v1.0 — "Stable SDD"
1. Bidirectional traceability (spec IDs in commits, criteria in test names)
2. Enhanced doctor (validates full SDD pipeline)
3. `guild new-skill` command
4. Full documentation site (Concepts, Guides, Reference)
5. Case studies (Guild's own specs as examples)

## Anti-patterns to avoid (from SDD Methodologist)
- **BDUF**: Mitigate with appetite gate (small tasks skip council)
- **Spec Bureaucracy**: Test "does the developer consult the spec during implementation?"
- **Spec Staleness**: Spec-aware review validates implementation matches spec
- **Analysis Paralysis**: Cap council rounds, "proceed with uncertainty" is a valid outcome
- **Over-specification**: Specs define behavior and constraints, NOT implementation steps

## Technical context
- **Version**: 0.3.1 (published to npm)
- **Tests**: 104 passing (8 test files)
- **Agents**: 9 templates + SDD Methodologist (local only)
- **Skills**: 11 templates (including create-pr)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Next steps
1. Decide how to handle the 9 untracked spec files in `docs/specs/`
2. Regenerate `docs/og-image.png` from updated SVG
3. Clean up stale worktree branches
4. Begin v0.4 planning — `/spec` standalone skill is the anchor feature
