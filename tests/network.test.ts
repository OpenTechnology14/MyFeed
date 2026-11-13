import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
}));
vi.mock('undici', () => ({
  Agent: class {
    async close() {}
  },
  fetch: vi.fn(),
}));
import { fetch } from 'undici';
import { fetchPublic } from '../server/network';
describe('credential-bearing source redirects', () => {
  beforeEach(() => vi.resetAllMocks());
  it('blocks API-key headers from crossing origins', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'https://other.example.com/items' },
      }) as never,
    );
    await expect(
      fetchPublic('https://api.example.com/items', { headers: { 'X-API-Key': 'private' } }),
    ).rejects.toThrow('another server');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('retains credentials only on a validated same-origin redirect', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: '/next' } }) as never,
      )
      .mockResolvedValueOnce(new Response('{"items":[]}') as never);
    expect(
      await fetchPublic('https://api.example.com/items', { headers: { 'X-API-Key': 'private' } }),
    ).toBe('{"items":[]}');
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toBe('https://api.example.com/next');
  });
  it('never follows a posting redirect and never forwards query API credentials across origins', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 302, headers: { location: '/other' } }) as never,
    );
    await expect(
      fetchPublic('https://api.example.com/post', {
        method: 'POST',
        body: 'reviewed',
        rejectRedirects: true,
      }),
    ).rejects.toThrow('Posting redirects');
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.mocked(fetch)
      .mockClear()
      .mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: 'https://other.example.com' },
        }) as never,
      );
    await expect(fetchPublic('https://api.example.com/items?key=fixture-private')).rejects.toThrow(
      'another server',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
