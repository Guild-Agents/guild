/**
 * pricing.js — Model pricing table and cost calculation.
 *
 * Prices per million tokens (USD).
 * Source: https://docs.anthropic.com/en/docs/about-claude/models
 */

export const DEFAULT_PRICING = {
  'claude-opus-4-6': { input: 15.00, output: 75.00 },
  'claude-sonnet-4-5': { input: 3.00, output: 15.00 },
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
};

const SHORT_NAMES = {
  'claude-opus-4-6': 'Opus',
  'claude-sonnet-4-5': 'Sonnet',
  'claude-haiku-4-5': 'Haiku',
};

export function estimateCost(model, inputTokens, outputTokens) {
  const pricing = DEFAULT_PRICING[model];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export function getModelShortName(model) {
  return SHORT_NAMES[model] || model;
}
