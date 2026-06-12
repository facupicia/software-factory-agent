import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { TaskCreateSchema } from '@/lib/validation';
import { zodErrorResponse, internalErrorResponse } from '@/lib/api';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return internalErrorResponse(error.message);
    return NextResponse.json(data ?? []);
  } catch (err) {
    return internalErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = TaskCreateSchema.safeParse(json);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('tasks')
      .insert(parsed.data)
      .select()
      .single();

    if (error) return internalErrorResponse(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return internalErrorResponse(err);
  }
}
