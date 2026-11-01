import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  listFactors: vi.fn(), enroll: vi.fn(), unenroll: vi.fn(), challengeAndVerify: vi.fn(), signInWithPassword: vi.fn(),
  requireUser: vi.fn(), requireStaff: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn(() => { throw new Error('REDIRECT'); }) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ requireUser: mock.requireUser, requireStaff: mock.requireStaff }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => client }));
vi.mock('@/lib/config', () => ({ getPublicConfig: () => ({ url: 'https://test.supabase.co', key: 'sb_publishable_fake' }) }));
const client = { auth: { mfa: mock, signInWithPassword: mock.signInWithPassword } };
import { enrollAuthenticator, removeAuthenticator, verifyAuthenticator } from '@/lib/auth/actions';

beforeEach(() => {
  vi.resetAllMocks();
  mock.requireUser.mockResolvedValue({ supabase: client, user: { id: 'staff', factors: [{ id: 'a', factor_type: 'totp', status: 'verified' }] } });
  mock.requireStaff.mockResolvedValue({ supabase: client, factors: [{ id: 'a' }] });
  mock.listFactors.mockResolvedValue({ data: { all: [{ id: 'a', factor_type: 'totp', status: 'verified' }], totp: [{ id: 'a' }] }, error: null });
  mock.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
  mock.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal2' }, error: null });
  mock.unenroll.mockResolvedValue({ error: null });
});

describe('MFA server actions', () => {
  it('does not let a password-only session replace existing MFA', async () => {
    mock.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1' }, error: null });
    expect((await enrollAuthenticator()).error).toBeTruthy();
    expect(mock.enroll).not.toHaveBeenCalled();
  });
  it('checks authentication before setup', async () => {
    mock.requireUser.mockRejectedValue(new Error('REDIRECT'));
    await expect(enrollAuthenticator()).rejects.toThrow('REDIRECT');
    expect(mock.enroll).not.toHaveBeenCalled();
  });
  it('never removes the last verified factor', async () => {
    expect((await removeAuthenticator('a', '123456')).error).toBeTruthy();
    expect(mock.unenroll).not.toHaveBeenCalled();
  });
  it('requires a fresh valid code before removing a replaced factor', async () => {
    mock.requireStaff.mockResolvedValue({ supabase: client, factors: [{ id: 'a' }, { id: 'b' }] });
    mock.challengeAndVerify.mockResolvedValue({ error: { code: 'mfa_verification_failed' } });
    expect((await removeAuthenticator('a', '123456')).error).toBeTruthy();
    expect(mock.unenroll).not.toHaveBeenCalled();
  });
  it('removes an owned factor only after verification', async () => {
    mock.requireStaff.mockResolvedValue({ supabase: client, factors: [{ id: 'a' }, { id: 'b' }] });
    expect((await removeAuthenticator('a', '123456')).success).toBeTruthy();
    expect(mock.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'a', code: '123456' });
    expect(mock.unenroll).toHaveBeenCalledWith({ factorId: 'a' });
  });
  it('rejects unknown factors and malformed codes', async () => {
    expect((await verifyAuthenticator('foreign', '123456')).error).toBeTruthy();
    expect((await verifyAuthenticator('a', '12345')).error).toBeTruthy();
    expect(mock.challengeAndVerify).not.toHaveBeenCalled();
  });
  it('retains leading zeros in valid authenticator codes', async () => {
    expect((await verifyAuthenticator('a', '001234')).success).toBeTruthy();
    expect(mock.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'a', code: '001234' });
  });
  it('opens the workplace directly after a sign-in code, without listing factors again', async () => {
    await expect(verifyAuthenticator('a', '123456', true)).rejects.toThrow('REDIRECT');
    expect(mock.listFactors).not.toHaveBeenCalled();
  });
});
