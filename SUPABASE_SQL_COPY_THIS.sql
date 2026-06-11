-- ============================================
-- Agent Kanban — Schema Completo
-- Copiar TODO y ejecutar en:
-- https://supabase.com/dashboard/project/hvpdzmmlfoqejjzipmsx/sql/new
-- ============================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'offline')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID REFERENCES columns(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id),
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'done', 'blocked')),
  tags TEXT[] DEFAULT '{}',
  github_issue_url TEXT,
  github_pr_url TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  comment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_activity_task ON activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity_log(agent_id);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all teams" ON teams FOR ALL USING (true);
CREATE POLICY "Allow all agents" ON agents FOR ALL USING (true);
CREATE POLICY "Allow all columns" ON columns FOR ALL USING (true);
CREATE POLICY "Allow all tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all activity" ON activity_log FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;

-- SEED DATA
INSERT INTO teams (name, description) VALUES ('Core Team', 'Agent Kanban primary dev team');

DO $$
DECLARE
  done_col_id UUID;
  progress_col_id UUID;
  todo_col_id UUID;
  backlog_col_id UUID;
  claudia_id UUID;
  nova_id UUID;
  rex_id UUID;
BEGIN
  SELECT id INTO claudia_id FROM agents WHERE name = 'Clawdia' LIMIT 1;
  
  INSERT INTO agents (name, role, status) VALUES
    ('Clawdia', 'pm', 'busy'),
    ('Kai', 'tech-lead', 'busy'),
    ('Nova', 'frontend', 'busy'),
    ('Rex', 'backend', 'idle'),
    ('Zara', 'qa', 'idle'),
    ('DocBot', 'docs', 'idle'),
    ('Spike', 'research', 'idle')
  ON CONFLICT DO NOTHING;
  
  INSERT INTO columns (title, position, color) VALUES
    ('Backlog', 0, '#6b7280'),
    ('To Do', 1, '#3b82f6'),
    ('In Progress', 2, '#f59e0b'),
    ('Review', 3, '#8b5cf6'),
    ('Done', 4, '#10b981')
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO done_col_id FROM columns WHERE title = 'Done';
  SELECT id INTO progress_col_id FROM columns WHERE title = 'In Progress';
  SELECT id INTO todo_col_id FROM columns WHERE title = 'To Do';
  SELECT id INTO backlog_col_id FROM columns WHERE title = 'Backlog';
  
  SELECT id INTO claudia_id FROM agents WHERE name = 'Clawdia';
  SELECT id INTO nova_id FROM agents WHERE name = 'Nova';
  SELECT id INTO rex_id FROM agents WHERE name = 'Rex';
  
  INSERT INTO tasks (column_id, assigned_agent_id, title, description, priority, status, tags) VALUES
    (done_col_id, claudia_id, 'Design Supabase schema', 'Initial database schema for kanban board', 'high', 'done', ARRAY['database', 'supabase']),
    (done_col_id, nova_id, 'Build Next.js scaffold', 'Initialize Next.js 16 with TypeScript and Tailwind', 'high', 'done', ARRAY['frontend', 'setup']),
    (progress_col_id, nova_id, 'Build kanban board UI', 'Draggable kanban components with dark theme', 'high', 'in_progress', ARRAY['frontend', 'react']),
    (progress_col_id, rex_id, 'Build REST API routes', 'API endpoints for tasks, agents, columns, activity', 'high', 'in_progress', ARRAY['backend', 'api']),
    (todo_col_id, NULL, 'Add Supabase realtime subscriptions', 'Replace reload with realtime updates', 'medium', 'pending', ARRAY['frontend', 'realtime']),
    (backlog_col_id, NULL, 'Implement task detail modal', 'Clicking a task opens modal with full info and activity', 'medium', 'pending', ARRAY['frontend', 'ui']),
    (backlog_col_id, NULL, 'Add agent dashboard panel', 'Sidebar with agent list and realtime status', 'low', 'pending', ARRAY['frontend', 'monitoring']),
    (backlog_col_id, NULL, 'CI/CD pipeline setup', 'Configure GitHub Actions and Vercel deploy', 'medium', 'pending', ARRAY['devops', 'deploy']);
END $$;
