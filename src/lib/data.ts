import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import type {
  ActivityLog,
  Agent,
  AgentRun,
  ClawdiaMessage,
  Column,
  PmSetting,
  Task,
} from '@/types';

let cachedServerClient: ReturnType<typeof createClient> | null = null;

function getServerClient() {
  if (cachedServerClient) return cachedServerClient;
  const key = env.supabaseServiceRoleKey ?? env.supabaseAnonKey;
  cachedServerClient = createClient(env.supabaseUrl, key, {
    auth: { persistSession: false },
  });
  return cachedServerClient;
}

export async function fetchColumns(): Promise<Column[]> {
  const { data, error } = await getServerClient()
    .from('columns')
    .select('*')
    .order('position', { ascending: true });
  if (error) throw new Error(`fetchColumns: ${error.message}`);
  return (data ?? []) as Column[];
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await getServerClient()
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchTasks: ${error.message}`);
  return (data ?? []) as Task[];
}

export async function fetchAgents(): Promise<Agent[]> {
  const { data, error } = await getServerClient()
    .from('agents')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw new Error(`fetchAgents: ${error.message}`);
  return (data ?? []) as Agent[];
}

export async function fetchRecentActivity(limit = 30): Promise<ActivityLog[]> {
  const { data, error } = await getServerClient()
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`fetchRecentActivity: ${error.message}`);
  return (data ?? []) as ActivityLog[];
}

export async function fetchRunningAgentRuns(): Promise<AgentRun[]> {
  const { data, error } = await getServerClient()
    .from('agent_runs')
    .select('*')
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchRunningAgentRuns: ${error.message}`);
  return (data ?? []) as AgentRun[];
}

export async function fetchGlobalMessages(limit = 50): Promise<ClawdiaMessage[]> {
  const { data, error } = await getServerClient()
    .from('clawdia_messages')
    .select('*')
    .eq('scope', 'global')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`fetchGlobalMessages: ${error.message}`);
  return (data ?? []) as ClawdiaMessage[];
}

export async function fetchPmSettings(): Promise<PmSetting[]> {
  const { data, error } = await getServerClient()
    .from('pm_settings')
    .select('*');
  if (error) throw new Error(`fetchPmSettings: ${error.message}`);
  return (data ?? []) as PmSetting[];
}
