import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env, getSelfBaseUrl } from './env';

export function createServerClient() {
  const key = env.supabaseServiceRoleKey ?? env.supabaseAnonKey;
  return createClient(env.supabaseUrl, key, {
    auth: { persistSession: false },
  });
}

export { getSelfBaseUrl };
