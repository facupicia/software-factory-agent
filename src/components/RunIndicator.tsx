'use client';

import { useEffect, useState } from 'react';
import type { AgentRun } from '@/types';

interface RunIndicatorProps {
  run: AgentRun;
}

function useElapsed(startedAt: string | null): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}

function formatDuration(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r.toString().padStart(2, '0')}s`;
}

export default function RunIndicator({ run }: RunIndicatorProps) {
  const elapsed = useElapsed(run.started_at);
  const isLive = run.status === 'running' || run.status === 'queued';
  const cost = Number(run.estimated_cost_usd);

  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] mt-1.5 ${
        isLive ? 'text-amber-400' : 'text-gray-600'
      }`}
    >
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
      )}
      <span className="font-mono">
        {run.status === 'queued' ? '⏳ en cola' : formatDuration(elapsed)}
      </span>
      <span className="text-gray-700">·</span>
      <span className="font-mono">${cost.toFixed(4)}</span>
    </div>
  );
}
