import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { z } from 'zod';
import { internalErrorResponse, zodErrorResponse } from '@/lib/api';
import type { Team } from '@/types';

const PostSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true });

    if (error) return internalErrorResponse(error.message);
    return NextResponse.json((data ?? []) as Team[]);
  } catch (err) {
    return internalErrorResponse(err, 'GET /api/teams');
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = PostSchema.safeParse(json);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = createServerClient();

    // Create team
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .insert({ name: parsed.data.name, description: parsed.data.description ?? null })
      .select()
      .single();

    if (teamErr || !team) {
      return NextResponse.json(
        { error: teamErr?.message ?? 'Failed to create team' },
        { status: 409 }
      );
    }

    // Create default columns for the new team
    const defaultColumns = [
      { team_id: team.id, title: 'Backlog', position: 0, color: '#6b7280' },
      { team_id: team.id, title: 'To Do', position: 1, color: '#3b82f6' },
      { team_id: team.id, title: 'In Progress', position: 2, color: '#f59e0b' },
      { team_id: team.id, title: 'Review', position: 3, color: '#8b5cf6' },
      { team_id: team.id, title: 'Done', position: 4, color: '#10b981' },
    ];

    const { error: colsErr } = await supabase.from('columns').insert(defaultColumns);
    if (colsErr) {
      console.error('Failed to create default columns:', colsErr.message);
    }

    return NextResponse.json(team as Team, { status: 201 });
  } catch (err) {
    return internalErrorResponse(err, 'POST /api/teams');
  }
}
