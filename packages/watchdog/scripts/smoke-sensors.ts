#!/usr/bin/env tsx
/**
 * Smoke test: runs GitHub sensors only (no Anthropic/Telegram needed).
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx GITHUB_OWNER=Guild-Agents GITHUB_REPO=guild tsx scripts/smoke-sensors.ts
 *
 * Or with gh CLI token:
 *   GITHUB_TOKEN=$(gh auth token) GITHUB_OWNER=Guild-Agents GITHUB_REPO=guild tsx scripts/smoke-sensors.ts
 */
import { checkCiStatus } from '../src/sensors/github-ci.js';
import { checkPrStatus } from '../src/sensors/github-prs.js';
import type { GitHubConfig } from '../src/sensors/types.js';

const token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER || 'Guild-Agents';
const repo = process.env.GITHUB_REPO || 'guild';

if (!token) {
  console.error('Missing GITHUB_TOKEN. Run with: GITHUB_TOKEN=$(gh auth token) tsx scripts/smoke-sensors.ts');
  process.exit(1);
}

const github: GitHubConfig = { token, owner, repo };

console.log(`\n🔍 Smoke testing sensors for ${owner}/${repo}...\n`);

const [ci, prs] = await Promise.all([
  checkCiStatus(github),
  checkPrStatus(github),
]);

console.log('--- CI Sensor ---');
console.log(`  Status: ${ci.status}`);
if (ci.payload) console.log(`  Payload: ${ci.payload}`);

console.log('\n--- PR Sensor ---');
console.log(`  Status: ${prs.status}`);
if (prs.payload) console.log(`  Payload: ${prs.payload}`);

const allGreen = ci.status === 200 && prs.status === 200;
console.log(`\n${allGreen ? '✅ All sensors green' : '⚠️  Issues detected'}\n`);
