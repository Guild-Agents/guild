#!/usr/bin/env tsx
/**
 * Smoke test: runs GitHub sensors → heuristic classifier (Layers 1+2, $0).
 * No Anthropic or Telegram tokens needed.
 *
 * Usage:
 *   GITHUB_TOKEN=$(gh auth token) tsx scripts/smoke-classifier.ts
 */
import { checkCiStatus } from '../src/sensors/github-ci.js';
import { checkPrStatus } from '../src/sensors/github-prs.js';
import { classify } from '../src/classifier.js';
import type { GitHubConfig } from '../src/sensors/types.js';

const token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER || 'Guild-Agents';
const repo = process.env.GITHUB_REPO || 'guild';

if (!token) {
  console.error('Missing GITHUB_TOKEN. Run with: GITHUB_TOKEN=$(gh auth token) tsx scripts/smoke-classifier.ts');
  process.exit(1);
}

const github: GitHubConfig = { token, owner, repo };

console.log(`\n🔍 Smoke: Sensors → Classifier for ${owner}/${repo}\n`);

const [ci, prs] = await Promise.all([
  checkCiStatus(github),
  checkPrStatus(github),
]);

for (const signal of [ci, prs]) {
  const result = classify(signal);
  console.log(`--- ${signal.source} ---`);
  console.log(`  Sensor status: ${signal.status}`);
  if (signal.payload) console.log(`  Payload: ${signal.payload}`);
  console.log(`  Classification: severity=${result.severity}, confidence=${result.confidence}`);
  console.log(`  Reason: ${result.reason}`);
  console.log();
}

console.log('✅ Layers 1+2 smoke test complete (sensors → classifier, $0 cost)\n');
