/**
 * trigger-runner.js — Loads and executes trigger tests for skills.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rankSkills } from './trigger-matcher.js';
import { extractFrontmatterBlock, parseYamlFrontmatter } from './workflow-parser.js';

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
 * When matcherType is "keyword" and a test has keywordExpected defined,
 * that value overrides shouldTrigger for accuracy calculation. This lets
 * tests document the ideal (semantic) expectation while being honest
 * about what keyword matching can achieve.
 */
export function runTriggerTests(triggers, allSkills) {
  const threshold = triggers.threshold || 0.3;
  const isKeyword = triggers.matcherType === 'keyword';
  const results = [];

  for (const test of triggers.tests) {
    const ranked = rankSkills(test.prompt, allSkills);
    const targetRank = ranked.findIndex(s => s.name === triggers.skill);
    const targetScore = targetRank >= 0 ? ranked[targetRank].score : 0;

    const actual = targetRank === 0 && targetScore >= threshold;

    const hasOverride = isKeyword && test.keywordExpected !== undefined;
    const expected = hasOverride ? test.keywordExpected : test.shouldTrigger;

    const result = {
      prompt: test.prompt,
      expected,
      actual,
      score: targetScore,
      rank: targetRank + 1,
    };

    if (hasOverride) {
      result.semanticExpected = test.shouldTrigger;
    }

    results.push(result);
  }

  return results;
}

/**
 * Computes precision, recall, and accuracy from trigger test results.
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
