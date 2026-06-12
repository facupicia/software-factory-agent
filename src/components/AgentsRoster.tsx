'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabase } from '@/lib/client-supabase';
import type { Agent } from '@/types';
import AgentEditor from './AgentEditor';

const statusColors: Record<Agent['status'], string> = {
  idle: 'bg-gray-500',
  busy: 'bg-amber-500',
  offline: 'bg-gray-700',
};

const statusLabels: Record<Agent['status'], string> = {
  idle: 'Inactivo',
  busy: 'Ocupado',
  offline: 'Desconectado',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function relTime(iso: string | null): string {
  if (!iso) return 'nunca';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'ahora';
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)} h`;
  return `hace ${Math.floor(diff / 86_400_000)} d`;
}

export default function AgentsRoster({
  initialAgents,
}: {
  initialAgents: Agent[];
}) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);

  useEffect(() => {
    let supabase: ReturnType<typeof getBrowserSupabase>;
    try {
      supabase = getBrowserSupabase();
    } catch {
      return;
    }

    const channel = supabase
      .channel('agents-roster')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string }).id;
            setAgents((prev) => prev.filter((a) => a.id !== oldId));
            return;
          }
          const next = payload.new as Agent;
          setAgents((prev) => {
            const exists = prev.some((a) => a.id === next.id);
            return exists
              ? prev.map((a) => (a.id === next.id ? next : a))
              : [next, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Equipo de agentes</h2>
          <p className="text-xs text-gray-500">
            {agents.length} agentes · hacé click en una card para editarla
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.length === 0 ? (
            <p className="text-gray-500 italic text-sm col-span-full">
              Aún no hay agentes. Corré el SQL de seed en tu dashboard de Supabase.
            </p>
          ) : (
            agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <AgentEditor agent={agent}>
      <button
        type="button"
        className="group text-left bg-gray-950/40 border border-gray-800/70 rounded-xl p-4 hover:border-gray-700 hover:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-colors w-full"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-200 ring-1 ring-gray-600 relative"
            aria-hidden="true"
          >
            {getInitials(agent.name)}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${statusColors[agent.status]} ring-2 ring-gray-950`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-100 truncate">
                {agent.name}
              </h3>
              {agent.is_pm && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  PM
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono truncate">
              {agent.role}
            </p>
          </div>
        </div>

        {agent.skills && agent.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {agent.skills.slice(0, 6).map((s) => (
              <span
                key={s}
                className="text-[10px] bg-gray-800/80 text-gray-400 px-1.5 py-0.5 rounded"
              >
                {s}
              </span>
            ))}
            {agent.skills.length > 6 && (
              <span className="text-[10px] text-gray-600">
                +{agent.skills.length - 6}
              </span>
            )}
          </div>
        )}

        {agent.notes && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
            {agent.notes}
          </p>
        )}

        <div className="flex items-center justify-between mt-3 text-[10px] text-gray-600">
          <span>{statusLabels[agent.status]}</span>
          <span>activo {relTime(agent.last_active_at)}</span>
        </div>
      </button>
    </AgentEditor>
  );
}
