'use client';
import { useState } from 'react';
import { signOut } from '@/lib/auth/actions';

export function SignOut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div><button className="button subtle small" disabled={busy} onClick={async () => {
    setBusy(true); setError('');
    try { const result = await signOut(); setError(result.error ?? ''); }
    catch { setError('Uitloggen lukt nu niet. Probeer het opnieuw.'); }
    finally { setBusy(false); }
  }}>{busy ? 'Uitloggen…' : 'Uitloggen ↗'}</button>{error ? <p role="alert" className="form-help">{error}</p> : null}</div>;
}
