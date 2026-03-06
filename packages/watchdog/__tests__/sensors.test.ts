import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCiStatus } from '../src/sensors/github-ci.js';
import { checkPrStatus } from '../src/sensors/github-prs.js';
import type { GitHubConfig } from '../src/sensors/types.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const githubConfig: GitHubConfig = { token: 'ghp_test', owner: 'Guild-Agents', repo: 'guild' };

describe('sensors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('github-ci', () => {
    it('returns 200 when latest run succeeded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflow_runs: [{ conclusion: 'success', html_url: 'https://github.com/run/1' }],
        }),
      });

      const result = await checkCiStatus(githubConfig);
      expect(result.source).toBe('github-ci');
      expect(result.status).toBe(200);
    });

    it('returns 500 when latest run failed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflow_runs: [{ conclusion: 'failure', html_url: 'https://github.com/run/2' }],
        }),
      });

      const result = await checkCiStatus(githubConfig);
      expect(result.status).toBe(500);
      expect(result.payload).toContain('failure');
    });

    it('returns 201 when latest run is in progress', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflow_runs: [{ conclusion: null, status: 'in_progress', html_url: 'https://github.com/run/3' }],
        }),
      });

      const result = await checkCiStatus(githubConfig);
      expect(result.status).toBe(201);
    });

    it('returns 200 when no workflow runs exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflow_runs: [] }),
      });

      const result = await checkCiStatus(githubConfig);
      expect(result.status).toBe(200);
    });

    it('returns 502 when GitHub API fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' });

      const result = await checkCiStatus(githubConfig);
      expect(result.status).toBe(502);
    });
  });

  describe('github-prs', () => {
    it('returns 200 when no open PRs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      const result = await checkPrStatus(githubConfig);
      expect(result.status).toBe(200);
    });

    it('returns 500 for Renovate PR older than 48h', async () => {
      const staleDate = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            title: 'chore(deps): update dependency',
            created_at: staleDate,
            html_url: 'https://github.com/pr/1',
            user: { login: 'renovate[bot]' },
            labels: [{ name: 'dependencies' }],
          },
        ]),
      });

      const result = await checkPrStatus(githubConfig);
      expect(result.status).toBe(500);
      expect(result.payload).toContain('Renovate');
    });

    it('returns 200 for fresh Renovate PR under 48h', async () => {
      const freshDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            title: 'chore(deps): update dependency',
            created_at: freshDate,
            html_url: 'https://github.com/pr/2',
            user: { login: 'renovate[bot]' },
            labels: [{ name: 'dependencies' }],
          },
        ]),
      });

      const result = await checkPrStatus(githubConfig);
      expect(result.status).toBe(200);
    });

    it('returns 502 when GitHub API fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' });

      const result = await checkPrStatus(githubConfig);
      expect(result.status).toBe(502);
    });
  });
});
