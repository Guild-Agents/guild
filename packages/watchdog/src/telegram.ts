import type { Bot } from 'grammy';

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

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatNotification(notification: Notification): string {
  const icon = SEVERITY_ICON[notification.severity] ?? '';
  const lines = [`[${icon}] ${escapeHtml(notification.summary)}`];

  if (notification.details) {
    lines.push(escapeHtml(notification.details));
  }
  if (notification.link) {
    lines.push(escapeHtml(notification.link));
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

export function createTelegramBot(bot: Bot, chatId: string): WatchdogBot {
  return {
    async sendNotification(notification: Notification) {
      const text = formatNotification(notification);
      await bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' });
    },

    registerCommands(handlers: CommandHandlers) {
      bot.command('status', async (ctx) => {
        if (String(ctx.chat.id) !== chatId) return;
        await ctx.reply(handlers.onStatus());
      });

      bot.command('stats', async (ctx) => {
        if (String(ctx.chat.id) !== chatId) return;
        await ctx.reply(handlers.onStats());
      });

      bot.command('interval', async (ctx) => {
        if (String(ctx.chat.id) !== chatId) return;
        const response = handlers.onInterval(ctx.match || '15m');
        await ctx.reply(response);
      });

      bot.command('pause', async (ctx) => {
        if (String(ctx.chat.id) !== chatId) return;
        await ctx.reply(handlers.onPause());
      });

      bot.command('resume', async (ctx) => {
        if (String(ctx.chat.id) !== chatId) return;
        await ctx.reply(handlers.onResume());
      });
    },
  };
}
