/**
 * accounting.js — Token usage recording, persistence, and aggregation.
 *
 * Persists usage data to .claude/guild/usage.json.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { estimateCost } from './pricing.js';

const USAGE_PATH = join('.claude', 'guild', 'usage.json');

export function emptyUsage() {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    entries: [],
    totals: {
      totalTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUSD: 0,
      tokensByModel: {},
      tokensByTier: {},
      tokensByWorkflow: {},
      workflowCount: 0,
    },
  };
}

export function createEntry({ workflow, agent, tier, model, inputTokens, outputTokens }) {
  const totalTokens = inputTokens + outputTokens;
  return {
    timestamp: new Date().toISOString(),
    workflow,
    agent,
    tier,
    model,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUSD: estimateCost(model, inputTokens, outputTokens),
  };
}

export function loadUsage(root) {
  const filePath = join(root, USAGE_PATH);
  if (!existsSync(filePath)) return emptyUsage();
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return emptyUsage();
  }
}

export function saveUsage(root, usage) {
  const filePath = join(root, USAGE_PATH);
  mkdirSync(dirname(filePath), { recursive: true });
  usage.lastUpdated = new Date().toISOString();
  writeFileSync(filePath, JSON.stringify(usage, null, 2) + '\n');
}

function updateTotals(totals, entry) {
  totals.totalTokens += entry.totalTokens;
  totals.totalInputTokens += entry.inputTokens;
  totals.totalOutputTokens += entry.outputTokens;
  totals.totalCostUSD += entry.estimatedCostUSD;
  totals.tokensByModel[entry.model] = (totals.tokensByModel[entry.model] || 0) + entry.totalTokens;
  totals.tokensByTier[entry.tier] = (totals.tokensByTier[entry.tier] || 0) + entry.totalTokens;
  totals.tokensByWorkflow[entry.workflow] = (totals.tokensByWorkflow[entry.workflow] || 0) + entry.totalTokens;
  totals.workflowCount += 1;
}

export function recordStep(root, params) {
  const usage = loadUsage(root);
  const entry = createEntry(params);
  usage.entries.push(entry);
  updateTotals(usage.totals, entry);
  saveUsage(root, usage);
}

const PROFILES = {
  max: { reasoning: 'claude-opus-4-6', execution: 'claude-sonnet-4-5', routine: 'claude-haiku-4-5' },
  pro: { reasoning: 'claude-sonnet-4-5', execution: 'claude-sonnet-4-5', routine: 'claude-haiku-4-5' },
  'all-opus': { reasoning: 'claude-opus-4-6', execution: 'claude-opus-4-6', routine: 'claude-opus-4-6' },
};

export function aggregate(root, period) {
  const usage = loadUsage(root);
  const now = new Date();
  let cutoff;

  switch (period) {
    case 'today':
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      break;
    case 'month':
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      break;
    default:
      cutoff = new Date(0);
  }

  const filtered = usage.entries.filter(e => new Date(e.timestamp) >= cutoff);

  const totals = {
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUSD: 0,
    tokensByModel: {},
    tokensByTier: {},
    tokensByWorkflow: {},
    workflowCount: 0,
  };

  for (const entry of filtered) {
    updateTotals(totals, entry);
  }

  return totals;
}

export function estimateWithProfile(entries, profileName) {
  const profile = PROFILES[profileName];
  if (!profile) return 0;

  let cost = 0;
  for (const entry of entries) {
    const model = profile[entry.tier] || entry.model;
    cost += estimateCost(model, entry.inputTokens, entry.outputTokens);
  }
  return cost;
}
