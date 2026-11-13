import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
vi.mock('../server/network', async (original) => ({
  ...(await original<typeof import('../server/network')>()),
  fetchPublic: vi.fn(),
  resolvePublicHost: vi.fn(),
}));
import { fetchPublic } from '../server/network';
import { createStore, type Store } from '../server/store';
import { createApp } from '../server/app';
import { createBackup, restoreBackup } from '../server/backup';
import { DEFAULT_DRAFT_BODY, type PostingReview } from '../shared/posting';
import { reviewedDigestCopy } from '../shared/generation';
import { feedFingerprint } from '../shared/pipeline';

describe('manual posting (mocked providers, no live messages)', () => {
  let directory: string, store: Store, server: Server, base: string;
  const provider = vi.mocked(fetchPublic);
  function fixture(url: string, init?: { method?: string; body?: string }) {
    if (url.includes('/verify_credentials'))
      return JSON.stringify({ id: 'writer-account', acct: 'writer' });
    if (url.endsWith('/api/v2/instance'))
      return JSON.stringify({ configuration: { statuses: { max_characters: 500 } } });
    if (url.endsWith('/api/v1/me'))
      return JSON.stringify({ _id: 'writing-user', username: 'writer', active: true });
    if (url.includes('/channels.info'))
      return JSON.stringify({
        success: true,
        channel: { _id: 'public-channel', t: 'c', name: 'General', ro: false },
      });
    if (url.includes('/chat.getMessage'))
      return JSON.stringify({
        success: true,
        message: { _id: new URL(url).searchParams.get('msgId'), rid: 'public-channel' },
      });
    if (/\/statuses\/\d+$/.test(url))
      return JSON.stringify({ id: url.split('/').at(-1), visibility: 'public' });
    if (init?.method === 'POST' && url.endsWith('/statuses')) {
      const body = JSON.parse(init.body!);
      return JSON.stringify({
        id: '9001',
        account: { id: 'writer-account' },
        visibility: body.visibility,
        in_reply_to_id: body.in_reply_to_id ?? null,
        url: 'https://social.example.com/@writer/9001',
      });
    }
    if (init?.method === 'POST' && url.endsWith('/chat.sendMessage')) {
      const body = JSON.parse(init.body!);
      return JSON.stringify({
        success: true,
        message: { ...body.message, u: { _id: 'writing-user' } },
      });
    }
    throw Error('Unexpected fixture request');
  }
  beforeEach(async () => {
    vi.resetAllMocks();
    provider.mockImplementation(async (url, init) => fixture(url, init));
    directory = mkdtempSync(join(tmpdir(), 'myfeed-posting-'));
    store = createStore(directory);
    server = createApp(store).app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });
  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  });
  async function api(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  }
  async function source(kind: 'rocket' | 'mastodon' = 'mastodon') {
    const result = await api('/connections', 'POST', {
      kind,
      name: 'Reading source',
      endpoint: kind === 'rocket' ? 'https://chat.example.com' : 'https://social.example.com',
      account: kind === 'mastodon' ? 'different.followed.author' : '',
      roomId: 'public-channel',
      userId: 'reading-user',
      secret: 'reading-secret-marker',
    });
    expect(result.status).toBe(201);
    return store.read().connections.at(-1)!;
  }
  async function writer(id: string) {
    const result = await api(`/connections/${id}/posting`, 'PUT', {
      enabled: true,
      version: store.read().connections.find((c) => c.id === id)?.posting?.version ?? 0,
      sourceVersion: 1,
      userId: 'writing-user',
      secret: 'writing-secret-marker',
    });
    expect(result.status).toBe(200);
  }
  async function checked(id: string) {
    await writer(id);
    expect((await api(`/connections/${id}/posting/check`, 'POST', {})).status).toBe(200);
  }
  async function draft(id: string, text = 'Reviewed text', replyEntryId = '') {
    expect(
      (
        await api('/outbound/drafts', 'POST', {
          connectionId: id,
          body: { ...DEFAULT_DRAFT_BODY, text, replyEntryId },
        })
      ).status,
    ).toBe(201);
    return store.read().outbound!.drafts[0];
  }
  async function review(id: string): Promise<PostingReview> {
    const result = await api(`/outbound/drafts/${id}/review`);
    expect(result.status).toBe(200);
    return result.data;
  }
  const posts = () => provider.mock.calls.filter(([, init]) => init?.method === 'POST');
  function seedEntry(connectionId: string, rocket = false) {
    const id = crypto.randomUUID();
    store.update((state) =>
      state.entries.push({
        id,
        connectionId,
        externalId: rocket ? 'child-message' : '1234',
        title: 'Collected original',
        content: 'Never automatically quote this source content',
        author: 'Original author',
        url: '',
        publishedAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        tags: [],
        saved: true,
        read: true,
        type: rocket ? 'chat' : 'post',
        ...(rocket
          ? {
              chat: {
                channelId: 'public-channel',
                channelName: 'General',
                threadId: 'root-message',
              },
            }
          : {}),
      }),
    );
    return id;
  }

  it('does not copy a digest with filtered references, changed rules or stale history into a posting draft', () => {
    const feed = store.read().feeds[0];
    feed.digest = {
      text: 'Reviewed snapshot',
      model: 'fixture',
      createdAt: new Date().toISOString(),
      itemIds: ['eligible'],
      configHash: feedFingerprint(feed),
    };
    expect(reviewedDigestCopy(feed, ['eligible'], 1, 1)).toBe('Reviewed snapshot');
    expect(() => reviewedDigestCopy(feed, [], 1, 1)).toThrow('current feed');
    expect(() => reviewedDigestCopy(feed, ['eligible'], 1, 2)).toThrow('current feed');
    feed.exclude = ['changed'];
    expect(() => reviewedDigestCopy(feed, ['eligible'], 1, 1)).toThrow('current feed');
  });
  it('keeps separate writing credentials encrypted, and saving/checking/reviewing never sends', async () => {
    const c = await source();
    await writer(c.id);
    expect(provider).not.toHaveBeenCalled();
    const local = await api('/state');
    expect(JSON.stringify(local.data)).not.toContain('secret-marker');
    expect(local.data.connections[0].posting.secretCipher).toBeUndefined();
    expect(local.data.connections[0].posting.hasSecret).toBe(true);
    expect(readFileSync(join(directory, 'store.json'), 'utf8')).not.toContain('secret-marker');
    expect(store.decrypt(store.read().connections[0].secretCipher)).toBe('reading-secret-marker');
    expect(store.decrypt(store.read().connections[0].posting!.secretCipher)).toBe(
      'writing-secret-marker',
    );
    const d = await draft(c.id);
    expect(provider).not.toHaveBeenCalled();
    expect((await api(`/outbound/drafts/${d.id}/review`)).status).toBe(409);
    await api(`/connections/${c.id}/posting/check`, 'POST', {});
    expect((await review(d.id)).sender).toBe('writer');
    expect(posts()).toHaveLength(0);
    expect(createStore(directory).read().outbound!.drafts[0].body.text).toBe('Reviewed text');
  });
  it('requires confirmation, binds exact audience/body and records Mastodon acknowledgment without importing a fake original', async () => {
    const c = await source();
    await checked(c.id);
    const d = await draft(c.id);
    const plan = await review(d.id);
    expect(
      (await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: false }))
        .status,
    ).toBe(400);
    expect(posts()).toHaveLength(0);
    expect(
      (await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: true }))
        .status,
    ).toBe(200);
    const request = posts()[0][1]!;
    expect(JSON.parse(request.body!)).toMatchObject({
      status: 'Reviewed text',
      visibility: 'unlisted',
    });
    expect(request.headers?.Authorization).toBe('Bearer writing-secret-marker');
    expect(request.headers?.['Idempotency-Key']).toBe(plan.token);
    expect(request.rejectRedirects).toBe(true);
    expect(store.read().outbound!.receipts[0]).toMatchObject({
      status: 'sent',
      providerId: '9001',
      sender: 'writer',
    });
    expect(store.read().entries).toHaveLength(0);
  });
  it('sends Rocket.Chat replies to the checked channel/root with the writing identity, not source author or read identity', async () => {
    const c = await source('rocket');
    await checked(c.id);
    const entry = seedEntry(c.id, true),
      d = await draft(c.id, 'My reply', entry),
      plan = await review(d.id);
    expect(plan.replyId).toBe('root-message');
    await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: true });
    const request = posts()[0][1]!;
    expect(JSON.parse(request.body!)).toMatchObject({
      message: { rid: 'public-channel', tmid: 'root-message', tshow: false, msg: 'My reply' },
      previewUrls: [],
    });
    expect(request.headers?.['X-User-Id']).toBe('writing-user');
    expect(store.read().outbound!.receipts[0].status).toBe('sent');
    expect(store.read().entries).toHaveLength(1);
    expect(store.read().entries[0]).toMatchObject({ saved: true, read: true });
  });
  it('rejects changed draft versions and writing accounts before submission', async () => {
    const c = await source();
    await checked(c.id);
    const d = await draft(c.id),
      plan = await review(d.id);
    expect(
      (
        await api(`/outbound/drafts/${d.id}`, 'PATCH', {
          version: d.version,
          body: { ...d.body, text: 'Changed' },
        })
      ).status,
    ).toBe(200);
    expect(
      (await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: true }))
        .status,
    ).toBe(409);
    expect(posts()).toHaveLength(0);
    const next = await review(d.id);
    await writer(c.id);
    expect(
      (await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: next.token, confirmed: true }))
        .status,
    ).toBe(409);
    expect(posts()).toHaveLength(0);
  });
  it('expires local reviews and rejects a source disconnected during preflight without submitting', async () => {
    const c = await source();
    await checked(c.id);
    const d = await draft(c.id),
      old = await review(d.id);
    const now = Date.now(),
      clock = vi.spyOn(Date, 'now').mockReturnValue(now + 6 * 60000);
    try {
      expect(
        (await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: old.token, confirmed: true }))
          .status,
      ).toBe(409);
    } finally {
      clock.mockRestore();
    }
    const fresh = await review(d.id);
    let finish!: (value: string) => void;
    provider.mockImplementation(async (url, init) =>
      url.endsWith('/verify_credentials')
        ? new Promise<string>((resolve) => {
            finish = resolve;
          })
        : fixture(url, init),
    );
    const pending = api(`/outbound/drafts/${d.id}/send`, 'POST', {
      token: fresh.token,
      confirmed: true,
    });
    await vi.waitFor(() => expect(finish).toBeDefined());
    await api(`/connections/${c.id}`, 'DELETE');
    finish(JSON.stringify({ id: 'writer-account', acct: 'writer' }));
    expect((await pending).status).toBe(404);
    expect(posts()).toHaveLength(0);
    expect(store.read().outbound!.receipts).toHaveLength(0);
  });
  it('does not resend duplicate tokens during an active request or after server restart', async () => {
    const c = await source();
    await checked(c.id);
    const d = await draft(c.id),
      plan = await review(d.id);
    let finish!: (value: string) => void;
    provider.mockImplementation(async (url, init) =>
      init?.method === 'POST'
        ? new Promise<string>((resolve) => {
            finish = resolve;
          })
        : fixture(url, init),
    );
    const pending = api(`/outbound/drafts/${d.id}/send`, 'POST', {
      token: plan.token,
      confirmed: true,
    });
    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    const duplicate = await api(`/outbound/drafts/${d.id}/send`, 'POST', {
      token: plan.token,
      confirmed: true,
    });
    expect(duplicate.data.outbound.receipts[0].status).toBe('sending');
    finish(fixture(posts()[0][0], posts()[0][1]));
    await pending;
    expect(
      (await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: true }))
        .data.outbound.receipts[0].status,
    ).toBe('sent');
    expect(createStore(directory).read().outbound!.receipts[0].status).toBe('sent');
    expect(posts()).toHaveLength(1);
  });
  it('confirms a Rocket.Chat unknown outcome by exact client ID through reads only, including while posting is disabled', async () => {
    const c = await source('rocket');
    await checked(c.id);
    const d = await draft(c.id),
      plan = await review(d.id);
    provider.mockImplementation(async (url, init) => {
      if (init?.method === 'POST') throw Error('timeout');
      return fixture(url, init);
    });
    await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: true });
    await api(`/connections/${c.id}/posting`, 'PUT', {
      enabled: false,
      version: 1,
      sourceVersion: 1,
      userId: 'writing-user',
      secret: '',
    });
    const readsBefore = provider.mock.calls.length;
    provider.mockImplementation(async (url, init) =>
      url.includes('/chat.getMessage')
        ? JSON.stringify({
            success: true,
            message: {
              _id: plan.token.replaceAll('-', ''),
              rid: 'public-channel',
              msg: d.body.text,
              u: { _id: 'writing-user' },
            },
          })
        : fixture(url, init),
    );
    const result = await api(`/outbound/receipts/${plan.token}/check`, 'POST', {});
    expect(result.status).toBe(200);
    expect(result.data.outbound.receipts[0]).toMatchObject({
      status: 'sent',
      confirmation: 'provider-lookup',
      providerId: plan.token.replaceAll('-', ''),
    });
    expect(result.data.outbound.drafts[0].status).toBe('sent');
    expect(
      provider.mock.calls.slice(readsBefore).every(([, init]) => init?.method !== 'POST'),
    ).toBe(true);
    expect(posts()).toHaveLength(1);
    expect(createStore(directory).read().outbound!.receipts[0].confirmation).toBe(
      'provider-lookup',
    );
  });
  it('checks exact Mastodon source text, audience, warning, language, parent, sender and attempt time before confirming a supplied candidate', async () => {
    const c = await source();
    await checked(c.id);
    let d = await draft(c.id);
    await api(`/outbound/drafts/${d.id}`, 'PATCH', {
      version: d.version,
      body: { ...d.body, warning: 'Test warning', language: 'en' },
    });
    d = store.read().outbound!.drafts[0];
    const plan = await review(d.id);
    provider.mockImplementation(async (url, init) => {
      if (init?.method === 'POST') throw Error('timeout');
      return fixture(url, init);
    });
    await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: true });
    const receipt = store.read().outbound!.receipts[0];
    provider.mockImplementation(async (url, init) =>
      url.endsWith('/12345/source')
        ? JSON.stringify({ id: '12345', text: d.body.text, spoiler_text: d.body.warning })
        : url.endsWith('/statuses/12345')
          ? JSON.stringify({
              id: '12345',
              account: { id: 'writer-account' },
              visibility: 'unlisted',
              in_reply_to_id: null,
              created_at: receipt.at,
              language: 'en',
              url: 'https://social.example.com/@writer/12345',
            })
          : fixture(url, init),
    );
    const result = await api(`/outbound/receipts/${plan.token}/check`, 'POST', {
      providerId: '12345',
    });
    expect(result.data.outbound.receipts[0]).toMatchObject({
      status: 'sent',
      providerId: '12345',
      confirmation: 'provider-lookup',
    });
    expect(posts()).toHaveLength(1);
    expect(store.read().entries).toHaveLength(0);
  });
  it('does not confirm a Mastodon candidate with altered source fields or an earlier creation time', async () => {
    const c = await source();
    await checked(c.id);
    let d = await draft(c.id);
    await api(`/outbound/drafts/${d.id}`, 'PATCH', {
      version: d.version,
      body: { ...d.body, warning: 'Warning', language: 'en' },
    });
    d = store.read().outbound!.drafts[0];
    const plan = await review(d.id);
    provider.mockImplementation(async (url, init) => {
      if (init?.method === 'POST') throw Error('timeout');
      return fixture(url, init);
    });
    await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: true });
    const receipt = store.read().outbound!.receipts[0];
    for (const variant of ['text', 'warning', 'sender', 'audience', 'language', 'reply', 'time']) {
      provider.mockImplementation(async (url, init) =>
        url.endsWith('/12345/source')
          ? JSON.stringify({
              id: '12345',
              text: variant === 'text' ? 'Different' : d.body.text,
              spoiler_text: variant === 'warning' ? 'Different' : d.body.warning,
            })
          : url.endsWith('/statuses/12345')
            ? JSON.stringify({
                id: '12345',
                account: { id: variant === 'sender' ? 'other' : 'writer-account' },
                visibility: variant === 'audience' ? 'public' : 'unlisted',
                in_reply_to_id: variant === 'reply' ? '999' : null,
                created_at:
                  variant === 'time'
                    ? new Date(Date.parse(receipt.at) - 120000).toISOString()
                    : receipt.at,
                language: variant === 'language' ? 'es' : 'en',
                url: 'https://social.example.com/@writer/12345',
              })
            : fixture(url, init),
      );
      const result = await api(`/outbound/receipts/${plan.token}/check`, 'POST', {
        providerId: '12345',
      });
      expect(result.data.outbound.receipts[0].status, variant).toBe('unknown');
      expect(result.data.outbound.drafts[0].status).toBe('unknown');
    }
    expect(posts()).toHaveLength(1);
  });
  it('never converts a missing or different provider lookup into failure or a retriable draft', async () => {
    const c = await source('rocket');
    await checked(c.id);
    const d = await draft(c.id),
      plan = await review(d.id);
    provider.mockImplementation(async (url, init) => {
      if (init?.method === 'POST') throw Error('timeout');
      return fixture(url, init);
    });
    await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: true });
    provider.mockImplementation(async (url, init) => {
      if (url.includes('/chat.getMessage'))
        throw Object.assign(Error('private-message-body'), { httpStatus: 404 });
      return fixture(url, init);
    });
    const missing = await api(`/outbound/receipts/${plan.token}/check`, 'POST', {});
    expect(missing.data.outbound.receipts[0].status).toBe('unknown');
    expect(JSON.stringify(missing.data)).not.toContain('private-message-body');
    provider.mockImplementation(async (url, init) =>
      url.includes('/chat.getMessage')
        ? JSON.stringify({
            success: true,
            message: {
              _id: plan.token.replaceAll('-', ''),
              rid: 'other-room',
              msg: d.body.text,
              u: { _id: 'writing-user' },
            },
          })
        : fixture(url, init),
    );
    const mismatch = await api(`/outbound/receipts/${plan.token}/check`, 'POST', {});
    expect(mismatch.data.outbound.drafts[0].status).toBe('unknown');
    expect((await api(`/outbound/drafts/${d.id}/review`)).status).toBe(409);
    expect(posts()).toHaveLength(1);
  });
  it('cannot check a legacy unknown receipt without frozen sender/reply evidence', async () => {
    const c = await source();
    await checked(c.id);
    const d = await draft(c.id),
      plan = await review(d.id);
    provider.mockImplementation(async (url, init) => {
      if (init?.method === 'POST') throw Error('timeout');
      return fixture(url, init);
    });
    await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: true });
    store.update((state) => {
      delete state.outbound!.receipts[0].senderId;
    });
    const calls = provider.mock.calls.length;
    expect(
      (await api(`/outbound/receipts/${plan.token}/check`, 'POST', { providerId: '12345' })).status,
    ).toBe(409);
    expect(provider).toHaveBeenCalledTimes(calls);
  });
  it('does not recreate a deleted draft/source when provider lookup completes', async () => {
    const c = await source('rocket');
    await checked(c.id);
    const d = await draft(c.id),
      plan = await review(d.id);
    provider.mockImplementation(async (url, init) => {
      if (init?.method === 'POST') throw Error('timeout');
      return fixture(url, init);
    });
    await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: true });
    let finish!: (value: string) => void;
    provider.mockImplementation(async (url, init) =>
      url.includes('/chat.getMessage')
        ? new Promise<string>((resolve) => {
            finish = resolve;
          })
        : fixture(url, init),
    );
    const pending = api(`/outbound/receipts/${plan.token}/check`, 'POST', {});
    await vi.waitFor(() => expect(finish).toBeDefined());
    await api(`/connections/${c.id}`, 'DELETE');
    finish(
      JSON.stringify({
        success: true,
        message: {
          _id: plan.token.replaceAll('-', ''),
          rid: 'public-channel',
          msg: d.body.text,
          u: { _id: 'writing-user' },
        },
      }),
    );
    expect((await pending).status).toBe(409);
    expect(store.read().connections).toHaveLength(0);
    expect(store.read().outbound!.drafts).toHaveLength(0);
    expect(store.read().outbound!.receipts[0].status).toBe('unknown');
    expect(posts()).toHaveLength(1);
  });
  it('locks timeout outcomes, sanitizes receipts, survives restart and never retries automatically', async () => {
    const c = await source();
    await checked(c.id);
    const d = await draft(c.id),
      plan = await review(d.id);
    provider.mockImplementation(async (url, init) => {
      if (init?.method === 'POST') throw Error('private-provider-response-body');
      return fixture(url, init);
    });
    const result = await api(`/outbound/drafts/${d.id}/send`, 'POST', {
      token: plan.token,
      confirmed: true,
    });
    expect(result.data.outbound.receipts[0].status).toBe('unknown');
    expect(JSON.stringify(result.data)).not.toContain('private-provider-response-body');
    expect((await api(`/outbound/drafts/${d.id}/review`)).status).toBe(409);
    expect(
      (await api(`/outbound/drafts/${d.id}`, 'PATCH', { version: d.version, body: d.body })).status,
    ).toBe(409);
    expect((await api(`/outbound/drafts/${d.id}`, 'DELETE')).status).toBe(409);
    await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: true });
    expect(posts()).toHaveLength(1);
    expect(createStore(directory).read().outbound!.drafts[0].status).toBe('unknown');
  });
  it('records a definite permission rejection and requires a saved new draft version before a fresh review', async () => {
    const c = await source();
    await checked(c.id);
    const d = await draft(c.id),
      plan = await review(d.id);
    provider.mockImplementation(async (url, init) => {
      if (init?.method === 'POST') throw Object.assign(Error('private-error'), { httpStatus: 403 });
      return fixture(url, init);
    });
    await api(`/outbound/drafts/${d.id}/send`, 'POST', { token: plan.token, confirmed: true });
    expect(store.read().outbound!.receipts[0].status).toBe('failed');
    expect((await api(`/outbound/drafts/${d.id}/review`)).status).toBe(409);
    expect(
      (await api(`/outbound/drafts/${d.id}`, 'PATCH', { version: d.version, body: d.body })).status,
    ).toBe(200);
    expect((await api(`/outbound/drafts/${d.id}/review`)).status).toBe(200);
    expect(posts()).toHaveLength(1);
  });
  it('rejects foreign reply ownership, private reply targets and oversized messages without posting', async () => {
    const c = await source(),
      other = await source();
    await checked(c.id);
    const foreign = seedEntry(other.id),
      d = await draft(c.id, 'Reply', foreign);
    expect((await api(`/outbound/drafts/${d.id}/review`)).status).toBe(409);
    const own = seedEntry(c.id),
      current = await draft(c.id, 'Reply', own),
      plan = await review(current.id);
    provider.mockImplementation(async (url, init) =>
      /\/statuses\/1234$/.test(url)
        ? JSON.stringify({ id: '1234', visibility: 'private' })
        : fixture(url, init),
    );
    expect(
      (
        await api(`/outbound/drafts/${current.id}/send`, 'POST', {
          token: plan.token,
          confirmed: true,
        })
      ).status,
    ).toBe(409);
    const long = await draft(c.id, 'a'.repeat(501));
    expect((await api(`/outbound/drafts/${long.id}/review`)).status).toBe(400);
    expect(posts()).toHaveLength(0);
  });
  it('does not recreate disconnected sources/drafts during a submitted send; acknowledged receipt remains', async () => {
    const c = await source();
    await checked(c.id);
    const d = await draft(c.id),
      plan = await review(d.id);
    let finish!: (value: string) => void;
    provider.mockImplementation(async (url, init) =>
      init?.method === 'POST'
        ? new Promise<string>((resolve) => {
            finish = resolve;
          })
        : fixture(url, init),
    );
    const pending = api(`/outbound/drafts/${d.id}/send`, 'POST', {
      token: plan.token,
      confirmed: true,
    });
    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    await api(`/connections/${c.id}`, 'DELETE');
    finish(fixture(posts()[0][0], posts()[0][1]));
    await pending;
    expect(store.read().connections).toHaveLength(0);
    expect(store.read().entries).toHaveLength(0);
    expect(store.read().outbound!.drafts).toHaveLength(0);
    expect(store.read().outbound!.receipts[0].status).toBe('sent');
    expect(createStore(directory).read().outbound!.receipts[0].providerId).toBe('9001');
  });
  it('recovers sending as unknown and includes independent writer credentials and drafts in protected paired backup/restore', async () => {
    const c = await source();
    await checked(c.id);
    const d = await draft(c.id),
      plan = await review(d.id);
    store.update((state) => {
      state.outbound!.drafts[0].status = 'sending';
      state.outbound!.receipts.push({
        id: plan.token,
        draftId: d.id,
        draftVersion: d.version,
        connectionId: c.id,
        at: new Date().toISOString(),
        status: 'sending',
        sender: 'writer',
        destination: 'https://social.example.com',
        payloadHash: 'fixture',
      });
    });
    const restarted = createStore(directory);
    expect(restarted.read().outbound!.drafts[0].status).toBe('unknown');
    expect(restarted.read().outbound!.receipts[0].status).toBe('unknown');
    const archive = createBackup(directory, 'temporary-safe-password');
    const restoreDirectory = mkdtempSync(join(tmpdir(), 'myfeed-posting-restore-'));
    try {
      restoreBackup(restoreDirectory, archive, 'temporary-safe-password');
      const restored = createStore(restoreDirectory);
      expect(restored.read().outbound!.receipts[0].status).toBe('unknown');
      expect(restored.decrypt(restored.read().connections[0].posting!.secretCipher)).toBe(
        'writing-secret-marker',
      );
    } finally {
      rmSync(restoreDirectory, { recursive: true, force: true });
    }
  });
});
