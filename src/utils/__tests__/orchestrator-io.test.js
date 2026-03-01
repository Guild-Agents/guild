import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import {
  resolveStepDispatch,
  loadWorkflow,
  buildStepContext,
  recordStepTrace,
  finalizeWorkflowTrace,
  orchestrate,
} from '../orchestrator-io.js';
import { createTrace } from '../trace.js';
import { createExecutionPlan, advanceStep } from '../orchestrator.js';

// --- Shared helpers ---

function makeTmpDir() {
  return mkdtempSync(join(tmpdir(), 'guild-orch-io-'));
}

function makeAgentDir(tmpDir) {
  const agentsDir = join(tmpDir, '.claude', 'agents');
  mkdirSync(agentsDir, { recursive: true });
  return agentsDir;
}

function writeAgentMd(agentsDir, role, tier = 'execution') {
  writeFileSync(join(agentsDir, `${role}.md`), [
    '---',
    `name: ${role}`,
    `description: "${role} agent"`,
    'tools: Read, Write, Edit, Bash, Glob, Grep',
    'permissionMode: bypassPermissions',
    `default-tier: ${tier}`,
    '---',
    '',
    `# ${role}`,
  ].join('\n'));
}

function makeSkillsDir(tmpDir) {
  const skillsBase = join(tmpDir, '.claude', 'skills');
  mkdirSync(skillsBase, { recursive: true });
  return skillsBase;
}

function writeSkillMd(skillsBase, skillName, content) {
  const skillDir = join(skillsBase, skillName);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), content);
}

const SIMPLE_SKILL_CONTENT = `---
name: simple-skill
description: "A simple test skill"
user-invocable: true
workflow:
  version: 1
  steps:
    - id: evaluate
      role: advisor
      intent: "Evaluate the feature"
      produces: [verdict]
      model-tier: reasoning
      on-failure: abort
    - id: implement
      role: developer
      intent: "Implement the feature"
      requires: [verdict]
      produces: [implementation]
      model-tier: execution
---

# Simple Skill

Instructions here.
`;

const PROSE_SKILL_CONTENT = `---
name: prose-skill
description: "A prose skill without workflow"
user-invocable: true
---

# Prose Skill

This skill has no workflow.
`;

function makeSimpleWorkflow() {
  return {
    version: 1,
    steps: [
      {
        id: 'step-a',
        role: 'advisor',
        intent: 'Evaluate',
        requires: [],
        produces: ['verdict'],
        blocking: true,
        onFailure: 'abort',
        gate: false,
        retry: undefined,
        condition: undefined,
        parallel: undefined,
        modelTier: 'reasoning',
      },
      {
        id: 'step-b',
        role: 'developer',
        intent: 'Implement',
        requires: ['verdict'],
        produces: ['implementation'],
        blocking: true,
        onFailure: 'abort',
        gate: false,
        retry: undefined,
        condition: undefined,
        parallel: undefined,
        modelTier: 'execution',
      },
    ],
  };
}

// --- resolveStepDispatch ---

describe('resolveStepDispatch', () => {
  let tmpDir;
  let agentsDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    agentsDir = makeAgentDir(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns system dispatch info for system role', () => {
    const step = {
      id: 'gate',
      role: 'system',
      intent: 'Run tests',
      commands: ['npm test'],
      gate: true,
    };

    const info = resolveStepDispatch(step, { projectRoot: tmpDir });

    expect(info.role).toBe('system');
    expect(info.tier).toBeNull();
    expect(info.model).toBeNull();
    expect(info.fallback).toBe(false);
    expect(info.agentMetadata).toBeNull();
  });

  it('resolves dispatch for an agent step with agent file', () => {
    writeAgentMd(agentsDir, 'advisor', 'reasoning');

    const step = {
      id: 'evaluate',
      role: 'advisor',
      intent: 'Evaluate feature',
      modelTier: 'reasoning',
    };

    const info = resolveStepDispatch(step, { profile: 'max', projectRoot: tmpDir });

    expect(info.role).toBe('agent');
    expect(info.tier).toBe('reasoning');
    expect(info.model).toBe('claude-opus-4-6');
    expect(info.fallback).toBe(false);
    expect(info.agentMetadata).not.toBeNull();
    expect(info.agentMetadata.role).toBe('advisor');
  });

  it('resolves dispatch for agent step without agent file', () => {
    // No agent file — falls back to DEFAULT_AGENT_TIERS
    const step = {
      id: 'evaluate',
      role: 'advisor',
      intent: 'Evaluate',
      modelTier: undefined,
    };

    const info = resolveStepDispatch(step, { profile: 'max', projectRoot: tmpDir });

    expect(info.role).toBe('agent');
    expect(info.tier).toBe('reasoning'); // DEFAULT_AGENT_TIERS['advisor'] = 'reasoning'
    expect(info.model).toBe('claude-opus-4-6');
    expect(info.agentMetadata).toBeNull();
  });

  it('respects modelTier from step over agent defaults', () => {
    writeAgentMd(agentsDir, 'developer', 'execution');

    const step = {
      id: 'impl',
      role: 'developer',
      intent: 'Implement',
      modelTier: 'reasoning', // override to reasoning
    };

    const info = resolveStepDispatch(step, { profile: 'max', projectRoot: tmpDir });

    expect(info.tier).toBe('reasoning');
    expect(info.model).toBe('claude-opus-4-6');
  });

  it('uses max profile by default', () => {
    const step = {
      id: 'eval',
      role: 'advisor',
      intent: 'Evaluate',
      modelTier: 'execution',
    };

    const info = resolveStepDispatch(step, { projectRoot: tmpDir });

    expect(info.model).toBe('claude-sonnet-4-6');
  });
});

// --- loadWorkflow ---

describe('loadWorkflow', () => {
  let tmpDir;
  let skillsBase;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    skillsBase = makeSkillsDir(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads a valid skill with workflow', () => {
    writeSkillMd(skillsBase, 'simple-skill', SIMPLE_SKILL_CONTENT);

    const result = loadWorkflow('simple-skill', { basePath: skillsBase });

    expect(result.workflow).not.toBeNull();
    expect(result.workflow.version).toBe(1);
    expect(result.workflow.steps).toHaveLength(2);
    expect(result.name).toBe('simple-skill');
    expect(result.body).toContain('Instructions here');
  });

  it('throws for skill without workflow', () => {
    writeSkillMd(skillsBase, 'prose-skill', PROSE_SKILL_CONTENT);

    expect(() => loadWorkflow('prose-skill', { basePath: skillsBase }))
      .toThrow('no workflow');
  });

  it('throws for nonexistent skill', () => {
    expect(() => loadWorkflow('does-not-exist', { basePath: skillsBase }))
      .toThrow();
  });

  it('throws for skill with validation errors', () => {
    const badSkill = `---
name: bad-skill
description: "Invalid workflow"
user-invocable: true
workflow:
  version: 99
  steps:
    - id: step1
      role: developer
      intent: "Do it"
---
`;
    writeSkillMd(skillsBase, 'bad-skill', badSkill);

    expect(() => loadWorkflow('bad-skill', { basePath: skillsBase }))
      .toThrow();
  });
});

// --- buildStepContext ---

describe('buildStepContext', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('includes step intent in context', () => {
    const workflow = makeSimpleWorkflow();
    const plan = createExecutionPlan(workflow);
    const step = workflow.steps[0];

    const context = buildStepContext(step, plan, {});

    expect(context).toContain('Evaluate');
  });

  it('includes skill body when provided', () => {
    const workflow = makeSimpleWorkflow();
    const plan = createExecutionPlan(workflow);
    const step = workflow.steps[0];

    const context = buildStepContext(step, plan, {
      skillBody: '## Instructions\n\nDo the thing carefully.',
    });

    expect(context).toContain('Instructions');
    expect(context).toContain('Do the thing carefully');
  });

  it('continues without learnings when path is invalid', () => {
    const workflow = makeSimpleWorkflow();
    const plan = createExecutionPlan(workflow);
    const step = workflow.steps[0];

    // Non-existent path — should not throw
    const context = buildStepContext(step, plan, {
      learningsPath: join(tmpDir, 'nonexistent', 'learnings.md'),
    });

    expect(typeof context).toBe('string');
    expect(context).toContain('Evaluate');
  });

  it('includes learnings when file exists with entries', () => {
    const learningsPath = join(tmpDir, 'learnings.md');
    writeFileSync(learningsPath, [
      '# Guild Learnings — test-project',
      '',
      '> Auto-generated by Guild. Last updated: 2026-02-25T10:00:00.000Z',
      '> Total executions: 1',
      '> Token budget: this file should stay under 2000 tokens',
      '',
      '## Project Patterns',
      '',
      '- Use ESModules throughout (discovered: 2026-02-25)',
      '',
      '## Architecture Decisions',
      '',
      '_No learnings yet._',
      '',
      '## Past Issues & Resolutions',
      '',
      '_No learnings yet._',
      '',
      '## User Preferences',
      '',
      '_No learnings yet._',
      '',
      '## Agent Notes',
      '',
      '_No learnings yet._',
      '',
    ].join('\n'));

    const workflow = makeSimpleWorkflow();
    const plan = createExecutionPlan(workflow);
    const step = workflow.steps[0];

    const context = buildStepContext(step, plan, { learningsPath });

    expect(context).toContain('<guild-learnings>');
    expect(context).toContain('ESModules');
  });

  it('includes outcomes from required steps when present', () => {
    const workflow = makeSimpleWorkflow();
    let plan = createExecutionPlan(workflow);

    // Advance step-a to passed with outcome
    plan = advanceStep(plan, 'step-a', {
      status: 'passed',
      outcome: { verdict: 'The feature is approved.' },
      error: null,
    });

    // Build context for step-b which requires 'verdict'
    const stepB = workflow.steps[1];
    const context = buildStepContext(stepB, plan, {});

    expect(context).toContain('verdict');
    expect(context).toContain('The feature is approved.');
  });

  it('returns string even with no body, no learnings, no requires', () => {
    const workflow = makeSimpleWorkflow();
    const plan = createExecutionPlan(workflow);
    const step = workflow.steps[0];

    const context = buildStepContext(step, plan, {});

    expect(typeof context).toBe('string');
    expect(context.length).toBeGreaterThan(0);
  });
});

// --- recordStepTrace ---

describe('recordStepTrace', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('adds a step to the trace context', () => {
    const tracesDir = join(tmpDir, 'traces');
    const traceCtx = createTrace('test-workflow', 'default', tracesDir);

    const step = {
      id: 'evaluate',
      role: 'advisor',
      intent: 'Evaluate the feature',
      modelTier: 'reasoning',
    };

    const stepState = {
      status: 'passed',
      attempts: 1,
      outcome: { verdict: 'approved' },
      error: null,
    };

    const dispatchInfo = {
      role: 'agent',
      tier: 'reasoning',
      model: 'claude-opus-4-6',
      fallback: false,
      agentMetadata: null,
    };

    const updated = recordStepTrace(traceCtx, step, stepState, dispatchInfo);

    expect(updated.steps).toHaveLength(1);
    expect(updated.steps[0].role).toBe('advisor');
    expect(updated.steps[0].intent).toBe('Evaluate the feature');
    expect(updated.steps[0].tier).toBe('reasoning');
    expect(updated.steps[0].model).toBe('claude-opus-4-6');
    expect(updated.steps[0].result).toBe('pass');
  });

  it('records failed step as fail result', () => {
    const tracesDir = join(tmpDir, 'traces');
    const traceCtx = createTrace('test-workflow', 'default', tracesDir);

    const step = { id: 's1', role: 'developer', intent: 'Implement' };
    const stepState = { status: 'failed', attempts: 1, outcome: null, error: 'Error occurred' };
    const dispatchInfo = { role: 'agent', tier: 'execution', model: 'claude-sonnet-4-6', fallback: false, agentMetadata: null };

    recordStepTrace(traceCtx, step, stepState, dispatchInfo);

    expect(traceCtx.steps[0].result).toBe('fail');
  });

  it('records system step dispatch info', () => {
    const tracesDir = join(tmpDir, 'traces');
    const traceCtx = createTrace('test-workflow', 'default', tracesDir);

    const step = { id: 'gate', role: 'system', intent: 'Run tests' };
    const stepState = { status: 'passed', attempts: 1, outcome: null, error: null };
    const dispatchInfo = { role: 'system', tier: null, model: null, fallback: false, agentMetadata: null };

    recordStepTrace(traceCtx, step, stepState, dispatchInfo);

    expect(traceCtx.steps[0].tier).toBe('system');
    expect(traceCtx.steps[0].model).toBe('none');
  });
});

// --- finalizeWorkflowTrace ---

describe('finalizeWorkflowTrace', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('produces trace and executionSummary', () => {
    const tracesDir = join(tmpDir, 'traces');
    const traceCtx = createTrace('my-skill', 'default', tracesDir);

    const workflow = makeSimpleWorkflow();
    let plan = createExecutionPlan(workflow, { skillName: 'my-skill' });
    plan = advanceStep(plan, 'step-a', { status: 'passed', outcome: null, error: null });
    plan = advanceStep(plan, 'step-b', { status: 'passed', outcome: null, error: null });

    const result = finalizeWorkflowTrace(traceCtx, plan);

    expect(result).toHaveProperty('trace');
    expect(result).toHaveProperty('executionSummary');
    expect(typeof result.executionSummary).toBe('string');
    expect(result.executionSummary).toContain('my-skill');
  });

  it('produces pass result when all steps passed', () => {
    const tracesDir = join(tmpDir, 'traces');
    const traceCtx = createTrace('my-skill', 'default', tracesDir);

    const workflow = makeSimpleWorkflow();
    let plan = createExecutionPlan(workflow);
    plan = advanceStep(plan, 'step-a', { status: 'passed', outcome: null, error: null });
    plan = advanceStep(plan, 'step-b', { status: 'passed', outcome: null, error: null });

    const result = finalizeWorkflowTrace(traceCtx, plan);
    expect(result.executionSummary).toContain('pass');
  });

  it('produces fail result when plan was aborted', () => {
    const tracesDir = join(tmpDir, 'traces');
    const traceCtx = createTrace('my-skill', 'default', tracesDir);

    const workflow = makeSimpleWorkflow();
    let plan = createExecutionPlan(workflow);
    plan = advanceStep(plan, 'step-a', { status: 'failed', outcome: null, error: 'Error' });

    expect(plan.status).toBe('aborted');
    const result = finalizeWorkflowTrace(traceCtx, plan);
    expect(result.executionSummary).toContain('fail');
  });
});

// --- orchestrate ---

describe('orchestrate', () => {
  let tmpDir;
  let skillsBase;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    skillsBase = makeSkillsDir(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns plan and trace for a valid skill', async () => {
    writeSkillMd(skillsBase, 'simple-skill', SIMPLE_SKILL_CONTENT);

    const result = await orchestrate('simple-skill', 'Add dark mode', {
      basePath: skillsBase,
      projectRoot: tmpDir,
      tracesDir: join(tmpDir, 'traces'),
    });

    expect(result).toHaveProperty('plan');
    expect(result).toHaveProperty('trace');
  });

  it('plan has all steps in pending state initially', async () => {
    writeSkillMd(skillsBase, 'simple-skill', SIMPLE_SKILL_CONTENT);

    const { plan } = await orchestrate('simple-skill', 'feature desc', {
      basePath: skillsBase,
      projectRoot: tmpDir,
      tracesDir: join(tmpDir, 'traces'),
    });

    for (const state of Object.values(plan.stepStates)) {
      expect(state.status).toBe('pending');
    }
  });

  it('plan status is running initially', async () => {
    writeSkillMd(skillsBase, 'simple-skill', SIMPLE_SKILL_CONTENT);

    const { plan } = await orchestrate('simple-skill', 'feature desc', {
      basePath: skillsBase,
      projectRoot: tmpDir,
      tracesDir: join(tmpDir, 'traces'),
    });

    expect(plan.status).toBe('running');
  });

  it('trace has workflow name set', async () => {
    writeSkillMd(skillsBase, 'simple-skill', SIMPLE_SKILL_CONTENT);

    const { trace } = await orchestrate('simple-skill', 'feature desc', {
      basePath: skillsBase,
      projectRoot: tmpDir,
      tracesDir: join(tmpDir, 'traces'),
    });

    expect(trace.workflow).toBe('simple-skill');
  });

  it('throws for skill without workflow', async () => {
    writeSkillMd(skillsBase, 'prose-skill', PROSE_SKILL_CONTENT);

    await expect(orchestrate('prose-skill', '', {
      basePath: skillsBase,
      projectRoot: tmpDir,
      tracesDir: join(tmpDir, 'traces'),
    })).rejects.toThrow('no workflow');
  });

  it('throws for nonexistent skill', async () => {
    await expect(orchestrate('no-such-skill', '', {
      basePath: skillsBase,
      projectRoot: tmpDir,
      tracesDir: join(tmpDir, 'traces'),
    })).rejects.toThrow();
  });

  it('plan has correct step count', async () => {
    writeSkillMd(skillsBase, 'simple-skill', SIMPLE_SKILL_CONTENT);

    const { plan } = await orchestrate('simple-skill', '', {
      basePath: skillsBase,
      projectRoot: tmpDir,
      tracesDir: join(tmpDir, 'traces'),
    });

    expect(Object.keys(plan.stepStates)).toHaveLength(2);
    expect(plan.stepStates.evaluate).toBeDefined();
    expect(plan.stepStates.implement).toBeDefined();
  });
});
