import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { UuidSchema } from '@/lib/validation';
import { internalErrorResponse, zodErrorResponse } from '@/lib/api';
import type { AgentRun } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const idCheck = UuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return internalErrorResponse(error.message);
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data as AgentRun);
  } catch (err) {
    return internalErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const idCheck = UuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 });
    }

    const json = await req.json().catch(() => null);
    const parsed = z
      .object({
        status: z
          .enum(['queued', 'running', 'completed', 'failed', 'killed', 'paused_budget'])
          .optional(),
        exit_reason: z.string().max(200).optional(),
        completed_at: z.iso.datetime().optional(),
      })
      .strict()
      .safeParse(json);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('agent_runs')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single();
    if (error) return internalErrorResponse(error.message);
    return NextResponse.json(data);
  } catch (err) {
    return internalErrorResponse(err);
  }
}

import { z } from 'zod';
