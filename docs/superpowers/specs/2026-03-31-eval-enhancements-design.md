# Eval Enhancements — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Three complementary features for the guild eval pipeline

## Overview

Three features that build on the existing eval/trigger infrastructure:

1. **Semantic Matcher** — LLM-based trigger scoring (Haiku) as optional complement to keyword matcher
2. **Benchmark Aggregation** — Persistent results with historical tracking and regression detection
3. **Description Optimization** — Gap analysis to surface keyword improvements for skill descriptions

## Feature 1: Semantic Matcher

### New file: `src/utils/semantic-matcher.js`

**Exports:**

- `SEMANTIC_MODEL_DEFAULT` — `"claude-haiku-4-5-20251001"` (current Haiku)
- `scoreMatchSemantic(prompt, skillName, skillDescription)` — Calls Haiku for binary classification
  - Model resolved from: `GUILD_SEMANTIC_MODEL` env var > `SEMANTIC_MODEL_DEFAULT`
  - System prompt requests strict JSON response: `{"score": N, "reasoning": "..."}`
  - Score range: 0-100 from Haiku, normalized to 0-1 for consistency with keyword matcher
  - Returns: `{ score: number, reasoning: string }`
  - JSON parse with fallback: extract first `{...}` from response if raw parse fails
  - If parse still fails: `{ score: 0, reasoning: "parse-error", error: true }`
- No new dependencies — uses native `fetch()` (Node 20+) for Anthropic Messages API
- Auth via `ANTHROPIC_API_KEY` env var

### Changes to `src/utils/trigger-runner.js`

- `runTriggerTests(triggers, allSkills, { semantic: false })` — new options parameter
- When `semantic: true`:
  - Uses `scoreMatchSemantic` instead of `scoreMatch` from trigger-matcher
  - `keywordExpected` field is ignored (not applicable to semantic matching)
  - Results include `matcherUsed: "keyword" | "semantic"` and `reasoning` field
- When `semantic: false` (default): behavior unchanged

### Changes to `src/commands/eval.js`

- New flag: `guild eval --semantic` activates semantic matcher for trigger tests
- Displays Haiku's `reasoning` on failures for debugging
- Warning if `ANTHROPIC_API_KEY` is not set when `--semantic` is used
- CI unchanged — keyword remains default, no API key required

## Feature 2: Benchmark Aggregation

### New file: `src/utils/benchmark.js`

**Exports:**

- `recordBenchmark(results, { matcher, timestamp })` — Appends entry to `benchmarks/benchmark.json`
  - Entry structure:
    ```json
    {
      "timestamp": "2026-03-31T15:30:00.000Z",
      "matcher": "keyword",
      "model": null,
      "skills": [
        { "name": "build-feature", "accuracy": 1.0, "precision": 1.0, "recall": 1.0, "tp": 4, "fp": 0, "fn": 0, "tn": 4 }
      ],
      "aggregate": { "accuracy": 0.958, "precision": 0.95, "recall": 0.97, "total": 120 }
    }
    ```
  - When `matcher: "semantic"`, `model` field contains the model string used
  - Retention: keeps last 30 entries, discards oldest (FIFO)
  - Creates `benchmarks/` directory and file if they don't exist

- `generateReport(benchmarkData)` — Generates `benchmarks/benchmark.md` from latest entry
  - Table: skill | accuracy | precision | recall | delta vs previous
  - Aggregate summary with delta
  - Delta indicators: `+2.5%`, `-1.0% !!` (warning on regression)

- `detectRegressions(current, previous)` — Compares two benchmark entries
  - Regression criteria: accuracy dropped >5% AND at least 2 tests flipped result
  - Returns: `Array<{ skill, currentAccuracy, previousAccuracy, delta, flippedTests }>`

### New directory: `benchmarks/` (git-tracked)

- `benchmarks/benchmark.json` — rolling history (max 30 entries)
- `benchmarks/benchmark.md` — human-readable report (regenerated each run)

### Integration in `src/commands/eval.js`

- After running trigger tests (keyword or semantic), automatically calls `recordBenchmark()`
- Regenerates `benchmark.md`
- If regressions detected vs previous entry, displays as warnings in console

## Feature 3: Description Optimization

### New file: `src/utils/description-analyzer.js`

**Exports:**

- `analyzeGaps(triggerResults, skillDescription)` — For each `shouldTrigger: true` test that failed:
  - Tokenizes prompt and description (reuses `tokenize()` from trigger-matcher)
  - Identifies prompt tokens missing from description (no full or substring match)
  - Filters stopwords and generic tokens
  - Returns: `{ skill: string, missingKeywords: string[], failedPrompts: string[] }`

- `generateSuggestions(gaps)` — For each skill with gaps:
  - Groups missing keywords by frequency across failed prompts
  - Confidence: `"high"` = keyword missing in 2+ failed prompts, `"medium"` = in 1 only
  - Returns: `Array<{ skill, currentDescription, suggestedKeywords: Array<{ word, confidence }> }>`

### Integration in `src/commands/eval.js`

- New flag: `guild eval --suggest` — runs keyword triggers, then analyzes gaps
- Console output per skill with gaps:
  ```
  !! build-feature — 2 missed triggers
     Missing keywords: pipeline, implement (high), end-to-end (medium)
     Current: "Full pipeline: evaluation -> spec -> implementation -> review -> QA"
  ```
- Read-only: does not modify any files

### No LLM required

Pure token analysis. The semantic matcher covers "intelligence"; this is mechanical diagnosis of why the keyword matcher fails on specific prompts.

## CLI Summary

| Command | Description |
|---------|-------------|
| `guild eval` | Structural evals + keyword triggers (existing, unchanged) |
| `guild eval [skill]` | Same, filtered to one skill (existing, unchanged) |
| `guild eval --semantic` | Trigger tests with Haiku semantic matcher |
| `guild eval --suggest` | Keyword triggers + description gap analysis |
| `guild eval --semantic --suggest` | Semantic triggers + keyword gap analysis (suggest always analyzes keyword gaps) |

All trigger runs (keyword or semantic) automatically record benchmarks.

## File Changes Summary

| File | Change |
|------|--------|
| `src/utils/semantic-matcher.js` | **New** — Haiku-based scoring |
| `src/utils/benchmark.js` | **New** — Recording, reporting, regression detection |
| `src/utils/description-analyzer.js` | **New** — Gap analysis and suggestions |
| `src/utils/trigger-runner.js` | **Modified** — Accept `{ semantic }` option, route to appropriate matcher |
| `src/commands/eval.js` | **Modified** — `--semantic`, `--suggest` flags, benchmark integration |
| `benchmarks/benchmark.json` | **New** — Rolling benchmark history |
| `benchmarks/benchmark.md` | **New** — Generated report |

## Testing Strategy

- **semantic-matcher.js** — Unit tests with mocked fetch (no real API calls in CI)
- **benchmark.js** — Unit tests for recording, rotation (>30 entries), report generation, regression detection
- **description-analyzer.js** — Unit tests with known gap scenarios
- **trigger-runner.js** — Tests for semantic option routing (mocked semantic-matcher)
- **eval.js** — Integration tests for new flags

## Dependencies

- No new npm packages
- `ANTHROPIC_API_KEY` — required only for `--semantic` flag
- `GUILD_SEMANTIC_MODEL` — optional, defaults to `claude-haiku-4-5-20251001`
