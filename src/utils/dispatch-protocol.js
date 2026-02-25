/**
 * dispatch-protocol.js — Constants and type definitions for the Guild dispatch protocol.
 *
 * Defines the vocabulary shared by dispatch utilities, workflow parser,
 * model routing, and trace modules. Zero dependencies.
 */

/**
 * Valid model tier values. Each tier maps to a class of model capability.
 * @type {readonly ['reasoning', 'execution', 'routine']}
 */
export const MODEL_TIERS = ['reasoning', 'execution', 'routine'];

/**
 * Valid failure strategy values for workflow steps.
 * - stop: halt the workflow on failure
 * - continue: skip this step and proceed
 * - retry: re-attempt the step up to max-retries
 * @type {readonly ['stop', 'continue', 'retry']}
 */
export const FAILURE_STRATEGIES = ['stop', 'continue', 'retry'];

/**
 * Default tier assignment for each Guild agent role.
 * Used as fallback when neither the workflow step nor the agent frontmatter
 * specifies a tier.
 * @type {Record<string, string>}
 */
export const DEFAULT_AGENT_TIERS = {
  'advisor': 'reasoning',
  'product-owner': 'reasoning',
  'tech-lead': 'reasoning',
  'code-reviewer': 'reasoning',
  'developer': 'execution',
  'bugfix': 'execution',
  'db-migration': 'execution',
  'qa': 'execution',
  'learnings-extractor': 'routine',
};

/**
 * Built-in model profiles mapping tiers to concrete model IDs.
 * @type {Record<string, Record<string, string>>}
 */
export const DEFAULT_MODEL_PROFILES = {
  max: {
    reasoning: 'claude-opus-4-6',
    execution: 'claude-sonnet-4-6',
    routine: 'claude-haiku-4-5',
  },
  pro: {
    reasoning: 'claude-sonnet-4-6',
    execution: 'claude-sonnet-4-6',
    routine: 'claude-haiku-4-5',
  },
};

/**
 * Fallback chain for tier resolution. When a tier's model is unavailable,
 * fall back to the next tier. `null` means no further fallback.
 * @type {Record<string, string|null>}
 */
export const FALLBACK_CHAIN = {
  reasoning: 'execution',
  execution: 'routine',
  routine: null,
};
