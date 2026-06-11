'use client';

import { useCallback } from 'react';
import type { Column, Task, Agent } from '@/types';
import ColumnLane from './ColumnLane';

interface KanbanBoardProps {
  columns: Column[];
  tasks: Task[];
  agents: Agent[];
}

export default function KanbanBoard({ columns, tasks, agents }: KanbanBoardProps) {
  const handleDrop = useCallback(async (taskId: string, toColumnId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_id: toColumnId }),
      });
      // The parent page will revalidate or we can trigger a refresh
      window.location.reload();
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  }, []);

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  const getTasksForColumn = (columnId: string) =>
    tasks.filter((t) => t.column_id === columnId);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1 min-h-0 flex-1
                    flex-col md:flex-row">
      {sortedColumns.map((column) => (
        <ColumnLane
          key={column.id}
          column={column}
          tasks={getTasksForColumn(column.id)}
          agents={agents}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
