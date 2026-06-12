import { z } from 'zod';

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  VERCEL_URL: z.string().optional(),
});

export type RawEnv = z.infer<typeof EnvSchema>;

export interface NormalizedEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string | undefined;
  siteUrl: string | undefined;
  vercelUrl: string | undefined;
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
