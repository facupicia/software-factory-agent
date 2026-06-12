import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function zodErrorResponse(err: ZodError) {
  return NextResponse.json(
    {
      error: 'Validation failed',
      issues: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    },
    { status: 400 }
  );
}

export function internalErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : 'Internal server error';
  return NextResponse.json({ error: message }, { status: 500 });
}
