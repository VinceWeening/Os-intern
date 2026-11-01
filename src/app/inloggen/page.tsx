import Link from 'next/link';
import { Brand } from '@/components/brand';
import { LoginForm } from '@/components/login-form';
import { getPublicConfig } from '@/lib/config';

export const metadata = { title: 'Inloggen' };
export default function LoginPage() {
  const configured = Boolean(getPublicConfig());
  return <main className="login-layout" id="inhoud">
    <section className="login-intro"><Brand /><div className="intro-copy"><span className="eyebrow">OS STEAKHOUSE · INTERN</span><h1>Een goede avond.<br />Een heldere<br /><em>afsluiting.</em></h1><p>Jouw vaste plek voor de kassa-afslag.<br />Heiloo & Heerhugowaard.</p><div className="intro-rule" /></div><span className="intro-foot">VOOR HET TEAM ACHTER DE AVOND</span><span className="intro-watermark" aria-hidden="true">OS</span></section>
    <section className="login-main"><div className="login-box"><span className="step-label">01 <span>/</span> TOEGANG TOT JE WERKPLEK</span><h2>Welkom terug.</h2><p className="subheading">Log in met je persoonlijke OS-account.</p>
      {!configured ? <div className="notice"><strong>De basis staat klaar.</strong><p>Verbind eerst de Supabase-testomgeving om in te loggen. Er zijn nog geen accounts of bedrijfsgegevens gekoppeld.</p><Link href="/voorbeeld" className="text-link">Bekijk het ontwerp van de werkplek →</Link></div> : null}
      <LoginForm configured={configured} />
      <div className="login-bottom"><span className="lock-symbol" aria-hidden="true">◇</span><p>Alleen vooraf aangemaakte accounts.<br />Geen toegang? Neem contact op met je beheerder.</p></div>
    </div><span className="login-footer">OS Werkplek <span>Besloten teamomgeving</span></span></section>
  </main>;
}
