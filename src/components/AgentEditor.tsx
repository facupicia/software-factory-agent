'use client';

import { useEffect, useState } from 'react';
import type { Agent, AgentStatus } from '@/types';

interface Props {
  agent?: Agent;
  children?: React.ReactNode;
}

type UpdateableFields = {
  name: string;
  role: string;
  status: AgentStatus;
  skills: string[];
  notes: string;
};

const statusOptions: AgentStatus[] = ['idle', 'busy', 'offline'];

const statusLabels: Record<AgentStatus, string> = {
  idle: 'Inactivo',
  busy: 'Ocupado',
  offline: 'Desconectado',
};

export default function AgentEditor({ agent, children }: Props) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!children) {
    if (!agent) return null;
    return (
      <Drawer
        key={agent.id}
        open={open}
        onClose={() => setOpen(false)}
        agent={agent}
        now={now}
      />
    );
  }

  return (
    <>
      <span
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        role="button"
        tabIndex={0}
        className="cursor-pointer"
      >
        {children}
      </span>
      {agent && (
        <Drawer
          key={agent.id}
          open={open}
          onClose={() => setOpen(false)}
          agent={agent}
          now={now}
        />
      )}
    </>
  );
}

function relTime(iso: string | null, now: number): string {
  if (!iso) return 'nunca';
  const diff = now - new Date(iso).getTime();
  if (diff < 60_000) return 'ahora';
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)} h`;
  return `hace ${Math.floor(diff / 86_400_000)} d`;
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  agent: Agent;
  now: number;
}

function Drawer({ open, onClose, agent, now }: DrawerProps) {
  const [draft, setDraft] = useState<UpdateableFields>(() => draftFromAgent(agent));
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          reason?: string;
          issues?: { message: string }[];
        };
        throw new Error(
          body.issues?.map((i) => i.message).join('; ') ??
            body.reason ??
            body.error ??
            `HTTP ${res.status}`
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el agente "${agent.name}"? Esta acción no se puede deshacer.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Editar ${agent.name}`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-gray-950 border-l border-gray-800 w-full max-w-lg flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between p-4 border-b border-gray-800/70">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
              Editar agente
              {agent.is_pm && (
                <span className="text-blue-300 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded normal-case">
                  PM
                </span>
              )}
            </p>
            <h2 className="text-base font-semibold text-gray-100 truncate">
              {agent.name}
            </h2>
            <p className="text-[10px] text-gray-600 mt-1">
              activo {relTime(agent.last_active_at, now)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar editor"
            className="ml-2 text-gray-500 hover:text-gray-300 text-xl leading-none"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          <Field label="Nombre">
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={80}
              className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/60"
            />
          </Field>

          <Field label="Rol">
            <input
              type="text"
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              maxLength={80}
              placeholder="ej. backend-node, qa-playwright"
              className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/60"
            />
            <p className="text-[10px] text-gray-600 mt-1">
              Se usa para buscar el modelo y el set de herramientas del rol. El runtime lee{' '}
              <code className="mx-1 px-1 bg-gray-800 rounded">src/lib/agents/registry.ts</code>.
            </p>
          </Field>

          <Field label="Estado">
            <div className="flex gap-2">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft({ ...draft, status: s })}
                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                    draft.status === s
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-200'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Skills (${draft.skills.length})`}>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draft.skills.map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="inline-flex items-center gap-1 text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        skills: draft.skills.filter((_, j) => j !== i),
                      })
                    }
                    className="text-gray-500 hover:text-red-400"
                    aria-label={`Quitar ${s}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {draft.skills.length === 0 && (
                <span className="text-xs text-gray-600 italic">Sin skills</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addSkillToDraft(setDraft, draft, newSkill);
                    setNewSkill('');
                  }
                }}
                placeholder="agregá una skill y presioná Enter"
                maxLength={40}
                className="flex-1 bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/60"
              />
              <button
                type="button"
                onClick={() => {
                  addSkillToDraft(setDraft, draft, newSkill);
                  setNewSkill('');
                }}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded"
              >
                Agregar
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1">
              Se matchean contra el campo{' '}
              <code className="px-1 bg-gray-800 rounded">required_skills</code>{' '}
              de las tareas para elegir al mejor agente.
            </p>
          </Field>

          <Field label="Notas (instrucciones / cómo querés que trabaje)">
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              maxLength={10_000}
              rows={8}
              placeholder="Markdown libre. Describí cómo querés que se comporte este agente, qué evitar, qué priorizar…"
              className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 font-mono resize-y focus:outline-none focus:ring-1 focus:ring-blue-500/60"
            />
            <p className="text-[10px] text-gray-600 mt-1">
              {draft.notes.length} / 10.000 caracteres
            </p>
          </Field>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <footer className="border-t border-gray-800/70 p-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || agent.is_pm}
            title={agent.is_pm ? 'No se puede eliminar al PM' : 'Eliminar agente'}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Eliminar
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function draftFromAgent(agent: Agent): UpdateableFields {
  return {
    name: agent.name,
    role: agent.role,
    status: agent.status,
    skills: agent.skills ?? [],
    notes: agent.notes ?? '',
  };
}

function addSkillToDraft(
  setDraft: (d: UpdateableFields) => void,
  draft: UpdateableFields,
  raw: string
) {
  const v = raw.trim();
  if (!v) return;
  if (draft.skills.some((s) => s.toLowerCase() === v.toLowerCase())) return;
  setDraft({ ...draft, skills: [...draft.skills, v] });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1.5 font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
