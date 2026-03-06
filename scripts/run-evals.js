#!/usr/bin/env node

/**
 * Runs skill evals and reports results.
 * Usage: node scripts/run-evals.js [skill-name]
 * If no skill name given, runs all skills that have evals.
 */

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEvals, runEvals } from '../src/utils/eval-runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

const skillArg = process.argv[2];

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
      const icon = evalResult.passed ? '  \u2705' : '  \u274C';
      console.log(`${icon} ${evalResult.description}`);
      if (!evalResult.passed) {
        for (const exp of evalResult.expectations.filter(e => !e.passed)) {
          console.log(`     \u21B3 ${exp.text}: ${exp.evidence}`);
        }
      }
      if (evalResult.passed) totalPassed++;
      else totalFailed++;
    }
  } catch (err) {
    console.error(`\n${skill}: ERROR \u2014 ${err.message}`);
    totalFailed++;
  }
}

console.log(`\n${totalPassed + totalFailed} evals: ${totalPassed} passed, ${totalFailed} failed`);
if (totalFailed > 0) process.exit(1);
