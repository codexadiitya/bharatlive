import { createMiddleware } from '@tanstack/react-start';
import { getSupabaseClient } from './client';

// Registered as global function middleware in src/start.ts. When Supabase is not
// configured, public server functions still run without an auth header.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const client = getSupabaseClient();
    if (!client) return next();

    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
