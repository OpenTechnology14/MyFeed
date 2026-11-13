import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
vi.mock('../server/network', () => ({ fetchPublic: vi.fn(), resolvePublicHost: vi.fn() }));
import { fetchPublic } from '../server/network';
import { fetchConnection } from '../server/connectors';
import { apiItems, apiSourceConfigSchema, DEFAULT_API_SOURCE } from '../shared/api-source';
import type { Connection } from '../shared/model';
import { createStore } from '../server/store';
import { createApp } from '../server/app';

const network = vi.mocked(fetchPublic);
const source: Connection = {
  id: 'api-source',
  kind: 'api',
  name: 'External pipeline',
  endpoint: 'https://api.example.com/items',
  account: '',
  roomId: '',
  userId: '',
  mailbox: 'INBOX',
  enabled: true,
  status: 'ready',
  api: DEFAULT_API_SOURCE,
};
describe('read-only API source', () => {
  beforeEach(() => vi.resetAllMocks());
  it('maps nested JSON, stable zero IDs, safe content/media, and honest missing dates', async () => {
    network.mockResolvedValue(
      JSON.stringify({
        data: [
          {
            uid: 0,
            text: '<p>Hello</p>',
            link: 'javascript:bad()',
            image: 'https://example.com/image.jpg',
            topics: ['news'],
          },
        ],
      }),
    );
    const batch = await fetchConnection(
      {
        ...source,
        api: {
          ...DEFAULT_API_SOURCE,
          itemsPath: 'data',
          idPath: 'uid',
          contentPath: 'text',
          urlPath: 'link',
          imagePath: 'image',
          tagsPath: 'topics',
        },
      },
      '',
    );
    expect(batch[0]).toMatchObject({
      externalId: '0',
      content: 'Hello',
      url: '',
      publishedAt: '1970-01-01T00:00:00.000Z',
      image: 'https://example.com/image.jpg',
      tags: ['news'],
      type: 'post',
    });
    expect(network.mock.calls[0][1]).toEqual({ headers: {} });
  });
  it('caps collection and retains an older-page cursor without allowing it to change hosts', async () => {
    network.mockImplementation(async (url) => {
      const cursor = new URL(url).searchParams.get('after');
      const index = cursor ? Number(cursor) : 0;
      return JSON.stringify({
        items: [{ id: String(index), content: 'item' }],
        next: index < 4 ? String(index + 1) : null,
      });
    });
    const c = {
      ...source,
      api: {
        ...DEFAULT_API_SOURCE,
        nextCursorPath: 'next',
        cursorParameter: 'after',
        auth: 'header' as const,
      },
    };
    const initial = await fetchConnection(c, 'private-key');
    expect(initial).toHaveLength(3);
    expect(initial.progress).toMatchObject({ apiNextCursor: '3', historyComplete: false });
    const older = await fetchConnection({ ...c, progress: initial.progress }, 'private-key', {
      older: true,
    });
    expect(older.map((item) => item.externalId)).toEqual(['3', '4']);
    expect(older.progress?.historyComplete).toBe(true);
    expect(
      network.mock.calls.every(
        ([url, init]) =>
          new URL(url).origin === 'https://api.example.com' &&
          init?.headers?.['X-API-Key'] === 'private-key',
      ),
    ).toBe(true);
  });
  it('rejects executable/prototype mappings, missing IDs, invalid shapes/dates and oversized pages', () => {
    for (const path of ['__proto__.items', 'a.constructor.id', '$.items[*]', 'a.b.c.d.e.f.g.h.i'])
      expect(apiSourceConfigSchema.safeParse({ itemsPath: path }).success).toBe(false);
    expect(() => apiItems({ items: [{ content: 'No ID' }] }, DEFAULT_API_SOURCE)).toThrow('stable');
    expect(() =>
      apiItems({ items: [{ id: Number.MAX_SAFE_INTEGER + 1 }] }, DEFAULT_API_SOURCE),
    ).toThrow('stable');
    expect(() => apiItems({ items: {} }, DEFAULT_API_SOURCE)).toThrow('array');
    expect(() =>
      apiItems({ items: [{ id: 'x', publishedAt: 'not a date' }] }, DEFAULT_API_SOURCE),
    ).toThrow('dates');
    expect(() =>
      apiItems({ items: Array.from({ length: 101 }, (_, id) => ({ id })) }, DEFAULT_API_SOURCE),
    ).toThrow('100');
    expect(apiSourceConfigSchema.safeParse({ headerName: 'Host' }).success).toBe(false);
  });
  it('fails closed on a malformed later page or repeated cursor without returning partial items', async () => {
    network
      .mockResolvedValueOnce(JSON.stringify({ items: [{ id: 'first' }], next: 'a' }))
      .mockResolvedValueOnce('invalid JSON private-body');
    await expect(
      fetchConnection({ ...source, api: { ...DEFAULT_API_SOURCE, nextCursorPath: 'next' } }, ''),
    ).rejects.toThrow('valid JSON');
    network.mockReset().mockResolvedValue(JSON.stringify({ items: [{ id: 'first' }], next: 'a' }));
    await expect(
      fetchConnection({ ...source, api: { ...DEFAULT_API_SOURCE, nextCursorPath: 'next' } }, ''),
    ).rejects.toThrow('repeated');
  });
});

describe('API source persistence and repair', () => {
  let directory: string, server: Server, base: string;
  let store: ReturnType<typeof createStore>;
  beforeEach(async () => {
    vi.resetAllMocks();
    directory = mkdtempSync(join(tmpdir(), 'myfeed-api-source-'));
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
  async function api(path: string, method: string, body: unknown) {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  }
  it('keeps credentials private and preserves IDs/save/read/overlays across repeats and restart; mapping repair requires reset', async () => {
    network.mockResolvedValue(
      JSON.stringify({ items: [{ id: 'stable', title: 'Collected', content: 'original' }] }),
    );
    const created = await api('/connections', 'POST', {
      ...source,
      feedIds: [store.read().feeds[0].id],
      secret: 'private-api-key',
      api: { ...DEFAULT_API_SOURCE, auth: 'bearer' },
    });
    expect(created.status).toBe(201);
    expect(JSON.stringify(created.data)).not.toContain('private-api-key');
    const connection = store.read().connections[0];
    expect(readFileSync(join(directory, 'store.json'), 'utf8')).not.toContain('private-api-key');
    await api(`/connections/${connection.id}/sync`, 'POST', {});
    const item = store.read().entries[0];
    await api(`/entries/${item.id}`, 'PATCH', { saved: true, read: true });
    await api(`/entries/${item.id}`, 'PATCH', {
      localEdit: { title: 'Local', content: 'overlay' },
      editVersion: item.editVersion ?? 0,
    });
    await api(`/connections/${connection.id}/sync`, 'POST', {});
    expect(store.read().entries).toHaveLength(1);
    expect(createStore(directory).read().entries[0]).toMatchObject({
      id: item.id,
      saved: true,
      read: true,
      localEdit: { title: 'Local' },
    });
    const {
      id,
      enabled,
      status,
      secretCipher,
      progress,
      syncHealth,
      lastSync,
      configVersion,
      feedIds,
      background,
      ...configuration
    } = store.read().connections[0];
    const patch = {
      configuration: {
        ...configuration,
        api: { ...configuration.api!, idPath: 'otherId' },
        secret: '',
      },
      configVersion,
    };
    expect((await api(`/connections/${id}`, 'PATCH', patch)).status).toBe(409);
    expect(store.read().entries).toHaveLength(1);
    expect((await api(`/connections/${id}`, 'PATCH', { ...patch, resetItems: true })).status).toBe(
      200,
    );
    expect(store.read().entries).toHaveLength(0);
    expect(store.decrypt(store.read().connections[0].secretCipher)).toBe('private-api-key');
  });
  it('rejects missing mappings/authentication, URL secrets and nonstandard ports before persistence', async () => {
    for (const invalid of [
      { api: undefined },
      { api: { ...DEFAULT_API_SOURCE, auth: 'bearer' } },
      { endpoint: 'https://api.example.com/feed?api_key=secret' },
      { endpoint: 'https://api.example.com:8443/feed' },
    ]) {
      expect((await api('/connections', 'POST', { ...source, ...invalid })).status).toBe(400);
    }
    expect(store.read().connections).toHaveLength(0);
    expect(network).not.toHaveBeenCalled();
  });
});
