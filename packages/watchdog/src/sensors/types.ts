export interface SensorResult {
  source: 'github-ci' | 'github-prs';
  status: number;          // 200=ok, 201=ambiguous, 4xx/5xx=error
  payload?: string;
  timestamp: number;
}

export type SensorFn = () => Promise<SensorResult>;

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}
