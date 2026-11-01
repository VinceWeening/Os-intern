import { redirect } from 'next/navigation';
import { Brand } from '@/components/brand';
import { AuthenticatorPanel } from '@/components/authenticator-panel';
import { SignOut } from '@/components/sign-out';
import { requireUser } from '@/lib/auth/session';

export const metadata = { title: 'Authenticator' };
export const dynamic = 'force-dynamic';
export default async function AuthenticatorPage() {
  const { supabase, user } = await requireUser();
  // Factors come with the verified user; no second Auth request needed.
  const factors = (user.factors ?? []).filter(factor => factor.factor_type === 'totp' && factor.status === 'verified');
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error) throw new Error('MFA_UNAVAILABLE');
  if (assurance.data.currentLevel === 'aal2' && factors.length) redirect('/kassa-afslag');
  return <main id="inhoud" className="auth-page"><Brand /><AuthenticatorPanel mode="challenge" factors={factors} /><SignOut /></main>;
}
