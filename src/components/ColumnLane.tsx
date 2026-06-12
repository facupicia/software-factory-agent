'use client';

import { useCallback } from 'react';
import type { Column, Task, Agent } from '@/types';
import TaskCard from './TaskCard';

interface ColumnLaneProps {
  column: Column;
  tasks: Task[];
  agents: Agent[];
  onDrop: (taskId: string, toColumnId: string) => void;
}

export default function ColumnLane({ column, tasks, agents, onDrop }: ColumnLaneProps) {
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.taskId && data.fromColumnId !== column.id) {
          onDrop(data.taskId, column.id);
        }
      } catch {
        // ignore invalid drop data
      }
    },
    [column.id, onDrop]
  );

  const getAgentForTask = (task: Task): Agent | undefined =>
    agents.find((a) => a.id === task.assigned_agent_id);

  return (
    <section
      aria-label={`${column.title} column with ${tasks.length} tasks`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDrop={handleDrop}
      className="flex-shrink-0 w-72 flex flex-col bg-gray-950/60 border border-gray-800/70 rounded-xl min-h-[400px]"
    >
      <header className="flex items-center gap-2 px-3 py-3 border-b border-gray-800/60">
        <span
          aria-hidden="true"
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: column.color }}
        />
        <h2 className="text-sm font-semibold text-gray-300">{column.title}</h2>
        <span
          aria-label={`${tasks.length} tasks`}
          className="ml-auto text-xs text-gray-600 bg-gray-900 px-2 py-0.5 rounded-full"
        >
          {tasks.length}
        </span>
      </header>

      <div role="list" className="flex-1 p-2 space-y-2 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="flex items-center justify-center h-24 text-xs text-gray-600 italic">
            No tasks
          </p>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} agent={getAgentForTask(task)} />
          ))
        )}
      </div>
    </section>
  );
}
