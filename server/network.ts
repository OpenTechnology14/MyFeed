import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import { Agent, fetch } from 'undici';

export function isPublicAddress(value: string) {
  try {
    return ipaddr.process(value).range() === 'unicast';
  } catch {
    return false;
  }
}
export async function resolvePublicHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, '');
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new Error(
      'Use a public internet address. Private and local network addresses are not supported.',
    );
  return addresses[0];
}
export async function fetchPublic(
  input: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    rejectRedirects?: boolean;
  } = {},
) {
  const { rejectRedirects, ...request } = init;
  let url = new URL(input);
  const originalOrigin = url.origin;
  const credentialQuery = [...url.searchParams.keys()].some((key) =>
    /^(key|api[-_]?key|token|access[-_]?token|auth|secret|password)$/i.test(key),
  );
  for (let i = 0; i < 5; i++) {
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443')
    )
      throw new Error('Use an HTTPS URL on the standard port, without a password in the URL.');
    const address = await resolvePublicHost(url.hostname);
    const agent = new Agent({
      connect: {
        lookup: (_host, options, callback) =>
          options.all ? callback(null, [address]) : callback(null, address.address, address.family),
      },
    });
    try {
      const response = await fetch(url, {
        ...request,
        headers: { 'User-Agent': 'MyFeed/0.1', ...init.headers },
        redirect: 'manual',
        dispatcher: agent,
        signal: AbortSignal.timeout(20000),
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        if (rejectRedirects)
          throw new Error(
            'Posting redirects are blocked; check the provider for the outcome before another send.',
          );
        const location = response.headers.get('location');
        if (!location) throw new Error('Source returned an invalid redirect.');
        const next = new URL(location, url);
        if (
          (Object.keys(init.headers ?? {}).length > 0 || credentialQuery) &&
          next.origin !== originalOrigin
        )
          throw new Error('Authenticated redirects to another server are blocked.');
        url = next;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw Object.assign(
          new Error(`Source returned HTTP ${response.status}. Check its address and credentials.`),
          { httpStatus: response.status },
        );
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Source returned an empty response.');
      let length = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 2_000_000) {
          await reader.cancel();
          throw new Error('Source response exceeds the 2 MB limit.');
        }
        chunks.push(value);
      }
      return Buffer.concat(chunks).toString('utf8');
    } finally {
      await agent.close();
    }
  }
  throw new Error('Too many redirects from this source.');
}
