/**
 * eval.js — Run skill structural evaluations.
 *
 * Usage:
 *   guild eval                — Run all skills that have evals
 *   guild eval build-feature  — Run evals for a specific skill
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEvals, runEvals } from '../utils/eval-runner.js';
import { loadTriggers, runTriggerTests, computeAccuracy, loadAllSkillDescriptions } from '../utils/trigger-runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'templates', 'skills');

/**
 * Runs skill evaluations.
 * @param {string} [skillName] - Specific skill to evaluate, or all if omitted
 */
export async function runEval(skillName) {
  const skills = skillName
    ? [skillName]
    : readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(name => loadEvals(name) !== null);

  p.intro(chalk.bold.cyan(`Guild Eval — ${skillName || 'all skills'}`));

  let totalPassed = 0;
  let totalFailed = 0;

  for (const skill of skills) {
    try {
      const results = runEvals(skill);
      for (const evalResult of results.results) {
        if (evalResult.passed) {
          p.log.success(`${chalk.gray(skill)} ${evalResult.description}`);
          totalPassed++;
        } else {
          p.log.error(`${chalk.gray(skill)} ${evalResult.description}`);
          for (const exp of evalResult.expectations.filter(e => !e.passed)) {
            p.log.info(chalk.red(`  ↳ ${exp.text}: ${exp.evidence}`));
          }
          totalFailed++;
        }
      }
    } catch (err) {
      p.log.error(`${skill}: ${err.message}`);
      totalFailed++;
    }
  }

  const summary = `${totalPassed + totalFailed} evals: ${chalk.green(`${totalPassed} passed`)}${totalFailed > 0 ? `, ${chalk.red(`${totalFailed} failed`)}` : ''}`;
  p.outro(summary);

  if (totalFailed > 0) process.exit(1);
}

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
  const benchmarkDir = join(__dirname, '..', '..', 'benchmarks');
  const benchmarkPath = join(benchmarkDir, 'benchmark.json');
  const reportPath = join(benchmarkDir, 'benchmark.md');

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
  const entries = JSON.parse(readFileSync(benchmarkPath, 'utf8'));
  const previous = entries.length >= 2 ? entries[entries.length - 2] : null;

  const report = generateReport(entry, previous);
  writeFileSync(reportPath, report);
  p.log.info(chalk.gray(`Benchmark recorded → benchmarks/benchmark.json`));

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
