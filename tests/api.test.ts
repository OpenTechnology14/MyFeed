import { evaluateFeed } from '../shared/pipeline';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createStore, type Store } from '../server/store';
import { createApp } from '../server/app';
import { fetchConnection } from '../server/connectors';
import { sampleStories, sampleUpdates } from '../server/sample';

const sampleCount = sampleStories.length + sampleUpdates.length;

describe('local workspace API', () => {
  let directory: string, store: Store, server: Server, base: string;
  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'myfeed-test-'));
    store = createStore(directory);
    server = createApp(store).app.listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });
  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    rmSync(directory, { force: true, recursive: true });
  });
  async function api(
    path: string,
    method = 'GET',
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  }
  const sample = () => ({ feedId: store.read().feeds[0].id, kind: 'sample', name: 'Sample' });
  it('rejects browser-test traffic on a normal workspace before any mutation', async () => {
    const result = await api(
      '/feeds',
      'POST',
      { name: 'Must not create' },
      { 'X-MyFeed-Test-Session': '11111111-1111-4111-8111-111111111111' },
    );
    expect(result.status).toBe(403);
    expect(store.read().feeds).toHaveLength(1);
  });
  it('starts with one empty feed and enforces the 5-feed creation limit', async () => {
    expect(store.read().feeds).toHaveLength(1);
    expect(store.read().connections).toHaveLength(0);
    for (let i = 0; i < 4; i++)
      expect((await api('/feeds', 'POST', { name: `Feed ${i}` })).status).toBe(201);
    expect((await api('/feeds', 'POST', { name: 'Too many' })).status).toBe(409);
    expect(store.read().feeds).toHaveLength(5);
  });
  it('enforces 3 connections per feed, including when paused', async () => {
    for (let i = 0; i < 3; i++)
      expect((await api('/connections', 'POST', sample())).status).toBe(201);
    await api(`/connections/${store.read().connections[0].id}`, 'PATCH', { enabled: false });
    expect((await api('/connections', 'POST', sample())).status).toBe(409);
  });
  it('encrypts secrets at rest and omits encrypted and plaintext credentials from API output', async () => {
    const result = await api('/connections', 'POST', {
      ...sample(),
      secret: 'private-secret-marker',
    });
    expect(result.data.connections[0].hasSecret).toBe(true);
    expect(JSON.stringify(result.data)).not.toContain('private-secret-marker');
    expect(result.data.connections[0].secretCipher).toBeUndefined();
    expect(readFileSync(join(directory, 'store.json'), 'utf8')).not.toContain(
      'private-secret-marker',
    );
    expect(store.decrypt(store.read().connections[0].secretCipher)).toBe('private-secret-marker');
  });
  it('requires a user-owned YouTube API key and keeps it encrypted', async () => {
    const input = {
      feedId: store.read().feeds[0].id,
      kind: 'youtube',
      name: 'Public uploads',
      account: 'UCpublicChannelId',
      youtube: { source: 'channel' },
    };
    expect((await api('/connections', 'POST', input)).status).toBe(400);
    const result = await api('/connections', 'POST', { ...input, secret: 'youtube-api-key' });
    expect(result.status).toBe(201);
    expect(JSON.stringify(result.data)).not.toContain('youtube-api-key');
    expect(store.decrypt(store.read().connections[0].secretCipher)).toBe('youtube-api-key');
  });
  it('makes sample sync idempotent and keeps bookmarks after sync and restart', async () => {
    await api('/connections', 'POST', sample());
    const id = store.read().feeds[0].id;
    await api(`/feeds/${id}/sync`, 'POST', {});
    const item = store.read().entries[0];
    expect(store.read().entries).toHaveLength(sampleCount);
    await api(`/entries/${item.id}`, 'PATCH', { saved: true });
    await api(`/feeds/${id}/sync`, 'POST', {});
    expect(store.read().entries).toHaveLength(sampleCount);
    expect(store.read().entries.find((e) => e.id === item.id)?.saved).toBe(true);
    expect(store.read().runs[0].added).toBe(0);
    expect(
      createStore(directory)
        .read()
        .entries.find((e) => e.id === item.id)?.saved,
    ).toBe(true);
  });
  it('rejects stale customization and cross-origin mutations', async () => {
    const { id, createdAt, digest, ...config } = store.read().feeds[0];
    const revision = store.read().revision;
    await api('/connections', 'POST', sample());
    expect((await api(`/feeds/${id}`, 'PATCH', { ...config, revision })).status).toBe(409);
    expect(
      (await api('/feeds', 'POST', { name: 'Cross origin' }, { Origin: 'https://example.com' }))
        .status,
    ).toBe(403);
    expect(
      (
        await api(
          '/feeds',
          'POST',
          { name: 'Cross origin' },
          { Origin: 'http://127.0.0.1.evil.example:5188' },
        )
      ).status,
    ).toBe(403);
  });
  it('disconnects a source with its items and preserves at least one feed', async () => {
    await api('/connections', 'POST', sample());
    await api(`/feeds/${store.read().feeds[0].id}/sync`, 'POST', {});
    expect((await api(`/connections/${store.read().connections[0].id}`, 'DELETE')).status).toBe(
      200,
    );
    expect(store.read().entries).toHaveLength(0);
    expect((await api(`/feeds/${store.read().feeds[0].id}`, 'DELETE')).status).toBe(409);
  });
  it('records failed sources and completes healthy sources in the same run', async () => {
    await api('/connections', 'POST', sample());
    await api('/connections', 'POST', { ...sample(), name: 'Failing' });
    const runtime = createApp(store, async (c, secret) => {
      if (c.name === 'Failing') throw new Error('credentials must not leak');
      return fetchConnection(c, secret);
    });
    await runtime.runSync(store.read().feeds[0].id, 'manual');
    expect(store.read().entries).toHaveLength(sampleCount);
    expect(store.read().runs[0].errors).toHaveLength(1);
    expect(JSON.stringify(store.public())).not.toContain('credentials must not leak');
  });
  it('deduplicates simultaneous syncs and discards disconnected-source results', async () => {
    await api('/connections', 'POST', sample());
    const c = store.read().connections[0],
      id = store.read().feeds[0].id;
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const connector = vi.fn(async () => {
      await gate;
      return fetchConnection(c, '');
    });
    const runtime = createApp(store, connector);
    const first = runtime.runSync(id, 'manual'),
      second = runtime.runSync(id, 'manual');
    await api(`/connections/${c.id}`, 'DELETE');
    release();
    await Promise.all([first, second]);
    expect(connector).toHaveBeenCalledTimes(1);
    expect(store.read().entries).toHaveLength(0);
    expect(store.read().runs).toHaveLength(1);
  });
  it('runs background sync only after opt-in and respects the 5-minute interval', async () => {
    await api('/connections', 'POST', sample());
    const runtime = createApp(store);
    await runtime.tick();
    expect(store.read().runs).toHaveLength(0);
    store.update((s) => {
      s.connections[0].background = true;
    });
    await runtime.tick();
    await runtime.tick();
    expect(store.read().runs).toHaveLength(1);
    expect(store.read().runs[0].trigger).toBe('background');
  });
  it('fails clearly when AI is not configured, and clears its credential on disconnect', async () => {
    expect((await api(`/feeds/${store.read().feeds[0].id}/digest`, 'POST', {})).status).toBe(409);
    await api('/ai', 'PUT', { model: 'user-selected-model', secret: 'provider-secret' });
    expect(store.public().ai.hasSecret).toBe(true);
    await api('/ai', 'PUT', { disconnect: true });
    expect(store.read().ai.secretCipher).toBeUndefined();
  });
  it('collects before linking, shares one source across lenses, and preserves data after unlink/delete', async () => {
    const first = store.read().feeds[0].id;
    const second = (await api('/feeds', 'POST', { name: 'Second lens' })).data.createdId;
    expect(
      (await api('/connections', 'POST', { kind: 'sample', name: 'Independent' })).status,
    ).toBe(201);
    const c = store.read().connections[0];
    expect(c.feedIds).toEqual([]);
    await api(`/connections/${c.id}/sync`, 'POST', {});
    const ids = store.read().entries.map((e) => e.id);
    await api(`/entries/${ids[0]}`, 'PATCH', { saved: true, read: true });
    expect((await api(`/connections/${c.id}`, 'PATCH', { feedIds: [first, second] })).status).toBe(
      200,
    );
    const f = store.read().feeds[1];
    await api(`/feeds/${second}`, 'PATCH', {
      ...f,
      include: ['no-such-keyword'],
      revision: store.read().revision,
    });
    expect(evaluateFeed(store.read(), store.read().feeds[0]).some((d) => d.included)).toBe(true);
    expect(evaluateFeed(store.read(), store.read().feeds[1]).every((d) => !d.included)).toBe(true);
    await api(`/connections/${c.id}`, 'PATCH', { feedIds: [second] });
    expect(evaluateFeed(store.read(), store.read().feeds[0])).toEqual([]);
    await api(`/feeds/${second}`, 'DELETE');
    expect(store.read().connections[0].feedIds).toEqual([]);
    expect(store.read().entries.map((e) => e.id)).toEqual(ids);
    expect(store.read().entries[0]).toMatchObject({ saved: true, read: true });
    expect(createStore(directory).read().connections[0].feedIds).toEqual([]);
  });
  it('enforces feed link capacity including paused connections without partial changes', async () => {
    for (let i = 0; i < 3; i++) await api('/connections', 'POST', sample());
    await api('/connections', 'POST', { kind: 'sample', name: 'Unlinked' });
    const connections = store.read().connections;
    await api(`/connections/${connections[0].id}`, 'PATCH', { enabled: false });
    const second = (await api('/feeds', 'POST', { name: 'Spare' })).data.createdId;
    expect(
      (
        await api(`/connections/${connections[3].id}`, 'PATCH', {
          feedIds: [second, store.read().feeds[0].id],
        })
      ).status,
    ).toBe(409);
    expect(store.read().connections[3].feedIds).toEqual([]);
  });
  it('migrates legacy ownership and background opt-in without changing item or credential identity', async () => {
    await api('/connections', 'POST', { ...sample(), secret: 'migration-secret' });
    const feedId = store.read().feeds[0].id;
    await api(`/feeds/${feedId}/sync`, 'POST', {});
    store.update((s) => {
      const c = s.connections[0];
      delete c.feedIds;
      delete c.background;
      c.feedId = feedId;
      s.feeds[0].background = true;
    });
    const before = store.read();
    const migrated = createStore(directory);
    expect(migrated.read().connections[0]).toMatchObject({
      id: before.connections[0].id,
      feedIds: [feedId],
      background: true,
    });
    expect(migrated.read().connections[0].feedId).toBeUndefined();
    expect(migrated.read().entries).toEqual(before.entries);
    expect(migrated.decrypt(migrated.read().connections[0].secretCipher)).toBe('migration-secret');
  });
  it('shares a sync lock across linked feeds', async () => {
    await api('/connections', 'POST', sample());
    const first = store.read().feeds[0].id;
    const second = (await api('/feeds', 'POST', { name: 'Shared' })).data.createdId;
    const c = store.read().connections[0];
    await api(`/connections/${c.id}`, 'PATCH', { feedIds: [first, second] });
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const connector = vi.fn(async () => {
      await gate;
      return fetchConnection(c, '');
    });
    const runtime = createApp(store, connector);
    const a = runtime.runSync(first, 'manual'),
      b = runtime.runSync(second, 'manual');
    release();
    await Promise.all([a, b]);
    expect(connector).toHaveBeenCalledTimes(1);
    expect(store.read().entries).toHaveLength(sampleCount);
  });
  it('persists per-feed alert opt-in/handles and rejects invalid mention configuration', async () => {
    const f = store.read().feeds[0];
    expect(f.alertsEnabled).toBe(false);
    expect(
      (
        await api(`/feeds/${f.id}`, 'PATCH', {
          ...f,
          alertsEnabled: true,
          alertHandles: ['@alex'],
          revision: store.read().revision,
        })
      ).status,
    ).toBe(200);
    expect(createStore(directory).read().feeds[0]).toMatchObject({
      alertsEnabled: true,
      alertHandles: ['@alex'],
    });
    const before = store.read().revision;
    expect(
      (
        await api(`/feeds/${f.id}`, 'PATCH', {
          ...f,
          alertsEnabled: true,
          alertHandles: ['someone without a handle'],
          revision: before,
        })
      ).status,
    ).toBe(400);
    expect(store.read().revision).toBe(before);
  });
  it('persists independent text limits, rejects bounds/stale edits, and migrates old feeds', async () => {
    const first = store.read().feeds[0];
    const second = (await api('/feeds', 'POST', { name: 'Second' })).data.feeds[1];
    for (const [feed, textLimit] of [
      [first, { mode: 'words', value: 3 }],
      [second, { mode: 'characters', value: 8 }],
    ] as const) {
      expect(
        (
          await api(`/feeds/${feed.id}`, 'PATCH', {
            ...feed,
            textLimit,
            revision: store.read().revision,
          })
        ).status,
      ).toBe(200);
    }
    const reloaded = createStore(directory).read();
    expect(reloaded.feeds.map((f) => f.textLimit)).toEqual([
      { mode: 'words', value: 3 },
      { mode: 'characters', value: 8 },
    ]);
    const revision = store.read().revision;
    for (const textLimit of [
      { mode: 'words', value: 0 },
      { mode: 'words', value: 5001 },
      { mode: 'characters', value: 20001 },
      { mode: 'words', value: 1.5 },
    ])
      expect(
        (await api(`/feeds/${first.id}`, 'PATCH', { ...first, textLimit, revision })).status,
      ).toBe(400);
    expect(
      (
        await api(`/feeds/${first.id}`, 'PATCH', {
          ...first,
          textLimit: { mode: 'words', value: 2 },
          revision: revision - 1,
        })
      ).status,
    ).toBe(409);
    expect(store.read().revision).toBe(revision);
    const legacy = JSON.parse(readFileSync(join(directory, 'store.json'), 'utf8'));
    delete legacy.feeds[0].textLimit;
    writeFileSync(join(directory, 'store.json'), JSON.stringify(legacy));
    expect(createStore(directory).read().feeds[0].textLimit).toEqual({ mode: 'default' });
  });
  it('repairs connections without exposing credentials, requires reset for identity changes, and checks without ingest', async () => {
    await api('/connections', 'POST', { ...sample(), secret: 'old-test-secret' });
    let c = store.read().connections[0];
    await api(`/connections/${c.id}/sync`, 'POST', {});
    const entries = structuredClone(store.read().entries);
    const configuration = {
      name: 'Repaired',
      endpoint: c.endpoint,
      account: c.account,
      roomId: c.roomId,
      userId: c.userId,
      mailbox: c.mailbox,
      secret: '',
    };
    let result = await api(`/connections/${c.id}`, 'PATCH', { configuration, configVersion: 1 });
    expect(result.status).toBe(200);
    expect(JSON.stringify(result.data)).not.toContain('old-test-secret');
    expect(store.decrypt(store.read().connections[0].secretCipher)).toBe('old-test-secret');
    expect(store.read().entries).toEqual(entries);
    expect(
      (await api(`/connections/${c.id}`, 'PATCH', { configuration, configVersion: 1 })).status,
    ).toBe(409);
    expect((await api(`/connections/${c.id}/check`, 'POST', {})).status).toBe(200);
    expect(store.read().connections[0].check?.status).toBe('read-succeeded');
    expect(store.read().entries).toEqual(entries);
    expect(
      (
        await api(`/connections/${c.id}`, 'PATCH', {
          configuration: { ...configuration, account: 'different' },
          configVersion: 2,
        })
      ).status,
    ).toBe(409);
    result = await api(`/connections/${c.id}`, 'PATCH', {
      configuration: { ...configuration, account: 'different', secret: 'replacement-test-secret' },
      configVersion: 2,
      resetItems: true,
    });
    expect(result.status).toBe(200);
    expect(store.read().entries).toEqual([]);
    expect(JSON.stringify(result.data)).not.toContain('replacement-test-secret');
    const restarted = createStore(directory);
    expect(restarted.decrypt(restarted.read().connections[0].secretCipher)).toBe(
      'replacement-test-secret',
    );
    expect(restarted.read().connections[0].configVersion).toBe(3);
  });
  it('discards a sync result when its source configuration is replaced', async () => {
    await api('/connections', 'POST', sample());
    const c = store.read().connections[0];
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>((r) => (release = r)),
      started = new Promise<void>((r) => (entered = r));
    const runtime = createApp(store, async () => {
      entered();
      await gate;
      return fetchConnection(c, '');
    });
    await new Promise<void>((r) => server.close(() => r()));
    server = runtime.app.listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
    const pending = api(`/connections/${c.id}/sync`, 'POST', {});
    await started;
    const configuration = {
      name: 'New config',
      endpoint: c.endpoint,
      account: c.account,
      roomId: c.roomId,
      userId: c.userId,
      mailbox: c.mailbox,
      secret: '',
    };
    expect(
      (await api(`/connections/${c.id}`, 'PATCH', { configuration, configVersion: 1 })).status,
    ).toBe(200);
    release();
    await pending;
    expect(store.read().entries).toEqual([]);
    expect(store.read().runs).toEqual([]);
    expect(store.read().connections[0].status).toBe('ready');
  });
  it('versions local item copies independently, preserves originals across sync/restart, and resets to latest originals', async () => {
    await api('/connections', 'POST', sample());
    const c = store.read().connections[0];
    await api(`/connections/${c.id}/sync`, 'POST', {});
    const e = structuredClone(store.read().entries[0]);
    await api('/feeds', 'POST', { name: 'Second lens' });
    await api(`/connections/${c.id}`, 'PATCH', { feedIds: store.read().feeds.map((f) => f.id) });
    const localEdit = { title: 'My local headline 🧭', content: 'Local display @invented' };
    expect((await api(`/entries/${e.id}`, 'PATCH', { localEdit, editVersion: 0 })).status).toBe(
      200,
    );
    expect((await api(`/entries/${e.id}`, 'PATCH', { saved: true, read: true })).status).toBe(200);
    for (const feed of store.read().feeds) {
      const page = await api(`/history?feedId=${feed.id}&entryId=${e.id}`);
      expect(page.data.decisions[0].entry.localEdit).toMatchObject(localEdit);
      expect(page.data.decisions[0].entry).toMatchObject({ id: e.id, saved: true, read: true });
    }

    expect(
      (
        await api(`/entries/${e.id}`, 'PATCH', {
          localEdit: { ...localEdit, title: 'Stale' },
          editVersion: 0,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await api(`/entries/${e.id}`, 'PATCH', {
          localEdit: { title: ' ', content: '' },
          editVersion: 1,
        })
      ).status,
    ).toBe(400);
    await api(`/connections/${c.id}/sync`, 'POST', {});
    const edited = store.read().entries.find((x) => x.id === e.id)!;
    expect(edited).toMatchObject({
      title: e.title,
      content: e.content,
      localEdit,
      saved: true,
      read: true,
      editVersion: 1,
    });
    expect(
      createStore(directory)
        .read()
        .entries.find((x) => x.id === e.id)?.localEdit,
    ).toMatchObject(localEdit);
    store.update((s) => {
      s.entries.find((x) => x.id === e.id)!.content = 'Updated provider text';
      s.feeds[0].include = ['invented'];
    });
    expect(
      evaluateFeed(store.read(), store.read().feeds[0]).find((d) => d.entry.id === e.id)?.included,
    ).toBe(false);
    expect(
      (await api(`/entries/${e.id}`, 'PATCH', { localEdit: null, editVersion: 1 })).status,
    ).toBe(200);
    expect(store.read().entries.find((x) => x.id === e.id)).toMatchObject({
      content: 'Updated provider text',
      editVersion: 2,
      saved: true,
      read: true,
    });
    expect(store.read().entries.find((x) => x.id === e.id)?.localEdit).toBeUndefined();
    await api(`/connections/${c.id}`, 'DELETE');
    expect((await api(`/entries/${e.id}`, 'PATCH', { localEdit, editVersion: 2 })).status).toBe(
      404,
    );
  });
  it('commits checkpoints only after successful collection and backs off failing background sources', async () => {
    await api('/connections', 'POST', sample());
    const c = store.read().connections[0];
    store.update((s) => {
      s.connections[0].background = true;
      s.connections[0].progress = { newestId: 'original' };
    });
    const connector = vi.fn().mockRejectedValue(Error('private upstream body'));
    const runtime = createApp(store, connector);
    await runtime.tick();
    expect(store.read().connections[0].progress).toEqual({ newestId: 'original' });
    expect(store.read().connections[0].syncHealth?.failures).toBe(1);
    await runtime.tick();
    expect(connector).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(store.public())).not.toContain('private upstream body');
    connector.mockResolvedValue(
      Object.assign(await fetchConnection(c, ''), {
        progress: { newestId: 'committed', partial: false },
      }),
    );
    await runtime.runConnection(c.id, 'manual');
    expect(store.read().connections[0].progress).toEqual({ newestId: 'committed', partial: false });
    expect(store.read().connections[0].syncHealth?.failures).toBe(0);
    expect(createStore(directory).read().connections[0].progress?.newestId).toBe('committed');
  });
  it('returns item-free navigation summaries and sanitized paged decision history', async () => {
    await api('/connections', 'POST', { ...sample(), secret: 'fixture-secret' });
    const source = store.read().connections[0];
    await api(`/connections/${source.id}/sync`, 'POST', {});
    const summary = await api('/state', 'GET', undefined, { 'X-MyFeed-Summary': '1' });
    expect(summary.data.entries).toEqual([]);
    expect(summary.data.counts.entries).toBe(sampleCount);
    expect(summary.data.counts.feeds[store.read().feeds[0].id].included).toBeGreaterThan(0);
    const first = await api(`/history?connectionId=${source.id}&limit=2`);
    expect(first.data.decisions).toHaveLength(2);
    expect(JSON.stringify(first.data)).not.toContain('secretCipher');
    expect(JSON.stringify(first.data)).not.toContain('fixture-secret');
    await api(`/entries/${first.data.decisions[0].entry.id}`, 'PATCH', { saved: true });
    const stale = await api(
      `/history?connectionId=${source.id}&limit=2&cursor=${encodeURIComponent(first.data.nextCursor)}`,
    );
    expect(stale.status).toBe(409);
    const plan = await api(
      `/feeds/${store.read().feeds[0].id}/digest-plan?maxItems=2&charactersPerItem=100`,
    );
    expect(plan.data.items).toHaveLength(2);
    expect(plan.data.items.every((item: { content: string }) => item.content.length <= 100)).toBe(
      true,
    );
    expect(Object.keys(plan.data.items[0]).sort()).toEqual(['author', 'content', 'id', 'title']);
    expect(plan.data.revision).toBe(store.read().revision);
  });
});
