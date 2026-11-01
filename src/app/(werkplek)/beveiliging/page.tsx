import { requireStaff } from '@/lib/auth/session';
import { AuthenticatorPanel } from '@/components/authenticator-panel';
import { InstallApp } from '@/components/install-app';

export const metadata = { title: 'Beveiliging' };
export const dynamic = 'force-dynamic';
export default async function SecurityPage() {
  const { factors } = await requireStaff();
  return <><div className="page-heading"><div><span className="eyebrow">JOUW ACCOUNT</span><h1>Beveiliging<span>.</span></h1><p>Je eigen account en authenticator. Gebruikers en rollen staan apart bij Gebruikersbeheer.</p></div></div><div className="security-grid"><div><AuthenticatorPanel factors={factors} mode="manage" /></div><InstallApp /></div></>;
}
