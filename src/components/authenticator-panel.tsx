'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { enrollAuthenticator, verifyAuthenticator, removeAuthenticator, type EnrollmentResult } from '@/lib/auth/actions';

type Factor = { id: string; friendly_name?: string; created_at: string };
type Props = { factors: Factor[]; mode: 'challenge' | 'manage' };

export function AuthenticatorPanel({ factors, mode }: Props) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<EnrollmentResult | null>(null);
  const [factorId, setFactorId] = useState(factors[0]?.id ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const target = enrollment?.factorId ?? factorId;
  const enrolling = Boolean(enrollment?.factorId);

  async function enroll() {
    setBusy(true); setError(''); setMessage(''); setCode('');
    try {
      const result = await enrollAuthenticator();
      if (result.error) setError(result.error); else setEnrollment(result);
    } catch { setError('Geen verbinding. Probeer het opnieuw zodra je online bent.'); }
    finally { setBusy(false); }
  }

  return <section className="panel auth-panel"><span className="eyebrow">EEN EXTRA SLOT OP JE WERKPLEK</span><h2>{mode === 'manage' ? 'Je authenticators' : factors.length ? 'Bevestig dat jij het bent.' : 'Koppel je authenticator.'}</h2>
    <p>{mode === 'manage' ? 'Koppel eerst een nieuwe authenticator voordat je de oude verwijdert.' : factors.length ? 'Open je authenticator-app en vul de zescijferige code in.' : 'Stel een authenticator in voordat je bedrijfsgegevens kunt openen.'}</p>
    {mode === 'manage' ? <ul className="factor-list">{factors.map((factor, index) => <li key={factor.id}><div><strong>Authenticator {index + 1}</strong><small>Gekoppeld op {new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeZone: 'Europe/Amsterdam' }).format(new Date(factor.created_at))}</small></div><span className="badge">Actief</span>{factors.length > 1 ? <RemoveFactor factorId={factor.id} /> : <small className="factor-note">Koppel eerst een vervanger om deze te verwijderen.</small>}</li>)}</ul> : null}
    {enrolling ? <div className="enrollment"><ol><li>Open bijvoorbeeld Microsoft of Google Authenticator.</li><li>Voeg een account toe en scan de QR-code.</li><li>Vul hieronder de code uit de app in.</li></ol>
      {/* Supabase's generated QR is shown as an image, never executed as SVG markup. */}
      <img className="qr-code" src={enrollment!.qrCode!.startsWith('data:') ? enrollment!.qrCode : `data:image/svg+xml;utf8,${encodeURIComponent(enrollment!.qrCode!)}`} width={224} height={224} alt="Scan deze QR-code met je authenticator-app" />
      <details><summary>Op hetzelfde toestel? Gebruik de instelsleutel.</summary><p className="form-help">Kies handmatig toevoegen in je authenticator en gebruik een tijdgebonden code. Bewaar of deel deze sleutel niet.</p><code className="setup-secret">{enrollment!.secret}</code></details>
    </div> : null}
    {(mode === 'challenge' && factors.length > 0) || enrolling ? <form className="form-stack" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError(''); setMessage('');
      try {
        // When signing in the server redirects to the workplace itself; no extra page loads here.
        const result = await verifyAuthenticator(target, code, mode === 'challenge');
        if (!result) return;
        if (result.error) setError(result.error);
        else {
          setEnrollment(null); setCode(''); setMessage(result.success ?? 'Bevestigd.');
          router.refresh();
        }
      } catch { setError('Bevestigen lukt nu niet. Controleer je verbinding en probeer een nieuwe code.'); }
      finally { setBusy(false); }
    }}>
      {!enrolling && factors.length > 1 ? <div><label htmlFor="factor">Authenticator</label><select id="factor" value={factorId} onChange={event => setFactorId(event.target.value)}>{factors.map((factor, index) => <option value={factor.id} key={factor.id}>Authenticator {index + 1}</option>)}</select></div> : null}
      <div><label htmlFor="code">Authenticatorcode</label><input id="code" className="otp-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" required disabled={busy} /></div>
      <button className="button primary" disabled={busy}>{busy ? 'Bevestigen…' : enrolling ? 'Koppeling bevestigen' : 'Werkplek openen'}<span>→</span></button>
    </form> : null}
    {!enrolling && (mode === 'manage' || factors.length === 0) ? <button className="button secondary" disabled={busy || factors.length >= 2} onClick={enroll}>{busy ? 'Instellen…' : factors.length ? '＋ Nieuwe authenticator koppelen' : 'Authenticator instellen →'}</button> : null}
    {error ? <p className="notice error" role="alert">{error}</p> : null}{message ? <p className="notice success" role="status">{message}</p> : null}
    <p className="form-help">Telefoon kwijt? Neem contact op met je beheerder. Herstel is alleen via vertrouwd beheer mogelijk.</p>
  </section>;
}

function RemoveFactor({ factorId }: { factorId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <div className="remove-factor">{!open ? <button className="button subtle small" onClick={() => setOpen(true)}>Deze authenticator verwijderen</button> : <form className="form-stack" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const result = await removeAuthenticator(factorId, code);
      if (result.error) setMessage(result.error);
      else { setOpen(false); setCode(''); router.refresh(); }
    } catch { setMessage('Geen verbinding. Verwijderen is niet bevestigd; probeer het opnieuw.'); }
    finally { setBusy(false); }
  }}><label htmlFor={`remove-${factorId}`}>Nieuwe code van de te verwijderen authenticator</label><input id={`remove-${factorId}`} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} required disabled={busy} /><div className="button-row"><button className="button secondary" disabled={busy}>{busy ? 'Verwijderen…' : 'Verwijderen bevestigen'}</button><button className="button subtle" type="button" disabled={busy} onClick={() => setOpen(false)}>Annuleren</button></div></form>}{message ? <p role="alert" className="notice error">{message}</p> : null}</div>;
}
