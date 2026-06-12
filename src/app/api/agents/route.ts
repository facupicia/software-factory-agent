import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { AgentCreateSchema } from '@/lib/validation';
import { zodErrorResponse, internalErrorResponse } from '@/lib/api';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('name', { ascending: true });
    if (error) return internalErrorResponse(error.message);
    return NextResponse.json(data ?? []);
  } catch (err) {
    return internalErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = AgentCreateSchema.safeParse(json);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('agents')
      .insert(parsed.data)
      .select()
      .single();
    if (error) return internalErrorResponse(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return internalErrorResponse(err);
  }
}
