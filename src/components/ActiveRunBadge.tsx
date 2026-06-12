'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabase } from '@/lib/client-supabase';
import type { AgentRun } from '@/types';
import RunIndicator from './RunIndicator';

interface Props {
  taskId: string;
}

export default function ActiveRunBadge({ taskId }: Props) {
  const [activeRun, setActiveRun] = useState<AgentRun | null>(null);

  useEffect(() => {
    let supabase: ReturnType<typeof getBrowserSupabase>;
    try {
      supabase = getBrowserSupabase();
    } catch {
      return;
    }

    async function load() {
      const { data } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('task_id', taskId)
        .in('status', ['queued', 'running'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveRun((data as AgentRun | null) ?? null);
    }
    void load();

    const channel = supabase
      .channel(`active-run:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_runs',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  if (!activeRun) return null;
  return <RunIndicator run={activeRun} />;
}
