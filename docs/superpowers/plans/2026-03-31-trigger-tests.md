# Skill Trigger Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a trigger test framework that verifies skill descriptions correctly activate for relevant prompts and stay silent for irrelevant ones, measuring precision and recall per skill.

**Architecture:** Each skill gets a `triggers.json` file alongside its `evals.json` with `matcherType: "keyword"` (extensible to `"semantic"` later). A `trigger-matcher.js` module scores prompts against all skill descriptions using keyword/phrase matching. `guild eval --triggers` runs trigger tests and reports accuracy. No Claude invocation — purely programmatic matching to validate description quality. Tests that can't pass with keyword matching are marked `keywordExpected: false` to establish a baseline for future semantic matchers.

**Tech Stack:** Node.js ESModules, Vitest, existing eval-runner infrastructure

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/trigger-matcher.js` | Create | Score a prompt against skill descriptions, rank matches |
| `src/utils/__tests__/trigger-matcher.test.js` | Create | Tests for matching logic |
| `src/utils/trigger-runner.js` | Create | Load triggers.json, run trigger tests, compute accuracy |
| `src/utils/__tests__/trigger-runner.test.js` | Create | Tests for trigger runner |
| `src/templates/skills/*/evals/triggers.json` | Create (x5) | Trigger test definitions for 5 skills as proof of concept |
| `src/commands/eval.js` | Modify | Add `--triggers` flag support |
| `src/commands/__tests__/eval.test.js` | Modify | Test for --triggers flag |

---

### Task 1: Trigger Matcher

**Files:**
- Create: `src/utils/trigger-matcher.js`
- Create: `src/utils/__tests__/trigger-matcher.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// src/utils/__tests__/trigger-matcher.test.js
import { describe, it, expect } from 'vitest';
import { scoreMatch, rankSkills } from '../trigger-matcher.js';

describe('scoreMatch', () => {
  it('scores high when prompt keywords match description', () => {
    const score = scoreMatch(
      'create a pull request',
      'Create a pull request from the current branch with structured summary'
    );
    expect(score).toBeGreaterThan(0.5);
  });

  it('scores low when prompt is unrelated to description', () => {
    const score = scoreMatch(
      'deploy to production',
      'Saves current state to SESSION.md'
    );
    expect(score).toBeLessThan(0.2);
  });

  it('scores zero for empty prompt', () => {
    const score = scoreMatch('', 'Some description');
    expect(score).toBe(0);
  });

  it('is case insensitive', () => {
    const score1 = scoreMatch('Create PR', 'Create a pull request');
    const score2 = scoreMatch('create pr', 'Create a pull request');
    expect(score1).toBe(score2);
  });

  it('handles abbreviations and partial matches', () => {
    const score = scoreMatch(
      'TDD red green refactor',
      'Discipline skill — TDD red-green-refactor cycle. Use when implementing any feature or bugfix, before writing implementation code.'
    );
    expect(score).toBeGreaterThan(0.3);
  });
});

describe('rankSkills', () => {
  const skills = [
    { name: 'create-pr', description: 'Create a pull request from the current branch with structured summary' },
    { name: 'review', description: 'Standalone code review on the current diff' },
    { name: 'session-end', description: 'Saves current state to SESSION.md' },
  ];

  it('ranks matching skill first', () => {
    const ranked = rankSkills('create a pull request', skills);
    expect(ranked[0].name).toBe('create-pr');
  });

  it('ranks code review first for review prompt', () => {
    const ranked = rankSkills('review my code changes', skills);
    expect(ranked[0].name).toBe('review');
  });

  it('returns all skills with scores', () => {
    const ranked = rankSkills('anything', skills);
    expect(ranked).toHaveLength(3);
    for (const r of ranked) {
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('score');
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/trigger-matcher.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement trigger matcher**

```javascript
// src/utils/trigger-matcher.js
/**
 * trigger-matcher.js — Scores prompts against skill descriptions.
 *
 * Uses keyword overlap scoring to determine how well a user prompt
 * matches a skill's description. No LLM calls — purely programmatic.
 */

/**
 * Tokenizes text into lowercase words, stripping punctuation.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[—–\-\/]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

/**
 * Common words to ignore during matching.
 */
const STOP_WORDS = new Set([
  'the', 'is', 'at', 'in', 'on', 'to', 'of', 'for', 'and', 'or', 'an',
  'it', 'by', 'as', 'be', 'do', 'if', 'no', 'so', 'up', 'we', 'my',
  'use', 'when', 'with', 'from', 'this', 'that', 'will', 'can', 'has',
  'not', 'are', 'was', 'but', 'all', 'any', 'its', 'you', 'your',
  'skill', 'discipline',
]);

/**
 * Scores how well a prompt matches a description.
 * Returns a value between 0 (no match) and 1 (perfect match).
 *
 * @param {string} prompt - User prompt
 * @param {string} description - Skill description
 * @returns {number} Match score 0-1
 */
export function scoreMatch(prompt, description) {
  const promptTokens = tokenize(prompt).filter(w => !STOP_WORDS.has(w));
  if (promptTokens.length === 0) return 0;

  const descTokens = new Set(tokenize(description).filter(w => !STOP_WORDS.has(w)));

  let matches = 0;
  for (const token of promptTokens) {
    if (descTokens.has(token)) {
      matches++;
    } else {
      // Partial match: check if any desc token starts with or contains prompt token
      for (const dt of descTokens) {
        if (dt.includes(token) || token.includes(dt)) {
          matches += 0.5;
          break;
        }
      }
    }
  }

  return matches / promptTokens.length;
}

/**
 * Ranks all skills by how well they match a prompt.
 * Returns skills sorted by score descending.
 *
 * @param {string} prompt - User prompt
 * @param {{ name: string, description: string }[]} skills
 * @returns {{ name: string, description: string, score: number }[]}
 */
export function rankSkills(prompt, skills) {
  return skills
    .map(s => ({ ...s, score: scoreMatch(prompt, s.description) }))
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/trigger-matcher.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/trigger-matcher.js src/utils/__tests__/trigger-matcher.test.js
git commit -m "feat(eval): add trigger matcher for prompt-to-skill scoring"
```

---

### Task 2: Trigger Runner

**Files:**
- Create: `src/utils/trigger-runner.js`
- Create: `src/utils/__tests__/trigger-runner.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// src/utils/__tests__/trigger-runner.test.js
import { describe, it, expect } from 'vitest';
import { loadTriggers, runTriggerTests, computeAccuracy } from '../trigger-runner.js';

describe('loadTriggers', () => {
  it('returns null for skill without triggers', () => {
    const triggers = loadTriggers('status');
    expect(triggers).toBeNull();
  });
});

describe('computeAccuracy', () => {
  it('computes perfect accuracy', () => {
    const results = [
      { prompt: 'a', expected: true, actual: true },
      { prompt: 'b', expected: false, actual: false },
    ];
    const acc = computeAccuracy(results);
    expect(acc.precision).toBe(1.0);
    expect(acc.recall).toBe(1.0);
    expect(acc.accuracy).toBe(1.0);
  });

  it('computes accuracy with false positive', () => {
    const results = [
      { prompt: 'a', expected: true, actual: true },
      { prompt: 'b', expected: false, actual: true },  // false positive
    ];
    const acc = computeAccuracy(results);
    expect(acc.precision).toBe(0.5);  // 1 TP / (1 TP + 1 FP)
    expect(acc.recall).toBe(1.0);     // 1 TP / (1 TP + 0 FN)
  });

  it('computes accuracy with false negative', () => {
    const results = [
      { prompt: 'a', expected: true, actual: false },  // false negative
      { prompt: 'b', expected: false, actual: false },
    ];
    const acc = computeAccuracy(results);
    expect(acc.precision).toBe(0);    // 0 TP / 0 predicted positive → 0
    expect(acc.recall).toBe(0);       // 0 TP / (0 TP + 1 FN)
  });

  it('handles empty results', () => {
    const acc = computeAccuracy([]);
    expect(acc.accuracy).toBe(0);
  });
});

describe('runTriggerTests', () => {
  it('returns results with expected and actual fields', () => {
    const triggers = {
      skill: 'test-skill',
      matcherType: 'keyword',
      description: 'Create a pull request from the current branch',
      threshold: 0.3,
      tests: [
        { prompt: 'create a pull request', shouldTrigger: true },
        { prompt: 'deploy to production', shouldTrigger: false },
      ],
    };

    const allSkills = [
      { name: 'test-skill', description: 'Create a pull request from the current branch' },
      { name: 'other-skill', description: 'Saves current state to SESSION.md' },
    ];

    const results = runTriggerTests(triggers, allSkills);
    expect(results).toHaveLength(2);
    expect(results[0].expected).toBe(true);
    expect(results[0]).toHaveProperty('actual');
    expect(results[0]).toHaveProperty('score');
    expect(results[0]).toHaveProperty('rank');
    expect(results[1].expected).toBe(false);
  });

  it('uses keywordExpected when present for keyword matcher', () => {
    const triggers = {
      skill: 'test-skill',
      matcherType: 'keyword',
      description: 'Create a pull request from the current branch',
      threshold: 0.3,
      tests: [
        { prompt: 'I am ready to submit this for review', shouldTrigger: true, keywordExpected: false },
      ],
    };

    const allSkills = [
      { name: 'test-skill', description: 'Create a pull request from the current branch' },
      { name: 'other-skill', description: 'Saves current state to SESSION.md' },
    ];

    const results = runTriggerTests(triggers, allSkills);
    // keywordExpected overrides: expected should be false for keyword matcher
    expect(results[0].expected).toBe(false);
    expect(results[0].semanticExpected).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/trigger-runner.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement trigger runner**

```javascript
// src/utils/trigger-runner.js
/**
 * trigger-runner.js — Loads and executes trigger tests for skills.
 *
 * Trigger tests verify that a skill's description causes it to rank
 * first (or not) for given prompts, measuring precision and recall.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rankSkills } from './trigger-matcher.js';
import { parseSkill, extractFrontmatterBlock, parseYamlFrontmatter } from './workflow-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'templates', 'skills');

/**
 * Loads triggers.json for a skill template.
 * @param {string} skillName
 * @returns {object|null}
 */
export function loadTriggers(skillName) {
  const triggersPath = join(TEMPLATES_DIR, skillName, 'evals', 'triggers.json');
  if (!existsSync(triggersPath)) return null;
  return JSON.parse(readFileSync(triggersPath, 'utf8'));
}

/**
 * Loads all skill names and descriptions from templates.
 * @returns {{ name: string, description: string }[]}
 */
export function loadAllSkillDescriptions() {
  const skillDirs = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const skills = [];
  for (const name of skillDirs) {
    const skillPath = join(TEMPLATES_DIR, name, 'SKILL.md');
    if (!existsSync(skillPath)) continue;
    const content = readFileSync(skillPath, 'utf8');
    const block = extractFrontmatterBlock(content);
    if (!block) continue;
    const fm = parseYamlFrontmatter(block.yaml);
    if (fm.description) {
      skills.push({ name, description: fm.description });
    }
  }
  return skills;
}

/**
 * Runs trigger tests for a skill.
 *
 * For each test prompt, ranks all skills and checks whether the target
 * skill ranks #1 (for should-trigger) or NOT #1 (for should-not-trigger).
 *
 * When matcherType is "keyword" and a test has keywordExpected defined,
 * that value overrides shouldTrigger for accuracy calculation. This lets
 * tests document the ideal (semantic) expectation while being honest
 * about what keyword matching can achieve.
 *
 * @param {object} triggers - Trigger test config from triggers.json
 * @param {{ name: string, description: string }[]} allSkills
 * @returns {{ prompt: string, expected: boolean, actual: boolean, score: number, rank: number, semanticExpected?: boolean }[]}
 */
export function runTriggerTests(triggers, allSkills) {
  const threshold = triggers.threshold || 0.3;
  const isKeyword = triggers.matcherType === 'keyword';
  const results = [];

  for (const test of triggers.tests) {
    const ranked = rankSkills(test.prompt, allSkills);
    const targetRank = ranked.findIndex(s => s.name === triggers.skill);
    const targetScore = targetRank >= 0 ? ranked[targetRank].score : 0;

    // "Triggered" means: skill ranked #1 AND score above threshold
    const actual = targetRank === 0 && targetScore >= threshold;

    // If keyword matcher and keywordExpected is defined, use it as the expected value
    const hasOverride = isKeyword && test.keywordExpected !== undefined;
    const expected = hasOverride ? test.keywordExpected : test.shouldTrigger;

    const result = {
      prompt: test.prompt,
      expected,
      actual,
      score: targetScore,
      rank: targetRank + 1,
    };

    // Preserve the semantic expectation for reporting
    if (hasOverride) {
      result.semanticExpected = test.shouldTrigger;
    }

    results.push(result);
  }

  return results;
}

/**
 * Computes precision, recall, and accuracy from trigger test results.
 *
 * @param {{ expected: boolean, actual: boolean }[]} results
 * @returns {{ precision: number, recall: number, accuracy: number, total: number, tp: number, fp: number, fn: number, tn: number }}
 */
export function computeAccuracy(results) {
  if (results.length === 0) return { precision: 0, recall: 0, accuracy: 0, total: 0, tp: 0, fp: 0, fn: 0, tn: 0 };

  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const r of results) {
    if (r.expected && r.actual) tp++;
    else if (!r.expected && r.actual) fp++;
    else if (r.expected && !r.actual) fn++;
    else tn++;
  }

  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const accuracy = (tp + tn) / results.length;

  return { precision, recall, accuracy, total: results.length, tp, fp, fn, tn };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/trigger-runner.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/trigger-runner.js src/utils/__tests__/trigger-runner.test.js
git commit -m "feat(eval): add trigger runner with precision/recall scoring"
```

---

### Task 3: Trigger Test Definitions (5 skills)

**Files:**
- Create: `src/templates/skills/create-pr/evals/triggers.json`
- Create: `src/templates/skills/dev-flow/evals/triggers.json`
- Create: `src/templates/skills/review/evals/triggers.json`
- Create: `src/templates/skills/session-start/evals/triggers.json`
- Create: `src/templates/skills/debug/evals/triggers.json`

These 5 skills cover diverse types: workflow skill (create-pr, dev-flow, review), session skill (session-start), and discipline skill (debug).

- [ ] **Step 1: Create triggers.json for create-pr**

```json
{
  "skill": "create-pr",
  "matcherType": "keyword",
  "description": "Create a pull request from the current branch with structured summary",
  "threshold": 0.3,
  "tests": [
    { "prompt": "create a pull request", "shouldTrigger": true },
    { "prompt": "open a PR for this branch", "shouldTrigger": true },
    { "prompt": "push and create PR", "shouldTrigger": true },
    { "prompt": "I'm ready to submit this for review", "shouldTrigger": true, "keywordExpected": false },
    { "prompt": "review my code changes", "shouldTrigger": false },
    { "prompt": "start a new feature", "shouldTrigger": false },
    { "prompt": "deploy to production", "shouldTrigger": false },
    { "prompt": "save my session", "shouldTrigger": false }
  ]
}
```

- [ ] **Step 2: Create triggers.json for dev-flow**

```json
{
  "skill": "dev-flow",
  "matcherType": "keyword",
  "description": "Shows current pipeline phase and what comes next",
  "threshold": 0.3,
  "tests": [
    { "prompt": "what phase am I in", "shouldTrigger": true },
    { "prompt": "show the current pipeline phase", "shouldTrigger": true },
    { "prompt": "what comes next in the flow", "shouldTrigger": true },
    { "prompt": "where did I leave off", "shouldTrigger": true, "keywordExpected": false },
    { "prompt": "create a pull request", "shouldTrigger": false },
    { "prompt": "review my code", "shouldTrigger": false },
    { "prompt": "fix this bug", "shouldTrigger": false },
    { "prompt": "run the tests", "shouldTrigger": false }
  ]
}
```

- [ ] **Step 3: Create triggers.json for review**

```json
{
  "skill": "review",
  "matcherType": "keyword",
  "description": "Standalone code review on the current diff",
  "threshold": 0.3,
  "tests": [
    { "prompt": "review my code", "shouldTrigger": true },
    { "prompt": "do a code review on the current changes", "shouldTrigger": true },
    { "prompt": "check my diff for issues", "shouldTrigger": true },
    { "prompt": "review the current diff", "shouldTrigger": true },
    { "prompt": "create a pull request", "shouldTrigger": false },
    { "prompt": "save my session", "shouldTrigger": false },
    { "prompt": "what phase am I in", "shouldTrigger": false },
    { "prompt": "start a new feature", "shouldTrigger": false }
  ]
}
```

- [ ] **Step 4: Create triggers.json for session-start**

```json
{
  "skill": "session-start",
  "matcherType": "keyword",
  "description": "Loads context and resumes work from SESSION.md",
  "threshold": 0.3,
  "tests": [
    { "prompt": "load my session context", "shouldTrigger": true },
    { "prompt": "resume work from SESSION.md", "shouldTrigger": true },
    { "prompt": "start session and load context", "shouldTrigger": true },
    { "prompt": "where did I leave off", "shouldTrigger": true, "keywordExpected": false },
    { "prompt": "save my progress", "shouldTrigger": false },
    { "prompt": "create a new feature", "shouldTrigger": false },
    { "prompt": "review my code", "shouldTrigger": false },
    { "prompt": "run the tests", "shouldTrigger": false }
  ]
}
```

- [ ] **Step 5: Create triggers.json for debug**

```json
{
  "skill": "debug",
  "matcherType": "keyword",
  "description": "Discipline skill — systematic debugging process. Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes.",
  "threshold": 0.3,
  "tests": [
    { "prompt": "I have a bug in the login flow", "shouldTrigger": true },
    { "prompt": "tests are failing unexpectedly", "shouldTrigger": true },
    { "prompt": "unexpected behavior in the API", "shouldTrigger": true },
    { "prompt": "help me debug this function", "shouldTrigger": true },
    { "prompt": "create a new feature", "shouldTrigger": false },
    { "prompt": "review my code", "shouldTrigger": false },
    { "prompt": "save my session", "shouldTrigger": false },
    { "prompt": "what phase am I in", "shouldTrigger": false }
  ]
}
```

- [ ] **Step 6: Commit**

```bash
git add src/templates/skills/*/evals/triggers.json
git commit -m "feat(eval): add trigger test definitions for 5 skills"
```

---

### Task 4: Integrate Triggers into `guild eval`

**Files:**
- Modify: `src/commands/eval.js`
- Modify: `src/commands/__tests__/eval.test.js`

- [ ] **Step 1: Write failing test for --triggers flag**

Append to `src/commands/__tests__/eval.test.js`:

```javascript
import { runEvalTriggers } from '../eval.js';

describe('runEvalTriggers', () => {
  it('runs trigger tests for all skills with triggers', async () => {
    await expect(runEvalTriggers()).resolves.toBeUndefined();
  });

  it('runs trigger tests for a specific skill', async () => {
    await expect(runEvalTriggers('create-pr')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/commands/__tests__/eval.test.js`
Expected: FAIL — `runEvalTriggers` not exported

- [ ] **Step 3: Add runEvalTriggers to eval.js**

Add to `src/commands/eval.js`:

```javascript
import { loadTriggers, runTriggerTests, computeAccuracy, loadAllSkillDescriptions } from '../utils/trigger-runner.js';

/**
 * Runs trigger evaluations.
 * @param {string} [skillName] - Specific skill or all
 */
export async function runEvalTriggers(skillName) {
  const allSkills = loadAllSkillDescriptions();
  const SKILLS_DIR_LOCAL = join(__dirname, '..', 'templates', 'skills');

  const skills = skillName
    ? [skillName]
    : readdirSync(SKILLS_DIR_LOCAL, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(name => loadTriggers(name) !== null);

  p.intro(chalk.bold.cyan(`Guild Trigger Tests — ${skillName || 'all skills'}`));

  let totalSkills = 0;
  let totalTests = 0;
  let totalCorrect = 0;

  for (const skill of skills) {
    const triggers = loadTriggers(skill);
    if (!triggers) {
      p.log.warn(`${skill}: no triggers.json`);
      continue;
    }

    const results = runTriggerTests(triggers, allSkills);
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
        p.log.info(chalk.gray(`    ${label} "${r.prompt}" (score=${r.score.toFixed(2)}, rank=#${r.rank})`));
      }
    }
  }

  const overallAcc = totalTests > 0 ? ((totalCorrect / totalTests) * 100).toFixed(0) : 0;
  p.outro(`${totalSkills} skills, ${totalTests} tests, ${overallAcc}% overall accuracy`);
}
```

- [ ] **Step 4: Update `guild eval` command registration in bin/guild.js**

Modify the eval command in `bin/guild.js` to accept `--triggers`:

```javascript
// guild eval
program
  .command('eval')
  .description('Run skill structural evaluations')
  .argument('[skill]', 'Skill name to evaluate (or all if omitted)')
  .option('--triggers', 'Run trigger tests instead of structural evals')
  .action(async (skill, options) => {
    try {
      if (options.triggers) {
        const { runEvalTriggers } = await import('../src/commands/eval.js');
        await runEvalTriggers(skill);
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

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All PASS

- [ ] **Step 6: Test CLI manually**

Run: `node bin/guild.js eval --triggers`
Expected: Shows trigger test results for 5 skills with accuracy metrics

- [ ] **Step 7: Commit**

```bash
git add src/commands/eval.js src/commands/__tests__/eval.test.js bin/guild.js
git commit -m "feat(eval): add --triggers flag to guild eval command"
```

---

## Summary

| Task | What it builds | Files |
|------|---------------|-------|
| Task 1 | Trigger matcher — keyword scoring engine | 2 new |
| Task 2 | Trigger runner — test execution + accuracy metrics | 2 new |
| Task 3 | Trigger definitions for 5 pilot skills | 5 new |
| Task 4 | CLI integration — `guild eval --triggers` | 3 modified |
| **Total** | | **9 new, 3 modified** |
