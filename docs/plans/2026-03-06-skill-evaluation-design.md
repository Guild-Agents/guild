# Skill Evaluation System — Design

**Date:** 2026-03-06
**Status:** Approved
**Scope:** Component 1 (dry-run assertions), Component 2 (full execution, future)

## Problem

Guild has 15 skill templates but no way to verify they produce correct execution plans. A change to a skill template could break its workflow structure (missing steps, wrong model tiers, missing gates) without anyone noticing until runtime.

## Solution: Dry-Run Eval Framework

Evaluate skill plan correctness by parsing SKILL.md frontmatter and running assertions against the workflow structure. No Claude invocation needed. Compatible with the `anthropics/skills` eval format.

## Eval Format (anthropics/skills compatible)

```json
{
  "skill": "build-feature",
  "evals": [
    {
      "id": "bf-has-six-phases",
      "description": "Build-feature plan contains all 6 phases",
      "expectations": [
        { "text": "Plan has evaluate step", "assertion": "step-exists:evaluate" },
        { "text": "Plan has review step", "assertion": "step-exists:review" }
      ]
    }
  ]
}
```

## Assertion Types

Assertions operate on the parsed workflow from SKILL.md frontmatter:

| Assertion | What it verifies |
|---|---|
| `step-exists:<id>` | Plan contains a step with that id |
| `step-role:<id>:<role>` | Step has expected role (system, dynamic) |
| `step-model-tier:<id>:<tier>` | Step uses correct model-tier |
| `step-requires:<id>:<dep>` | Step has the expected dependency |
| `step-parallel:<id>` | Step is in a parallel group |
| `gate-exists:<id>` | Step has gate: true |
| `step-count:<min>` | Plan has at least N steps |

## Skills Evaluated

### build-feature
- Has all 6 phases (evaluate, specify, plan, implement, review, validate)
- Advisor uses reasoning tier
- Developer uses execution tier
- Gates pre-review and final exist
- Has at least 7 steps

### council
- Has 3 agent steps in parallel
- Agents use reasoning tier
- Synthesize step exists with gate
- workspace-context step has condition

## File Structure

```
src/templates/skills/build-feature/evals/evals.json
src/templates/skills/council/evals/evals.json
src/utils/eval-runner.js
src/utils/__tests__/eval-runner.test.js
```

Evals are NOT copied to user projects. Internal development only.

## Execution

```bash
npm run eval                    # run all skill evals
npm run eval:build-feature      # single skill
npm run eval:council            # single skill
```

Internally: parse SKILL.md frontmatter workflow, load evals.json, run each assertion against the plan, report pass/fail.

## Code

- **`src/utils/eval-runner.js`** — `loadEvals(skillName)`, `runEvals(skillName)`, `evaluateAssertion(plan, assertion)`. Pure functions.
- **`package.json`** — npm scripts for eval execution

## Phases

### Component 1 — Dry-Run Assertions (this cycle)
- Eval runner with assertion engine
- Evals for build-feature and council
- npm scripts for execution
- Unit tests for eval-runner

### Component 2 — Full Execution (future)
- Execute skills with Claude, verify real outcomes
- With-skill vs baseline comparison
- Grader subagent for subjective evaluation
- Benchmark aggregation (pass rate, timing, tokens)

## Out of Scope
- Evals copied to user projects
- CLI command (`guild eval`)
- Full execution with Claude (Component 2)
- With-skill vs baseline comparison
- Evals for all 15 skills (only build-feature and council)
