import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { TaskMoveSchema, UuidSchema } from '@/lib/validation';
import { zodErrorResponse, internalErrorResponse } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { dispatchAgentForTask } from '@/lib/agents/dispatcher';
import type { Task } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const idCheck = UuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
    }

    const json = await req.json().catch(() => null);
    const parsed = TaskMoveSchema.safeParse(json);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = createServerClient();

    const { data: previous, error: prevError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (prevError) return internalErrorResponse(prevError.message);
    if (!previous) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        column_id: parsed.data.column_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return internalErrorResponse(error.message);
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await logActivity(supabase, {
      task_id: id,
      action: 'moved',
      comment: null,
      metadata: {
        from: previous.column_id,
        to: parsed.data.column_id,
      },
    });

    let dispatched: { runId?: string; skipped?: string } = {};
    if (parsed.data.column_id) {
      const { data: targetColumn } = await supabase
        .from('columns')
        .select('title')
        .eq('id', parsed.data.column_id)
        .maybeSingle();
      if (targetColumn?.title === 'In Progress') {
        const result = await dispatchAgentForTask({
          task: data as Task,
          trigger: 'move',
        });
        if (result?.run) dispatched = { runId: result.run.id };
        else if (result?.skipped) dispatched = { skipped: result.skipped };
      }
    }

    return NextResponse.json({ task: data, ...dispatched });
  } catch (err) {
    return internalErrorResponse(err);
  }
}
