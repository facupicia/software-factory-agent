import type { Column, Task, Agent } from '@/types';
import KanbanBoard from '@/components/KanbanBoard';

async function fetchData<T>(url: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}${url}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

export default async function KanbanBoardAsync() {
  let columns: Column[] = [];
  let tasks: Task[] = [];
  let agents: Agent[] = [];

  try {
    [columns, tasks, agents] = await Promise.all([
      fetchData<Column[]>('/api/columns'),
      fetchData<Task[]>('/api/tasks'),
      fetchData<Agent[]>('/api/agents'),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load data';
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-lg font-medium">Error loading board</p>
          <p className="text-gray-500 text-sm">{message}</p>
        </div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-400 text-lg">No columns found</p>
          <p className="text-gray-600 text-sm">
            Run the seed SQL in your Supabase dashboard to create default columns.
          </p>
        </div>
      </div>
    );
  }

  return <KanbanBoard columns={columns} tasks={tasks} agents={agents} />;
}
