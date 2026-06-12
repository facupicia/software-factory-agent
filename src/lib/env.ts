import { z } from 'zod';

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  VERCEL_URL: z.string().optional(),

  OPENCODE_API_KEY: z.string().min(1).optional(),
  OPENCODE_BASE_URL: z.string().optional(),
  OPENCODE_DEFAULT_MODEL: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),
  CLAWDIA_CHAT_ID: z.coerce.number().int().optional(),

  DAILY_BUDGET_USD: z.coerce.number().positive().optional(),
});

export type RawEnv = z.infer<typeof EnvSchema>;

export interface NormalizedEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string | undefined;
  siteUrl: string | undefined;
  vercelUrl: string | undefined;

  opencodeApiKey: string | undefined;
  opencodeBaseUrl: string | undefined;
  opencodeDefaultModel: string;

  telegramBotToken: string | undefined;
  telegramWebhookSecret: string | undefined;
  clawdiaChatId: number | undefined;

  dailyBudgetUsd: number;
}

let cached: NormalizedEnv | null = null;

function load(): NormalizedEnv {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_URL: process.env.VERCEL_URL,

    OPENCODE_API_KEY: process.env.OPENCODE_API_KEY,
    OPENCODE_BASE_URL: process.env.OPENCODE_BASE_URL,
    OPENCODE_DEFAULT_MODEL: process.env.OPENCODE_DEFAULT_MODEL,

    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    CLAWDIA_CHAT_ID: process.env.CLAWDIA_CHAT_ID,

    DAILY_BUDGET_USD: process.env.DAILY_BUDGET_USD,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid or missing environment variables:\n${issues}\n\n` +
        `See .env.example for the required configuration.`
    );
  }
  const r = parsed.data;
  cached = {
    supabaseUrl: r.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: r.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    supabaseServiceRoleKey: r.SUPABASE_SERVICE_ROLE_KEY,
    siteUrl: r.NEXT_PUBLIC_SITE_URL,
    vercelUrl: r.VERCEL_URL,

    opencodeApiKey: r.OPENCODE_API_KEY,
    opencodeBaseUrl: r.OPENCODE_BASE_URL,
    opencodeDefaultModel:
      r.OPENCODE_DEFAULT_MODEL ?? 'anthropic/claude-sonnet-4.5',

    telegramBotToken: r.TELEGRAM_BOT_TOKEN,
    telegramWebhookSecret: r.TELEGRAM_WEBHOOK_SECRET,
    clawdiaChatId: r.CLAWDIA_CHAT_ID,

    dailyBudgetUsd: r.DAILY_BUDGET_USD ?? 1.0,
  };
  return cached;
}

export const env: NormalizedEnv = new Proxy({} as NormalizedEnv, {
  get(_t, prop: keyof NormalizedEnv) {
    return load()[prop];
  },
});

export function getSelfBaseUrl(): string {
  const e = load();
  if (e.vercelUrl) return `https://${e.vercelUrl}`;
  if (e.siteUrl) return e.siteUrl;
  return 'http://localhost:3000';
}
