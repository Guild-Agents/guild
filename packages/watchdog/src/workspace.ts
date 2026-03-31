import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import type { HeartbeatState } from './heartbeat.js';

export function writeEvent(
  workspacePath: string,
  source: string,
  severity: string,
  content: string,
): string {
  const eventsDir = path.join(workspacePath, 'events');
  mkdirSync(eventsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}_${source}.md`;
  const filePath = path.join(eventsDir, filename);

  writeFileSync(filePath, content, 'utf8');
  return filePath;
}

export function isDuplicate(
  workspacePath: string,
  source: string,
  windowHours: number,
): boolean {
  const eventsDir = path.join(workspacePath, 'events');
  if (!existsSync(eventsDir)) return false;

  const files = readdirSync(eventsDir).filter(f => f.endsWith('.md') && f.includes(`_${source}`));
  if (files.length === 0) return false;

  const now = Date.now();
  const windowMs = windowHours * 60 * 60 * 1000;

  for (const file of files) {
    const filePath = path.join(eventsDir, file);
    const stat = statSync(filePath);
    if (now - stat.mtimeMs < windowMs) {
      return true;
    }
  }

  return false;
}

export function loadHeartbeatState(workspacePath: string): HeartbeatState | null {
  const filePath = path.join(workspacePath, 'heartbeat-state.json');
  if (!existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as HeartbeatState;
  } catch {
    return null;
  }
}

export function saveHeartbeatState(workspacePath: string, state: HeartbeatState): void {
  const filePath = path.join(workspacePath, 'heartbeat-state.json');
  writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}

export function loadWorkspaceFile(workspacePath: string, filename: string): string {
  const filePath = path.join(workspacePath, filename);
  if (!existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf8');
}
