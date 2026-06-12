import type { ToolDefinition } from '../opencode/client';
import { toolsByRole } from './tools';

export interface AgentRoleConfig {
  role: string;
  model: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  maxIterations: number;
  costCeilingUsd: number;
}

function buildSystemPrompt(role: string, skills: string[]): string {
  return `You are an ephemeral specialist agent named after your role (${role}).

You exist only to complete the task assigned to you. When you finish or decide you cannot, you stop.

## Your skills
${skills.map((s) => `- ${s}`).join('\n')}

## How you work
- You will be spawned with a task in the user message.
- Use the available tools to make progress. Prefer \`update_task\` and \`log_activity\` to keep the board informed.
- If you need a decision or hit a blocker, use \`post_message\` to reach the PM (Clawdia).
- Do not invent files. Use \`read_file\` before \`edit_file\`.
- When done, summarize in a final \`update_task\` call (status='done') and a \`log_activity\` entry.

## Constraints
- Be concise. Token cost is real.
- Never log secrets.
- Never modify \`pm_settings\` or other agents' runs.
- Respect the task scope — do not start side quests.

You will be destroyed once the task completes or the run times out.`;
}

const ROLE_DEFAULTS: Record<
  string,
  { model: string; skills: string[]; maxIterations: number; costCeiling: number }
> = {
  'frontend-react': {
    model: 'anthropic/claude-sonnet-4.5',
    skills: ['react', 'next', 'typescript', 'tailwind', 'css', 'html'],
    maxIterations: 20,
    costCeiling: 0.20,
  },
  'backend-node': {
    model: 'anthropic/claude-sonnet-4.5',
    skills: ['node', 'next-api', 'postgres', 'sql', 'supabase'],
    maxIterations: 20,
    costCeiling: 0.20,
  },
  'qa-playwright': {
    model: 'anthropic/claude-haiku-4.5',
    skills: ['playwright', 'e2e-testing', 'browser-automation'],
    maxIterations: 15,
    costCeiling: 0.10,
  },
  'docs-writer': {
    model: 'anthropic/claude-haiku-4.5',
    skills: ['markdown', 'technical-writing', 'api-docs'],
    maxIterations: 10,
    costCeiling: 0.05,
  },
  'tech-lead': {
    model: 'anthropic/claude-sonnet-4.5',
    skills: ['architecture', 'code-review', 'typescript', 'postgres'],
    maxIterations: 15,
    costCeiling: 0.15,
  },
  research: {
    model: 'openai/gpt-5-mini',
    skills: ['web-research', 'analysis', 'summarization'],
    maxIterations: 10,
    costCeiling: 0.05,
  },
  pm: {
    model: 'anthropic/claude-sonnet-4.5',
    skills: ['planning', 'prioritization', 'communication'],
    maxIterations: 5,
    costCeiling: 0.05,
  },
};

export const agentRoles: Record<string, AgentRoleConfig> = Object.fromEntries(
  Object.entries(ROLE_DEFAULTS).map(([role, cfg]) => [
    role,
    {
      role,
      model: cfg.model,
      systemPrompt: buildSystemPrompt(role, cfg.skills),
      tools: toolsByRole[role] ?? [],
      maxIterations: cfg.maxIterations,
      costCeilingUsd: cfg.costCeiling,
    },
  ])
);

export function getRoleConfig(role: string): AgentRoleConfig | undefined {
  return agentRoles[role];
}

export function pickRoleForSkills(
  skills: string[]
): string | undefined {
  if (skills.length === 0) return undefined;
  const ranked = Object.entries(agentRoles)
    .map(([role, cfg]) => {
      const matches = cfg.systemPrompt.match(/## Your skills\n([\s\S]*?)\n##/)?.[1];
      const roleSkills = matches
        ? matches.split('\n').map((s) => s.replace(/^-\s*/, '').trim())
        : [];
      const overlap = skills.filter((s) => roleSkills.includes(s)).length;
      return { role, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap);
  return ranked[0]?.overlap ? ranked[0].role : undefined;
}
