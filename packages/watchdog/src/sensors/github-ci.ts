import type { SensorResult, GitHubConfig } from './types.js';

export async function checkCiStatus(github: GitHubConfig): Promise<SensorResult> {
  const url = `https://api.github.com/repos/${github.owner}/${github.repo}/actions/runs?branch=main&per_page=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${github.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return {
        source: 'github-ci',
        status: response.status,
        payload: `GitHub API error: ${response.statusText}`,
        timestamp: Date.now(),
      };
    }

    const data = await response.json() as { workflow_runs: Array<{ conclusion: string | null; status?: string; html_url: string }> };
    const runs = data.workflow_runs;

    if (runs.length === 0) {
      return { source: 'github-ci', status: 200, timestamp: Date.now() };
    }

    const latest = runs[0];

    if (latest.conclusion === 'success') {
      return { source: 'github-ci', status: 200, timestamp: Date.now() };
    }

    if (latest.conclusion === null) {
      return {
        source: 'github-ci',
        status: 201,
        payload: `CI run in progress: ${latest.html_url}`,
        timestamp: Date.now(),
      };
    }

    return {
      source: 'github-ci',
      status: 500,
      payload: `CI ${latest.conclusion}: ${latest.html_url}`,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      source: 'github-ci',
      status: 503,
      payload: `Network error: ${(error as Error).message}`,
      timestamp: Date.now(),
    };
  }
}
