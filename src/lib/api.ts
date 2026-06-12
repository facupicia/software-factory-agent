import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function zodErrorResponse(err: ZodError) {
  return NextResponse.json(
    {
      error: 'Validación fallida',
      issues: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    },
    { status: 400 }
  );
}

export function internalErrorResponse(err: unknown, context?: string) {
  const message = err instanceof Error ? err.message : 'Error interno del servidor';
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[api:500]${context ? ` ${context}` : ''} ${message}`, stack);
  return NextResponse.json(
    {
      error: message,
      ...(process.env.NODE_ENV !== 'production' && stack
        ? { stack: stack.split('\n').slice(0, 8) }
        : {}),
    },
    { status: 500 }
  );
}
