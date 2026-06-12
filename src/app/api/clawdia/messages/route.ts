import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { z } from 'zod';
import { internalErrorResponse, zodErrorResponse } from '@/lib/api';
import { sendToTelegram } from '@/lib/clawdia/telegram';
import type { ClawdiaMessage } from '@/types';

const QuerySchema = z.object({
  scope: z.enum(['global', 'task']).default('global'),
  task_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const PostSchema = z
  .object({
    scope: z.enum(['global', 'task']).default('global'),
    task_id: z.string().uuid().nullable().optional(),
    content: z.string().min(1).max(4000),
    forward_to_telegram: z.boolean().default(true),
  })
  .refine(
    (d) => d.scope === 'global' || Boolean(d.task_id),
    { message: 'task_id is required when scope=task', path: ['task_id'] }
  );

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = createServerClient();
    let query = supabase
      .from('clawdia_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parsed.data.limit);

    if (parsed.data.scope === 'task' && parsed.data.task_id) {
      query = query.eq('task_id', parsed.data.task_id);
    } else {
      query = query.eq('scope', 'global');
    }

    const { data, error } = await query;
    if (error) return internalErrorResponse(error.message);
    return NextResponse.json((data ?? []).reverse() as ClawdiaMessage[]);
  } catch (err) {
    return internalErrorResponse(err, 'GET /api/clawdia/messages');
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = PostSchema.safeParse(json);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('clawdia_messages')
      .insert({
        scope: parsed.data.scope,
        task_id: parsed.data.scope === 'task' ? parsed.data.task_id : null,
        role: 'user',
        source: 'board',
        content: parsed.data.content,
      })
      .select()
      .single();

    if (error) {
      const reason = error.message || error.code || JSON.stringify(error);
      console.error('[POST clawdia_messages] insert failed:', reason);
    }

    let telegram: { sent: boolean; reason?: string; skipped?: boolean } = { sent: false };
    if (parsed.data.forward_to_telegram) {
      const result = await sendToTelegram(parsed.data.content, {
        scope: parsed.data.scope,
        taskId: parsed.data.task_id ?? null,
      });
      telegram = {
        sent: result.ok,
        reason: result.ok ? undefined : result.reason,
        skipped: result.ok ? undefined : 'skipped' in result ? result.skipped : undefined,
      };
    }

    if (!data) {
      return NextResponse.json(
        {
          message: null,
          telegram,
          db_error: true,
          reason: error ? (error.message || error.code || 'insert failed') : 'unknown',
        },
        { status: 202 }
      );
    }

    return NextResponse.json(
      { message: data as ClawdiaMessage, telegram },
      { status: 201 }
    );
  } catch (err) {
    return internalErrorResponse(err, 'POST /api/clawdia/messages');
  }
}
