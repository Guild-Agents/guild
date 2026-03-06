import type TelegramBotApi from 'node-telegram-bot-api';

export interface Notification {
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  details?: string;
  link?: string;
}

const SEVERITY_ICON: Record<string, string> = {
  info: 'INFO',
  warning: 'WARN',
  critical: 'ALERT',
};

export function formatNotification(notification: Notification): string {
  const icon = SEVERITY_ICON[notification.severity] ?? '';
  const lines = [`[${icon}] ${notification.summary}`];

  if (notification.details) {
    lines.push(notification.details);
  }
  if (notification.link) {
    lines.push(notification.link);
  }

  return lines.join('\n');
}

export interface WatchdogBot {
  sendNotification(notification: Notification): Promise<void>;
  registerCommands(handlers: CommandHandlers): void;
}

export interface CommandHandlers {
  onStatus: () => string;
  onStats: () => string;
  onInterval: (minutes: string) => string;
  onPause: () => string;
  onResume: () => string;
}

export function createTelegramBot(bot: TelegramBotApi, chatId: string): WatchdogBot {
  return {
    async sendNotification(notification: Notification) {
      const text = formatNotification(notification);
      await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    },

    registerCommands(handlers: CommandHandlers) {
      bot.onText(/\/status/, async (msg) => {
        if (String(msg.chat.id) !== chatId) return;
        await bot.sendMessage(chatId, handlers.onStatus());
      });

      bot.onText(/\/stats/, async (msg) => {
        if (String(msg.chat.id) !== chatId) return;
        await bot.sendMessage(chatId, handlers.onStats());
      });

      bot.onText(/\/interval (.+)/, async (msg, match) => {
        if (String(msg.chat.id) !== chatId) return;
        const response = handlers.onInterval(match?.[1] ?? '15m');
        await bot.sendMessage(chatId, response);
      });

      bot.onText(/\/pause/, async (msg) => {
        if (String(msg.chat.id) !== chatId) return;
        await bot.sendMessage(chatId, handlers.onPause());
      });

      bot.onText(/\/resume/, async (msg) => {
        if (String(msg.chat.id) !== chatId) return;
        await bot.sendMessage(chatId, handlers.onResume());
      });
    },
  };
}
