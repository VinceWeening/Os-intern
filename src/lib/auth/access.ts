// Accounts without a mailbox (such as the shared cash computer) sign in with a
// name. Supabase needs an e-mail, so the name maps onto a reserved domain that
// can never receive mail. Create such accounts in Supabase with this address.
export const USERNAME_DOMAIN = 'gebruiker.os-werkplek.invalid';
export function loginEmail(value: string): string | null {
  const login = value.trim();
  if (login.includes('@')) return login.length <= 254 ? login : null;
  return /^[a-z0-9][a-z0-9._-]{1,39}$/i.test(login) ? `${login.toLowerCase()}@${USERNAME_DOMAIN}` : null;
}

export function needsAuthenticator(currentLevel: string | null, verifiedFactors: number) {
  return currentLevel !== 'aal2' || verifiedFactors < 1;
}

export function canRemoveAuthenticator(verifiedIds: string[], factorId: string, currentLevel: string | null) {
  return currentLevel === 'aal2' && verifiedIds.length > 1 && verifiedIds.includes(factorId);
}
