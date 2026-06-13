-- ============================================
-- Agent Kanban — Supabase Schema & Seed
-- ============================================
-- Refleja exactamente las tablas/columnas en Supabase.
-- Idempotent: usa CREATE TABLE IF NOT EXISTS y ON CONFLICT DO NOTHING.

-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. TABLES (existing — already in Supabase)
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'idle',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID REFERENCES columns(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
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
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  model TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tokens_input INT NOT NULL DEFAULT 0,
  tokens_output INT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  exit_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. NEW TABLES (not yet in Supabase — create them)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_logs (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pm_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clawdia_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  tool_calls JSONB,
  external_id BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_activity_task ON activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runs_task ON agent_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started ON agent_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_logs_run ON agent_logs(run_id, id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clawdia_messages_task
  ON clawdia_messages(task_id, created_at DESC)
  WHERE scope = 'task';
CREATE INDEX IF NOT EXISTS idx_clawdia_messages_global
  ON clawdia_messages(created_at DESC)
  WHERE scope = 'global';

-- 5. updated_at TRIGGER (tasks + pm_settings)
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pm_settings_updated_at ON pm_settings;
CREATE TRIGGER trg_pm_settings_updated_at
  BEFORE UPDATE ON pm_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. RLS
-- ============================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clawdia_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all teams" ON teams;
DROP POLICY IF EXISTS "Allow all agents" ON agents;
DROP POLICY IF EXISTS "Allow all columns" ON columns;
DROP POLICY IF EXISTS "Allow all tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all activity" ON activity_log;
DROP POLICY IF EXISTS "Allow all agent_runs" ON agent_runs;
DROP POLICY IF EXISTS "Allow all agent_logs" ON agent_logs;
DROP POLICY IF EXISTS "Allow all pm_settings" ON pm_settings;
DROP POLICY IF EXISTS "Allow all clawdia_messages" ON clawdia_messages;

CREATE POLICY "Allow all teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all columns" ON columns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all activity" ON activity_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all agent_runs" ON agent_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all agent_logs" ON agent_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all pm_settings" ON pm_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all clawdia_messages" ON clawdia_messages FOR ALL USING (true) WITH CHECK (true);

-- 7. REALTIME
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['tasks','activity_log','agents','agent_runs','agent_logs','clawdia_messages']) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
  END LOOP;
END $$;

-- 8. SEED DATA
-- ============================================
INSERT INTO teams (name, description)
  SELECT 'Core Team', 'Agent Kanban primary development team'
  WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Core Team');

DO $$
DECLARE
  done_col_id UUID;
  progress_col_id UUID;
  todo_col_id UUID;
  backlog_col_id UUID;
  review_col_id UUID;
  claudia_id UUID;
  nova_id UUID;
  rex_id UUID;
BEGIN
  -- Agents (only columns that exist in Supabase)
  INSERT INTO agents (name, role, status) VALUES
    ('Clawdia', 'pm', 'busy'),
    ('Kai', 'tech-lead', 'busy'),
    ('Nova', 'frontend-react', 'busy'),
    ('Rex', 'backend-node', 'idle'),
    ('Zara', 'qa-playwright', 'idle'),
    ('DocBot', 'docs-writer', 'idle'),
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
  SELECT id INTO review_col_id FROM columns WHERE title = 'Review';

  SELECT id INTO claudia_id FROM agents WHERE name = 'Clawdia';
  SELECT id INTO nova_id FROM agents WHERE name = 'Nova';
  SELECT id INTO rex_id FROM agents WHERE name = 'Rex';

  -- Tasks (using only columns that exist)
  IF NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Design Supabase schema') THEN
    INSERT INTO tasks (column_id, assigned_agent_id, title, description, priority, status, tags) VALUES
      (done_col_id, claudia_id, 'Design Supabase schema', 'Create the initial database schema for the kanban board', 'high', 'done', ARRAY['database', 'supabase']),
      (done_col_id, nova_id, 'Build Next.js scaffold', 'Initialize Next.js 16 project with TypeScript and Tailwind', 'high', 'done', ARRAY['frontend', 'setup']),
      (progress_col_id, nova_id, 'Implement kanban board UI', 'Build draggable kanban components with dark theme', 'high', 'in_progress', ARRAY['frontend', 'react']),
      (progress_col_id, rex_id, 'Build REST API routes', 'Create API endpoints for tasks, agents, columns, and activity', 'high', 'in_progress', ARRAY['backend', 'api']),
      (review_col_id, nova_id, 'Add Supabase realtime subscriptions', 'Replace reload with realtime updates', 'medium', 'review', ARRAY['frontend', 'realtime']),
      (todo_col_id, NULL, 'Implement task detail modal', 'Clicking a task card opens a modal with full info and activity log', 'medium', 'pending', ARRAY['frontend', 'ui']),
      (backlog_col_id, NULL, 'Add agent dashboard panel', 'Sidebar showing agent list with realtime status indicators', 'low', 'pending', ARRAY['frontend', 'monitoring']),
      (backlog_col_id, NULL, 'CI/CD pipeline setup', 'Configure GitHub Actions and Vercel deploy', 'medium', 'pending', ARRAY['devops', 'deploy']);
  END IF;

  -- Default PM settings
  INSERT INTO pm_settings (key, value) VALUES
    ('daily_budget_usd', '1.0'::jsonb),
    ('require_approval_for_done', 'false'::jsonb),
    ('max_concurrent_agents', '3'::jsonb)
  ON CONFLICT (key) DO NOTHING;
END $$;
