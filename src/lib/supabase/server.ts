import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPublicConfig } from '@/lib/config';
import type { Database } from './database.types';
import { timedFetch } from './fetch';

export async function createClient() {
  const config = getPublicConfig();
  if (!config) throw new Error('SUPABASE_CONFIGURATION_MISSING');
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    global: { fetch: timedFetch },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot set cookies; proxy refreshes them. */ }
      },
    },
  });
}
