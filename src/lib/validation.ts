import { z } from 'zod';

export const UuidSchema = z.uuid();

export const PrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const TaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'review',
  'done',
  'blocked',
]);
export const AgentStatusSchema = z.enum(['idle', 'busy', 'offline']);

export const TaskCreateSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(200),
  description: z.string().max(5000).nullable().optional(),
  priority: PrioritySchema.default('medium'),
  status: TaskStatusSchema.default('pending'),
  column_id: UuidSchema.nullable().optional(),
  assigned_agent_id: UuidSchema.nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  github_issue_url: z.url().nullable().optional(),
  github_pr_url: z.url().nullable().optional(),
});
export type TaskCreateInput = z.infer<typeof TaskCreateSchema>;

export const TaskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5000).nullable().optional(),
    priority: PrioritySchema.optional(),
    status: TaskStatusSchema.optional(),
    column_id: UuidSchema.nullable().optional(),
    assigned_agent_id: UuidSchema.nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    github_issue_url: z.url().nullable().optional(),
    github_pr_url: z.url().nullable().optional(),
  })
  .strict();
export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>;

export const TaskMoveSchema = z
  .object({
    column_id: UuidSchema,
    position: z.number().int().min(0).optional(),
  })
  .strict();
export type TaskMoveInput = z.infer<typeof TaskMoveSchema>;

export const ColumnCreateSchema = z.object({
  title: z.string().trim().min(1).max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'color must be a hex like #10b981')
    .default('#6b7280'),
  position: z.number().int().min(0).default(0),
  team_id: UuidSchema.nullable().optional(),
});
export type ColumnCreateInput = z.infer<typeof ColumnCreateSchema>;

export const ColumnUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(80).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'color must be a hex like #10b981')
      .optional(),
    position: z.number().int().min(0).optional(),
  })
  .strict();
export type ColumnUpdateInput = z.infer<typeof ColumnUpdateSchema>;

export const AgentCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.string().trim().min(1).max(80),
  status: AgentStatusSchema.default('idle'),
  team_id: UuidSchema.nullable().optional(),
});
export type AgentCreateInput = z.infer<typeof AgentCreateSchema>;

export const AgentUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    role: z.string().trim().min(1).max(80).optional(),
    status: AgentStatusSchema.optional(),
  })
  .strict();
export type AgentUpdateInput = z.infer<typeof AgentUpdateSchema>;

export const ActivityCreateSchema = z.object({
  task_id: UuidSchema,
  agent_id: UuidSchema.nullable().optional(),
  action: z.string().trim().min(1).max(80),
  comment: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type ActivityCreateInput = z.infer<typeof ActivityCreateSchema>;
