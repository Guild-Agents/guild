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

describe('validateWorkflow — qa-cycle workflow', () => {
  it('validates the qa-cycle workflow (4 steps with retry and condition)', () => {
    const content = [
      '---',
      'name: qa-cycle',
      'description: "QA + bugfix cycle"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: gate-pre-qa',
      '      role: system',
      '      intent: "Run tests and lint before QA"',
      '      commands: [npm test, npm run lint]',
      '      gate: true',
      '      produces: [test-result, lint-result]',
      '    - id: qa-validate',
      '      role: qa',
      '      intent: "Validate against acceptance criteria"',
      '      requires: [acceptance-criteria, test-result, lint-result]',
      '      produces: [qa-report]',
      '      model-tier: execution',
      '      retry:',
      '        max: 3',
      '        on: has-bugs',
      '    - id: bugfix',
      '      role: bugfix',
      '      intent: "Fix bugs reported by QA"',
      '      requires: [qa-report]',
      '      produces: [bugfix-result]',
      '      model-tier: execution',
      '      condition: step.qa-validate.has-bugs',
      '      on-failure: goto:qa-validate',
      '    - id: gate-post-qa',
      '      role: system',
      '      intent: "Final tests and lint"',
      '      commands: [npm test, npm run lint]',
      '      gate: true',
      '      produces: [final-test-result, final-lint-result]',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    expect(skill.workflow).not.toBeNull();
    expect(skill.workflow.steps).toHaveLength(4);

    const errors = validateWorkflow(skill.workflow);
    expect(errors).toEqual([]);

    // Verify retry and condition
    const qaStep = skill.workflow.steps[1];
    expect(qaStep.retry).toEqual({ max: 3, on: 'has-bugs' });

    const bugfixStep = skill.workflow.steps[2];
    expect(bugfixStep.condition).toBe('step.qa-validate.has-bugs');
    expect(bugfixStep.onFailure).toBe('goto:qa-validate');
  });
});

describe('validateWorkflow — create-pr workflow', () => {
  it('validates the create-pr workflow (5 system steps)', () => {
    const content = [
      '---',
      'name: create-pr',
      'description: "Create a pull request"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: verify-branch',
      '      role: system',
      '      intent: "Verify not on main/develop"',
      '      commands: [git branch --show-current, git status]',
      '      produces: [branch-name, branch-state, commit-list]',
      '    - id: gather-context',
      '      role: system',
      '      intent: "Collect diff stats and test results"',
      '      commands: [git diff main..HEAD --stat, npm test, npm run lint]',
      '      requires: [branch-state]',
      '      produces: [diff-summary, test-result, lint-result]',
      '    - id: generate-description',
      '      role: system',
      '      intent: "Build structured PR description"',
      '      requires: [commit-list, diff-summary, test-result, lint-result]',
      '      produces: [pr-description, pr-title]',
      '      gate: true',
      '    - id: create-pr',
      '      role: system',
      '      intent: "Push branch and create PR via gh CLI"',
      '      commands: [git push -u origin, gh pr create]',
      '      requires: [pr-description, pr-title, branch-name]',
      '      produces: [pr-url]',
      '    - id: post-creation',
      '      role: system',
      '      intent: "Display PR URL and suggest next steps"',
      '      requires: [pr-url]',
      '      produces: [summary]',
      '      gate: true',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    expect(skill.workflow).not.toBeNull();
    expect(skill.workflow.steps).toHaveLength(5);

    const errors = validateWorkflow(skill.workflow);
    expect(errors).toEqual([]);

    // All steps are system role
    skill.workflow.steps.forEach(step => {
      expect(step.role).toBe('system');
    });
  });
});

describe('validateWorkflow — dev-flow workflow', () => {
  it('validates the dev-flow workflow (2 system steps)', () => {
    const content = [
      '---',
      'name: dev-flow',
      'description: "Shows pipeline phase"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: read-state',
      '      role: system',
      '      intent: "Read SESSION.md for current phase"',
      '      commands: [cat SESSION.md]',
      '      produces: [session-state, feature-name, current-phase]',
      '    - id: present-flow',
      '      role: system',
      '      intent: "Display pipeline progress"',
      '      requires: [session-state, feature-name, current-phase]',
      '      produces: [flow-display]',
      '      gate: true',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    expect(skill.workflow).not.toBeNull();
    expect(skill.workflow.steps).toHaveLength(2);

    const errors = validateWorkflow(skill.workflow);
    expect(errors).toEqual([]);
  });
});

describe('validateWorkflow — guild-specialize workflow', () => {
  it('validates the guild-specialize workflow (6 steps with tech-lead role)', () => {
    const content = [
      '---',
      'name: guild-specialize',
      'description: "Enriches CLAUDE.md"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: read-base',
      '      role: system',
      '      intent: "Read config files"',
      '      commands: [cat CLAUDE.md, cat PROJECT.md, cat SESSION.md]',
      '      produces: [claude-md, project-md, session-md]',
      '    - id: explore-project',
      '      role: system',
      '      intent: "Scan project structure"',
      '      commands: [ls -R src/, cat package.json]',
      '      produces: [detected-stack, detected-architecture, detected-conventions]',
      '      gate: true',
      '    - id: enrich-claude-md',
      '      role: tech-lead',
      '      intent: "Replace placeholders in CLAUDE.md"',
      '      requires: [claude-md, detected-stack, detected-architecture, detected-conventions]',
      '      produces: [enriched-claude-md]',
      '      model-tier: reasoning',
      '    - id: specialize-agents',
      '      role: tech-lead',
      '      intent: "Add project-specific context to agents"',
      '      requires: [detected-stack, detected-architecture, detected-conventions]',
      '      produces: [specialized-agents]',
      '      model-tier: execution',
      '    - id: confirm',
      '      role: system',
      '      intent: "Present specialization summary"',
      '      requires: [enriched-claude-md, specialized-agents]',
      '      produces: [specialization-summary]',
      '      gate: true',
      '    - id: commit-enrichment',
      '      role: system',
      '      intent: "Commit enriched files"',
      '      commands: [git add CLAUDE.md .claude/agents/*.md, git commit]',
      '      requires: [enriched-claude-md, specialized-agents]',
      '      produces: [enrichment-commit]',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    expect(skill.workflow).not.toBeNull();
    expect(skill.workflow.steps).toHaveLength(6);

    const errors = validateWorkflow(skill.workflow);
    expect(errors).toEqual([]);

    // Verify tech-lead steps have model-tier
    const enrichStep = skill.workflow.steps[2];
    expect(enrichStep.role).toBe('tech-lead');
    expect(enrichStep.modelTier).toBe('reasoning');

    const specializeStep = skill.workflow.steps[3];
    expect(specializeStep.role).toBe('tech-lead');
    expect(specializeStep.modelTier).toBe('execution');
  });
});

describe('validateWorkflow — new-feature workflow', () => {
  it('validates the new-feature workflow (5 steps with condition)', () => {
    const content = [
      '---',
      'name: new-feature',
      'description: "Creates branch and scaffold"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: get-name',
      '      role: system',
      '      intent: "Obtain feature name"',
      '      produces: [feature-name, feature-description]',
      '      gate: true',
      '    - id: create-branch',
      '      role: system',
      '      intent: "Create feature branch"',
      '      commands: [git checkout -b]',
      '      requires: [feature-name]',
      '      produces: [branch-name]',
      '    - id: update-session',
      '      role: system',
      '      intent: "Update SESSION.md"',
      '      requires: [feature-name, feature-description, branch-name]',
      '      produces: [session-update]',
      '      gate: true',
      '    - id: create-issue',
      '      role: system',
      '      intent: "Create GitHub Issue"',
      '      commands: [gh issue create]',
      '      requires: [feature-name, feature-description]',
      '      produces: [issue-url]',
      '      condition: user-wants-issue',
      '    - id: confirm',
      '      role: system',
      '      intent: "Confirm setup complete"',
      '      requires: [branch-name, session-update]',
      '      produces: [confirmation]',
      '      gate: true',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    expect(skill.workflow).not.toBeNull();
    expect(skill.workflow.steps).toHaveLength(5);

    const errors = validateWorkflow(skill.workflow);
    expect(errors).toEqual([]);

    // Verify conditional step
    const issueStep = skill.workflow.steps[3];
    expect(issueStep.condition).toBe('user-wants-issue');
  });
});

describe('validateWorkflow — session-end workflow', () => {
  it('validates the session-end workflow (4 steps with condition)', () => {
    const content = [
      '---',
      'name: session-end',
      'description: "Saves state to SESSION.md"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: gather-state',
      '      role: system',
      '      intent: "Analyze current work state"',
      '      commands: [git status, git log --oneline -10]',
      '      produces: [work-state, modified-files, session-commits]',
      '    - id: update-session',
      '      role: system',
      '      intent: "Write state to SESSION.md"',
      '      requires: [work-state, modified-files, session-commits]',
      '      produces: [session-update]',
      '      gate: true',
      '    - id: commit-wip',
      '      role: system',
      '      intent: "Create WIP checkpoint commit"',
      '      commands: [git add -A, git commit]',
      '      requires: [modified-files]',
      '      produces: [wip-commit]',
      '      condition: has-uncommitted-changes',
      '    - id: confirm',
      '      role: system',
      '      intent: "Confirm session saved"',
      '      requires: [session-update]',
      '      produces: [confirmation]',
      '      gate: true',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    expect(skill.workflow).not.toBeNull();
    expect(skill.workflow.steps).toHaveLength(4);

    const errors = validateWorkflow(skill.workflow);
    expect(errors).toEqual([]);

    // Verify conditional WIP step
    const wipStep = skill.workflow.steps[2];
    expect(wipStep.condition).toBe('has-uncommitted-changes');
  });
});

describe('validateWorkflow — session-start workflow', () => {
  it('validates the session-start workflow (5 system steps)', () => {
    const content = [
      '---',
      'name: session-start',
      'description: "Loads context from SESSION.md"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: load-context',
      '      role: system',
      '      intent: "Read project context files"',
      '      commands: [cat CLAUDE.md, cat SESSION.md, cat PROJECT.md]',
      '      produces: [claude-md, session-md, project-md]',
      '    - id: detect-resumable',
      '      role: system',
      '      intent: "Check for wip: checkpoint commits"',
      '      commands: [git branch --list "feature/*" --list "fix/*", git log --oneline -1]',
      '      requires: [session-md]',
      '      produces: [resumable-branches, last-phase]',
      '    - id: present-state',
      '      role: system',
      '      intent: "Display previous session summary"',
      '      requires: [session-md, resumable-branches]',
      '      produces: [state-display]',
      '      gate: true',
      '    - id: suggest-continuation',
      '      role: system',
      '      intent: "Suggest skill to continue"',
      '      requires: [state-display]',
      '      produces: [suggested-action]',
      '      gate: true',
      '    - id: update-session',
      '      role: system',
      '      intent: "Update SESSION.md with current date"',
      '      requires: [session-md]',
      '      produces: [session-updated]',
      '      gate: true',
      '---',
      '',
    ].join('\n');

    const skill = parseSkill(content);
    expect(skill.workflow).not.toBeNull();
    expect(skill.workflow.steps).toHaveLength(5);

    const errors = validateWorkflow(skill.workflow);
    expect(errors).toEqual([]);

    // All steps are system role
    skill.workflow.steps.forEach(step => {
      expect(step.role).toBe('system');
    });
  });
});

describe('validateWorkflow — status workflow', () => {
  it('validates the status workflow (3 system steps)', () => {
    const content = [
      '---',
      'name: status',
      'description: "Shows project state"',
      'user-invocable: true',
      'workflow:',
      '  version: 1',
      '  steps:',
      '    - id: read-state',
      '      role: system',
      '      intent: "Read project state files"',
      '      commands: [cat CLAUDE.md, cat PROJECT.md, cat SESSION.md]',
      '      produces: [claude-md, project-md, session-md]',
      '    - id: scan-resources',
      '      role: system',
      '      intent: "List available agents and skills"',
      '      commands: [ls .claude/agents/, ls .claude/skills/]',
      '      produces: [agent-list, skill-list]',
      '    - id: present-status',
      '      role: system',
      '      intent: "Display project summary"',
      '      requires: [project-md, session-md, agent-list, skill-list]',
      '      produces: [status-display]',
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
