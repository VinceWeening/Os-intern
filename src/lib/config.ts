export type PublicConfig = { url: string; key: string; environment: 'test' | 'production' };

// Only these public settings may be imported by browser components.
export function getPublicConfig(): PublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const project = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
  const environment = process.env.NEXT_PUBLIC_APP_ENV;
  if (!url || !key || !project || !['test', 'production'].includes(environment ?? '')) return null;
  if (!key.startsWith('sb_publishable_')) return null;
  try {
    const parsed = new URL(url);
    const local = ['127.0.0.1', 'localhost'].includes(parsed.hostname);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (!local && (parsed.protocol !== 'https:' || parsed.hostname !== `${project}.supabase.co`)) return null;
    if (local && environment !== 'test') return null;
    return { url: parsed.origin, key, environment: environment as PublicConfig['environment'] };
  } catch { return null; }
}
