import { describe, it, expect } from 'vitest';
import {
  extractFrontmatterBlock,
  parseYamlFrontmatter,
  parseSkill,
  validateWorkflow,
  resolveExecutionPlan,
} from '../workflow-parser.js';

describe('extractFrontmatterBlock', () => {
  it('extracts yaml and body from markdown with frontmatter', () => {
    const content = '---\nname: test\n---\n\n# Body';
    const result = extractFrontmatterBlock(content);
    expect(result).not.toBeNull();
    expect(result.yaml).toBe('name: test');
    expect(result.body).toBe('# Body');
  });

  it('returns null for content without frontmatter', () => {
    const result = extractFrontmatterBlock('# Just a heading');
    expect(result).toBeNull();
  });

  it('handles empty body', () => {
    const content = '---\nname: test\n---';
    const result = extractFrontmatterBlock(content);
    expect(result).not.toBeNull();
    expect(result.yaml).toBe('name: test');
    expect(result.body).toBe('');
  });

  it('handles multiline YAML with nested structures', () => {
    const content = '---\nname: test\nworkflow:\n  version: 1\n  steps:\n    - id: step1\n---\n\nBody here';
    const result = extractFrontmatterBlock(content);
    expect(result).not.toBeNull();
    expect(result.yaml).toContain('workflow:');
    expect(result.yaml).toContain('version: 1');
  });
});

describe('parseYamlFrontmatter', () => {
  it('parses simple key-value pairs', () => {
    const result = parseYamlFrontmatter('name: test\ndescription: "A test"');
    expect(result.name).toBe('test');
    expect(result.description).toBe('A test');
  });

  it('parses nested objects', () => {
    const yaml = 'workflow:\n  version: 1\n  steps:\n    - id: step1';
    const result = parseYamlFrontmatter(yaml);
    expect(result.workflow).toBeDefined();
    expect(result.workflow.version).toBe(1);
    expect(result.workflow.steps).toHaveLength(1);
    expect(result.workflow.steps[0].id).toBe('step1');
  });

  it('parses arrays', () => {
    const yaml = 'items:\n  - one\n  - two\n  - three';
    const result = parseYamlFrontmatter(yaml);
    expect(result.items).toEqual(['one', 'two', 'three']);
  });

  it('parses booleans', () => {
    const yaml = 'user-invocable: true\ngate: false';
    const result = parseYamlFrontmatter(yaml);
    expect(result['user-invocable']).toBe(true);
    expect(result.gate).toBe(false);
  });

  it('returns empty object for empty string', () => {
    expect(parseYamlFrontmatter('')).toEqual({});
  });
});

describe('parseSkill', () => {
  it('parses a simple skill without workflow', () => {
    const content = '---\nname: review\ndescription: "Code review"\nuser-invocable: true\n---\n\n# Review\n\nDo the review.';
    const skill = parseSkill(content);

    expect(skill.name).toBe('review');
    expect(skill.description).toBe('Code review');
    expect(skill.userInvocable).toBe(true);
    expect(skill.workflow).toBeNull();
    expect(skill.body).toContain('# Review');
  });

  it('parses a skill with workflow', () => {
    const content = [
      '---',
      'name: build-feature',
      'description: "Full pipeline"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: evaluate',
      '      role: advisor',
      '      intent: "Evaluate the feature"',
      '      model-tier: reasoning',
      '    - id: implement',
      '      role: developer',
      '      intent: "Implement the feature"',
      '      model-tier: execution',
      '---',
      '',
      '# Build Feature',
    ].join('\n');

    const skill = parseSkill(content);

    expect(skill.name).toBe('build-feature');
    expect(skill.workflow).not.toBeNull();
    expect(skill.workflow.version).toBe(1);
    expect(skill.workflow.steps).toHaveLength(2);
    expect(skill.workflow.steps[0].id).toBe('evaluate');
    expect(skill.workflow.steps[0].role).toBe('advisor');
    expect(skill.workflow.steps[0].modelTier).toBe('reasoning');
    expect(skill.workflow.steps[1].id).toBe('implement');
    expect(skill.workflow.steps[1].modelTier).toBe('execution');
  });

  it('normalizes step fields correctly', () => {
    const content = [
      '---',
      'name: test',
      'description: "Test"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: gate1',
      '      role: system',
      '      intent: "Run tests"',
      '      gate: true',
      '      on-failure: goto:implement',
      '      commands:',
      '        - npm test',
      '        - npm run lint',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    const step = skill.workflow.steps[0];

    expect(step.gate).toBe(true);
    expect(step.onFailure).toBe('goto:implement');
    expect(step.commands).toEqual(['npm test', 'npm run lint']);
    expect(step.blocking).toBe(true);  // default
  });

  it('returns empty skill for content without frontmatter', () => {
    const skill = parseSkill('# Just a heading\n\nSome text.');
    expect(skill.name).toBe('');
    expect(skill.workflow).toBeNull();
    expect(skill.body).toContain('Just a heading');
  });

  it('handles requires and produces arrays', () => {
    const content = [
      '---',
      'name: test',
      'description: "Test"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: step1',
      '      role: advisor',
      '      intent: "Do something"',
      '      requires:',
      '        - feature-description',
      '        - project-context',
      '      produces:',
      '        - evaluation-report',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    const step = skill.workflow.steps[0];

    expect(step.requires).toEqual(['feature-description', 'project-context']);
    expect(step.produces).toEqual(['evaluation-report']);
  });

  it('handles retry configuration', () => {
    const content = [
      '---',
      'name: test',
      'description: "Test"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: review',
      '      role: code-reviewer',
      '      intent: "Review code"',
      '      retry:',
      '        max: 2',
      '        on: has-blockers',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    const step = skill.workflow.steps[0];

    expect(step.retry).toEqual({ max: 2, on: 'has-blockers' });
  });

  it('handles delegates-to for system steps', () => {
    const content = [
      '---',
      'name: test',
      'description: "Test"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: qa-phase',
      '      role: system',
      '      intent: "Run QA"',
      '      delegates-to: qa-cycle',
      '      requires:',
      '        - acceptance-criteria',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    const step = skill.workflow.steps[0];

    expect(step.delegatesTo).toBe('qa-cycle');
  });

  it('handles blocking: false for fire-and-forget steps', () => {
    const content = [
      '---',
      'name: test',
      'description: "Test"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: extract',
      '      role: learnings-extractor',
      '      intent: "Extract learnings"',
      '      blocking: false',
      '      model-tier: routine',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    const step = skill.workflow.steps[0];

    expect(step.blocking).toBe(false);
    expect(step.modelTier).toBe('routine');
  });
});

describe('validateWorkflow', () => {
  const validWorkflow = {
    version: 1,
    steps: [
      { id: 'step1', role: 'advisor', intent: 'Do something', requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false },
    ],
  };

  it('returns empty array for valid workflow', () => {
    expect(validateWorkflow(validWorkflow)).toEqual([]);
  });

  it('rejects unsupported version', () => {
    const errors = validateWorkflow({ version: 2, steps: [{ id: 's1', role: 'advisor', intent: 'x', requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false }] });
    expect(errors).toContainEqual(expect.stringContaining('Unsupported workflow version: 2'));
  });

  it('rejects empty steps array', () => {
    const errors = validateWorkflow({ version: 1, steps: [] });
    expect(errors).toContainEqual(expect.stringContaining('at least one step'));
  });

  it('detects duplicate step IDs', () => {
    const errors = validateWorkflow({
      version: 1,
      steps: [
        { id: 'dup', role: 'advisor', intent: 'First', requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false },
        { id: 'dup', role: 'developer', intent: 'Second', requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false },
      ],
    });
    expect(errors).toContainEqual(expect.stringContaining('Duplicate step id: "dup"'));
  });

  it('detects missing role', () => {
    const errors = validateWorkflow({
      version: 1,
      steps: [{ id: 's1', intent: 'Do something', requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false }],
    });
    expect(errors).toContainEqual(expect.stringContaining('missing required field: role'));
  });

  it('detects missing intent', () => {
    const errors = validateWorkflow({
      version: 1,
      steps: [{ id: 's1', role: 'advisor', requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false }],
    });
    expect(errors).toContainEqual(expect.stringContaining('missing required field: intent'));
  });

  it('detects invalid model-tier', () => {
    const errors = validateWorkflow({
      version: 1,
      steps: [{ id: 's1', role: 'advisor', intent: 'x', modelTier: 'turbo', requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false }],
    });
    expect(errors).toContainEqual(expect.stringContaining('invalid model-tier: "turbo"'));
  });

  it('accepts valid model-tier values', () => {
    for (const tier of ['reasoning', 'execution', 'routine']) {
      const errors = validateWorkflow({
        version: 1,
        steps: [{ id: 's1', role: 'advisor', intent: 'x', modelTier: tier, requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false }],
      });
      expect(errors).toEqual([]);
    }
  });

  it('detects invalid on-failure', () => {
    const errors = validateWorkflow({
      version: 1,
      steps: [{ id: 's1', role: 'advisor', intent: 'x', onFailure: 'explode', requires: [], produces: [], blocking: true, gate: false }],
    });
    expect(errors).toContainEqual(expect.stringContaining('invalid on-failure: "explode"'));
  });

  it('accepts valid on-failure values', () => {
    for (const onFailure of ['abort', 'continue', 'goto:step2']) {
      const errors = validateWorkflow({
        version: 1,
        steps: [
          { id: 's1', role: 'advisor', intent: 'x', onFailure, requires: [], produces: [], blocking: true, gate: false },
          { id: 'step2', role: 'developer', intent: 'y', requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false },
        ],
      });
      expect(errors).toEqual([]);
    }
  });

  it('detects goto target that does not exist', () => {
    const errors = validateWorkflow({
      version: 1,
      steps: [
        { id: 's1', role: 'advisor', intent: 'x', onFailure: 'goto:nonexistent', requires: [], produces: [], blocking: true, gate: false },
      ],
    });
    expect(errors).toContainEqual(expect.stringContaining('goto target "nonexistent" does not exist'));
  });

  it('detects retry.max exceeding limit', () => {
    const errors = validateWorkflow({
      version: 1,
      steps: [{ id: 's1', role: 'advisor', intent: 'x', retry: { max: 11 }, requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false }],
    });
    expect(errors).toContainEqual(expect.stringContaining('retry.max exceeds limit of 10'));
  });

  it('detects retry.max below 1', () => {
    const errors = validateWorkflow({
      version: 1,
      steps: [{ id: 's1', role: 'advisor', intent: 'x', retry: { max: 0 }, requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false }],
    });
    expect(errors).toContainEqual(expect.stringContaining('retry.max must be at least 1'));
  });

  it('detects system step without commands, delegates-to, or gate', () => {
    const errors = validateWorkflow({
      version: 1,
      steps: [{ id: 's1', role: 'system', intent: 'x', requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false }],
    });
    expect(errors).toContainEqual(expect.stringContaining('System step "s1" must have commands, delegates-to, or gate'));
  });

  it('accepts system step with gate: true', () => {
    const errors = validateWorkflow({
      version: 1,
      steps: [{ id: 's1', role: 'system', intent: 'x', gate: true, requires: [], produces: [], blocking: true, onFailure: 'abort' }],
    });
    expect(errors).toEqual([]);
  });

  it('accepts system step with commands', () => {
    const errors = validateWorkflow({
      version: 1,
      steps: [{ id: 's1', role: 'system', intent: 'x', commands: ['npm test'], requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false }],
    });
    expect(errors).toEqual([]);
  });

  it('accepts system step with delegates-to', () => {
    const errors = validateWorkflow({
      version: 1,
      steps: [{ id: 's1', role: 'system', intent: 'x', delegatesTo: 'qa-cycle', requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false }],
    });
    expect(errors).toEqual([]);
  });
});

describe('validateWorkflow — full build-feature workflow', () => {
  it('validates the complete build-feature workflow from spec', () => {
    const content = [
      '---',
      'name: build-feature',
      'description: "Full pipeline"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: evaluate',
      '      role: advisor',
      '      intent: "Evaluate the feature"',
      '      requires: [feature-description]',
      '      produces: [evaluation-report, verdict]',
      '      model-tier: reasoning',
      '      on-failure: abort',
      '    - id: specify',
      '      role: product-owner',
      '      intent: "Define tasks and acceptance criteria"',
      '      requires: [feature-description, evaluation-report]',
      '      produces: [task-list, acceptance-criteria]',
      '      model-tier: reasoning',
      '      condition: step.evaluate.verdict != rejected',
      '    - id: design',
      '      role: tech-lead',
      '      intent: "Define implementation approach"',
      '      requires: [task-list, acceptance-criteria]',
      '      produces: [technical-plan]',
      '      model-tier: reasoning',
      '    - id: implement',
      '      role: developer',
      '      intent: "Implement the feature"',
      '      requires: [technical-plan, acceptance-criteria]',
      '      produces: [implementation, test-results]',
      '      model-tier: execution',
      '    - id: gate-pre-review',
      '      role: system',
      '      intent: "Run tests and lint"',
      '      commands: [npm test, npm run lint]',
      '      gate: true',
      '      produces: [gate-pre-review-result]',
      '      on-failure: goto:implement',
      '    - id: review',
      '      role: code-reviewer',
      '      intent: "Review code quality"',
      '      requires: [implementation, gate-pre-review-result]',
      '      produces: [review-report]',
      '      model-tier: reasoning',
      '      retry:',
      '        max: 2',
      '        on: has-blockers',
      '    - id: gate-final',
      '      role: system',
      '      intent: "Final tests and lint"',
      '      commands: [npm test, npm run lint]',
      '      gate: true',
      '      produces: [final-gate-result]',
      '      on-failure: goto:implement',
      '---',
      '',
      '# Build Feature body',
    ].join('\n');

    const skill = parseSkill(content);
    expect(skill.workflow).not.toBeNull();
    expect(skill.workflow.steps).toHaveLength(7);

    const errors = validateWorkflow(skill.workflow);
    expect(errors).toEqual([]);
  });
});

describe('validateWorkflow — review workflow from spec', () => {
  it('validates the review workflow', () => {
    const content = [
      '---',
      'name: review',
      'description: "Standalone code review"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: gather-diff',
      '      role: system',
      '      intent: "Get current git diff and run tests + lint"',
      '      commands: [git diff --staged, git diff, npm test, npm run lint]',
      '      produces: [diff-content, test-result, lint-result]',
      '    - id: review',
      '      role: code-reviewer',
      '      intent: "Review code quality and patterns"',
      '      requires: [diff-content, test-result, lint-result]',
      '      produces: [review-report]',
      '      model-tier: reasoning',
      '    - id: present',
      '      role: system',
      '      intent: "Present findings organized by severity"',
      '      requires: [review-report]',
      '      produces: [formatted-report]',
      '      gate: true',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    expect(skill.workflow).not.toBeNull();
    expect(skill.workflow.steps).toHaveLength(3);

    const errors = validateWorkflow(skill.workflow);
    expect(errors).toEqual([]);
  });
});

describe('validateWorkflow — council workflow with parallel', () => {
  it('validates the council workflow with parallel steps', () => {
    const content = [
      '---',
      'name: council',
      'description: "Multi-agent debate"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: identify-type',
      '      role: system',
      '      intent: "Determine council type"',
      '      requires: [user-question]',
      '      produces: [council-type, participant-roles]',
      '      gate: true',
      '    - id: agent-1',
      '      role: dynamic',
      '      intent: "Analyze from perspective 1"',
      '      requires: [user-question, council-type]',
      '      produces: [perspective-1]',
      '      model-tier: reasoning',
      '      parallel: [agent-2, agent-3]',
      '    - id: agent-2',
      '      role: dynamic',
      '      intent: "Analyze from perspective 2"',
      '      requires: [user-question, council-type]',
      '      produces: [perspective-2]',
      '      model-tier: reasoning',
      '      parallel: [agent-1, agent-3]',
      '    - id: agent-3',
      '      role: dynamic',
      '      intent: "Analyze from perspective 3"',
      '      requires: [user-question, council-type]',
      '      produces: [perspective-3]',
      '      model-tier: reasoning',
      '      parallel: [agent-1, agent-2]',
      '    - id: synthesize',
      '      role: system',
      '      intent: "Synthesize debate"',
      '      requires: [perspective-1, perspective-2, perspective-3]',
      '      produces: [synthesis, options]',
      '      gate: true',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    expect(skill.workflow).not.toBeNull();
    expect(skill.workflow.steps).toHaveLength(5);

    const errors = validateWorkflow(skill.workflow);
    expect(errors).toEqual([]);

    // Verify parallel steps were parsed
    const agent1 = skill.workflow.steps[1];
    expect(agent1.parallel).toEqual(['agent-2', 'agent-3']);
  });
});

describe('resolveExecutionPlan', () => {
  it('groups sequential steps individually', () => {
    const workflow = {
      version: 1,
      steps: [
        { id: 'a', role: 'advisor', intent: 'x', requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false },
        { id: 'b', role: 'developer', intent: 'y', requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false },
      ],
    };

    const plan = resolveExecutionPlan(workflow);
    expect(plan.groups).toHaveLength(2);
    expect(plan.groups[0].parallel).toBe(false);
    expect(plan.groups[0].steps).toHaveLength(1);
    expect(plan.groups[1].parallel).toBe(false);
  });

  it('groups parallel steps together', () => {
    const workflow = {
      version: 1,
      steps: [
        { id: 'a', role: 'advisor', intent: 'x', parallel: ['b', 'c'], requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false },
        { id: 'b', role: 'developer', intent: 'y', parallel: ['a', 'c'], requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false },
        { id: 'c', role: 'tech-lead', intent: 'z', parallel: ['a', 'b'], requires: [], produces: [], blocking: true, onFailure: 'abort', gate: false },
        { id: 'd', role: 'system', intent: 'w', gate: true, requires: [], produces: [], blocking: true, onFailure: 'abort' },
      ],
    };

    const plan = resolveExecutionPlan(workflow);
    expect(plan.groups).toHaveLength(2);
    expect(plan.groups[0].parallel).toBe(true);
    expect(plan.groups[0].steps).toHaveLength(3);
    expect(plan.groups[1].parallel).toBe(false);
    expect(plan.groups[1].steps).toHaveLength(1);
  });
});
