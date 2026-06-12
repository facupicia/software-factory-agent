import KanbanBoard from '@/components/KanbanBoard';
import { fetchAgents, fetchColumns, fetchTasks } from '@/lib/data';
import type { Agent, Column, Task } from '@/types';

export default async function KanbanBoardAsync() {
  let columns: Column[] = [];
  let tasks: Task[] = [];
  let agents: Agent[] = [];

  try {
    [columns, tasks, agents] = await Promise.all([
      fetchColumns(),
      fetchTasks(),
      fetchAgents(),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudieron cargar los datos';
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-lg font-medium">Error al cargar el tablero</p>
          <p className="text-gray-500 text-sm">{message}</p>
        </div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-400 text-lg">No hay columnas</p>
          <p className="text-gray-600 text-sm">
            Corré el SQL de seed en tu dashboard de Supabase para crear las columnas por defecto.
          </p>
        </div>
      </div>
    );
  }

  return <KanbanBoard columns={columns} tasks={tasks} agents={agents} />;
}
