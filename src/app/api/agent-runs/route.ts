import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { UuidSchema } from '@/lib/validation';
import { internalErrorResponse, zodErrorResponse } from '@/lib/api';
import type { AgentRun } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('agent_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (taskId) query = query.eq('task_id', taskId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return internalErrorResponse(error.message);
    return NextResponse.json((data ?? []) as AgentRun[]);
  } catch (err) {
    return internalErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = z
      .object({
        task_id: UuidSchema,
        agent_id: UuidSchema.nullable().optional(),
        role: z.string().min(1).max(80),
        model: z.string().optional(),
      })
      .safeParse(json);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('agent_runs')
      .insert({
        task_id: parsed.data.task_id,
        agent_id: parsed.data.agent_id ?? null,
        role: parsed.data.role,
        model: parsed.data.model ?? null,
        status: 'queued',
      })
      .select()
      .single();
    if (error) return internalErrorResponse(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return internalErrorResponse(err);
  }
}

import { z } from 'zod';
