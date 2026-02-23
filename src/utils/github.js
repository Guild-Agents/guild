/**
 * github.js — GitHub CLI (gh) integration
 *
 * Requires the user to have gh installed and authenticated.
 * All operations are non-blocking — if gh is not available,
 * Guild works normally without GitHub integration.
 *
 * Uses execFileSync with array-based arguments to prevent shell injection
 * through user-controlled strings (issue titles, bodies, labels).
 */

import { execFileSync } from 'node:child_process';

const LABELS = [
  { name: 'backlog',      color: '8E8E8E', description: 'Documented task, pending start' },
  { name: 'in-progress',  color: '0075CA', description: 'In implementation' },
  { name: 'in-review',    color: 'E4A800', description: 'In QA validation' },
  { name: 'done',         color: '2EA44F', description: 'Completed and merged' },
  { name: 'bug',          color: 'D73A4A', description: 'Bug reported by QA' },
  { name: 'blocked',      color: 'E99695', description: 'Blocked by dependency' },
];

/**
 * Checks if gh CLI is installed and authenticated.
 */
export function isGhAvailable() {
  try {
    execFileSync('gh', ['auth', 'status'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Configures status labels in the GitHub repository.
 */
export async function setupGithubLabels(repoUrl) {
  if (!isGhAvailable()) {
    console.warn('gh CLI not available — skipping label configuration.');
    return;
  }

  const repo = extractRepoFromUrl(repoUrl);
  if (!repo) return;

  for (const label of LABELS) {
    try {
      execFileSync('gh', [
        'label', 'create', label.name,
        '--color', label.color,
        '--description', label.description,
        '--repo', repo,
        '--force',
      ], { stdio: 'ignore' });
    } catch {
      // Label already exists or non-critical error
    }
  }
}

/**
 * Assigns an issue to @me and changes its status label.
 */
export function assignIssue(issueNumber, fromLabel, toLabel) {
  if (!isGhAvailable()) return;

  try {
    execFileSync('gh', [
      'issue', 'assign', String(issueNumber), '--assignee', '@me',
    ], { stdio: 'ignore' });
    execFileSync('gh', [
      'issue', 'edit', String(issueNumber),
      '--add-label', toLabel,
      '--remove-label', fromLabel,
    ], { stdio: 'ignore' });
  } catch {
    // Non-critical
  }
}

/**
 * Adds a comment to an issue.
 */
export function commentIssue(issueNumber, body) {
  if (!isGhAvailable()) return;

  try {
    execFileSync('gh', [
      'issue', 'comment', String(issueNumber), '--body', body,
    ], { stdio: 'ignore' });
  } catch {
    // Non-critical
  }
}

/**
 * Closes an issue with a comment.
 */
export function closeIssue(issueNumber, comment) {
  if (!isGhAvailable()) return;

  try {
    execFileSync('gh', [
      'issue', 'close', String(issueNumber), '--comment', comment,
    ], { stdio: 'ignore' });
  } catch {
    // Non-critical
  }
}

/**
 * Creates a bug issue referencing a parent task.
 */
export function createBugIssue(title, body, parentIssueNumber) {
  if (!isGhAvailable()) return null;

  try {
    const result = execFileSync('gh', [
      'issue', 'create',
      '--title', title,
      '--body', body,
      '--label', 'bug',
    ], { encoding: 'utf8' });
    const issueUrl = result.trim();
    const issueNumber = issueUrl.split('/').pop();

    if (parentIssueNumber) {
      commentIssue(parentIssueNumber, `Bug found: ${issueUrl}`);
    }

    return { number: issueNumber, url: issueUrl };
  } catch {
    return null;
  }
}

/**
 * Extracts "owner/repo" from a GitHub URL.
 */
function extractRepoFromUrl(url) {
  const match = url.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/);
  return match ? match[1] : null;
}
