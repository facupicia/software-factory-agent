import 'server-only';
import { env } from '../env';

const DEFAULT_BASE = 'https://api.opencode.ai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export type AgentStreamEvent =
  | { type: 'content'; delta: string }
  | { type: 'tool_call'; toolCall: ToolCall }
  | { type: 'tool_call_delta'; index: number; id?: string; name?: string; arguments?: string }
  | { type: 'finish'; reason: ChatCompletionResponse['choices'][0]['finish_reason'] }
  | { type: 'usage'; usage: NonNullable<ChatCompletionResponse['usage']> }
  | { type: 'error'; message: string };

function getBaseUrl(): string {
  return env.opencodeBaseUrl ?? DEFAULT_BASE;
}

export async function chatCompletion(
  req: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const apiKey = env.opencodeApiKey;
  if (!apiKey) {
    throw new Error(
      'OPENCODE_API_KEY is not set. Get one at https://opencode.ai and add it to .env.local'
    );
  }

  const res = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...req, stream: false }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenCode API error ${res.status}: ${body}`);
  }

  return (await res.json()) as ChatCompletionResponse;
}

export async function* chatCompletionStream(
  req: ChatCompletionRequest
): AsyncGenerator<AgentStreamEvent> {
  const apiKey = env.opencodeApiKey;
  if (!apiKey) {
    throw new Error('OPENCODE_API_KEY is not set');
  }

  const res = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ ...req, stream: true }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenCode API error ${res.status}: ${body}`);
  }
  if (!res.body) {
    throw new Error('OpenCode response had no body');
  }

  yield* parseSSE(res.body);
}

/**
 * Parse an SSE stream from the OpenAI-compatible chat completions endpoint.
 * Each event looks like:
 *   data: {"id":"...","choices":[{"delta":{...}}]}
 * terminated by a literal `data: [DONE]`.
 */
export async function* parseSSE(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<AgentStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        const dataLines: string[] = [];
        for (const line of rawEvent.split('\n')) {
          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
          }
        }
        const data = dataLines.join('\n').trim();
        if (!data || data === '[DONE]') continue;

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }

        for (const ev of chunkToEvents(parsed)) yield ev;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function chunkToEvents(chunk: Record<string, unknown>): AgentStreamEvent[] {
  const events: AgentStreamEvent[] = [];

  const usage = chunk.usage as ChatCompletionResponse['usage'] | undefined;
  if (usage) events.push({ type: 'usage', usage });

  const choices = chunk.choices as ChatCompletionResponse['choices'] | undefined;
  if (!choices) return events;

  for (const choice of choices) {
    const delta = (choice as { delta?: Record<string, unknown> }).delta;
    if (delta) {
      const content = delta.content;
      if (typeof content === 'string' && content.length > 0) {
        events.push({ type: 'content', delta: content });
      }
      const toolCalls = delta.tool_calls as
        | Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }>
        | undefined;
      if (toolCalls) {
        for (const tc of toolCalls) {
          if (tc.id && tc.function?.name) {
            events.push({
              type: 'tool_call',
              toolCall: {
                id: tc.id,
                type: 'function',
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments ?? '{}',
                },
              },
            });
          } else {
            events.push({
              type: 'tool_call_delta',
              index: tc.index,
              id: tc.id,
              name: tc.function?.name,
              arguments: tc.function?.arguments,
            });
          }
        }
      }
    }

    const finish = (choice as { finish_reason?: string }).finish_reason;
    if (finish) {
      events.push({
        type: 'finish',
        reason: finish as ChatCompletionResponse['choices'][0]['finish_reason'],
      });
    }
  }

  return events;
}

/**
 * Estimate cost in USD given a model and token counts.
 * Pricing is in USD per 1M tokens. Adjust as OpenCode's pricing changes.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4.5': { input: 3, output: 15 },
  'anthropic/claude-haiku-4.5': { input: 0.8, output: 4 },
  'openai/gpt-5': { input: 2.5, output: 10 },
  'openai/gpt-5-mini': { input: 0.25, output: 2 },
};

export function estimateCostUsd(
  model: string,
  tokensInput: number,
  tokensOutput: number
): number {
  const p = PRICING[model] ?? { input: 1, output: 3 };
  return (tokensInput * p.input + tokensOutput * p.output) / 1_000_000;
}
