# Skill Evaluation System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dry-run eval framework that verifies Guild skill templates produce correct workflow plans, compatible with the anthropics/skills eval format.

**Architecture:** `eval-runner.js` uses `parseSkill()` from `workflow-parser.js` to parse SKILL.md frontmatter, then runs assertions from `evals.json` against the parsed workflow steps. npm scripts invoke the runner for each skill.

**Tech Stack:** Node.js, ESModules, Vitest, workflow-parser.js (existing)

---

### Task 1: `evaluateAssertion()` with tests for all 7 assertion types

**Files:**
- Create: `src/utils/eval-runner.js`
- Create: `src/utils/__tests__/eval-runner.test.js`

**Step 1: Write the failing tests**

Create `src/utils/__tests__/eval-runner.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { evaluateAssertion } from '../eval-runner.js';

// A minimal parsed workflow for testing (matches normalizeStep shape)
const MOCK_STEPS = [
  { id: 'evaluate', role: 'advisor', modelTier: 'reasoning', gate: false, requires: ['feature-description'], parallel: undefined, condition: undefined },
  { id: 'implement', role: 'developer', modelTier: 'execution', gate: false, requires: ['technical-plan'], parallel: undefined, condition: undefined },
  { id: 'gate-pre-review', role: 'system', modelTier: undefined, gate: true, requires: [], parallel: undefined, condition: undefined },
  { id: 'agent-1', role: 'dynamic', modelTier: 'reasoning', gate: false, requires: ['user-question'], parallel: ['agent-2', 'agent-3'], condition: undefined },
  { id: 'workspace-context', role: 'system', modelTier: undefined, gate: false, requires: ['council-type'], parallel: undefined, condition: 'in-workspace' },
];
const MOCK_WORKFLOW = { version: 1, steps: MOCK_STEPS };

describe('evaluateAssertion', () => {
  it('step-exists passes when step is present', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-exists:evaluate');
    expect(result.passed).toBe(true);
  });

  it('step-exists fails when step is missing', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-exists:nonexistent');
    expect(result.passed).toBe(false);
  });

  it('step-role passes when role matches', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-role:evaluate:advisor');
    expect(result.passed).toBe(true);
  });

  it('step-role fails when role does not match', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-role:evaluate:developer');
    expect(result.passed).toBe(false);
  });

  it('step-model-tier passes when tier matches', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-model-tier:evaluate:reasoning');
    expect(result.passed).toBe(true);
  });

  it('step-model-tier fails when tier does not match', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-model-tier:implement:reasoning');
    expect(result.passed).toBe(false);
  });

  it('step-requires passes when dependency exists', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-requires:evaluate:feature-description');
    expect(result.passed).toBe(true);
  });

  it('step-requires fails when dependency is missing', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-requires:evaluate:nonexistent');
    expect(result.passed).toBe(false);
  });

  it('step-parallel passes when step has parallel group', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-parallel:agent-1');
    expect(result.passed).toBe(true);
  });

  it('step-parallel fails when step has no parallel group', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-parallel:evaluate');
    expect(result.passed).toBe(false);
  });

  it('gate-exists passes when step has gate: true', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'gate-exists:gate-pre-review');
    expect(result.passed).toBe(true);
  });

  it('gate-exists fails when step has no gate', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'gate-exists:evaluate');
    expect(result.passed).toBe(false);
  });

  it('step-count passes when count meets minimum', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-count:3');
    expect(result.passed).toBe(true);
  });

  it('step-count fails when count is below minimum', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'step-count:10');
    expect(result.passed).toBe(false);
  });

  it('returns evidence string on pass and fail', () => {
    const pass = evaluateAssertion(MOCK_WORKFLOW, 'step-exists:evaluate');
    expect(pass.evidence).toBeTruthy();
    const fail = evaluateAssertion(MOCK_WORKFLOW, 'step-exists:nope');
    expect(fail.evidence).toBeTruthy();
  });

  it('returns passed: false for unknown assertion type', () => {
    const result = evaluateAssertion(MOCK_WORKFLOW, 'unknown-type:foo');
    expect(result.passed).toBe(false);
    expect(result.evidence).toContain('Unknown');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/eval-runner.test.js`
Expected: FAIL — module not found

**Step 3: Implement `evaluateAssertion()`**

Create `src/utils/eval-runner.js`:

```javascript
/**
 * eval-runner.js — Skill evaluation framework for Guild.
 *
 * Runs assertions against parsed skill workflows to verify
 * structural correctness. Compatible with anthropics/skills eval format.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseSkill } from './workflow-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'templates', 'skills');

/**
 * Evaluates a single assertion against a parsed workflow.
 * @param {object} workflow - Parsed workflow with { version, steps[] }
 * @param {string} assertion - Assertion string (e.g. "step-exists:evaluate")
 * @returns {{ passed: boolean, evidence: string }}
 */
export function evaluateAssertion(workflow, assertion) {
  const colonIdx = assertion.indexOf(':');
  if (colonIdx === -1) {
    return { passed: false, evidence: `Malformed assertion: "${assertion}"` };
  }

  const type = assertion.slice(0, colonIdx);
  const args = assertion.slice(colonIdx + 1);

  switch (type) {
    case 'step-exists': {
      const step = workflow.steps.find(s => s.id === args);
      return step
        ? { passed: true, evidence: `Step "${args}" found` }
        : { passed: false, evidence: `Step "${args}" not found in ${workflow.steps.map(s => s.id).join(', ')}` };
    }

    case 'step-role': {
      const [stepId, expectedRole] = args.split(':');
      const step = workflow.steps.find(s => s.id === stepId);
      if (!step) return { passed: false, evidence: `Step "${stepId}" not found` };
      return step.role === expectedRole
        ? { passed: true, evidence: `Step "${stepId}" has role "${expectedRole}"` }
        : { passed: false, evidence: `Step "${stepId}" has role "${step.role}", expected "${expectedRole}"` };
    }

    case 'step-model-tier': {
      const [stepId, expectedTier] = args.split(':');
      const step = workflow.steps.find(s => s.id === stepId);
      if (!step) return { passed: false, evidence: `Step "${stepId}" not found` };
      return step.modelTier === expectedTier
        ? { passed: true, evidence: `Step "${stepId}" uses tier "${expectedTier}"` }
        : { passed: false, evidence: `Step "${stepId}" uses tier "${step.modelTier}", expected "${expectedTier}"` };
    }

    case 'step-requires': {
      const [stepId, dep] = args.split(':');
      const step = workflow.steps.find(s => s.id === stepId);
      if (!step) return { passed: false, evidence: `Step "${stepId}" not found` };
      return step.requires.includes(dep)
        ? { passed: true, evidence: `Step "${stepId}" requires "${dep}"` }
        : { passed: false, evidence: `Step "${stepId}" requires [${step.requires.join(', ')}], missing "${dep}"` };
    }

    case 'step-parallel': {
      const step = workflow.steps.find(s => s.id === args);
      if (!step) return { passed: false, evidence: `Step "${args}" not found` };
      return step.parallel && step.parallel.length > 0
        ? { passed: true, evidence: `Step "${args}" is parallel with [${step.parallel.join(', ')}]` }
        : { passed: false, evidence: `Step "${args}" has no parallel group` };
    }

    case 'gate-exists': {
      const step = workflow.steps.find(s => s.id === args);
      if (!step) return { passed: false, evidence: `Step "${args}" not found` };
      return step.gate === true
        ? { passed: true, evidence: `Step "${args}" has gate: true` }
        : { passed: false, evidence: `Step "${args}" has gate: ${step.gate}` };
    }

    case 'step-count': {
      const min = parseInt(args, 10);
      const actual = workflow.steps.length;
      return actual >= min
        ? { passed: true, evidence: `Workflow has ${actual} steps (minimum ${min})` }
        : { passed: false, evidence: `Workflow has ${actual} steps, expected at least ${min}` };
    }

    default:
      return { passed: false, evidence: `Unknown assertion type: "${type}"` };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/eval-runner.test.js`
Expected: ALL PASS (16 tests)

**Step 5: Commit**

```bash
git add src/utils/eval-runner.js src/utils/__tests__/eval-runner.test.js
git commit -m "feat: add evaluateAssertion engine for skill evals"
```

---

### Task 2: `loadEvals()` and `runEvals()` with tests

**Files:**
- Modify: `src/utils/eval-runner.js`
- Modify: `src/utils/__tests__/eval-runner.test.js`

**Step 1: Write the failing tests**

Add to `src/utils/__tests__/eval-runner.test.js`:

```javascript
import { loadEvals, runEvals } from '../eval-runner.js';

describe('loadEvals', () => {
  it('loads evals.json for a skill with evals', () => {
    const evals = loadEvals('build-feature');
    expect(evals).not.toBeNull();
    expect(evals.skill).toBe('build-feature');
    expect(Array.isArray(evals.evals)).toBe(true);
    expect(evals.evals.length).toBeGreaterThan(0);
  });

  it('returns null for a skill without evals', () => {
    const evals = loadEvals('session-start');
    expect(evals).toBeNull();
  });
});

describe('runEvals', () => {
  it('runs all evals for build-feature and returns results', () => {
    const results = runEvals('build-feature');
    expect(results.skill).toBe('build-feature');
    expect(Array.isArray(results.results)).toBe(true);
    expect(results.results.length).toBeGreaterThan(0);
    for (const evalResult of results.results) {
      expect(evalResult).toHaveProperty('id');
      expect(evalResult).toHaveProperty('passed');
      expect(Array.isArray(evalResult.expectations)).toBe(true);
    }
  });

  it('all build-feature evals pass', () => {
    const results = runEvals('build-feature');
    const failed = results.results.filter(r => !r.passed);
    expect(failed).toEqual([]);
  });

  it('all council evals pass', () => {
    const results = runEvals('council');
    const failed = results.results.filter(r => !r.passed);
    expect(failed).toEqual([]);
  });

  it('throws for skill without evals', () => {
    expect(() => runEvals('session-start')).toThrow('No evals found');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/eval-runner.test.js`
Expected: FAIL — `loadEvals` and `runEvals` not exported

**Step 3: Implement `loadEvals()` and `runEvals()`**

Add to `src/utils/eval-runner.js`:

```javascript
/**
 * Loads evals.json for a skill template.
 * @param {string} skillName - Skill directory name (e.g. 'build-feature')
 * @returns {object|null} Parsed evals object or null if no evals exist
 */
export function loadEvals(skillName) {
  const evalsPath = join(TEMPLATES_DIR, skillName, 'evals', 'evals.json');
  if (!existsSync(evalsPath)) return null;
  return JSON.parse(readFileSync(evalsPath, 'utf8'));
}

/**
 * Runs all evals for a skill template.
 * Parses the SKILL.md, loads evals.json, and evaluates each assertion.
 * @param {string} skillName - Skill directory name
 * @returns {{ skill: string, results: Array<{ id: string, description: string, passed: boolean, expectations: Array }> }}
 */
export function runEvals(skillName) {
  const evals = loadEvals(skillName);
  if (!evals) throw new Error(`No evals found for skill "${skillName}"`);

  const skillPath = join(TEMPLATES_DIR, skillName, 'SKILL.md');
  const content = readFileSync(skillPath, 'utf8');
  const skill = parseSkill(content);

  if (!skill.workflow) {
    throw new Error(`Skill "${skillName}" has no workflow definition`);
  }

  const results = evals.evals.map(evalCase => {
    const expectations = evalCase.expectations.map(exp => {
      const result = evaluateAssertion(skill.workflow, exp.assertion);
      return { text: exp.text, assertion: exp.assertion, ...result };
    });
    const passed = expectations.every(e => e.passed);
    return {
      id: evalCase.id,
      description: evalCase.description,
      passed,
      expectations,
    };
  });

  return { skill: skillName, results };
}
```

**Step 4: These tests will still fail because evals.json files don't exist yet. That's expected — they pass after Task 3.**

Run: `npx vitest run src/utils/__tests__/eval-runner.test.js`
Expected: `loadEvals` tests fail (no evals.json), `runEvals` tests fail. Commit the code anyway — Task 3 creates the evals.

**Step 5: Commit**

```bash
git add src/utils/eval-runner.js src/utils/__tests__/eval-runner.test.js
git commit -m "feat: add loadEvals and runEvals for skill evaluation"
```

---

### Task 3: Create evals.json for build-feature and council

**Files:**
- Create: `src/templates/skills/build-feature/evals/evals.json`
- Create: `src/templates/skills/council/evals/evals.json`

**Step 1: Create build-feature evals**

Create `src/templates/skills/build-feature/evals/evals.json`:

```json
{
  "skill": "build-feature",
  "evals": [
    {
      "id": "bf-has-core-phases",
      "description": "Plan contains evaluate, specify, design, implement phases",
      "expectations": [
        { "text": "Has evaluate step", "assertion": "step-exists:evaluate" },
        { "text": "Has specify step", "assertion": "step-exists:specify" },
        { "text": "Has design step", "assertion": "step-exists:design" },
        { "text": "Has implement step", "assertion": "step-exists:implement" }
      ]
    },
    {
      "id": "bf-has-quality-phases",
      "description": "Plan contains review, QA, and completion phases",
      "expectations": [
        { "text": "Has review step", "assertion": "step-exists:review" },
        { "text": "Has QA phase", "assertion": "step-exists:qa-phase" },
        { "text": "Has completion step", "assertion": "step-exists:completion" }
      ]
    },
    {
      "id": "bf-advisor-uses-reasoning",
      "description": "Advisor (evaluate) uses reasoning tier",
      "expectations": [
        { "text": "Evaluate uses reasoning tier", "assertion": "step-model-tier:evaluate:reasoning" }
      ]
    },
    {
      "id": "bf-developer-uses-execution",
      "description": "Developer (implement) uses execution tier",
      "expectations": [
        { "text": "Implement uses execution tier", "assertion": "step-model-tier:implement:execution" }
      ]
    },
    {
      "id": "bf-gates-exist",
      "description": "Quality gates exist at pre-review and final",
      "expectations": [
        { "text": "Pre-review gate exists", "assertion": "gate-exists:gate-pre-review" },
        { "text": "Final gate exists", "assertion": "gate-exists:gate-final" }
      ]
    },
    {
      "id": "bf-minimum-steps",
      "description": "Plan has at least 10 steps",
      "expectations": [
        { "text": "At least 10 steps", "assertion": "step-count:10" }
      ]
    }
  ]
}
```

**Step 2: Create council evals**

Create `src/templates/skills/council/evals/evals.json`:

```json
{
  "skill": "council",
  "evals": [
    {
      "id": "council-three-parallel-agents",
      "description": "Council has 3 agent steps in parallel",
      "expectations": [
        { "text": "Agent-1 exists", "assertion": "step-exists:agent-1" },
        { "text": "Agent-2 exists", "assertion": "step-exists:agent-2" },
        { "text": "Agent-3 exists", "assertion": "step-exists:agent-3" },
        { "text": "Agent-1 is parallel", "assertion": "step-parallel:agent-1" },
        { "text": "Agent-2 is parallel", "assertion": "step-parallel:agent-2" },
        { "text": "Agent-3 is parallel", "assertion": "step-parallel:agent-3" }
      ]
    },
    {
      "id": "council-agents-use-reasoning",
      "description": "All council agents use reasoning tier",
      "expectations": [
        { "text": "Agent-1 uses reasoning", "assertion": "step-model-tier:agent-1:reasoning" },
        { "text": "Agent-2 uses reasoning", "assertion": "step-model-tier:agent-2:reasoning" },
        { "text": "Agent-3 uses reasoning", "assertion": "step-model-tier:agent-3:reasoning" }
      ]
    },
    {
      "id": "council-synthesize-gate",
      "description": "Synthesize step exists with gate",
      "expectations": [
        { "text": "Synthesize step exists", "assertion": "step-exists:synthesize" },
        { "text": "Synthesize has gate", "assertion": "gate-exists:synthesize" }
      ]
    },
    {
      "id": "council-workspace-context",
      "description": "Workspace context step exists with condition",
      "expectations": [
        { "text": "Workspace-context step exists", "assertion": "step-exists:workspace-context" }
      ]
    }
  ]
}
```

**Step 3: Run all eval-runner tests**

Run: `npx vitest run src/utils/__tests__/eval-runner.test.js`
Expected: ALL PASS (including loadEvals and runEvals tests from Task 2)

**Step 4: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/templates/skills/build-feature/evals/evals.json src/templates/skills/council/evals/evals.json
git commit -m "feat: add evals for build-feature and council skills"
```

---

### Task 4: Add npm scripts to package.json

**Files:**
- Modify: `package.json`
- Create: `scripts/run-evals.js`

**Step 1: Create the eval runner script**

Create `scripts/run-evals.js`:

```javascript
#!/usr/bin/env node

/**
 * Runs skill evals and reports results.
 * Usage: node scripts/run-evals.js [skill-name]
 * If no skill name given, runs all skills that have evals.
 */

import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEvals, runEvals } from '../src/utils/eval-runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

const skillArg = process.argv[2];

// Find skills with evals
const skills = skillArg
  ? [skillArg]
  : readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(name => loadEvals(name) !== null);

let totalPassed = 0;
let totalFailed = 0;

for (const skill of skills) {
  try {
    const results = runEvals(skill);
    console.log(`\n${skill}:`);
    for (const evalResult of results.results) {
      const icon = evalResult.passed ? '  ✅' : '  ❌';
      console.log(`${icon} ${evalResult.description}`);
      if (!evalResult.passed) {
        for (const exp of evalResult.expectations.filter(e => !e.passed)) {
          console.log(`     ↳ ${exp.text}: ${exp.evidence}`);
        }
      }
      if (evalResult.passed) totalPassed++;
      else totalFailed++;
    }
  } catch (err) {
    console.error(`\n${skill}: ERROR — ${err.message}`);
    totalFailed++;
  }
}

console.log(`\n${totalPassed + totalFailed} evals: ${totalPassed} passed, ${totalFailed} failed`);
if (totalFailed > 0) process.exit(1);
```

**Step 2: Add npm scripts to package.json**

Add these scripts (alongside existing ones):

```json
"eval": "node scripts/run-evals.js",
"eval:build-feature": "node scripts/run-evals.js build-feature",
"eval:council": "node scripts/run-evals.js council"
```

**Step 3: Run the eval script**

Run: `npm run eval`
Expected: All evals pass for build-feature and council

**Step 4: Run full test suite and lint**

Run: `npm test && npm run lint`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add scripts/run-evals.js package.json
git commit -m "feat: add npm eval scripts for skill evaluation"
```
