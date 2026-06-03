/**
 * session-recap.mjs — Thin IO shell for the SessionStart hook.
 * Reads stdin JSON, finds the previous transcript, prints recap to stdout.
 * ALWAYS exits 0. NEVER throws out of main(). Read-only, no network/writes.
 */

import { readdirSync, statSync, openSync, readSync, closeSync, realpathSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseLine, buildRecap } from './transcript-recap.mjs';

/**
 * Picks the previous transcript file (max mtime, excluding current session).
 * Returns the dir entry with max mtime, or null if none found.
 */
export function pickPreviousTranscript(dirEntries, currentSessionId) {
  if (!Array.isArray(dirEntries) || dirEntries.length === 0) return null;

  let best = null;
  for (const entry of dirEntries) {
    if (!entry || !entry.name || !entry.name.endsWith('.jsonl')) continue;
    // Exclude current session by sessionId embedded in filename or by exact match
    if (currentSessionId && entry.name.includes(currentSessionId)) continue;
    if (best === null || entry.mtime > best.mtime) {
      best = entry;
    }
  }
  return best;
}

/** Maximum bytes to read from the tail of a transcript file (256 KB). */
const MAX_TAIL_BYTES = 256 * 1024;

/**
 * Reads the previous transcript in projectDir and builds a recap string.
 * Returns null when nothing useful found.
 * Reading is bounded to the last MAX_TAIL_BYTES so cost is O(constant)
 * regardless of transcript file size.
 */
export async function recapForProject({ projectDir, currentSessionId, now }) {
  const entries = [];
  try {
    const files = readdirSync(projectDir);
    for (const name of files) {
      if (!name.endsWith('.jsonl')) continue;
      try {
        const fullPath = join(projectDir, name);
        const st = statSync(fullPath);
        entries.push({ name, path: fullPath, mtime: st.mtimeMs });
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    return null;
  }

  const prev = pickPreviousTranscript(entries, currentSessionId);
  if (!prev) return null;

  let rawLines;
  try {
    const st = statSync(prev.path);
    const fileSize = st.size;
    const readLen = Math.min(fileSize, MAX_TAIL_BYTES);
    const position = fileSize - readLen;
    const buf = Buffer.allocUnsafe(readLen);
    const fd = openSync(prev.path, 'r');
    try {
      readSync(fd, buf, 0, readLen, position);
    } finally {
      closeSync(fd);
    }
    rawLines = buf.toString('utf8').split('\n');
    // If we didn't start at byte 0, the first entry may be a partial line — discard it
    if (position > 0) {
      rawLines = rawLines.slice(1);
    }
  } catch {
    return null;
  }

  const lines = rawLines.map(parseLine).filter(Boolean);
  return buildRecap(lines, { now: now ?? Date.now() });
}

/**
 * Main entry point. Wraps entire body in try/catch → exit 0 on any error.
 * Reads stdin JSON; if source !== "startup" exits 0 silently.
 */
async function main() {
  // Self-abort ~2s
  const timer = setTimeout(() => process.exit(0), 2000);
  timer.unref();

  try {
    let input = '';
    for await (const chunk of process.stdin) {
      input += chunk;
    }

    let data;
    try {
      data = JSON.parse(input);
    } catch {
      process.exit(0);
    }

    if (!data || data.source !== 'startup') {
      process.exit(0);
    }

    // Resolve project transcript directory from transcript_path.
    // Without transcript_path there is no reliable way to find the right dir — exit cleanly.
    if (!data.transcript_path) {
      process.exit(0);
    }
    const projectDir = dirname(data.transcript_path);

    const currentSessionId = data.session_id || null;
    const recap = await recapForProject({ projectDir, currentSessionId, now: Date.now() });

    if (recap) {
      process.stdout.write(recap + '\n');
    }
    process.exit(0);
  } catch {
    process.exit(0);
  }
}

// Only run main() when this file is executed directly (robust against symlinks)
try {
  const thisFile = fileURLToPath(import.meta.url);
  const argv1 = process.argv[1] ? realpathSync(process.argv[1]) : null;
  if (argv1 && realpathSync(thisFile) === argv1) {
    main();
  }
} catch {
  // If realpathSync fails (e.g. argv[1] doesn't exist yet), fall back gracefully
  if (process.argv[1] && (process.argv[1].endsWith('session-recap.mjs') || import.meta.url === `file://${process.argv[1]}`)) {
    main();
  }
}
