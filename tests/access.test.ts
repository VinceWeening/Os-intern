import { describe, expect, it } from 'vitest';
import { canRemoveAuthenticator, loginEmail, needsAuthenticator, USERNAME_DOMAIN } from '@/lib/auth/access';
import { amsterdamWorkDate } from '@/lib/dates';

describe('authenticator policy', () => {
  it('requires MFA even if there is no enrolled device yet', () => {
    expect(needsAuthenticator('aal1', 0)).toBe(true);
    expect(needsAuthenticator('aal1', 1)).toBe(true);
    expect(needsAuthenticator(null, 1)).toBe(true);
    expect(needsAuthenticator('aal2', 0)).toBe(true);
    expect(needsAuthenticator('aal2', 1)).toBe(false);
  });
  it('retains a verified replacement and requires ownership and AAL2', () => {
    expect(canRemoveAuthenticator(['a'], 'a', 'aal2')).toBe(false);
    expect(canRemoveAuthenticator(['a', 'b'], 'a', 'aal1')).toBe(false);
    expect(canRemoveAuthenticator(['a', 'b'], 'unknown', 'aal2')).toBe(false);
    expect(canRemoveAuthenticator(['a', 'b'], 'a', 'aal2')).toBe(true);
  });
});
describe('Amsterdam work date', () => {
  it('uses Amsterdam midnight independently of the server timezone', () => {
    expect(amsterdamWorkDate(new Date('2026-11-01T23:30:00Z'))).toBe('2026-11-02');
    expect(amsterdamWorkDate(new Date('2026-07-01T22:30:00Z'))).toBe('2026-07-02');
  });
  it('handles both daylight-saving changes', () => {
    expect(amsterdamWorkDate(new Date('2026-03-29T01:30:00Z'))).toBe('2026-03-29');
    expect(amsterdamWorkDate(new Date('2026-10-25T01:30:00Z'))).toBe('2026-10-25');
  });
});

describe('sign-in name', () => {
  it('maps a username onto the reserved no-mail domain and keeps e-mail addresses', () => {
    expect(loginEmail(' Kassa-Heiloo ')).toBe(`kassa-heiloo@${USERNAME_DOMAIN}`);
    expect(loginEmail('naam@voorbeeld.nl')).toBe('naam@voorbeeld.nl');
    for (const value of ['', 'a', 'kassa heiloo', '-kassa', 'x'.repeat(41)]) expect(loginEmail(value)).toBeNull();
  });
});
