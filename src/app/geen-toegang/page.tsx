import { Brand } from '@/components/brand';
import { SignOut } from '@/components/sign-out';
import { requireUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export default async function NoAccessPage() {
  await requireUser();
  return <main className="auth-page" id="inhoud"><Brand /><section className="panel auth-panel"><h1>Nog geen toegang.</h1><p>Je account is nog niet ingericht of niet actief. Vraag de beheerder om je profiel en vestigingstoegang te controleren.</p><SignOut /></section></main>;
}
