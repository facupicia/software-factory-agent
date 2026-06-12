'use client';

import { useCallback, useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Column, Task, Agent } from '@/types';
import ColumnLane from './ColumnLane';
import TaskDrawer from './TaskDrawer';

interface KanbanBoardProps {
  columns: Column[];
  tasks: Task[];
  agents: Agent[];
}

type OptimisticAction =
  | { type: 'move'; taskId: string; toColumnId: string }
  | { type: 'revert'; previous: Task[] };

function applyOptimistic(tasks: Task[], action: OptimisticAction): Task[] {
  switch (action.type) {
    case 'move':
      return tasks.map((t) =>
        t.id === action.taskId ? { ...t, column_id: action.toColumnId } : t
      );
    case 'revert':
      return action.previous;
  }
}

export default function KanbanBoard({ columns, tasks, agents }: KanbanBoardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticTasks, apply] = useOptimistic(tasks, applyOptimistic);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleDrop = useCallback(
    async (taskId: string, toColumnId: string) => {
      const previous = optimisticTasks;
      const task = previous.find((t) => t.id === taskId);
      if (!task || task.column_id === toColumnId) return;

      startTransition(() => {
        apply({ type: 'move', taskId, toColumnId });
      });

      try {
        const res = await fetch(`/api/tasks/${taskId}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column_id: toColumnId }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        router.refresh();
      } catch (err) {
        console.error('No se pudo mover la tarea:', err);
        startTransition(() => {
          apply({ type: 'revert', previous });
        });
      }
    },
    [apply, optimisticTasks, router]
  );

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  const getTasksForColumn = (columnId: string) =>
    optimisticTasks.filter((t) => t.column_id === columnId);

  return (
    <>
      <div
        aria-busy={isPending}
        className="flex gap-4 overflow-x-auto pb-4 px-1 min-h-0 flex-1
                    flex-col md:flex-row"
      >
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
      <TaskDrawer
        task={
          selectedTask
            ? optimisticTasks.find((t) => t.id === selectedTask.id) ?? selectedTask
            : null
        }
        onClose={() => setSelectedTask(null)}
      />
    </>
  );
}
