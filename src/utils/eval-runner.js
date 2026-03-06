/**
 * eval-runner.js — Skill evaluation framework for Guild.
 *
 * Runs assertions against parsed skill workflows to verify
 * structural correctness. Compatible with anthropics/skills eval format.
 */

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
