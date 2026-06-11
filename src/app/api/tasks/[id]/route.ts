import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();
  const { column_id } = body;

  if (!column_id || typeof column_id !== 'string') {
    return NextResponse.json({ error: 'column_id is required' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('tasks')
    .update({ column_id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
