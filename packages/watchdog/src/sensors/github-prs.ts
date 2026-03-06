import type { SensorResult, GitHubConfig } from './types.js';

const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

interface PullRequest {
  title: string;
  created_at: string;
  html_url: string;
  user: { login: string };
  labels: Array<{ name: string }>;
}

export async function checkPrStatus(github: GitHubConfig): Promise<SensorResult> {
  const url = `https://api.github.com/repos/${github.owner}/${github.repo}/pulls?state=open&per_page=30`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${github.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return {
        source: 'github-prs',
        status: response.status,
        payload: `GitHub API error: ${response.statusText}`,
        timestamp: Date.now(),
      };
    }

    const prs = await response.json() as PullRequest[];

    if (prs.length === 0) {
      return { source: 'github-prs', status: 200, timestamp: Date.now() };
    }

    const now = Date.now();
    const issues: string[] = [];

    for (const pr of prs) {
      const isRenovate = pr.user.login === 'renovate[bot]';
      const ageMs = now - new Date(pr.created_at).getTime();

      if (isRenovate && ageMs > STALE_THRESHOLD_MS) {
        issues.push(`Stale Renovate PR (${Math.floor(ageMs / 3600000)}h): ${pr.title} — ${pr.html_url}`);
      }
    }

    if (issues.length > 0) {
      return {
        source: 'github-prs',
        status: 500,
        payload: issues.join('\n'),
        timestamp: Date.now(),
      };
    }

    return { source: 'github-prs', status: 200, timestamp: Date.now() };
  } catch (error) {
    return {
      source: 'github-prs',
      status: 503,
      payload: `Network error: ${(error as Error).message}`,
      timestamp: Date.now(),
    };
  }
}
