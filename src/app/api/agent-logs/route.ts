import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { UuidSchema } from '@/lib/validation';
import { internalErrorResponse, zodErrorResponse } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('run_id');

    let query = supabase
      .from('agent_logs')
      .select('*')
      .order('id', { ascending: true })
      .limit(500);

    if (runId) query = query.eq('run_id', runId);

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
    const parsed = z
      .object({
        run_id: UuidSchema,
        level: z
          .enum(['info', 'thinking', 'tool_use', 'tool_result', 'result', 'error', 'warn'])
          .default('info'),
        message: z.string().min(1).max(5000),
        metadata: z.record(z.string(), z.unknown()).default({}),
      })
      .safeParse(json);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('agent_logs')
      .insert(parsed.data)
      .select()
      .single();
    if (error) return internalErrorResponse(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return internalErrorResponse(err);
  }
}

import { z } from 'zod';
