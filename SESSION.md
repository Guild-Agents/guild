# SESSION.md

## Active session
- **Date:** 2026-02-26
- **Current task:** model-visibility-per-step — pipeline complete, post-pipeline fix applied
- **Branch:** `feature/model-visibility-per-step` (ready to merge to develop)
- **Active agent:** none
- **Status:** 344 tests pass, 0 lint errors, clean working tree

## What happened this session

### Pipeline 4: Declarative Skill Migration (feature/declarative-skill-migration)
Completed all 6 phases. Migrated 7 remaining skills to declarative workflow format.
- 344 tests at branch level
- Merged to develop, snapshot published: `guild-agents@0.3.1-snapshot.20260225.2`

### Pipeline 5: Model Visibility Per Step (feature/model-visibility-per-step)
Completed all 6 phases. Adds model name display (opus/sonnet) to progress indicators in 4 skill templates and includes `model` parameter in Task tool invocation examples.
- Files modified: 8 (4 templates + 4 active copies)
- Review: 0 blockers, 1 warning fixed, 2 suggestions (1 fixed, 1 out of scope)
- QA: 8/8 acceptance criteria verified, 0 bugs
- **Post-pipeline fix:** User caught that build-feature phase descriptions only showed model in decorative Progress text but didn't explicitly instruct Task tool to pass `model`. Fixed all 5 Agent lines to say `with model: "opus"` / `with model: "sonnet"`.

### Council sessions
- Feature-scope council on next priorities — unanimous: PR to main first, then orchestrator
- Council on token-accounting spec — rejected (too many unbuilt dependencies)
- Council on model visibility — unanimous: template-only change, recommended Option B (display + model param)

### Branch cleanup
- Deleted 3 local feature branches + 1 worktree branch
- Deleted 13 remote merged/stale branches
- Kept `develop` branch per user preference

## Key decisions

1. **Merge dispatch + workflows** — workflow frontmatter is canonical format
2. **Pure/IO split** — learnings.js (zero deps) + learnings-io.js (fs operations)
3. **File locking deferred to v2** — concurrent workflows not supported yet
4. **Token estimation heuristic** — words x 1.35, no external tokenizer
5. **Dispatch precedence** — workflow steps > null (no "dispatch blocks" format yet)
6. **Execution summary budget** — 500 tokens, compact digest for learnings-extractor
7. **Model visibility = display + instruction** — showing model names is not enough; each phase must explicitly instruct passing `model` to Task tool
8. **Keep develop branch** — user prefers develop→main flow over trunk-based

## Problems encountered and resolved

1. **Decorative vs instructional model display** — Pipeline templates showed `(opus)` in progress lines but didn't instruct the orchestrator to pass `model` param to Task tool. Fixed by adding `with model: "opus"` to each phase's **Agent:** line.
2. **Task example agent/model mismatch** — build-feature Task example used `developer.md` with `model: "opus"` (developer is execution tier = sonnet). Fixed to use `advisor.md` which matches opus.
3. **qa-cycle Example Session inconsistency** — Only skill whose Example Session didn't show model names. Fixed to show `QA (sonnet)` and `Bugfix (sonnet)`.

## Technical context
- **Version**: 0.3.1 (stable) / 0.3.1-snapshot.20260225.2 (snapshot)
- **Tests**: 344 passing (17 files)
- **Agents**: 10 templates
- **Skills**: 11 templates (all with declarative workflows + model visibility)
- **Node**: v24.12.0 local, CI matrix 20.x/22.x

## Pending items

### Feature branch ready to merge
`feature/model-visibility-per-step` has 4 commits, ready to merge to `develop`.

### PRs to main not yet created
All work is on `develop` but no PR to `main` has been created yet.

### OG image PNG not regenerated

## Next steps
1. **Merge model-visibility branch** — merge `feature/model-visibility-per-step` to `develop`, publish snapshot
2. **Create PR** — `develop` to `main` to promote all v1.x core features
3. **Runtime orchestrator** — executes declarative workflows, wires learnings injection
4. **guild-specialize model visibility** — follow-up: add model names to guild-specialize skill (noted in review S2)
5. **`guild logs` command** — view/clean traces

**Resume with:** `/session-start` then merge feature branch and create PR from develop to main.
