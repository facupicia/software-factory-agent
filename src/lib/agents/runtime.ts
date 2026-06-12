import 'server-only';
import { createServerClient } from '../supabase';
import { env } from '../env';
import {
  chatCompletionStream,
  estimateCostUsd,
  type AgentStreamEvent,
  type ChatMessage,
  type ToolCall,
} from '../opencode/client';
import { getRoleConfig } from './registry';
import type { Task } from '@/types';
import type { ToolDefinition } from '../opencode/client';

interface RuntimeOptions {
  runId: string;
  taskId: string;
  role: string;
}

interface PendingLog {
  level: 'info' | 'thinking' | 'tool_use' | 'tool_result' | 'result' | 'error' | 'warn';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface RunResult {
  status: 'completed' | 'failed' | 'killed' | 'paused_budget';
  reason: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
}

export async function runAgent(opts: RuntimeOptions): Promise<RunResult> {
  const supabase = createServerClient();
  const role = getRoleConfig(opts.role);
  if (!role) {
    return failRun(supabase, opts.runId, 'failed', `Unknown role: ${opts.role}`);
  }

  await updateRun(supabase, opts.runId, {
    status: 'running',
    model: role.model,
    started_at: new Date().toISOString(),
  });
  await appendLog(supabase, opts.runId, {
    level: 'info',
    message: `Spawned ${role.role} agent (model=${role.model})`,
  });

  const task = await loadTask(supabase, opts.taskId);
  if (!task) {
    return failRun(supabase, opts.runId, 'failed', 'Task not found');
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: role.systemPrompt },
    {
      role: 'user',
      content: buildUserPrompt(task),
    },
  ];

  let totalInput = 0;
  let totalOutput = 0;
  const model = role.model;
  const toolDefs: ToolDefinition[] = role.tools;

  for (let iter = 0; iter < role.maxIterations; iter++) {
    const currentCost = estimateCostUsd(model, totalInput, totalOutput);
    if (currentCost >= role.costCeilingUsd) {
      await appendLog(supabase, opts.runId, {
        level: 'warn',
        message: `Cost ceiling reached ($${currentCost.toFixed(4)})`,
      });
      return finishRun(supabase, opts.runId, 'paused_budget', currentCost, totalInput, totalOutput);
    }

    const dailyCost = await getTodaySpend(supabase);
    if (dailyCost >= env.dailyBudgetUsd) {
      await appendLog(supabase, opts.runId, {
        level: 'warn',
        message: `Daily budget exhausted ($${dailyCost.toFixed(4)})`,
      });
      return finishRun(supabase, opts.runId, 'paused_budget', currentCost, totalInput, totalOutput);
    }

    let contentBuffer = '';
    const pendingToolCalls: ToolCall[] = [];
    let finishReason: string | null = null;

    try {
      for await (const event of chatCompletionStream({
        model,
        messages,
        tools: toolDefs.length > 0 ? toolDefs : undefined,
      } satisfies Parameters<typeof chatCompletionStream>[0])) {
        await handleEvent(supabase, opts.runId, event, {
          onContent: (delta) => {
            contentBuffer += delta;
          },
          onToolCall: (tc) => {
            pendingToolCalls.push(tc);
          },
        });

        if (event.type === 'usage') {
          totalInput += event.usage.prompt_tokens;
          totalOutput += event.usage.completion_tokens;
        }
        if (event.type === 'finish') {
          finishReason = event.reason;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'stream error';
      await appendLog(supabase, opts.runId, {
        level: 'error',
        message: `OpenCode stream error: ${msg}`,
      });
      return finishRun(supabase, opts.runId, 'failed', estimateCostUsd(model, totalInput, totalOutput), totalInput, totalOutput, msg);
    }

    if (contentBuffer) {
      messages.push({ role: 'assistant', content: contentBuffer });
    }

    if (pendingToolCalls.length === 0) {
      await appendLog(supabase, opts.runId, {
        level: 'result',
        message: contentBuffer || '(no content)',
      });
      break;
    }

    messages.push({
      role: 'assistant',
      content: contentBuffer || '',
      tool_calls: pendingToolCalls,
    });

    for (const tc of pendingToolCalls) {
      await executeToolCall(supabase, opts, tc);
    }

    if (finishReason === 'stop' && pendingToolCalls.length === 0) break;
  }

  const finalCost = estimateCostUsd(model, totalInput, totalOutput);
  return finishRun(supabase, opts.runId, 'completed', finalCost, totalInput, totalOutput);
}

function buildUserPrompt(task: Task): string {
  const lines = [
    `# Task: ${task.title}`,
    '',
    task.description ?? '(no description)',
    '',
    `Priority: ${task.priority}`,
    `Status: ${task.status}`,
  ];
  if (task.tags.length > 0) lines.push(`Tags: ${task.tags.join(', ')}`);
  if (task.required_skills.length > 0) {
    lines.push(`Required skills: ${task.required_skills.join(', ')}`);
  }
  if (task.github_issue_url) lines.push(`Issue: ${task.github_issue_url}`);
  if (task.github_pr_url) lines.push(`PR: ${task.github_pr_url}`);
  lines.push('');
  lines.push('Begin. Use update_task and log_activity to report progress.');
  return lines.join('\n');
}

async function handleEvent(
  supabase: ReturnType<typeof createServerClient>,
  runId: string,
  event: AgentStreamEvent,
  handlers: {
    onContent: (delta: string) => void;
    onToolCall: (tc: ToolCall) => void;
  }
): Promise<void> {
  switch (event.type) {
    case 'content':
      handlers.onContent(event.delta);
      break;
    case 'tool_call':
      handlers.onToolCall(event.toolCall);
      await appendLog(supabase, runId, {
        level: 'tool_use',
        message: `→ ${event.toolCall.function.name}`,
        metadata: safeParseArgs(event.toolCall.function.arguments),
      });
      break;
    case 'tool_call_delta':
      break;
    case 'finish':
      await appendLog(supabase, runId, {
        level: 'info',
        message: `finish_reason=${event.reason}`,
      });
      break;
    case 'usage':
      break;
    case 'error':
      await appendLog(supabase, runId, {
        level: 'error',
        message: event.message,
      });
      break;
  }
}

async function executeToolCall(
  supabase: ReturnType<typeof createServerClient>,
  opts: RuntimeOptions,
  tc: ToolCall
): Promise<void> {
  const args = safeParseArgs(tc.function.arguments);
  await appendLog(supabase, opts.runId, {
    level: 'tool_result',
    message: `← ${tc.function.name}`,
    metadata: args,
  });

  switch (tc.function.name) {
    case 'update_task': {
      const patch: Record<string, unknown> = {};
      if (typeof args.status === 'string') patch.status = args.status;
      if (typeof args.priority === 'string') patch.priority = args.priority;
      if (typeof args.description === 'string') patch.description = args.description;
      if (Object.keys(patch).length === 0) return;
      if (patch.status === 'done') patch.completed_at = new Date().toISOString();
      if (patch.status === 'in_progress' && !patch.started_at) {
        patch.started_at = new Date().toISOString();
      }
      await supabase.from('tasks').update(patch).eq('id', opts.taskId);
      await supabase.from('activity_log').insert({
        task_id: opts.taskId,
        action: 'agent_update_task',
        comment: null,
        metadata: { patch, run_id: opts.runId },
        source: 'orchestrator',
      });
      return;
    }
    case 'log_activity': {
      await supabase.from('activity_log').insert({
        task_id: opts.taskId,
        action: typeof args.action === 'string' ? args.action : 'agent_log',
        comment: typeof args.comment === 'string' ? args.comment : null,
        metadata: { run_id: opts.runId },
        source: 'orchestrator',
      });
      return;
    }
    case 'post_message': {
      await supabase.from('clawdia_messages').insert({
        scope: args.scope === 'task' ? 'task' : 'global',
        task_id: args.scope === 'task' ? opts.taskId : null,
        role: 'clawdia',
        content: typeof args.content === 'string' ? args.content : '',
        source: 'orchestrator',
        tool_calls: null,
        metadata: { run_id: opts.runId, role: opts.role },
      });
      return;
    }
    case 'read_file':
    case 'edit_file':
    case 'run_command':
    case 'run_tests':
    case 'browser': {
      await appendLog(supabase, opts.runId, {
        level: 'warn',
        message: `Tool "${tc.function.name}" is not yet wired to a real executor; ignoring.`,
      });
      return;
    }
    default:
      await appendLog(supabase, opts.runId, {
        level: 'warn',
        message: `Unknown tool: ${tc.function.name}`,
      });
  }
}

async function loadTask(
  supabase: ReturnType<typeof createServerClient>,
  taskId: string
): Promise<Task | null> {
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle();
  return (data as Task | null) ?? null;
}

async function updateRun(
  supabase: ReturnType<typeof createServerClient>,
  runId: string,
  patch: Record<string, unknown>
): Promise<void> {
  await supabase.from('agent_runs').update(patch).eq('id', runId);
}

async function appendLog(
  supabase: ReturnType<typeof createServerClient>,
  runId: string,
  entry: PendingLog
): Promise<void> {
  await supabase.from('agent_logs').insert({
    run_id: runId,
    level: entry.level,
    message: entry.message,
    metadata: entry.metadata ?? {},
  });
}

async function finishRun(
  supabase: ReturnType<typeof createServerClient>,
  runId: string,
  status: RunResult['status'],
  costUsd: number,
  tokensInput: number,
  tokensOutput: number,
  reason?: string
): Promise<RunResult> {
  await updateRun(supabase, runId, {
    status,
    completed_at: new Date().toISOString(),
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    estimated_cost_usd: costUsd,
    exit_reason: reason ?? status,
  });
  return { status, reason: reason ?? status, tokensInput, tokensOutput, costUsd };
}

async function failRun(
  supabase: ReturnType<typeof createServerClient>,
  runId: string,
  status: 'failed',
  reason: string
): Promise<RunResult> {
  return finishRun(supabase, runId, status, 0, 0, 0, reason);
}

async function getTodaySpend(
  supabase: ReturnType<typeof createServerClient>
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('agent_runs')
    .select('estimated_cost_usd')
    .gte('created_at', startOfDay.toISOString());
  if (!data) return 0;
  return (data as Array<{ estimated_cost_usd: number }>).reduce(
    (sum, r) => sum + Number(r.estimated_cost_usd ?? 0),
    0
  );
}

function safeParseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { _raw: raw };
  }
}
