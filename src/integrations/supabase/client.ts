import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function readSupabaseEnv() {
  const serverEnv = typeof process !== 'undefined' ? process.env : {};
  return {
    url: import.meta.env.VITE_SUPABASE_URL || serverEnv.SUPABASE_URL,
    publishableKey:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || serverEnv.SUPABASE_PUBLISHABLE_KEY,
  };
}

export function isSupabaseConfigured() {
  const { url, publishableKey } = readSupabaseEnv();
  return Boolean(url && publishableKey);
}

function createSupabaseClient() {
  const { url: SUPABASE_URL, publishableKey: SUPABASE_PUBLISHABLE_KEY } = readSupabaseEnv();

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Add them to .env or your hosting provider to enable auth and synced data.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!_supabase) _supabase = createSupabaseClient();
  return _supabase;
}

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase is not configured. Add Supabase environment variables to enable this feature.');
    }
    return Reflect.get(client, prop, receiver);
  },
});
