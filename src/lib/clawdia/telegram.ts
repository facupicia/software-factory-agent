import 'server-only';
import { env } from '../env';

const TELEGRAM_API = 'https://api.telegram.org/bot';

interface SendOptions {
  scope?: 'global' | 'task';
  taskId?: string | null;
  taskTitle?: string;
}

export type TelegramResult =
  | { ok: true; messageId: number }
  | { ok: false; reason: string; skipped?: boolean };

export function isTelegramConfigured(): boolean {
  return Boolean(env.telegramBotToken && env.clawdiaChatId);
}

/**
 * Send a message to Clawdia via Telegram.
 *
 * Returns a structured result instead of throwing. If Telegram is not
 * configured, returns `{ ok: false, reason: '...', skipped: true }` so the
 * caller can surface a non-error status to the user.
 */
export async function sendToTelegram(
  text: string,
  opts: SendOptions = {}
): Promise<TelegramResult> {
  if (!isTelegramConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason:
        'Telegram is not configured (set TELEGRAM_BOT_TOKEN and CLAWDIA_CHAT_ID)',
    };
  }

  // Telegram's HTML parser is strict; we don't know what the user typed, so
  // we send as plain text. This avoids 400s from stray '<', '&', etc.
  const scopeLabel =
    opts.scope === 'task'
      ? `📋 [task: ${opts.taskTitle ?? opts.taskId ?? '?'}]`
      : '🖥 Board';
  const body = `💬 ${scopeLabel}\n${text}`;

  let res: Response;
  try {
    res = await fetch(`${TELEGRAM_API}${env.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.clawdiaChatId,
        message_thread_id: env.clawdiaThreadId,
        text: body,
        disable_web_page_preview: true,
      }),
      cache: 'no-store',
    });
  } catch (err) {
    return {
      ok: false,
      reason: `network error: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    return {
      ok: false,
      reason: `Telegram API ${res.status}: ${errBody.slice(0, 200)}`,
    };
  }

  const json = (await res.json()) as { result?: { message_id?: number } };
  return { ok: true, messageId: json.result?.message_id ?? 0 };
}

export function verifyWebhookSecret(header: string | null): boolean {
  if (!env.telegramWebhookSecret) return false;
  return header === env.telegramWebhookSecret;
}
