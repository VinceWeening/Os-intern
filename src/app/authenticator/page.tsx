import { redirect } from 'next/navigation';
import { Brand } from '@/components/brand';
import { AuthenticatorPanel } from '@/components/authenticator-panel';
import { SignOut } from '@/components/sign-out';
import { requireUser } from '@/lib/auth/session';

export const metadata = { title: 'Authenticator' };
export const dynamic = 'force-dynamic';
export default async function AuthenticatorPage() {
  const { supabase } = await requireUser();
  const [factors, assurance] = await Promise.all([supabase.auth.mfa.listFactors(), supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
  if (factors.error || assurance.error) throw new Error('MFA_UNAVAILABLE');
  if (assurance.data.currentLevel === 'aal2' && factors.data.totp.length) redirect('/kassa-afslag');
  return <main id="inhoud" className="auth-page"><Brand /><AuthenticatorPanel mode="challenge" factors={factors.data.totp} /><SignOut /></main>;
}
