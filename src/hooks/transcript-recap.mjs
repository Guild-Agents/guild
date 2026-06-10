/**
 * transcript-recap.mjs — PURE module. C1 quarantine.
 * Converts .jsonl transcript lines into a session recap string.
 * NO fs / process / path imports. No side effects.
 */

/**
 * Parses a single raw JSONL line.
 * Returns a parsed object or null on any error.
 */
export function parseLine(rawLine) {
  if (typeof rawLine !== 'string') return null;
  const trimmed = rawLine.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Returns true when a user message content qualifies as a real prompt.
 * Filters out: pure tool_result arrays, isMeta, isSidechain,
 * and command-wrapped strings like <command-name> or <local-command.
 */
function isRealPrompt(line) {
  if (!line || line.type !== 'user') return false;
  if (line.isMeta) return false;
  if (line.isSidechain) return false;

  const content = line.message && line.message.content;
  if (content == null) return false;

  if (Array.isArray(content)) {
    // Must have at least one non-tool_result text block
    const hasReal = content.some(
      (block) => block && block.type !== 'tool_result' && (block.type === 'text' || typeof block === 'string')
    );
    if (!hasReal) return false;
  } else if (typeof content === 'string') {
    // Filter out command-wrapped strings
    if (/<command-(name|message)>|<local-command/.test(content)) return false;
    if (content.trim() === '') return false;
  } else {
    return false;
  }

  return true;
}

/**
 * Extracts text from a content block (string or array of blocks).
 */
function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && (b.type === 'text' || typeof b === 'string'))
      .map((b) => (typeof b === 'string' ? b : b.text || ''))
      .join(' ');
  }
  return '';
}

/**
 * Returns the last real user prompt from an array of parsed lines.
 * Returns null if none found.
 */
export function lastRealUserPrompt(lines) {
  if (!Array.isArray(lines)) return null;
  let result = null;
  for (const line of lines) {
    if (!isRealPrompt(line)) continue;
    const text = extractText(line.message.content);
    if (!text.trim()) continue;
    // Truncate ~200 chars, collapse newlines
    const collapsed = text.replace(/\r?\n+/g, ' ').trim();
    result = collapsed.length > 200 ? collapsed.slice(0, 200) + '…' : collapsed;
  }
  return result;
}

/**
 * Extracts stable signal from transcript lines.
 * Returns { branch, lastTs, promptText } — fields may be null.
 */
export function stableSignal(lines, { now } = {}) {
  if (!Array.isArray(lines)) return { branch: null, lastTs: null, promptText: null };

  let branch = null;
  let maxTs = null;

  for (const line of lines) {
    if (!line) continue;
    if (line.gitBranch != null) branch = line.gitBranch;
    const ts = line.timestamp;
    if (ts != null) {
      if (maxTs === null || ts > maxTs) maxTs = ts;
    }
  }

  let lastTs = null;
  if (maxTs != null) {
    const nowMs = now != null ? Number(now) : Date.now();
    const diffMs = nowMs - Number(maxTs);
    lastTs = formatRelative(diffMs);
  }

  const promptText = lastRealUserPrompt(lines);

  return { branch, lastTs, promptText };
}

/**
 * Formats a millisecond difference as a human-readable relative string.
 */
function formatRelative(diffMs) {
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `~${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `~${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `~${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `~${months} month${months === 1 ? '' : 's'} ago`;
}

/**
 * Extracts enhancement fields from transcript lines.
 * Only reads undocumented fields (custom-title/customTitle, ai-title/aiTitle).
 * Returns { title } or {} — never throws; absent fields => {}.
 */
export function enhancement(lines) {
  if (!Array.isArray(lines)) return {};
  try {
    for (const line of lines) {
      if (!line) continue;
      // Check current format first, then legacy
      const title =
        line['custom-title'] || line['customTitle'] ||
        line['ai-title'] || line['aiTitle'];
      if (title && typeof title === 'string' && title.trim()) {
        return { title: title.trim() };
      }
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Builds a recap string from parsed transcript lines.
 * Returns null when there is nothing useful to show.
 * C2 FLOOR: returns a non-null string when a real user prompt OR a branch exists,
 * even if undocumented enhancement fields are absent.
 */
export function buildRecap(lines, { now } = {}) {
  if (!Array.isArray(lines) || lines.length === 0) return null;

  const signal = stableSignal(lines, { now });
  const enh = enhancement(lines);

  // Floor check: need at least a branch or a prompt
  if (!signal.branch && !signal.promptText) return null;

  // Build the parenthetical context line
  const parts = [];
  if (enh.title) parts.push(enh.title);
  if (signal.branch) parts.push(`branch ${signal.branch}`);
  if (signal.lastTs) parts.push(signal.lastTs);

  const context = parts.length > 0 ? `(${parts.join(', ')})` : '';
  const header = `Previous session ${context}:`.replace(/\s+:/, ':');

  if (signal.promptText) {
    return `${header}\n  Last request: "${signal.promptText}"`;
  }
  return header;
}
