'use client';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="auth-page" id="inhoud"><section className="panel auth-panel"><h1>Even geen verbinding.</h1><p>De werkplek kon niet worden geladen. Probeer het opnieuw. Blijft dit gebeuren, neem dan contact op met je beheerder.</p><button className="button primary" onClick={reset}>Opnieuw proberen →</button></section></main>;
}
