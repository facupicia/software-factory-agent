import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { ActivityCreateSchema } from '@/lib/validation';
import { zodErrorResponse, internalErrorResponse } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');

    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (taskId) query = query.eq('task_id', taskId);

    const { data, error } = await query;
    if (error) return internalErrorResponse(error.message);
    return NextResponse.json(data ?? []);
  } catch (err) {
    return internalErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = ActivityCreateSchema.safeParse(json);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('activity_log')
      .insert(parsed.data)
      .select()
      .single();
    if (error) return internalErrorResponse(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return internalErrorResponse(err);
  }
}
