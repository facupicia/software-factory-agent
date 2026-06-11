export interface Agent {
  id: string;
  team_id: string | null;
  name: string;
  role: string;
  status: 'idle' | 'busy' | 'offline';
  created_at: string;
}

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
