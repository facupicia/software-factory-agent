'use client';

import type { Task, Agent } from '@/types';

const priorityConfig: Record<Task['priority'], { color: string; label: string }> = {
  low: { color: 'bg-gray-600 text-gray-200', label: 'Low' },
  medium: { color: 'bg-blue-600 text-blue-100', label: 'Med' },
  high: { color: 'bg-orange-600 text-orange-100', label: 'High' },
  critical: { color: 'bg-red-600 text-red-100', label: 'Crit' },
};

const statusIcons: Record<string, string> = {
  in_progress: '🔄',
  review: '👀',
  done: '✅',
  blocked: '🚫',
  pending: '📋',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface TaskCardProps {
  task: Task;
  agent?: Agent;
}

export default function TaskCard({ task, agent }: TaskCardProps) {
  const prio = priorityConfig[task.priority] ?? priorityConfig.medium;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ taskId: task.id, fromColumnId: task.column_id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group bg-gray-900 border border-gray-800 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-700 transition-colors"
    >
      {/* Priority + Status row */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${prio.color}`}>
          {prio.label}
        </span>
        <span className="text-xs text-gray-500">
          {task.status in statusIcons ? statusIcons[task.status] : '📋'}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-gray-200 leading-snug mb-2">
        {task.title}
      </p>

      {/* Tags + Agent */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        {agent ? (
          <div
            className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-300 ring-1 ring-gray-600"
            title={agent.name}
          >
            {getInitials(agent.name)}
          </div>
        ) : (
          <div className="flex-shrink-0 w-6 h-6 rounded-full border border-dashed border-gray-700 flex items-center justify-center text-[10px] text-gray-600"
            title="Unassigned">
            ?
          </div>
        )}
      </div>
    </div>
  );
}
