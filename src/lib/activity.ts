import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityCreateInput } from './validation';

export async function logActivity(
  supabase: SupabaseClient,
  entry: Omit<ActivityCreateInput, 'task_id'> & { task_id?: string | null }
): Promise<void> {
  const { error } = await supabase.from('activity_log').insert({
    task_id: entry.task_id ?? null,
    agent_id: entry.agent_id ?? null,
    action: entry.action,
    comment: entry.comment ?? null,
    metadata: entry.metadata,
  });
  if (error) {
    console.error('[activity] failed to write log entry:', error.message);
  }
}
