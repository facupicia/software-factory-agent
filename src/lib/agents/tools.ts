import type { ToolDefinition } from '../opencode/client';
import {
  PrioritySchema,
  TaskStatusSchema,
} from '../validation';

const readFileTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'read_file',
    description: 'Read the contents of a file from the project repository.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path relative to the project root, e.g. "src/app/page.tsx".',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
};

const editFileTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'edit_file',
    description:
      'Apply a unified-diff style edit to a file. The patch must apply cleanly.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        patch: { type: 'string', description: 'Unified diff content.' },
      },
      required: ['path', 'patch'],
      additionalProperties: false,
    },
  },
};

const runCommandTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'run_command',
    description:
      'Run a shell command in the project root. Use sparingly — it can be slow and unsafe.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        timeout_ms: { type: 'number', default: 30000 },
      },
      required: ['command'],
      additionalProperties: false,
    },
  },
};

const runTestsTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'run_tests',
    description:
      'Run the project test suite. Returns pass/fail with summary.',
    parameters: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Optional test name pattern.' },
      },
      additionalProperties: false,
    },
  },
};

const browserTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'browser',
    description: 'Navigate to a URL and return the rendered DOM (read-only).',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string' },
      },
      required: ['url'],
      additionalProperties: false,
    },
  },
};

const updateTaskTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_task',
    description: 'Update the current task. Use to reflect progress.',
    parameters: {
      type: 'object',
      properties: {
        status: TaskStatusSchema,
        priority: PrioritySchema.optional(),
        description: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
};

const logActivityTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'log_activity',
    description:
      'Append a milestone to the activity log. Use sparingly — only for notable events.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string' },
        comment: { type: 'string' },
      },
      required: ['action'],
      additionalProperties: false,
    },
  },
};

const postClawdiaMessageTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'post_message',
    description:
      'Send a message to Clawdia (the PM). Use when you need a decision or to report a blocker.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        scope: { type: 'string', enum: ['global', 'task'] },
        task_id: { type: 'string' },
      },
      required: ['content'],
      additionalProperties: false,
    },
  },
};

const baseTools: ToolDefinition[] = [
  updateTaskTool,
  logActivityTool,
  postClawdiaMessageTool,
];

const repoTools: ToolDefinition[] = [readFileTool, editFileTool, runCommandTool];

export const toolsByRole: Record<string, ToolDefinition[]> = {
  'frontend-react': [...repoTools, browserTool, ...baseTools],
  'backend-node': [...repoTools, runTestsTool, ...baseTools],
  'qa-playwright': [...repoTools, runTestsTool, browserTool, ...baseTools],
  'docs-writer': [readFileTool, editFileTool, ...baseTools],
  'tech-lead': [readFileTool, runCommandTool, ...baseTools],
  research: [browserTool, readFileTool, ...baseTools],
  pm: [...baseTools],
};
