'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Team } from '@/types';

interface TeamSelectorProps {
  teams: Team[];
  selectedTeamId: string | null;
}

export default function TeamSelector({ teams, selectedTeamId }: TeamSelectorProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const handleSelect = (teamId: string | null) => {
    const url = teamId ? `/?team=${teamId}` : '/';
    router.push(url);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setError('Name is required'); return; }
    setError('');
    setCreating(false);
    setNewName('');

    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      const team = await res.json() as Team;
      router.push(`/?team=${team.id}`);
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({ error: 'Failed' }));
      setError(err.error ?? 'Failed to create team');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <select
        value={selectedTeamId ?? ''}
        onChange={(e) => handleSelect(e.target.value || null)}
        className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200
                   focus:outline-none focus:ring-1 focus:ring-blue-500/60"
      >
        <option value="">— Select project —</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      {creating ? (
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
          className="flex items-center gap-1"
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name…"
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200
                       w-40 focus:outline-none focus:ring-1 focus:ring-blue-500/60"
          />
          <button
            type="submit"
            className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setError(''); }}
            className="px-2 py-1 text-sm text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </form>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          + New project
        </button>
      )}
    </div>
  );
}
