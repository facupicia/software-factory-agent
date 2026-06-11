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
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex-shrink-0 w-72 flex flex-col bg-gray-950/60 border border-gray-800/70 rounded-xl min-h-[400px]"
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-800/60">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: column.color }}
        />
        <h3 className="text-sm font-semibold text-gray-300">{column.title}</h3>
        <span className="ml-auto text-xs text-gray-600 bg-gray-900 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Tasks list */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-gray-600 italic">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} agent={getAgentForTask(task)} />
          ))
        )}
      </div>
    </div>
  );
}
