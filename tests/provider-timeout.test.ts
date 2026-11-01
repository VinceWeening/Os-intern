import { afterEach, describe, expect, it, vi } from 'vitest';
import { timedFetch } from '@/lib/supabase/fetch';

afterEach(() => vi.unstubAllGlobals());
describe('provider request deadlines', () => {
  it('adds a live deadline signal and preserves request headers/body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
    await timedFetch('https://example.invalid', { method: 'POST', body: 'test', headers: { 'x-test': 'fixture' } });
    const options = fetchMock.mock.calls[0][1];
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.signal.aborted).toBe(false);
    expect(options.body).toBe('test');
    expect(options.headers).toEqual({ 'x-test': 'fixture' });
  });
  it('preserves cancellation from the original caller', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
    await timedFetch('https://example.invalid', { signal: controller.signal });
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
