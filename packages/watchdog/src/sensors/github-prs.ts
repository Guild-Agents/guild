import type { SensorResult, GitHubConfig } from './types.js';

const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours
const FAILING_CHECK_MIN_AGE_MS = 60 * 60 * 1000; // 1 hour
const MAX_STATUS_CHECKS = 5; // cap API calls for commit status

type FetchFn = typeof globalThis.fetch;

interface PullRequest {
  title: string;
  created_at: string;
  html_url: string;
  draft: boolean;
  user: { login: string };
  labels: Array<{ name: string }>;
  head: { sha: string };
}

interface CombinedStatus {
  state: 'success' | 'failure' | 'pending' | 'error';
}

export async function checkPrStatus(
  github: GitHubConfig,
  fetchFn: FetchFn = globalThis.fetch,
): Promise<SensorResult> {
  const url = `https://api.github.com/repos/${github.owner}/${github.repo}/pulls?state=open&per_page=30`;
  const headers = {
    Authorization: `Bearer ${github.token}`,
    Accept: 'application/vnd.github.v3+json',
  };

  try {
    const response = await fetchFn(url, { headers });

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

    // Check for stale Renovate PRs
    for (const pr of prs) {
      const isRenovate = pr.user.login === 'renovate[bot]';
      const ageMs = now - new Date(pr.created_at).getTime();

      if (isRenovate && ageMs > STALE_THRESHOLD_MS) {
        issues.push(`Stale Renovate PR (${Math.floor(ageMs / 3600000)}h): ${pr.title} — ${pr.html_url}`);
      }
    }

    // Check for failing status checks on non-draft, non-Renovate PRs older than 1 hour
    const checkablePrs = prs
      .filter(pr => !pr.draft && pr.user.login !== 'renovate[bot]')
      .filter(pr => now - new Date(pr.created_at).getTime() > FAILING_CHECK_MIN_AGE_MS)
      .slice(0, MAX_STATUS_CHECKS);

    const statusResults = await Promise.all(
      checkablePrs.map(async (pr) => {
        const statusUrl = `https://api.github.com/repos/${github.owner}/${github.repo}/commits/${pr.head.sha}/status`;
        try {
          const statusResponse = await fetchFn(statusUrl, { headers });
          if (!statusResponse.ok) return null;
          const status = await statusResponse.json() as CombinedStatus;
          return { pr, status };
        } catch {
          return null;
        }
      }),
    );

    for (const result of statusResults) {
      if (result && result.status.state === 'failure') {
        issues.push(`Failing checks on PR: ${result.pr.title} — ${result.pr.html_url}`);
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
