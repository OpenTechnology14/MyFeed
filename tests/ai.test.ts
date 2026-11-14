import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createStore, type Store } from '../server/store';
import { createApp } from '../server/app';
import { fetchPublic } from '../server/network';
import { fetchConnection } from '../server/connectors';
vi.mock('../server/network', () => ({ fetchPublic: vi.fn(), resolvePublicHost: vi.fn() }));

describe('on-demand AI boundary', () => {
  let directory: string, store: Store, server: Server, base: string;
  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'myfeed-ai-test-'));
    store = createStore(directory);
    store.update((s) => {
      s.connections.push({
        id: crypto.randomUUID(),
        feedId: s.feeds[0].id,
        kind: 'sample',
        name: 'Examples',
        endpoint: '',
        account: '',
        mailbox: 'INBOX',
        roomId: '',
        userId: '',
        status: 'active',
        enabled: true,
      });
      s.ai = { model: 'user-chosen-model', secretCipher: store.encrypt('test-api-key') };
    });
    const rows = await fetchConnection(store.read().connections[0], '');
    store.update((s) => {
      s.entries = rows;
      s.feeds[0].exclude = ['fediverse'];
    });
    server = createApp(store).app.listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
    vi.mocked(fetchPublic).mockReset();
  });
  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    rmSync(directory, { force: true, recursive: true });
  });
  const options = {
    maxItems: 20,
    charactersPerItem: 2000,
    maxInputTokens: 12000,
    maxOutputTokens: 1500,
    inputRate: 1,
    outputRate: 2,
    maximumUsd: 0.1,
    pricesVerified: true,
  };
  const payload = () =>
    JSON.stringify({ revision: store.read().revision, options, confirmed: true });
  const responseMeta = {
    model: 'user-chosen-model',
    service_tier: 'default',
    status: 'completed',
    usage: { input_tokens: 1200, output_tokens: 200, total_tokens: 1400 },
  };
  it('persists the selected feed pipeline profile, reviews its instructions and counts the exact instruction payload without automatic spending', async () => {
    const feed = store.read().feeds[0];
    const { id, createdAt, digest, ...config } = feed;
    const saved = await fetch(`${base}/feeds/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...config,
        aiPipeline: {
          profile: 'digest',
          instructions: 'Group by topic and keep source references.',
        },
        revision: store.read().revision,
      }),
    });
    expect(saved.status).toBe(200);
    expect(fetchPublic).not.toHaveBeenCalled();
    expect(createStore(directory).read().feeds[0].aiPipeline.instructions).toBe(
      'Group by topic and keep source references.',
    );
    const plan = await (await fetch(`${base}/feeds/${id}/digest-plan`)).json();
    expect(plan.instructions).toContain('Group by topic');
    expect(plan.instructions).toContain('untrusted data');
    expect(fetchPublic).not.toHaveBeenCalled();
    vi.mocked(fetchPublic)
      .mockResolvedValueOnce(JSON.stringify({ input_tokens: 1200 }))
      .mockResolvedValueOnce(
        JSON.stringify({
          ...responseMeta,
          output: [{ type: 'message', content: [{ type: 'output_text', text: 'Generated [1]' }] }],
        }),
      );
    expect(
      (
        await fetch(`${base}/feeds/${id}/digest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload(),
        })
      ).status,
    ).toBe(200);
    const countRequest = JSON.parse(vi.mocked(fetchPublic).mock.calls[0][1]!.body!);
    const generationRequest = JSON.parse(vi.mocked(fetchPublic).mock.calls[1][1]!.body!);
    expect(countRequest.instructions).toBe(plan.instructions);
    expect(generationRequest.instructions).toBe(countRequest.instructions);
    expect(store.read().entries.some((entry) => entry.content.includes('Generated [1]'))).toBe(
      false,
    );
  });
  it('migrates old feeds to a compatible default pipeline without discarding their digest', () => {
    store.update((state) => {
      delete (state.feeds[0] as Partial<(typeof state.feeds)[0]>).aiPipeline;
      state.feeds[0].digest = {
        text: 'Existing',
        createdAt: new Date().toISOString(),
        model: 'user-chosen-model',
        itemIds: [],
        configHash: 'legacy',
      };
    });
    const migrated = createStore(directory).read().feeds[0];
    expect(migrated.aiPipeline).toEqual({ profile: 'digest', instructions: '' });
    expect(migrated.digest?.text).toBe('Existing');
  });
  it('submits included excerpts only, uses the configured model, and reads message text after reasoning output', async () => {
    vi.mocked(fetchPublic)
      .mockResolvedValueOnce(JSON.stringify({ input_tokens: 1200 }))
      .mockResolvedValueOnce(
        JSON.stringify({
          ...responseMeta,
          output: [
            { type: 'reasoning' },
            { type: 'message', content: [{ type: 'output_text', text: 'A grounded digest [1].' }] },
          ],
        }),
      );
    const response = await fetch(`${base}/feeds/${store.read().feeds[0].id}/digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload(),
    });
    expect(response.status).toBe(200);
    const state = await response.json();
    expect(state.feeds[0].digest.text).toBe('A grounded digest [1].');
    expect(state.ai.secretCipher).toBeUndefined();
    const request = vi.mocked(fetchPublic).mock.calls[1][1]!;
    const body = JSON.parse(request.body!);
    const input = JSON.parse(body.input);
    expect(body.model).toBe('user-chosen-model');
    expect(body.store).toBe(false);
    expect(body.tools).toBeUndefined();
    expect(input.items.length).toBeLessThanOrEqual(20);
    expect(
      input.items.some((e: { title: string }) => e.title === 'An introduction to the fediverse'),
    ).toBe(false);
    expect(request.headers?.Authorization).toBe('Bearer test-api-key');
    const c = store.read().connections[0];
    await fetch(`${base}/connections/${c.id}`, { method: 'DELETE' });
    expect(store.read().feeds[0].digest).toBeUndefined();
  });
  it('does not restore disconnected source content when generation finishes after removal', async () => {
    let finish!: (value: string) => void;
    vi.mocked(fetchPublic)
      .mockResolvedValueOnce(JSON.stringify({ input_tokens: 1200 }))
      .mockImplementationOnce(
        () =>
          new Promise<string>((r) => {
            finish = r;
          }),
      );
    const result = fetch(`${base}/feeds/${store.read().feeds[0].id}/digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload(),
    });
    await vi.waitFor(() => expect(fetchPublic).toHaveBeenCalledTimes(2));
    await fetch(`${base}/connections/${store.read().connections[0].id}`, { method: 'DELETE' });
    finish(
      JSON.stringify({
        ...responseMeta,
        output: [{ type: 'message', content: [{ type: 'output_text', text: 'Old content' }] }],
      }),
    );
    await result;
    expect(store.read().feeds[0].digest).toBeUndefined();
    expect(store.read().entries).toHaveLength(0);
  });
  it('rejects absent confirmation and over-budget generation before submitting a model request', async () => {
    const url = `${base}/feeds/${store.read().feeds[0].id}/digest`;
    expect(
      (
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
    ).toBe(400);
    expect(fetchPublic).not.toHaveBeenCalled();
    vi.mocked(fetchPublic).mockResolvedValueOnce(JSON.stringify({ input_tokens: 1200 }));
    const result = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        revision: store.read().revision,
        options: { ...options, maximumUsd: 0.0001 },
        confirmed: true,
      }),
    });
    expect(result.status).toBe(409);
    expect(fetchPublic).toHaveBeenCalledTimes(1);
    expect(store.read().ai.receipts?.[0].status).toBe('blocked');
  });
  it('records an uncertain charge after a submitted timeout without automatic retry', async () => {
    vi.mocked(fetchPublic)
      .mockResolvedValueOnce(JSON.stringify({ input_tokens: 1200 }))
      .mockRejectedValueOnce(Error('private-provider-response'));
    const response = await fetch(`${base}/feeds/${store.read().feeds[0].id}/digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload(),
    });
    expect(response.status).toBe(500);
    expect(fetchPublic).toHaveBeenCalledTimes(2);
    expect(store.read().ai.receipts?.[0]).toMatchObject({
      status: 'uncertain',
      reservedUsd: 0.0042,
    });
    const publicState = store.public();
    expect(publicState.ai.receipts?.[0].status).toBe('uncertain');
    expect(JSON.stringify(publicState)).not.toContain('private-provider-response');
    expect(JSON.stringify(publicState)).not.toContain('test-api-key');
  });
});
