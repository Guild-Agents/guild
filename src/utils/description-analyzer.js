/**
 * description-analyzer.js — Analyzes keyword gaps in skill descriptions.
 *
 * Uses token analysis to identify which keywords are missing from
 * skill descriptions based on failed trigger tests. No LLM required.
 */

import { tokenize } from './trigger-matcher.js';

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'in', 'on', 'to', 'of', 'for', 'and', 'or', 'an',
  'it', 'by', 'as', 'be', 'do', 'if', 'no', 'so', 'up', 'we', 'my',
  'use', 'when', 'with', 'from', 'this', 'that', 'will', 'can', 'has',
  'not', 'are', 'was', 'but', 'all', 'any', 'its', 'you', 'your',
  'want', 'need', 'just', 'let', 'get', 'make', 'help', 'me',
]);

/**
 * Checks if a token matches any description token (full or substring).
 */
function tokenMatchesDescription(token, descTokens) {
  for (const dt of descTokens) {
    if (dt === token || dt.includes(token) || token.includes(dt)) {
      return true;
    }
  }
  return false;
}

/**
 * Analyzes gaps between failed trigger prompts and a skill description.
 * @param {Array} triggerResults - Results from runTriggerTests
 * @param {string} description - Skill description
 * @returns {{ missingKeywords: string[], failedPrompts: string[] }}
 */
export function analyzeGaps(triggerResults, description) {
  const failedPositives = triggerResults.filter(r => r.expected && !r.actual);

  if (failedPositives.length === 0) {
    return { missingKeywords: [], failedPrompts: [] };
  }

  const descTokens = tokenize(description).filter(w => !STOP_WORDS.has(w));
  const missingKeywords = [];
  const failedPrompts = [];

  for (const result of failedPositives) {
    failedPrompts.push(result.prompt);
    const promptTokens = tokenize(result.prompt).filter(w => !STOP_WORDS.has(w));

    for (const token of promptTokens) {
      if (!tokenMatchesDescription(token, descTokens)) {
        missingKeywords.push(token);
      }
    }
  }

  return { missingKeywords, failedPrompts };
}

/**
 * Generates keyword suggestions from gap analysis results.
 * @param {Array<{ skill: string, currentDescription: string, missingKeywords: string[], failedPrompts: string[] }>} gapsList
 * @returns {Array<{ skill: string, currentDescription: string, suggestedKeywords: Array<{ word: string, confidence: string }> }>}
 */
export function generateSuggestions(gapsList) {
  const suggestions = [];

  for (const gaps of gapsList) {
    if (gaps.missingKeywords.length === 0) continue;

    const freq = new Map();
    for (const word of gaps.missingKeywords) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }

    const suggestedKeywords = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([word, count]) => ({
        word,
        confidence: count >= 2 ? 'high' : 'medium',
      }));

    suggestions.push({
      skill: gaps.skill,
      currentDescription: gaps.currentDescription,
      suggestedKeywords,
    });
  }

  return suggestions;
}
