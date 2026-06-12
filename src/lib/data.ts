import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import type { Agent, Column, Task } from '@/types';

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
