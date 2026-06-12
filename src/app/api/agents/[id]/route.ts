import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { AgentUpdateSchema, UuidSchema } from '@/lib/validation';
import { zodErrorResponse, internalErrorResponse } from '@/lib/api';
import { logActivity } from '@/lib/activity';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const idCheck = UuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });
    }

    const json = await req.json().catch(() => null);
    const parsed = AgentUpdateSchema.safeParse(json);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: previous } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!previous) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('agents')
      .update({
        ...parsed.data,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return internalErrorResponse(error.message);

    await logActivity(supabase, {
      task_id: null,
      agent_id: id,
      action: 'agent_updated',
      comment: null,
      metadata: {
        fields: Object.keys(parsed.data),
        diff: buildDiff(previous as Record<string, unknown>, parsed.data),
      },
    });

    return NextResponse.json(data);
  } catch (err) {
    return internalErrorResponse(err, 'PATCH /api/agents/[id]');
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const idCheck = UuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) return internalErrorResponse(error.message);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return internalErrorResponse(err, 'DELETE /api/agents/[id]');
  }
}

function buildDiff(
  previous: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, to] of Object.entries(patch)) {
    const from = previous[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      diff[key] = { from, to };
    }
  }
  return diff;
}
