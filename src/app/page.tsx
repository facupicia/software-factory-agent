import { Suspense } from 'react';
import KanbanBoardAsync from '@/components/KanbanBoardAsync';
import TeamSelector from '@/components/TeamSelector';
import { fetchTeams } from '@/lib/data';

interface HomePageProps {
  searchParams: Promise<{ team?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const sp = await searchParams;
  const selectedTeamId = sp.team ?? null;

  const teams = await fetchTeams().catch(() => []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Team selector bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800/60 bg-gray-950/40">
        <TeamSelector teams={teams} selectedTeamId={selectedTeamId} />
        <span className="text-xs text-gray-600">Agent Kanban</span>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 min-h-0">
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <Suspense fallback={null}>
            <KanbanBoardAsync teamId={selectedTeamId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
