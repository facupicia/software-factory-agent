import 'server-only';
import { createServerClient } from '../supabase';
import { env } from '../env';
import { getRoleConfig } from './registry';
import { runAgent } from './runtime';
import type { Agent, AgentRun, Task } from '@/types';

interface DispatchOptions {
  task: Task;
  trigger: 'move' | 'create' | 'manual';
}

interface DispatchResult {
  run: AgentRun;
  skipped?: 'no_skills' | 'no_agent' | 'budget' | 'no_opencode_key' | 'all_offline';
}

export async function dispatchAgentForTask(
  opts: DispatchOptions
): Promise<DispatchResult | null> {
  if (!env.opencodeApiKey) {
    return { run: null as never, skipped: 'no_opencode_key' };
  }

  const supabase = createServerClient();
  const agent = await pickBestAgentForSkills(supabase, opts.task.required_skills);
  if (!agent) {
    await logNoMatch(opts.task);
    return { run: null as never, skipped: 'no_skills' };
  }

  const roleConfig = getRoleConfig(agent.role);
  if (!roleConfig) {
    await logNoRole(opts.task, agent);
    return { run: null as never, skipped: 'no_agent' };
  }

  const { data: run, error } = await supabase
    .from('agent_runs')
    .insert({
      task_id: opts.task.id,
      agent_id: agent.id,
      role: agent.role,
      status: 'queued',
      model: roleConfig.model,
    })
    .select()
    .single();
  if (error || !run) {
    throw new Error(`dispatchAgent: failed to create run: ${error?.message ?? 'unknown'}`);
  }

  await supabase.from('activity_log').insert({
    task_id: opts.task.id,
    agent_id: agent.id,
    action: 'agent_spawned',
    comment: null,
    metadata: { run_id: run.id, role: agent.role, trigger: opts.trigger },
    source: 'orchestrator',
  });

  await supabase
    .from('agents')
    .update({ status: 'busy', last_active_at: new Date().toISOString() })
    .eq('id', agent.id);

  void runInBackground(run.id, opts.task.id, agent.role);

  return { run: run as AgentRun };
}

async function runInBackground(runId: string, taskId: string, role: string): Promise<void> {
  try {
    await runAgent({ runId, taskId, role });
  } catch (err) {
    const supabase = createServerClient();
    const message = err instanceof Error ? err.message : 'unknown error';
    await supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        exit_reason: `dispatcher_error: ${message}`,
      })
      .eq('id', runId);
  }
}

/**
 * Find the best agent for a task by overlapping its `required_skills`
 * with the agent's editable `skills` array. Ties broken by most recent
 * activity. PM (Clawdia) is excluded — she's the dispatcher, not a worker.
 */
async function pickBestAgentForSkills(
  supabase: ReturnType<typeof createServerClient>,
  requiredSkills: string[]
): Promise<Agent | null> {
  if (requiredSkills.length === 0) return null;

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .neq('status', 'offline')
    .neq('is_pm', true);
  if (error) {
    console.error('[dispatcher] agents query failed:', error.message);
    return null;
  }
  const agents = (data ?? []) as Agent[];
  if (agents.length === 0) return null;

  const ranked = agents
    .map((a) => {
      const overlap = requiredSkills.filter((s) =>
        a.skills.map((x) => x.toLowerCase()).includes(s.toLowerCase())
      ).length;
      return { agent: a, overlap };
    })
    .filter((r) => r.overlap > 0)
    .sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      const aTime = a.agent.last_active_at ? new Date(a.agent.last_active_at).getTime() : 0;
      const bTime = b.agent.last_active_at ? new Date(b.agent.last_active_at).getTime() : 0;
      return bTime - aTime;
    });

  return ranked[0]?.agent ?? null;
}

async function logNoMatch(task: Task): Promise<void> {
  const supabase = createServerClient();
  await supabase.from('activity_log').insert({
    task_id: task.id,
    action: 'agent_no_match',
    comment: 'No agent has overlapping skills for required_skills',
    metadata: { skills: task.required_skills },
    source: 'orchestrator',
  });
}

async function logNoRole(task: Task, agent: Agent): Promise<void> {
  const supabase = createServerClient();
  await supabase.from('activity_log').insert({
    task_id: task.id,
    agent_id: agent.id,
    action: 'agent_unknown_role',
    comment: `Agent "${agent.name}" has no role config in registry.ts`,
    metadata: { role: agent.role, agent_id: agent.id },
    source: 'orchestrator',
  });
}
