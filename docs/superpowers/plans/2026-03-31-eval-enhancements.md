# Eval Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add semantic matching (Haiku), benchmark aggregation with regression detection, and description gap analysis to the guild eval pipeline.

**Architecture:** Three new utility modules (`semantic-matcher.js`, `benchmark.js`, `description-analyzer.js`) plug into the existing `trigger-runner.js` and `eval.js`. The semantic matcher calls Anthropic's Messages API via native `fetch()`. Benchmarks persist to `benchmarks/benchmark.json` with 30-entry rotation. Description analyzer reuses `tokenize()` from `trigger-matcher.js`.

**Tech Stack:** Node.js (native fetch), Anthropic Messages API (Haiku), Vitest

---

### Task 1: Export tokenize from trigger-matcher.js

**Files:**
- Modify: `src/utils/trigger-matcher.js:13` (add `export` to `tokenize`)
- Modify: `src/utils/__tests__/trigger-matcher.test.js` (add import + test)

- [ ] **Step 1: Add test for tokenize export**

Add to `src/utils/__tests__/trigger-matcher.test.js` at the top, update the import and add a new describe block:

```javascript
import { scoreMatch, rankSkills, tokenize } from '../trigger-matcher.js';

// Add after the existing describe blocks:

describe('tokenize', () => {
  it('splits text into lowercase words', () => {
    const tokens = tokenize('Build a Feature');
    expect(tokens).toEqual(['build', 'feature']);
  });

  it('strips punctuation and splits on dashes', () => {
    const tokens = tokenize('red-green-refactor cycle!');
    expect(tokens).toEqual(['red', 'green', 'refactor', 'cycle']);
  });

  it('filters single-character words', () => {
    const tokens = tokenize('I am a dev');
    expect(tokens).toEqual(['am', 'dev']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/trigger-matcher.test.js`
Expected: FAIL — `tokenize` is not exported

- [ ] **Step 3: Export tokenize**

In `src/utils/trigger-matcher.js`, change line 13 from:

```javascript
function tokenize(text) {
```

to:

```javascript
export function tokenize(text) {
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/trigger-matcher.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/trigger-matcher.js src/utils/__tests__/trigger-matcher.test.js
git commit -m "refactor: export tokenize from trigger-matcher for reuse"
```

---

### Task 2: Semantic Matcher — Core Module

**Files:**
- Create: `src/utils/semantic-matcher.js`
- Create: `src/utils/__tests__/semantic-matcher.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/__tests__/semantic-matcher.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scoreMatchSemantic, SEMANTIC_MODEL_DEFAULT } from '../semantic-matcher.js';

describe('SEMANTIC_MODEL_DEFAULT', () => {
  it('exports the default model string', () => {
    expect(SEMANTIC_MODEL_DEFAULT).toBe('claude-haiku-4-5-20251001');
  });
});

describe('scoreMatchSemantic', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns score and reasoning from a valid API response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: '{"score": 85, "reasoning": "Strong match"}' }],
      }),
    }));

    const result = await scoreMatchSemantic('build a feature', 'build-feature', 'Full pipeline: evaluation -> spec -> implementation -> review -> QA');
    expect(result.score).toBeCloseTo(0.85, 2);
    expect(result.reasoning).toBe('Strong match');
    expect(result.error).toBeUndefined();
  });

  it('extracts JSON when response contains extra text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Here is my analysis: {"score": 40, "reasoning": "Weak overlap"}' }],
      }),
    }));

    const result = await scoreMatchSemantic('deploy app', 'build-feature', 'Full pipeline');
    expect(result.score).toBeCloseTo(0.40, 2);
    expect(result.reasoning).toBe('Weak overlap');
  });

  it('returns error result when JSON parse fails completely', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'I cannot determine a score for this.' }],
      }),
    }));

    const result = await scoreMatchSemantic('something', 'skill', 'desc');
    expect(result.score).toBe(0);
    expect(result.reasoning).toBe('parse-error');
    expect(result.error).toBe(true);
  });

  it('returns error result when API call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    }));

    const result = await scoreMatchSemantic('test', 'skill', 'desc');
    expect(result.score).toBe(0);
    expect(result.reasoning).toContain('API error');
    expect(result.error).toBe(true);
  });

  it('returns error result when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await scoreMatchSemantic('test', 'skill', 'desc');
    expect(result.score).toBe(0);
    expect(result.reasoning).toContain('Network failure');
    expect(result.error).toBe(true);
  });

  it('uses GUILD_SEMANTIC_MODEL env var when set', async () => {
    process.env.GUILD_SEMANTIC_MODEL = 'claude-haiku-custom';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: '{"score": 50, "reasoning": "ok"}' }],
      }),
    }));

    await scoreMatchSemantic('test', 'skill', 'desc');

    const fetchCall = fetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.model).toBe('claude-haiku-custom');

    delete process.env.GUILD_SEMANTIC_MODEL;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/semantic-matcher.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement semantic-matcher.js**

Create `src/utils/semantic-matcher.js`:

```javascript
/**
 * semantic-matcher.js — LLM-based trigger scoring via Anthropic Haiku.
 *
 * Calls the Anthropic Messages API to score how well a user prompt
 * matches a skill. Optional complement to the keyword matcher.
 */

export const SEMANTIC_MODEL_DEFAULT = 'claude-haiku-4-5-20251001';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are a skill-routing classifier. Given a user prompt and a skill name + description, score how likely the user wants to trigger this skill.

Respond with ONLY a JSON object, no other text:
{"score": <0-100>, "reasoning": "<one sentence>"}

Score guide:
- 90-100: Clear, direct match
- 60-89: Likely match, related intent
- 30-59: Possible but ambiguous
- 0-29: Unrelated`;

/**
 * Scores a prompt against a skill using the Anthropic Messages API.
 * @param {string} prompt - User prompt to classify
 * @param {string} skillName - Skill identifier
 * @param {string} skillDescription - Skill description text
 * @returns {Promise<{ score: number, reasoning: string, error?: boolean }>}
 */
export async function scoreMatchSemantic(prompt, skillName, skillDescription) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.GUILD_SEMANTIC_MODEL || SEMANTIC_MODEL_DEFAULT;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 100,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `User prompt: "${prompt}"\nSkill: ${skillName}\nDescription: ${skillDescription}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return { score: 0, reasoning: `API error: ${response.status} ${response.statusText}`, error: true };
    }

    const data = await response.json();
    const text = data.content[0].text;

    return parseResponse(text);
  } catch (err) {
    return { score: 0, reasoning: err.message, error: true };
  }
}

/**
 * Parses the LLM response, extracting JSON with fallback.
 * @param {string} text
 * @returns {{ score: number, reasoning: string, error?: boolean }}
 */
function parseResponse(text) {
  // Try direct parse first
  try {
    const parsed = JSON.parse(text);
    return { score: parsed.score / 100, reasoning: parsed.reasoning };
  } catch {
    // Fallback: extract first JSON object from text
    const match = text.match(/\{[^}]+\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return { score: parsed.score / 100, reasoning: parsed.reasoning };
      } catch {
        // Fall through
      }
    }
    return { score: 0, reasoning: 'parse-error', error: true };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/semantic-matcher.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/semantic-matcher.js src/utils/__tests__/semantic-matcher.test.js
git commit -m "feat(eval): add semantic matcher — Haiku-based trigger scoring"
```

---

### Task 3: Integrate Semantic Matcher into Trigger Runner

**Files:**
- Modify: `src/utils/trigger-runner.js:57` (`runTriggerTests` signature and logic)
- Modify: `src/utils/__tests__/trigger-runner.test.js` (add semantic option tests)

- [ ] **Step 1: Write the failing tests**

Add to `src/utils/__tests__/trigger-runner.test.js`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { loadTriggers, runTriggerTests, computeAccuracy } from '../trigger-runner.js';

// ... existing tests stay unchanged ...

describe('runTriggerTests with semantic option', () => {
  it('uses semantic matcher when semantic option is true', async () => {
    const mockSemantic = vi.fn().mockResolvedValue({ score: 0.9, reasoning: 'Strong match' });

    const triggers = {
      skill: 'test-skill',
      matcherType: 'keyword',
      description: 'Create a pull request',
      threshold: 0.3,
      tests: [
        { prompt: 'submit this for review', shouldTrigger: true, keywordExpected: false },
      ],
    };

    const allSkills = [
      { name: 'test-skill', description: 'Create a pull request' },
      { name: 'other-skill', description: 'Save session state' },
    ];

    const results = await runTriggerTests(triggers, allSkills, {
      semantic: true,
      scoreMatchSemantic: mockSemantic,
    });

    expect(mockSemantic).toHaveBeenCalledWith('submit this for review', 'test-skill', 'Create a pull request');
    expect(results[0].matcherUsed).toBe('semantic');
    expect(results[0].reasoning).toBe('Strong match');
    expect(results[0].expected).toBe(true); // uses shouldTrigger, not keywordExpected
  });

  it('defaults to keyword matcher when semantic option is false', async () => {
    const triggers = {
      skill: 'test-skill',
      matcherType: 'keyword',
      description: 'Create a pull request from the current branch',
      threshold: 0.3,
      tests: [
        { prompt: 'create a pull request', shouldTrigger: true },
      ],
    };

    const allSkills = [
      { name: 'test-skill', description: 'Create a pull request from the current branch' },
      { name: 'other-skill', description: 'Saves current state to SESSION.md' },
    ];

    const results = await runTriggerTests(triggers, allSkills, { semantic: false });
    expect(results[0].matcherUsed).toBe('keyword');
    expect(results[0].reasoning).toBeUndefined();
  });

  it('ignores keywordExpected in semantic mode', async () => {
    const mockSemantic = vi.fn().mockResolvedValue({ score: 0.1, reasoning: 'No match' });

    const triggers = {
      skill: 'test-skill',
      matcherType: 'keyword',
      description: 'Create a pull request',
      threshold: 0.3,
      tests: [
        { prompt: 'something unrelated', shouldTrigger: true, keywordExpected: false },
      ],
    };

    const allSkills = [
      { name: 'test-skill', description: 'Create a pull request' },
    ];

    const results = await runTriggerTests(triggers, allSkills, {
      semantic: true,
      scoreMatchSemantic: mockSemantic,
    });

    // In semantic mode, expected comes from shouldTrigger (true), not keywordExpected (false)
    expect(results[0].expected).toBe(true);
    expect(results[0]).not.toHaveProperty('semanticExpected');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/trigger-runner.test.js`
Expected: FAIL — `runTriggerTests` doesn't accept options / no `matcherUsed` property

- [ ] **Step 3: Update runTriggerTests to support semantic option**

Replace the `runTriggerTests` function in `src/utils/trigger-runner.js` (lines 57-88):

```javascript
/**
 * Runs trigger tests for a skill.
 *
 * When matcherType is "keyword" and a test has keywordExpected defined,
 * that value overrides shouldTrigger for accuracy calculation. This lets
 * tests document the ideal (semantic) expectation while being honest
 * about what keyword matching can achieve.
 *
 * @param {object} triggers - Trigger test config from triggers.json
 * @param {Array} allSkills - All skill descriptions
 * @param {object} [options] - Options
 * @param {boolean} [options.semantic=false] - Use semantic matcher
 * @param {Function} [options.scoreMatchSemantic] - Semantic scoring function (injected for testability)
 */
export async function runTriggerTests(triggers, allSkills, options = {}) {
  const { semantic = false, scoreMatchSemantic: semanticFn } = options;
  const threshold = triggers.threshold || 0.3;
  const isKeyword = !semantic && triggers.matcherType === 'keyword';
  const results = [];

  for (const test of triggers.tests) {
    let actual, score, rank, reasoning;

    if (semantic && semanticFn) {
      const targetSkill = allSkills.find(s => s.name === triggers.skill);
      const semanticResult = await semanticFn(test.prompt, triggers.skill, targetSkill?.description || triggers.description);
      score = semanticResult.score;
      actual = score >= threshold;
      rank = null;
      reasoning = semanticResult.reasoning;
    } else {
      const ranked = rankSkills(test.prompt, allSkills);
      const targetRank = ranked.findIndex(s => s.name === triggers.skill);
      score = targetRank >= 0 ? ranked[targetRank].score : 0;
      actual = targetRank === 0 && score >= threshold;
      rank = targetRank + 1;
    }

    const hasOverride = isKeyword && test.keywordExpected !== undefined;
    const expected = hasOverride ? test.keywordExpected : test.shouldTrigger;

    const result = {
      prompt: test.prompt,
      expected,
      actual,
      score,
      rank,
      matcherUsed: semantic ? 'semantic' : 'keyword',
    };

    if (reasoning) {
      result.reasoning = reasoning;
    }

    if (hasOverride) {
      result.semanticExpected = test.shouldTrigger;
    }

    results.push(result);
  }

  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/trigger-runner.test.js`
Expected: All PASS

Note: existing tests that call `runTriggerTests(triggers, allSkills)` without options will still work because the function is now async and options default to `{}`. However, existing callers that don't `await` the result need updating. Check the existing tests — they don't await since the original was synchronous. We need to make sure the existing tests still pass. The existing tests in `trigger-runner.test.js` don't await `runTriggerTests` — add `await`:

In the existing test "returns results with expected and actual fields" (line 62 of test file), change:

```javascript
    const results = runTriggerTests(triggers, allSkills);
```
to:
```javascript
    const results = await runTriggerTests(triggers, allSkills);
```

And in "uses keywordExpected when present" (line 88 of test file), change:

```javascript
    const results = runTriggerTests(triggers, allSkills);
```
to:
```javascript
    const results = await runTriggerTests(triggers, allSkills);
```

- [ ] **Step 5: Run full test suite to check for breakage**

Run: `npx vitest run`
Expected: All PASS. The async change is backward compatible — `await` on a non-promise is a no-op, but callers that use the return value synchronously will get a Promise. Check `eval.js` callers in next task.

- [ ] **Step 6: Commit**

```bash
git add src/utils/trigger-runner.js src/utils/__tests__/trigger-runner.test.js
git commit -m "feat(eval): integrate semantic matcher option into trigger runner"
```

---

### Task 4: Benchmark Module — Core

**Files:**
- Create: `src/utils/benchmark.js`
- Create: `src/utils/__tests__/benchmark.test.js`
- Create: `benchmarks/.gitkeep`

- [ ] **Step 1: Create benchmarks directory**

```bash
mkdir -p benchmarks
touch benchmarks/.gitkeep
```

- [ ] **Step 2: Write the failing tests**

Create `src/utils/__tests__/benchmark.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { recordBenchmark, generateReport, detectRegressions } from '../benchmark.js';

const TEST_DIR = join(import.meta.dirname, '__benchmark_test__');
const TEST_JSON = join(TEST_DIR, 'benchmark.json');
const TEST_MD = join(TEST_DIR, 'benchmark.md');

function makeEntry(overrides = {}) {
  return {
    timestamp: '2026-03-31T12:00:00.000Z',
    matcher: 'keyword',
    model: null,
    skills: [
      { name: 'build-feature', accuracy: 1.0, precision: 1.0, recall: 1.0, tp: 4, fp: 0, fn: 0, tn: 4 },
      { name: 'council', accuracy: 0.875, precision: 0.8, recall: 1.0, tp: 4, fp: 1, fn: 0, tn: 3 },
    ],
    aggregate: { accuracy: 0.9375, precision: 0.9, recall: 1.0, total: 16 },
    ...overrides,
  };
}

describe('benchmark', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('recordBenchmark', () => {
    it('creates benchmark.json if it does not exist', () => {
      const entry = makeEntry();
      recordBenchmark(entry, TEST_JSON);
      expect(existsSync(TEST_JSON)).toBe(true);
      const data = JSON.parse(readFileSync(TEST_JSON, 'utf8'));
      expect(data).toHaveLength(1);
      expect(data[0].timestamp).toBe('2026-03-31T12:00:00.000Z');
    });

    it('appends to existing benchmark.json', () => {
      const entry1 = makeEntry({ timestamp: '2026-03-30T12:00:00.000Z' });
      const entry2 = makeEntry({ timestamp: '2026-03-31T12:00:00.000Z' });
      recordBenchmark(entry1, TEST_JSON);
      recordBenchmark(entry2, TEST_JSON);
      const data = JSON.parse(readFileSync(TEST_JSON, 'utf8'));
      expect(data).toHaveLength(2);
    });

    it('rotates entries beyond 30', () => {
      // Seed with 30 entries
      const seed = Array.from({ length: 30 }, (_, i) =>
        makeEntry({ timestamp: `2026-03-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` })
      );
      writeFileSync(TEST_JSON, JSON.stringify(seed));

      // Add 31st
      recordBenchmark(makeEntry({ timestamp: '2026-04-01T00:00:00.000Z' }), TEST_JSON);
      const data = JSON.parse(readFileSync(TEST_JSON, 'utf8'));
      expect(data).toHaveLength(30);
      // Oldest should be removed (March 1)
      expect(data[0].timestamp).toBe('2026-03-02T00:00:00.000Z');
      expect(data[29].timestamp).toBe('2026-04-01T00:00:00.000Z');
    });
  });

  describe('generateReport', () => {
    it('generates markdown with skill table', () => {
      const current = makeEntry();
      const md = generateReport(current, null);
      expect(md).toContain('build-feature');
      expect(md).toContain('council');
      expect(md).toContain('100.0%');
      expect(md).toContain('87.5%');
    });

    it('includes delta when previous entry is provided', () => {
      const previous = makeEntry({
        skills: [
          { name: 'build-feature', accuracy: 1.0, precision: 1.0, recall: 1.0, tp: 4, fp: 0, fn: 0, tn: 4 },
          { name: 'council', accuracy: 0.75, precision: 0.67, recall: 1.0, tp: 4, fp: 2, fn: 0, tn: 2 },
        ],
        aggregate: { accuracy: 0.875, precision: 0.8, recall: 1.0, total: 16 },
      });
      const current = makeEntry();
      const md = generateReport(current, previous);
      expect(md).toContain('+12.5%');
    });
  });

  describe('detectRegressions', () => {
    it('detects regression when accuracy drops >5% and 2+ tests flipped', () => {
      const previous = makeEntry({
        skills: [
          { name: 'council', accuracy: 1.0, precision: 1.0, recall: 1.0, tp: 4, fp: 0, fn: 0, tn: 4 },
        ],
      });
      const current = makeEntry({
        skills: [
          { name: 'council', accuracy: 0.75, precision: 0.67, recall: 1.0, tp: 4, fp: 2, fn: 0, tn: 2 },
        ],
      });
      const regressions = detectRegressions(current, previous);
      expect(regressions).toHaveLength(1);
      expect(regressions[0].skill).toBe('council');
      expect(regressions[0].flippedTests).toBe(2);
    });

    it('ignores small drops from single test flips', () => {
      const previous = makeEntry({
        skills: [
          { name: 'council', accuracy: 1.0, precision: 1.0, recall: 1.0, tp: 4, fp: 0, fn: 0, tn: 4 },
        ],
      });
      const current = makeEntry({
        skills: [
          // One test flipped: accuracy dropped 12.5% but only 1 test changed
          { name: 'council', accuracy: 0.875, precision: 0.8, recall: 1.0, tp: 4, fp: 1, fn: 0, tn: 3 },
        ],
      });
      const regressions = detectRegressions(current, previous);
      expect(regressions).toHaveLength(0);
    });

    it('returns empty array when no previous entry', () => {
      const current = makeEntry();
      const regressions = detectRegressions(current, null);
      expect(regressions).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/benchmark.test.js`
Expected: FAIL — module not found

- [ ] **Step 4: Implement benchmark.js**

Create `src/utils/benchmark.js`:

```javascript
/**
 * benchmark.js — Records, reports, and detects regressions in eval benchmarks.
 *
 * Persists results to benchmarks/benchmark.json with 30-entry rotation.
 * Generates benchmarks/benchmark.md as a human-readable report.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const MAX_ENTRIES = 30;

/**
 * Appends a benchmark entry to the JSON file, rotating old entries.
 * @param {object} entry - Benchmark entry with timestamp, matcher, skills, aggregate
 * @param {string} filePath - Path to benchmark.json
 */
export function recordBenchmark(entry, filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let entries = [];
  if (existsSync(filePath)) {
    entries = JSON.parse(readFileSync(filePath, 'utf8'));
  }

  entries.push(entry);

  // Rotate: keep only the last MAX_ENTRIES
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(entries.length - MAX_ENTRIES);
  }

  writeFileSync(filePath, JSON.stringify(entries, null, 2));
}

/**
 * Generates a markdown report from a benchmark entry.
 * @param {object} current - Current benchmark entry
 * @param {object|null} previous - Previous entry for delta comparison
 * @returns {string} Markdown report
 */
export function generateReport(current, previous) {
  const lines = [];
  const date = current.timestamp;
  const matcher = current.matcher;
  const model = current.model ? ` (${current.model})` : '';

  lines.push(`# Eval Benchmark — ${date}`);
  lines.push(`Matcher: ${matcher}${model} | Skills: ${current.skills.length} | Total tests: ${current.aggregate.total}`);
  lines.push('');
  lines.push('| Skill | Accuracy | Precision | Recall | Delta |');
  lines.push('|-------|----------|-----------|--------|-------|');

  for (const skill of current.skills) {
    let delta = '—';
    if (previous) {
      const prev = previous.skills.find(s => s.name === skill.name);
      if (prev) {
        const diff = (skill.accuracy - prev.accuracy) * 100;
        if (Math.abs(diff) >= 0.1) {
          const sign = diff > 0 ? '+' : '';
          const warn = diff < -5 ? ' !!' : '';
          delta = `${sign}${diff.toFixed(1)}%${warn}`;
        }
      }
    }

    lines.push(`| ${skill.name} | ${(skill.accuracy * 100).toFixed(1)}% | ${(skill.precision * 100).toFixed(1)}% | ${(skill.recall * 100).toFixed(1)}% | ${delta} |`);
  }

  lines.push('');
  lines.push('## Aggregate');

  let aggDelta = '';
  if (previous) {
    const diff = (current.aggregate.accuracy - previous.aggregate.accuracy) * 100;
    if (Math.abs(diff) >= 0.1) {
      const sign = diff > 0 ? '+' : '';
      aggDelta = ` (Delta ${sign}${diff.toFixed(1)}%)`;
    }
  }

  lines.push(`Accuracy: ${(current.aggregate.accuracy * 100).toFixed(1)}%${aggDelta}`);
  lines.push(`Precision: ${(current.aggregate.precision * 100).toFixed(1)}%`);
  lines.push(`Recall: ${(current.aggregate.recall * 100).toFixed(1)}%`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Detects regressions between two benchmark entries.
 * A regression is: accuracy dropped >5% AND at least 2 tests flipped.
 * @param {object} current
 * @param {object|null} previous
 * @returns {Array<{ skill: string, currentAccuracy: number, previousAccuracy: number, delta: number, flippedTests: number }>}
 */
export function detectRegressions(current, previous) {
  if (!previous) return [];

  const regressions = [];

  for (const skill of current.skills) {
    const prev = previous.skills.find(s => s.name === skill.name);
    if (!prev) continue;

    const delta = skill.accuracy - prev.accuracy;
    if (delta >= -0.05) continue; // Not enough drop

    // Count flipped tests: absolute change in (tp+tn) vs previous
    const currentCorrect = skill.tp + skill.tn;
    const prevCorrect = prev.tp + prev.tn;
    const flippedTests = Math.abs(currentCorrect - prevCorrect);

    if (flippedTests < 2) continue; // Single flip noise

    regressions.push({
      skill: skill.name,
      currentAccuracy: skill.accuracy,
      previousAccuracy: prev.accuracy,
      delta,
      flippedTests,
    });
  }

  return regressions;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/benchmark.test.js`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/benchmark.js src/utils/__tests__/benchmark.test.js benchmarks/.gitkeep
git commit -m "feat(eval): add benchmark module — recording, reporting, regression detection"
```

---

### Task 5: Description Analyzer Module

**Files:**
- Create: `src/utils/description-analyzer.js`
- Create: `src/utils/__tests__/description-analyzer.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/__tests__/description-analyzer.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { analyzeGaps, generateSuggestions } from '../description-analyzer.js';

describe('analyzeGaps', () => {
  it('identifies missing keywords from failed triggers', () => {
    const triggerResults = [
      { prompt: 'implement this feature end to end', expected: true, actual: false, score: 0.1 },
      { prompt: 'build the full implementation pipeline', expected: true, actual: true, score: 0.8 },
      { prompt: 'review my code', expected: false, actual: false, score: 0.0 },
    ];
    const description = 'Full pipeline: evaluation -> spec -> implementation -> review -> QA';

    const gaps = analyzeGaps(triggerResults, description);
    expect(gaps.failedPrompts).toHaveLength(1);
    expect(gaps.failedPrompts[0]).toBe('implement this feature end to end');
    // "end" is a keyword in the prompt that's not in the description
    expect(gaps.missingKeywords).toContain('end');
  });

  it('returns empty arrays when no failed triggers', () => {
    const triggerResults = [
      { prompt: 'build a feature', expected: true, actual: true, score: 0.8 },
      { prompt: 'review code', expected: false, actual: false, score: 0.0 },
    ];
    const description = 'Build a new feature';

    const gaps = analyzeGaps(triggerResults, description);
    expect(gaps.missingKeywords).toHaveLength(0);
    expect(gaps.failedPrompts).toHaveLength(0);
  });

  it('ignores stopwords in missing keywords', () => {
    const triggerResults = [
      { prompt: 'I want to use this for my project', expected: true, actual: false, score: 0.0 },
    ];
    const description = 'Project scaffolding tool';

    const gaps = analyzeGaps(triggerResults, description);
    // "want" should be missing but stopwords like "the", "for", "my" should not appear
    expect(gaps.missingKeywords).not.toContain('for');
    expect(gaps.missingKeywords).not.toContain('my');
  });
});

describe('generateSuggestions', () => {
  it('ranks keywords by frequency across failed prompts', () => {
    const gapsList = [
      {
        skill: 'build-feature',
        currentDescription: 'Full pipeline: evaluation -> spec -> implementation -> review -> QA',
        missingKeywords: ['end', 'ship', 'end'],
        failedPrompts: ['implement end to end', 'ship this end to end'],
      },
    ];

    const suggestions = generateSuggestions(gapsList);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].skill).toBe('build-feature');

    const endKeyword = suggestions[0].suggestedKeywords.find(k => k.word === 'end');
    expect(endKeyword.confidence).toBe('high'); // appears in 2+ prompts
  });

  it('marks single-occurrence keywords as medium confidence', () => {
    const gapsList = [
      {
        skill: 'council',
        currentDescription: 'Debate decisions with multiple agents',
        missingKeywords: ['choose'],
        failedPrompts: ['help me choose between options'],
      },
    ];

    const suggestions = generateSuggestions(gapsList);
    expect(suggestions[0].suggestedKeywords[0].confidence).toBe('medium');
  });

  it('returns empty for skills with no gaps', () => {
    const gapsList = [
      {
        skill: 'build-feature',
        currentDescription: 'desc',
        missingKeywords: [],
        failedPrompts: [],
      },
    ];

    const suggestions = generateSuggestions(gapsList);
    expect(suggestions).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/description-analyzer.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement description-analyzer.js**

Create `src/utils/description-analyzer.js`:

```javascript
/**
 * description-analyzer.js — Analyzes keyword gaps in skill descriptions.
 *
 * Uses token analysis to identify which keywords are missing from
 * skill descriptions based on failed trigger tests. No LLM required.
 */

import { tokenize } from './trigger-matcher.js';

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'in', 'on', 'to', 'of', 'for', 'and', 'or', 'an',
  'it', 'by', 'as', 'be', 'do', 'if', 'no', 'so', 'up', 'we', 'my',
  'use', 'when', 'with', 'from', 'this', 'that', 'will', 'can', 'has',
  'not', 'are', 'was', 'but', 'all', 'any', 'its', 'you', 'your',
  'want', 'need', 'just', 'let', 'get', 'make', 'help', 'me',
]);

/**
 * Checks if a token matches any description token (full or substring).
 */
function tokenMatchesDescription(token, descTokens) {
  for (const dt of descTokens) {
    if (dt === token || dt.includes(token) || token.includes(dt)) {
      return true;
    }
  }
  return false;
}

/**
 * Analyzes gaps between failed trigger prompts and a skill description.
 * @param {Array} triggerResults - Results from runTriggerTests
 * @param {string} description - Skill description
 * @returns {{ missingKeywords: string[], failedPrompts: string[] }}
 */
export function analyzeGaps(triggerResults, description) {
  const failedPositives = triggerResults.filter(r => r.expected && !r.actual);

  if (failedPositives.length === 0) {
    return { missingKeywords: [], failedPrompts: [] };
  }

  const descTokens = tokenize(description).filter(w => !STOP_WORDS.has(w));
  const missingKeywords = [];
  const failedPrompts = [];

  for (const result of failedPositives) {
    failedPrompts.push(result.prompt);
    const promptTokens = tokenize(result.prompt).filter(w => !STOP_WORDS.has(w));

    for (const token of promptTokens) {
      if (!tokenMatchesDescription(token, descTokens)) {
        missingKeywords.push(token);
      }
    }
  }

  return { missingKeywords, failedPrompts };
}

/**
 * Generates keyword suggestions from gap analysis results.
 * @param {Array<{ skill: string, currentDescription: string, missingKeywords: string[], failedPrompts: string[] }>} gapsList
 * @returns {Array<{ skill: string, currentDescription: string, suggestedKeywords: Array<{ word: string, confidence: string }> }>}
 */
export function generateSuggestions(gapsList) {
  const suggestions = [];

  for (const gaps of gapsList) {
    if (gaps.missingKeywords.length === 0) continue;

    // Count frequency of each missing keyword
    const freq = new Map();
    for (const word of gaps.missingKeywords) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }

    // Deduplicate and rank by frequency
    const suggestedKeywords = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([word, count]) => ({
        word,
        confidence: count >= 2 ? 'high' : 'medium',
      }));

    suggestions.push({
      skill: gaps.skill,
      currentDescription: gaps.currentDescription,
      suggestedKeywords,
    });
  }

  return suggestions;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/description-analyzer.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/description-analyzer.js src/utils/__tests__/description-analyzer.test.js
git commit -m "feat(eval): add description analyzer — keyword gap detection and suggestions"
```

---

### Task 6: Integrate Everything into eval.js CLI

**Files:**
- Modify: `src/commands/eval.js` (add `--semantic`, `--suggest` flags, benchmark recording)
- Modify: `bin/guild.js:172-191` (add new CLI options)
- Modify: `src/commands/__tests__/eval.test.js` (update tests)

- [ ] **Step 1: Update bin/guild.js to add new flags**

In `bin/guild.js`, replace the `guild eval` command block (lines 172-191):

```javascript
// guild eval
program
  .command('eval')
  .description('Run skill structural evaluations')
  .argument('[skill]', 'Skill name to evaluate (or all if omitted)')
  .option('--triggers', 'Run trigger tests instead of structural evals')
  .option('--semantic', 'Use LLM-based semantic matcher for trigger tests')
  .option('--suggest', 'Show description improvement suggestions')
  .action(async (skill, options) => {
    try {
      if (options.triggers || options.semantic || options.suggest) {
        const { runEvalTriggers } = await import('../src/commands/eval.js');
        await runEvalTriggers(skill, {
          semantic: options.semantic || false,
          suggest: options.suggest || false,
        });
      } else {
        const { runEval } = await import('../src/commands/eval.js');
        await runEval(skill);
      }
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });
```

- [ ] **Step 2: Rewrite eval.js runEvalTriggers**

Replace `runEvalTriggers` in `src/commands/eval.js` (lines 68-111):

```javascript
/**
 * Runs trigger evaluations with optional semantic matcher, benchmarks, and suggestions.
 * @param {string} [skillName] - Specific skill or all
 * @param {object} [options] - CLI options
 * @param {boolean} [options.semantic=false] - Use semantic matcher
 * @param {boolean} [options.suggest=false] - Show description suggestions
 */
export async function runEvalTriggers(skillName, options = {}) {
  const { semantic = false, suggest = false } = options;
  const allSkills = loadAllSkillDescriptions();

  // Warn if semantic mode but no API key
  if (semantic && !process.env.ANTHROPIC_API_KEY) {
    p.log.warn(chalk.yellow('ANTHROPIC_API_KEY not set — semantic matcher requires it'));
    process.exit(1);
  }

  // Lazy-load semantic matcher only when needed
  let scoreMatchSemantic;
  if (semantic) {
    const mod = await import('../utils/semantic-matcher.js');
    scoreMatchSemantic = mod.scoreMatchSemantic;
  }

  const skills = skillName
    ? [skillName]
    : readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(name => loadTriggers(name) !== null);

  const matcherLabel = semantic ? 'semantic' : 'keyword';
  p.intro(chalk.bold.cyan(`Guild Trigger Tests [${matcherLabel}] — ${skillName || 'all skills'}`));

  let totalSkills = 0;
  let totalTests = 0;
  let totalCorrect = 0;
  const allResults = [];
  const benchmarkSkills = [];

  for (const skill of skills) {
    const triggers = loadTriggers(skill);
    if (!triggers) {
      p.log.warn(`${skill}: no triggers.json`);
      continue;
    }

    const results = await runTriggerTests(triggers, allSkills, {
      semantic,
      scoreMatchSemantic,
    });
    const acc = computeAccuracy(results);
    totalSkills++;
    totalTests += acc.total;
    totalCorrect += acc.tp + acc.tn;

    const icon = acc.accuracy === 1 ? chalk.green('✓') : acc.accuracy >= 0.75 ? chalk.yellow('~') : chalk.red('✗');
    p.log.info(`${icon} ${chalk.bold(skill)}  accuracy=${(acc.accuracy * 100).toFixed(0)}%  precision=${(acc.precision * 100).toFixed(0)}%  recall=${(acc.recall * 100).toFixed(0)}%`);

    // Show failures
    for (const r of results) {
      if (r.expected !== r.actual) {
        const label = r.expected ? chalk.red('MISS') : chalk.yellow('FALSE+');
        let detail = `(score=${r.score.toFixed(2)}`;
        if (r.rank !== null) detail += `, rank=#${r.rank}`;
        if (r.reasoning) detail += `, reason: ${r.reasoning}`;
        detail += ')';
        p.log.info(chalk.gray(`    ${label} "${r.prompt}" ${detail}`));
      }
    }

    allResults.push({ skill, results, triggers });
    benchmarkSkills.push({
      name: skill,
      accuracy: acc.accuracy,
      precision: acc.precision,
      recall: acc.recall,
      tp: acc.tp,
      fp: acc.fp,
      fn: acc.fn,
      tn: acc.tn,
    });
  }

  const overallAcc = totalTests > 0 ? ((totalCorrect / totalTests) * 100).toFixed(0) : 0;

  // Record benchmark
  const { recordBenchmark, generateReport, detectRegressions } = await import('../utils/benchmark.js');
  const benchmarkPath = join(dirname(SKILLS_DIR), '..', 'benchmarks', 'benchmark.json');
  const reportPath = join(dirname(SKILLS_DIR), '..', 'benchmarks', 'benchmark.md');

  const entry = {
    timestamp: new Date().toISOString(),
    matcher: matcherLabel,
    model: semantic ? (process.env.GUILD_SEMANTIC_MODEL || 'claude-haiku-4-5-20251001') : null,
    skills: benchmarkSkills,
    aggregate: {
      accuracy: totalTests > 0 ? totalCorrect / totalTests : 0,
      precision: benchmarkSkills.reduce((s, sk) => s + sk.precision, 0) / (benchmarkSkills.length || 1),
      recall: benchmarkSkills.reduce((s, sk) => s + sk.recall, 0) / (benchmarkSkills.length || 1),
      total: totalTests,
    },
  };

  recordBenchmark(entry, benchmarkPath);

  // Load previous entry for comparison
  const { readFileSync: readFile, existsSync: fileExists, writeFileSync: writeFile } = await import('fs');
  const entries = JSON.parse(readFile(benchmarkPath, 'utf8'));
  const previous = entries.length >= 2 ? entries[entries.length - 2] : null;

  const report = generateReport(entry, previous);
  writeFile(reportPath, report);
  p.log.info(chalk.gray(`Benchmark recorded → ${benchmarkPath}`));

  // Check for regressions
  const regressions = detectRegressions(entry, previous);
  if (regressions.length > 0) {
    p.log.warn(chalk.yellow.bold('Regressions detected:'));
    for (const reg of regressions) {
      p.log.warn(chalk.yellow(`  ${reg.skill}: ${(reg.previousAccuracy * 100).toFixed(0)}% → ${(reg.currentAccuracy * 100).toFixed(0)}% (${reg.flippedTests} tests flipped)`));
    }
  }

  // Description suggestions
  if (suggest) {
    const { analyzeGaps, generateSuggestions } = await import('../utils/description-analyzer.js');

    const gapsList = [];
    for (const { skill, results, triggers } of allResults) {
      const skillDesc = allSkills.find(s => s.name === skill);
      const gaps = analyzeGaps(results, skillDesc?.description || triggers.description);
      if (gaps.missingKeywords.length > 0) {
        gapsList.push({
          skill,
          currentDescription: skillDesc?.description || triggers.description,
          ...gaps,
        });
      }
    }

    const suggestions = generateSuggestions(gapsList);
    if (suggestions.length > 0) {
      p.log.info('');
      p.log.info(chalk.bold.cyan('Description Suggestions:'));
      for (const sug of suggestions) {
        const highWords = sug.suggestedKeywords.filter(k => k.confidence === 'high').map(k => k.word);
        const medWords = sug.suggestedKeywords.filter(k => k.confidence === 'medium').map(k => k.word);
        const parts = [];
        if (highWords.length > 0) parts.push(`${highWords.join(', ')} (high)`);
        if (medWords.length > 0) parts.push(`${medWords.join(', ')} (medium)`);
        p.log.warn(`  ${chalk.bold(sug.skill)} — ${sug.suggestedKeywords.length} missing keywords`);
        p.log.info(chalk.gray(`    Missing: ${parts.join(', ')}`));
        p.log.info(chalk.gray(`    Current: "${sug.currentDescription}"`));
      }
    } else {
      p.log.success('No description gaps found');
    }
  }

  p.outro(`${totalSkills} skills, ${totalTests} tests, ${overallAcc}% overall accuracy`);
}
```

Also add the missing import at the top of `src/commands/eval.js` — `dirname` is needed:

```javascript
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
```

The existing import already has `join` and `dirname` from `'path'` — check and add if missing.

- [ ] **Step 3: Update eval.test.js**

Replace `src/commands/__tests__/eval.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { runEval, runEvalTriggers } from '../eval.js';

describe('runEval', () => {
  it('runs evals for a specific skill', async () => {
    await expect(runEval('build-feature')).resolves.toBeUndefined();
  });

  it('runs all skill evals', async () => {
    await expect(runEval()).resolves.toBeUndefined();
  });
});

describe('runEvalTriggers', () => {
  it('runs trigger tests for all skills with triggers', async () => {
    await expect(runEvalTriggers()).resolves.toBeUndefined();
  });

  it('runs trigger tests for a specific skill', async () => {
    await expect(runEvalTriggers('create-pr')).resolves.toBeUndefined();
  });

  it('accepts options parameter', async () => {
    await expect(runEvalTriggers(undefined, { semantic: false, suggest: false })).resolves.toBeUndefined();
  });

  it('runs with suggest option', async () => {
    await expect(runEvalTriggers(undefined, { suggest: true })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 5: Manual smoke test**

Run: `node bin/guild.js eval --triggers`
Expected: Same output as before + "Benchmark recorded" message

Run: `node bin/guild.js eval --triggers --suggest`
Expected: Triggers output + description suggestions section

Run: `cat benchmarks/benchmark.json | head -20`
Expected: JSON array with one entry

Run: `cat benchmarks/benchmark.md`
Expected: Markdown table with skill results

- [ ] **Step 6: Commit**

```bash
git add src/commands/eval.js bin/guild.js src/commands/__tests__/eval.test.js
git commit -m "feat(eval): integrate semantic matcher, benchmarks, and suggestions into CLI"
```

---

### Task 7: Add benchmarks to .gitignore and finalize

**Files:**
- Modify: `.gitignore` (add `benchmarks/benchmark.json` — keep `.gitkeep` and `benchmark.md`)

- [ ] **Step 1: Decide on git tracking**

`benchmark.json` is a rolling data file that changes every run — it should be gitignored.
`benchmark.md` is a generated report — useful to commit for visibility but optional.

Add to `.gitignore`:

```
benchmarks/benchmark.json
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Run full test suite with coverage**

Run: `npm run test:coverage`
Expected: All PASS, coverage includes new files

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore benchmark.json rolling data"
```

---

### Task 8: End-to-end verification

- [ ] **Step 1: Run keyword triggers (existing behavior preserved)**

Run: `node bin/guild.js eval --triggers`
Expected: Same accuracy numbers as before, plus benchmark recording message

- [ ] **Step 2: Run with suggestions**

Run: `node bin/guild.js eval --triggers --suggest`
Expected: Suggestions section appears for skills with `keywordExpected: false` failures

- [ ] **Step 3: Verify benchmark files**

Run: `cat benchmarks/benchmark.json | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const a=JSON.parse(d);console.log('Entries:',a.length);console.log('Latest:',a[a.length-1].timestamp)"`
Expected: Shows entry count and latest timestamp

Run: `cat benchmarks/benchmark.md`
Expected: Formatted markdown report

- [ ] **Step 4: Run eval --triggers again to test delta reporting**

Run: `node bin/guild.js eval --triggers`
Expected: "Benchmark recorded" + delta column in benchmark.md shows comparisons

- [ ] **Step 5: Final commit if any fixes needed**

If fixes were applied during verification:
```bash
git add -A
git commit -m "fix(eval): adjustments from e2e verification"
```
