/**
 * trigger-matcher.js — Scores prompts against skill descriptions.
 *
 * Uses keyword overlap scoring to determine how well a user prompt
 * matches a skill's description. No LLM calls — purely programmatic.
 */

/**
 * Tokenizes text into lowercase words, stripping punctuation.
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[—–\-/]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'in', 'on', 'to', 'of', 'for', 'and', 'or', 'an',
  'it', 'by', 'as', 'be', 'do', 'if', 'no', 'so', 'up', 'we', 'my',
  'use', 'when', 'with', 'from', 'this', 'that', 'will', 'can', 'has',
  'not', 'are', 'was', 'but', 'all', 'any', 'its', 'you', 'your',
  'skill', 'discipline',
]);

/**
 * Scores how well a prompt matches a description.
 * Returns 0-1.
 */
export function scoreMatch(prompt, description) {
  const promptTokens = tokenize(prompt).filter(w => !STOP_WORDS.has(w));
  if (promptTokens.length === 0) return 0;

  const descTokens = new Set(tokenize(description).filter(w => !STOP_WORDS.has(w)));

  let matches = 0;
  for (const token of promptTokens) {
    if (descTokens.has(token)) {
      matches++;
    } else {
      for (const dt of descTokens) {
        if (dt.includes(token) || token.includes(dt)) {
          matches += 0.5;
          break;
        }
      }
    }
  }

  return matches / promptTokens.length;
}

/**
 * Ranks all skills by match score descending.
 */
export function rankSkills(prompt, skills) {
  return skills
    .map(s => ({ ...s, score: scoreMatch(prompt, s.description) }))
    .sort((a, b) => b.score - a.score);
}
