'use client';

import { useEffect, useRef, useState } from 'react';
import { getBrowserSupabase } from '@/lib/client-supabase';
import type { ClawdiaMessage } from '@/types';

interface ChatPanelProps {
  scope: 'global' | 'task';
  taskId?: string;
  initialMessages: ClawdiaMessage[];
  className?: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function sourceIcon(source: ClawdiaMessage['source']): string {
  switch (source) {
    case 'telegram':
      return '✈';
    case 'board':
      return '🖥';
    case 'orchestrator':
      return '⚙';
  }
}

export default function ChatPanel({
  scope,
  taskId,
  initialMessages,
  className = '',
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ClawdiaMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<
    'unknown' | 'sent' | 'skipped' | 'failed'
  >('unknown');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let supabase: ReturnType<typeof getBrowserSupabase>;
    try {
      supabase = getBrowserSupabase();
    } catch {
      return;
    }
    const filter =
      scope === 'task' && taskId
        ? `scope=eq.task AND task_id=eq.${taskId}`
        : `scope=eq.global`;
    const channel = supabase
      .channel(`chat:${scope}:${taskId ?? 'global'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clawdia_messages',
          filter,
        },
        (payload) => {
          const msg = payload.new as ClawdiaMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scope, taskId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setTelegramStatus('unknown');
    try {
      const res = await fetch('/api/clawdia/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, task_id: taskId ?? null, content }),
      });
      if (res.ok || res.status === 202) {
        setInput('');
        const json = (await res.json()) as {
          telegram?: { sent: boolean; reason?: string; skipped?: boolean };
          db_error?: boolean;
        };
        if (json.telegram?.sent) {
          setTelegramStatus('sent');
        } else if (json.telegram?.skipped) {
          setTelegramStatus('skipped');
        } else if (json.telegram?.reason) {
          setTelegramStatus('failed');
        } else {
          setTelegramStatus('unknown');
        }
        if (json.db_error) {
          setTelegramStatus('failed');
        }
      } else {
        setTelegramStatus('failed');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className={`flex flex-col bg-gray-950/40 border border-gray-800/70 rounded-xl overflow-hidden ${className}`}
    >
      <div className="px-3 py-2 border-b border-gray-800/60 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">
          Clawdia · conversación {scope === 'task' ? 'de la tarea' : 'del sprint'}
        </h3>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          {messages.length} mensajes
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0"
      >
        {messages.length === 0 ? (
          <p className="text-center text-xs text-gray-600 italic py-6">
            Aún no hay mensajes. Iniciá la conversación.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30'
                    : m.role === 'clawdia'
                    ? 'bg-gray-800/80 text-gray-100 border border-gray-700/60'
                    : 'bg-amber-600/10 text-amber-200 border border-amber-500/20 text-xs italic'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-600">
                <span>{sourceIcon(m.source)}</span>
                <span>{formatTime(m.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-gray-800/60 p-2 flex flex-col gap-1"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribile a Clawdia…"
            disabled={sending}
            className="flex-1 bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? '…' : 'Enviar'}
          </button>
        </div>
        {telegramStatus !== 'unknown' && (
          <p
            className={`text-[10px] ${
              telegramStatus === 'sent'
                ? 'text-green-500'
                : telegramStatus === 'failed'
                ? 'text-red-400'
                : 'text-gray-500'
            }`}
          >
            {telegramStatus === 'sent' && '✈ Reenviado a Telegram'}
            {telegramStatus === 'skipped' && 'Telegram no está configurado'}
            {telegramStatus === 'failed' && 'Falló el reenvío a Telegram'}
          </p>
        )}
      </form>
    </div>
  );
}
