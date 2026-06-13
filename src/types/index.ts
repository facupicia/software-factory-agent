export interface Team {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Agent {
  id: string;
  team_id: string | null;
  name: string;
  role: string;
  status: 'idle' | 'busy' | 'offline';
  created_at: string;
}

export type AgentStatus = Agent['status'];

export interface Task {
  id: string;
  column_id: string | null;
  team_id: string | null;
  assigned_agent_id: string | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'review' | 'done' | 'blocked';
  tags: string[];
  github_issue_url: string | null;
  github_pr_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  team_id: string | null;
  title: string;
  position: number;
  color: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  task_id: string;
  agent_id: string | null;
  action: string;
  comment: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AgentRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'killed'
  | 'paused_budget';

export interface AgentRun {
  id: string;
  task_id: string;
  agent_id: string | null;
  role: string;
  status: AgentRunStatus;
  model: string | null;
  started_at: string | null;
  completed_at: string | null;
  tokens_input: number;
  tokens_output: number;
  estimated_cost_usd: number;
  exit_reason: string | null;
  created_at: string;
}

export type AgentLogLevel =
  | 'info'
  | 'thinking'
  | 'tool_use'
  | 'tool_result'
  | 'result'
  | 'error'
  | 'warn';

export interface AgentLog {
  id: number;
  run_id: string;
  level: AgentLogLevel;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ClawdiaMessageRole = 'user' | 'clawdia' | 'system';
export type ClawdiaMessageSource = 'telegram' | 'board' | 'orchestrator';
export type ClawdiaMessageScope = 'global' | 'task';

export interface ClawdiaMessage {
  id: string;
  scope: ClawdiaMessageScope;
  task_id: string | null;
  role: ClawdiaMessageRole;
  content: string;
  source: ClawdiaMessageSource;
  tool_calls: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }> | null;
  external_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PmSetting {
  key: string;
  value: unknown;
  updated_at: string;
}
