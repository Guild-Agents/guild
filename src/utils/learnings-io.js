/**
 * learnings-io.js — File I/O operations for compound learnings.
 *
 * Read, write, init, exists, and delete operations for .claude/guild/learnings.md.
 * Separated from the pure functions in learnings.js following the trace.js pattern.
 *
 * NOTE: File locking for concurrent access is intentionally omitted.
 * Concurrent workflow execution is a v2 concern — current Guild workflows
 * are single-session and sequential.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { GUILD_LEARNINGS_PATH, renderEmptyLearnings } from './learnings.js';

/**
 * Reads the learnings file from disk.
 * Returns the raw content as a string, or null if the file does not exist.
 * @param {string} [filePath] - Override path (default: GUILD_LEARNINGS_PATH)
 * @returns {string | null}
 */
export function readLearnings(filePath) {
  const target = filePath || GUILD_LEARNINGS_PATH;
  if (!existsSync(target)) return null;
  return readFileSync(target, 'utf8');
}

/**
 * Writes content to the learnings file.
 * Creates parent directories if needed.
 * @param {string} content - Markdown content to write
 * @param {string} [filePath] - Override path (default: GUILD_LEARNINGS_PATH)
 */
export function writeLearnings(content, filePath) {
  const target = filePath || GUILD_LEARNINGS_PATH;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
}

/**
 * Checks whether the learnings file exists on disk.
 * @param {string} [filePath] - Override path (default: GUILD_LEARNINGS_PATH)
 * @returns {boolean}
 */
export function learningsExist(filePath) {
  const target = filePath || GUILD_LEARNINGS_PATH;
  return existsSync(target);
}

/**
 * Initializes the learnings file with empty scaffold content.
 * No-ops if the file already exists.
 * @param {string} [projectName='Project'] - Project name for the header
 * @param {string} [filePath] - Override path (default: GUILD_LEARNINGS_PATH)
 * @returns {{ created: boolean }}
 */
export function initLearnings(projectName = 'Project', filePath) {
  const target = filePath || GUILD_LEARNINGS_PATH;
  if (existsSync(target)) return { created: false };
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, renderEmptyLearnings(projectName), 'utf8');
  return { created: true };
}

/**
 * Deletes the learnings file from disk.
 * Returns { deleted: false } if the file does not exist (no throw).
 * @param {string} [filePath] - Override path (default: GUILD_LEARNINGS_PATH)
 * @returns {{ deleted: boolean }}
 */
export function deleteLearnings(filePath) {
  const target = filePath || GUILD_LEARNINGS_PATH;
  if (!existsSync(target)) return { deleted: false };
  unlinkSync(target);
  return { deleted: true };
}
