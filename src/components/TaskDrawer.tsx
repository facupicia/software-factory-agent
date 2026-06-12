'use client';

import { useEffect, useRef, useState } from 'react';
import { getBrowserSupabase } from '@/lib/client-supabase';
import type { ClawdiaMessage, Task, AgentRun, AgentLog } from '@/types';
import ChatPanel from './ChatPanel';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
}

type Tab = 'chat' | 'run';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const logLevelColor: Record<string, string> = {
  info: 'text-gray-400',
  thinking: 'text-purple-400',
  tool_use: 'text-blue-400',
  tool_result: 'text-cyan-400',
  result: 'text-green-400',
  error: 'text-red-400',
  warn: 'text-amber-400',
};

const logLevelLabel: Record<string, string> = {
  info: 'info',
  thinking: 'pensando',
  tool_use: 'herramienta →',
  tool_result: '← herramienta',
  result: 'resultado',
  error: 'error',
  warn: 'aviso',
};

export default function TaskDrawer({ task, onClose }: TaskDrawerProps) {
  const [tab, setTab] = useState<Tab>('chat');
  const [initialMessages, setInitialMessages] = useState<ClawdiaMessage[]>([]);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const taskId = task?.id;
  const runIdRef = useRef<string | null>(null);

  useEffect(() => {
    runIdRef.current = run?.id ?? null;
  }, [run?.id]);

  useEffect(() => {
    if (!taskId) return;

    let supabase: ReturnType<typeof getBrowserSupabase>;
    try {
      supabase = getBrowserSupabase();
    } catch {
      return;
    }

    void (async () => {
      const { data: msgs } = await supabase
        .from('clawdia_messages')
        .select('*')
        .eq('scope', 'task')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
        .limit(200);
      setInitialMessages((msgs ?? []) as ClawdiaMessage[]);

      const { data: latestRun } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const r = (latestRun as AgentRun | null) ?? null;
      setRun(r);
      if (r) {
        const { data: runLogs } = await supabase
          .from('agent_logs')
          .select('*')
          .eq('run_id', r.id)
          .order('id', { ascending: true })
          .limit(500);
        setLogs((runLogs ?? []) as AgentLog[]);
      }
    })();

    const logChannel = supabase
      .channel(`drawer-logs:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_runs',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          setRun(payload.new as AgentRun);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_logs',
        },
        async (payload) => {
          const log = payload.new as AgentLog;
          if (runIdRef.current && log.run_id === runIdRef.current) {
            setLogs((prev) => [...prev, log]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(logChannel);
    };
  }, [taskId]);

  if (!task) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Tarea: ${task.title}`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-gray-950 border-l border-gray-800 w-full max-w-md flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between p-4 border-b border-gray-800/70">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              {task.priority} · {task.status}
            </p>
            <h2 className="text-base font-semibold text-gray-100 leading-snug">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            className="ml-2 text-gray-500 hover:text-gray-300 text-xl leading-none"
          >
            ×
          </button>
        </header>

        <div className="flex border-b border-gray-800/70">
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'chat'
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setTab('run')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'run'
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            ⚙ Ejecución{run ? ` · ${run.status}` : ''}
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-3 min-h-0">
          {tab === 'chat' ? (
            <ChatPanel
              scope="task"
              taskId={task.id}
              initialMessages={initialMessages}
              className="h-full"
            />
          ) : (
            <div className="h-full flex flex-col bg-gray-950/40 border border-gray-800/70 rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-800/60 text-xs text-gray-400">
                {run ? (
                  <>
                    <span className="font-mono">
                      {run.role} · {run.status}
                    </span>
                    {run.model && (
                      <span className="ml-2 text-gray-600">{run.model}</span>
                    )}
                  </>
                ) : (
                  'Aún no se lanzó un agente para esta tarea.'
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs min-h-0">
                {logs.length === 0 ? (
                  <p className="text-gray-600 italic">Sin logs.</p>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="flex gap-2">
                      <span className="text-gray-600 shrink-0">
                        {formatTime(l.created_at)}
                      </span>
                      <span
                        className={`shrink-0 uppercase ${logLevelColor[l.level] ?? 'text-gray-400'}`}
                      >
                        {logLevelLabel[l.level] ?? l.level}
                      </span>
                      <span className="text-gray-300 break-all whitespace-pre-wrap">
                        {l.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
