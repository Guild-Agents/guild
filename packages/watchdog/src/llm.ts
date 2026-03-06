import Anthropic from '@anthropic-ai/sdk';
import type { SensorResult } from './sensors/types.js';
import type { Notification } from './telegram.js';

export interface TriageResult {
  decision: 'ignore' | 'action';
  inputTokens: number;
  outputTokens: number;
}

export interface ActionResult {
  event: string;
  notification: Notification;
  inputTokens: number;
  outputTokens: number;
}

interface WorkspaceContext {
  soul: string;
  heartbeat: string;
  memory: string;
}

export async function triageWithHaiku(
  signal: SensorResult,
  heuristicReason: string,
  apiKey: string,
): Promise<TriageResult> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 50,
    messages: [{
      role: 'user',
      content: `You are a signal triage system. Classify this signal as IGNORE or ACTION. Respond with ONLY one word.

Signal source: ${signal.source}
Signal payload: ${signal.payload ?? 'none'}
Heuristic reason for uncertainty: ${heuristicReason}

Classification:`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text.trim().toUpperCase() : '';
  const decision = text === 'IGNORE' ? 'ignore' : 'action';

  return {
    decision,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

export async function actWithSonnet(
  signal: SensorResult,
  classificationChain: string,
  apiKey: string,
  workspace: WorkspaceContext,
): Promise<ActionResult> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `${workspace.soul}

---
${workspace.heartbeat}

---
## Current Memory
${workspace.memory}

---
## Signal Detected

Source: ${signal.source}
Status: ${signal.status}
Payload: ${signal.payload ?? 'none'}
Classification chain: ${classificationChain}

---
## Your Task

Generate a JSON response with:
1. "event": A markdown string for the event log file
2. "notification": An object with severity ("info"|"warning"|"critical"), summary (max 100 chars), optional details, optional link

Respond with ONLY valid JSON, no markdown fencing.`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };

  try {
    const parsed = JSON.parse(text) as {
      event: string;
      notification: Notification;
    };

    return {
      event: parsed.event,
      notification: parsed.notification,
      ...usage,
    };
  } catch {
    // Fallback notification when Sonnet returns unparseable JSON
    return {
      event: `# Unparseable LLM Response\n\nSource: ${signal.source}\nStatus: ${signal.status}\nRaw response: ${text}`,
      notification: {
        severity: 'warning',
        summary: `Signal from ${signal.source} (status ${signal.status}) — LLM response unparseable`,
      },
      ...usage,
    };
  }
}
