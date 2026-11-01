// Read-only live check. Never prints API keys, passwords or session tokens.
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key?.startsWith('sb_publishable_')) throw new Error('Missing public test configuration');
if (process.env.NEXT_PUBLIC_APP_ENV !== 'test') throw new Error('This check is for the test environment only');
async function read(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await fetch(`${url}${path}`, { headers: { apikey: key }, signal: AbortSignal.timeout(8000) }); }
    catch { if (attempt === 2) throw new Error('Supabase niet bereikbaar na drie pogingen. Controleer je netwerk.'); }
  }
}
const settingsResponse = await read('/auth/v1/settings');
if (!settingsResponse.ok) throw new Error(`Auth settings unavailable: ${settingsResponse.status}`);
const settings = await settingsResponse.json();
if (settings.disable_signup !== true) throw new Error('Public signups must be disabled');
console.log('PASS: Supabase Auth bereikbaar; openbare registratie uitgeschakeld.');
await Promise.all(['profiles', 'locations', 'location_memberships', 'cash_closings', 'cash_count_lines', 'closing_events'].map(async table => {
  const response = await read(`/rest/v1/${table}?select=*&limit=1`);
  if (![401, 403].includes(response.status)) throw new Error(`Unexpected anonymous access status for ${table}: ${response.status}`);
  console.log(`PASS: ${table} weigert anonieme toegang.`);
}));
