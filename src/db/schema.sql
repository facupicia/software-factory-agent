-- ============================================
-- Agent Kanban — Supabase Schema & Seed
-- ============================================
-- Copy and paste into Supabase SQL Editor:
-- https://hvpdzmmlfoqejjzipmsx.supabase.co
-- ============================================

-- 1. TABLES
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

-- 2. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_activity_task ON activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity_log(agent_id);

-- 3. RLS
-- ============================================
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

-- 4. REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;

-- 5. SEED DATA
-- ============================================

-- Seed Team
INSERT INTO teams (name, description) VALUES ('Core Team', 'Agent Kanban primary development team');

-- Seed Agents
INSERT INTO agents (name, role, status) VALUES
  ('Clawdia', 'pm', 'busy'),
  ('Kai', 'tech-lead', 'busy'),
  ('Nova', 'frontend', 'busy'),
  ('Rex', 'backend', 'idle'),
  ('Zara', 'qa', 'idle'),
  ('DocBot', 'docs', 'idle'),
  ('Spike', 'research', 'idle');

-- Seed Columns
INSERT INTO columns (title, position, color) VALUES
  ('Backlog', 0, '#6b7280'),
  ('To Do', 1, '#3b82f6'),
  ('In Progress', 2, '#f59e0b'),
  ('Review', 3, '#8b5cf6'),
  ('Done', 4, '#10b981');

-- Seed Tasks
INSERT INTO tasks (column_id, assigned_agent_id, title, description, priority, status, tags) 
SELECT 
  col.id,
  ag.id,
  'Design Supabase schema',
  'Create the initial database schema for the kanban board',
  'high',
  'done',
  ARRAY['database', 'supabase']
FROM columns col, agents ag
WHERE col.title = 'Done' AND ag.name = 'Clawdia';

INSERT INTO tasks (column_id, assigned_agent_id, title, description, priority, status, tags)
SELECT 
  col.id,
  ag.id,
  'Build Next.js scaffold',
  'Initialize Next.js 16 project with TypeScript and Tailwind',
  'high',
  'done',
  ARRAY['frontend', 'setup']
FROM columns col, agents ag
WHERE col.title = 'Done' AND ag.name = 'Nova';

INSERT INTO tasks (column_id, assigned_agent_id, title, description, priority, status, tags)
SELECT 
  col.id,
  ag.id,
  'Implement kanban board UI',
  'Build draggable kanban components with dark theme',
  'high',
  'in_progress',
  ARRAY['frontend', 'react']
FROM columns col, agents ag
WHERE col.title = 'In Progress' AND ag.name = 'Nova';

INSERT INTO tasks (column_id, assigned_agent_id, title, description, priority, status, tags)
SELECT 
  col.id,
  ag.id,
  'Build REST API routes',
  'Create API endpoints for tasks, agents, columns, and activity',
  'high',
  'in_progress',
  ARRAY['backend', 'api']
FROM columns col, agents ag
WHERE col.title = 'In Progress' AND ag.name = 'Rex';

INSERT INTO tasks (column_id, assigned_agent_id, title, description, priority, status, tags)
SELECT 
  col.id,
  null,
  'Add Supabase realtime subscriptions',
  'Replace window.location.reload with realtime updates',
  'medium',
  'pending',
  ARRAY['frontend', 'realtime']
FROM columns col
WHERE col.title = 'To Do';

INSERT INTO tasks (column_id, assigned_agent_id, title, description, priority, status, tags)
SELECT 
  col.id,
  null,
  'Implement task detail modal',
  'Clicking a task card opens a modal with full info and activity log',
  'medium',
  'pending',
  ARRAY['frontend', 'ui']
FROM columns col
WHERE col.title = 'Backlog';

INSERT INTO tasks (column_id, assigned_agent_id, title, description, priority, status, tags)
SELECT 
  col.id,
  null,
  'Add agent dashboard panel',
  'Sidebar showing agent list with realtime status indicators',
  'low',
  'pending',
  ARRAY['frontend', 'monitoring']
FROM columns col
WHERE col.title = 'Backlog';

INSERT INTO tasks (column_id, assigned_agent_id, title, description, priority, status, tags)
SELECT 
  col.id,
  null,
  'CI/CD pipeline setup',
  'Configure GitHub Actions and Vercel deploy',
  'medium',
  'pending',
  ARRAY['devops', 'deploy']
FROM columns col
WHERE col.title = 'Backlog';
