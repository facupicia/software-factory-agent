import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { TaskMoveSchema, UuidSchema } from '@/lib/validation';
import { zodErrorResponse, internalErrorResponse } from '@/lib/api';
import { logActivity } from '@/lib/activity';

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
      .select('column_id')
      .eq('id', id)
      .maybeSingle();
    if (prevError) return internalErrorResponse(prevError.message);

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
        from: previous?.column_id ?? null,
        to: parsed.data.column_id,
      },
    });

    return NextResponse.json(data);
  } catch (err) {
    return internalErrorResponse(err);
  }
}
