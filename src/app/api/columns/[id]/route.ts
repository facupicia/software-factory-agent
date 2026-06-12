import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { ColumnUpdateSchema, UuidSchema } from '@/lib/validation';
import { zodErrorResponse, internalErrorResponse } from '@/lib/api';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const idCheck = UuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid column id' }, { status: 400 });
    }

    const json = await req.json().catch(() => null);
    const parsed = ColumnUpdateSchema.safeParse(json);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('columns')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single();
    if (error) return internalErrorResponse(error.message);
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return internalErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const idCheck = UuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid column id' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('columns').delete().eq('id', id);
    if (error) return internalErrorResponse(error.message);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return internalErrorResponse(err);
  }
}
