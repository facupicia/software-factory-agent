'use client';

import { useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/client-supabase';
import type { Agent, AgentRun } from '@/types';

interface PmChipProps {
  agents: Agent[];
}

interface RunStats {
  active: number;
  spend: number;
}

function isClawdiaActive(lastActiveAt: string | null | undefined, now: number): boolean {
  if (!lastActiveAt) return false;
  return now - new Date(lastActiveAt).getTime() < 5 * 60_000;
}

export default function PmChip({ agents }: PmChipProps) {
  const clawdia = agents.find((a) => a.is_pm);
  const [stats, setStats] = useState<RunStats>({ active: 0, spend: 0 });
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    let supabase: ReturnType<typeof getBrowserSupabase>;
    try {
      supabase = getBrowserSupabase();
    } catch {
      return;
    }

    async function load() {
      const { data: runs } = await supabase
        .from('agent_runs')
        .select('id, status, estimated_cost_usd, created_at')
        .in('status', ['queued', 'running']);
      const list = (runs ?? []) as Pick<AgentRun, 'id' | 'status' | 'estimated_cost_usd' | 'created_at'>[];
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const spend = list
        .filter((r) => new Date(r.created_at) >= startOfDay)
        .reduce((sum, r) => sum + Number(r.estimated_cost_usd ?? 0), 0);
      setStats({ active: list.length, spend });
    }
    void load();

    const channel = supabase
      .channel('pm-chip')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_runs' },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const clawdiaActive = useMemo(
    () => isClawdiaActive(clawdia?.last_active_at, now),
    [clawdia?.last_active_at, now]
  );

  if (!clawdia) return null;

  return (
    <div className="flex items-center gap-3 text-xs">
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
          clawdiaActive
            ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
            : 'bg-gray-800/50 border border-gray-700/50 text-gray-500'
        }`}
        title={clawdiaActive ? 'Clawdia está en línea' : 'Clawdia está inactiva'}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            clawdiaActive ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'
          }`}
        />
        <span className="font-medium">Clawdia</span>
      </div>
      <div className="flex items-center gap-1 text-gray-400">
        <span className="text-gray-600">·</span>
        <span>
          <span className="text-amber-400 font-mono">{stats.active}</span> activos
        </span>
      </div>
      <div className="flex items-center gap-1 text-gray-400">
        <span className="text-gray-600">·</span>
        <span>
          <span className="text-green-400 font-mono">
            ${stats.spend.toFixed(3)}
          </span>{' '}
          hoy
        </span>
      </div>
    </div>
  );
}
