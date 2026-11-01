'use client';
import { useActionState } from 'react';
import { signIn } from '@/lib/auth/actions';

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(signIn, {});
  return <form action={action} className="form-stack">
    <div><label htmlFor="email">E-mailadres</label><input id="email" type="email" name="email" autoComplete="username" placeholder="naam@voorbeeld.nl" required maxLength={254} disabled={!configured || pending} /></div>
    <div><label htmlFor="password">Wachtwoord</label><input id="password" type="password" name="password" autoComplete="current-password" placeholder="Je wachtwoord" required disabled={!configured || pending} /></div>
    {state.error ? <p className="notice error" role="alert">{state.error}</p> : null}
    <button type="submit" className="button primary" disabled={!configured || pending}>{pending ? 'Bezig met inloggen…' : 'Verder met inloggen'}<span aria-hidden="true">→</span></button>
    <p className="form-help">Daarna bevestig je je toegang met je authenticator.</p>
  </form>;
}
