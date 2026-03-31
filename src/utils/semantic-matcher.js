/**
 * semantic-matcher.js — LLM-based trigger scoring via Anthropic Haiku.
 *
 * Calls the Anthropic Messages API to score how well a user prompt
 * matches a skill. Optional complement to the keyword matcher.
 */

export const SEMANTIC_MODEL_DEFAULT = 'claude-haiku-4-5-20251001';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are a skill-routing classifier. Given a user prompt and a skill name + description, score how likely the user wants to trigger this skill.

Respond with ONLY a JSON object, no other text:
{"score": <0-100>, "reasoning": "<one sentence>"}

Score guide:
- 90-100: Clear, direct match
- 60-89: Likely match, related intent
- 30-59: Possible but ambiguous
- 0-29: Unrelated`;

/**
 * Scores a prompt against a skill using the Anthropic Messages API.
 * @param {string} prompt - User prompt to classify
 * @param {string} skillName - Skill identifier
 * @param {string} skillDescription - Skill description text
 * @returns {Promise<{ score: number, reasoning: string, error?: boolean }>}
 */
export async function scoreMatchSemantic(prompt, skillName, skillDescription) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.GUILD_SEMANTIC_MODEL || SEMANTIC_MODEL_DEFAULT;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 100,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `User prompt: "${prompt}"\nSkill: ${skillName}\nDescription: ${skillDescription}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return { score: 0, reasoning: `API error: ${response.status} ${response.statusText}`, error: true };
    }

    const data = await response.json();
    const text = data.content[0].text;

    return parseResponse(text);
  } catch (err) {
    return { score: 0, reasoning: err.message, error: true };
  }
}

/**
 * Parses the LLM response, extracting JSON with fallback.
 * @param {string} text
 * @returns {{ score: number, reasoning: string, error?: boolean }}
 */
function parseResponse(text) {
  // Try direct parse first
  try {
    const parsed = JSON.parse(text);
    return { score: parsed.score / 100, reasoning: parsed.reasoning };
  } catch {
    // Fallback: extract first JSON object from text
    const match = text.match(/\{[^}]+\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return { score: parsed.score / 100, reasoning: parsed.reasoning };
      } catch {
        // Fall through
      }
    }
    return { score: 0, reasoning: 'parse-error', error: true };
  }
}
