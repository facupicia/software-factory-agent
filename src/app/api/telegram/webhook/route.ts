import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyWebhookSecret } from '@/lib/clawdia/telegram';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
    date: number;
  };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!verifyWebhookSecret(secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const message = update.message;
  if (!message || !message.text) {
    return NextResponse.json({ ok: true, skipped: 'no_text' });
  }

  const supabase = createServerClient();

  const { error } = await supabase.from('clawdia_messages').insert({
    scope: 'global',
    task_id: null,
    role: 'user',
    source: 'telegram',
    content: message.text,
    external_id: message.message_id,
    metadata: {
      chat_id: message.chat.id,
      from: message.from,
      date: message.date,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({
    ok: true,
    message: 'POST a Telegram update here. Set X-Telegram-Bot-Api-Secret-Token header.',
  });
}
