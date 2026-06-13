import KanbanBoard from '@/components/KanbanBoard';
import { fetchAgents, fetchColumns, fetchTasks } from '@/lib/data';
import type { Agent, Column, Task } from '@/types';

interface Props {
  teamId: string | null;
}

export default async function KanbanBoardAsync({ teamId }: Props) {
  if (!teamId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-400 text-lg">No project selected</p>
          <p className="text-gray-600 text-sm">
            Select a project above or create a new one to get started.
          </p>
        </div>
      </div>
    );
  }

  let columns: Column[] = [];
  let tasks: Task[] = [];
  let agents: Agent[] = [];

  try {
    [columns, tasks, agents] = await Promise.all([
      fetchColumns(teamId),
      fetchTasks(teamId),
      fetchAgents(),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load board';
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
          <p className="text-gray-400 text-lg">No columns</p>
          <p className="text-gray-600 text-sm">
            Run the seed SQL in your Supabase dashboard to create default columns.
          </p>
        </div>
      </div>
    );
  }

  return <KanbanBoard columns={columns} tasks={tasks} agents={agents} />;
}
