import type { SensorResult } from './sensors/types.js';

export interface ClassificationResult {
  confidence: 'high' | 'low';
  severity: 'ignore' | 'triage' | 'action';
  reason: string;
}

export function classify(signal: SensorResult): ClassificationResult {
  // Layer 1: Status 200 -- everything is fine
  if (signal.status === 200) {
    return { confidence: 'high', severity: 'ignore', reason: 'Sensor reported OK' };
  }

  // Layer 1: Status 201 -- ambiguous, needs triage
  if (signal.status === 201) {
    return {
      confidence: 'low',
      severity: 'triage',
      reason: `Ambiguous signal from ${signal.source}: ${signal.payload ?? 'no details'}`,
    };
  }

  // PR-specific heuristics
  if (signal.source === 'github-prs' && signal.payload) {
    // @types packages can wait longer
    if (signal.payload.includes('@types/')) {
      return {
        confidence: 'high',
        severity: 'ignore',
        reason: '@types dependency PR -- low urgency, can wait',
      };
    }
  }

  // Default: 4xx/5xx -- escalate
  return {
    confidence: 'high',
    severity: 'action',
    reason: `Error signal from ${signal.source}: status ${signal.status}`,
  };
}
