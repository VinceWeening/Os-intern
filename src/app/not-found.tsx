import Link from 'next/link';
export default function NotFound() {
  return <main className="auth-page" id="inhoud"><section className="panel auth-panel"><h1>Pagina niet gevonden.</h1><Link href="/" className="button primary">Naar je werkplek →</Link></section></main>;
}
