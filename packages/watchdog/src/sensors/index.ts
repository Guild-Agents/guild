import type { SensorResult } from './types.js';
import type { AppConfig } from '../config.js';
import { checkCiStatus } from './github-ci.js';
import { checkPrStatus } from './github-prs.js';

export type { SensorResult } from './types.js';
export type { GitHubConfig } from './types.js';

export async function runAllSensors(config: AppConfig): Promise<SensorResult[]> {
  const results = await Promise.all([
    checkCiStatus(config.github),
    checkPrStatus(config.github),
  ]);
  return results;
}
