export interface HeartbeatConfig {
  minInterval: number;
  maxInterval: number;
  backoffFactor: number;
  activeHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export interface AppConfig {
  heartbeat: HeartbeatConfig;
  github: {
    token: string;
    owner: string;
    repo: string;
  };
  anthropic: {
    apiKey: string;
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  workspacePath: string;
}

export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  minInterval: 15 * 60 * 1000,       // 15 minutes
  maxInterval: 4 * 60 * 60 * 1000,   // 4 hours
  backoffFactor: 2,
  activeHours: {
    start: '08:00',
    end: '24:00',
    timezone: 'America/Santiago',
  },
};

function requireEnv(env: Record<string, string | undefined>, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  return {
    heartbeat: { ...DEFAULT_HEARTBEAT_CONFIG },
    github: {
      token: requireEnv(env, 'GITHUB_TOKEN'),
      owner: requireEnv(env, 'GITHUB_OWNER'),
      repo: requireEnv(env, 'GITHUB_REPO'),
    },
    anthropic: {
      apiKey: requireEnv(env, 'ANTHROPIC_API_KEY'),
    },
    telegram: {
      botToken: requireEnv(env, 'TELEGRAM_BOT_TOKEN'),
      chatId: requireEnv(env, 'TELEGRAM_CHAT_ID'),
    },
    workspacePath: env.WATCHDOG_WORKSPACE_PATH || 'workspace',
  };
}
