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
