'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getPublicConfig } from '@/lib/config';
import { requireUser, requireStaff } from './session';
import { canRemoveAuthenticator } from './access';

export type ActionResult = { error?: string; success?: string };
export type EnrollmentResult = ActionResult & { factorId?: string; qrCode?: string; secret?: string };

// Log only a fixed event name and provider code: never form values or errors as objects.
function logFailure(event: string, code?: string) {
  console.error(JSON.stringify({ event, code: code ?? 'unknown' }));
}

export async function signIn(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  if (!getPublicConfig()) return { error: 'De testomgeving is nog niet verbonden met Supabase.' };
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password || email.length > 254 || password.length > 1024) return { error: 'Vul je e-mailadres en wachtwoord in.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    logFailure('sign_in_failed', error.code);
    return { error: 'Inloggen lukt niet. Controleer je gegevens of probeer het later opnieuw.' };
  }
  redirect('/authenticator');
}

export async function signOut(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) return { error: 'Uitloggen mislukt. Probeer het opnieuw.' };
  revalidatePath('/', 'layout');
  redirect('/inloggen');
}

export async function enrollAuthenticator(): Promise<EnrollmentResult> {
  const { supabase } = await requireUser();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: 'Authenticatorgegevens konden niet worden geladen.' };
  if (factors.totp.length > 0) {
    const { data: assurance, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || assurance.currentLevel !== 'aal2') return { error: 'Bevestig eerst je bestaande authenticator voordat je een nieuwe koppelt.' };
  }
  if (factors.totp.length >= 2) return { error: 'Er zijn al twee authenticators. Verwijder eerst een oude.' };
  // Clean only unfinished setups owned by this user, never a verified device.
  for (const factor of factors.all.filter(item => item.factor_type === 'totp' && item.status === 'unverified')) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) return { error: 'Een eerdere instelling kon niet worden opgeruimd. Probeer opnieuw.' };
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp', issuer: 'OS Werkplek', friendlyName: `Authenticator ${Date.now()}`,
  });
  if (error) {
    logFailure('mfa_enroll_failed', error.code);
    return { error: 'Instellen is niet gelukt. Probeer het opnieuw.' };
  }
  // Shared secret is shown only during setup, never persisted in app storage.
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyAuthenticator(factorId: string, code: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  if (!/^[0-9]{6}$/.test(code)) return { error: 'Vul een code van zes cijfers in.' };
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError || !factors.all.some(item => item.id === factorId && item.factor_type === 'totp')) return { error: 'Deze authenticator is niet beschikbaar. Vernieuw de pagina.' };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    logFailure('mfa_verify_failed', error.code);
    return { error: 'Code niet geaccepteerd. Gebruik een nieuwe code uit je authenticator.' };
  }
  revalidatePath('/', 'layout');
  return { success: 'Authenticator bevestigd.' };
}

export async function removeAuthenticator(factorId: string, code: string): Promise<ActionResult> {
  const { supabase, factors } = await requireStaff();
  // Verify the device being removed again, and retain a verified replacement.
  if (!canRemoveAuthenticator(factors.map(item => item.id), factorId, 'aal2')) return { error: 'Koppel en bevestig eerst een tweede authenticator. De laatste kun je niet verwijderen.' };
  if (!/^[0-9]{6}$/.test(code)) return { error: 'Vul een nieuwe code in van de authenticator die je verwijdert.' };
  const { error: verificationError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (verificationError) return { error: 'Code niet geaccepteerd. Probeer een nieuwe code.' };
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: 'Verwijderen is niet gelukt. Probeer het opnieuw.' };
  revalidatePath('/', 'layout');
  return { success: 'Authenticator verwijderd. Je andere authenticator blijft actief.' };
}
