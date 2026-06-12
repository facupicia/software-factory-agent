'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabase } from '@/lib/client-supabase';
import type { ActivityLog, Agent } from '@/types';

interface ActivityFeedProps {
  initialLogs: ActivityLog[];
  agents: Agent[];
}

const sourceIcons: Record<string, string> = {
  ui: '🖥',
  board: '🖥',
  telegram: '✈',
  orchestrator: '⚙',
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'ahora';
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)} h`;
  return new Date(iso).toLocaleDateString();
}

const actionLabels: Record<string, string> = {
  moved: 'movió la tarea',
  updated: 'actualizó la tarea',
  created: 'creó la tarea',
  agent_spawned: 'lanzó un agente',
  agent_no_match: 'no encontró agente con skills coincidentes',
  agent_unknown_role: 'agente con rol desconocido',
  agent_update_task: 'actualizó la tarea desde el agente',
  agent_log: 'registró actividad del agente',
  agent_updated: 'fue actualizado',
};

export default function ActivityFeed({ initialLogs, agents }: ActivityFeedProps) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);

  useEffect(() => {
    let supabase: ReturnType<typeof getBrowserSupabase>;
    try {
      supabase = getBrowserSupabase();
    } catch {
      return;
    }

    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
        },
        (payload) => {
          const log = payload.new as ActivityLog;
          setLogs((prev) => (prev.some((l) => l.id === log.id) ? prev : [log, ...prev].slice(0, 50)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="bg-gray-950/40 border border-gray-800/70 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="px-3 py-2 border-b border-gray-800/60 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Actividad</h3>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          en vivo
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {logs.length === 0 ? (
          <p className="text-center text-xs text-gray-600 italic py-4">
            Aún no hay actividad.
          </p>
        ) : (
          logs.map((log) => {
            const agent = agents.find((a) => a.id === log.agent_id);
            const actionLabel = actionLabels[log.action] ?? log.action;
            return (
              <div
                key={log.id}
                className="flex items-start gap-2 text-xs px-2 py-1.5 rounded hover:bg-gray-900/50"
              >
                <span aria-hidden="true" className="text-gray-500 mt-0.5">
                  {sourceIcons[log.source] ?? '·'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 leading-snug">
                    <span className="font-medium text-gray-200">
                      {agent?.name ?? 'sistema'}
                    </span>{' '}
                    <span className="text-gray-400">{actionLabel}</span>
                  </p>
                  {log.comment && (
                    <p className="text-gray-500 truncate">{log.comment}</p>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 whitespace-nowrap mt-0.5">
                  {relTime(log.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
