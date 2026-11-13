import { describe, expect, it } from 'vitest';
import { createAlertOutbox } from '../server/alert-outbox';
import { createLoggerSinkAdapter, LOGGER_SINK_DESTINATION_ID } from '../server/alert-sink-logger';
import type { AlertEvent } from '../shared/alert-delivery';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function event(overrides: Partial<AlertEvent> = {}): AlertEvent {
  return {
    feedId: '11111111-1111-4111-8111-111111111111',
    connectionId: 'conn-1',
    entryId: 'entry-1',
    handle: '@alex',
    excerpt: 'Hello @alex, check this out.',
    source: 'Mastodon · social.example',
    occurredAt: '2026-10-18T12:00:00.000Z',
    ...overrides,
  };
}

describe('PROP-026 logger-sink adapter', () => {
  it('logs delivery metadata only, never the excerpt', async () => {
    const logged: unknown[] = [];
    const adapter = createLoggerSinkAdapter((record) => logged.push(record));
    const result = await adapter.send(event());
    expect(result).toEqual({ ok: true });
    expect(logged).toHaveLength(1);
    const record = logged[0] as Record<string, unknown>;
    expect(record.feedId).toBe('11111111-1111-4111-8111-111111111111');
    expect(record.handle).toBe('@alex');
    expect(record.destinationId).toBe(LOGGER_SINK_DESTINATION_ID);
    expect(record).not.toHaveProperty('excerpt');
    expect(JSON.stringify(record)).not.toContain('Hello @alex, check this out.');
  });

  it('defaults to console.log when no logger is supplied, without throwing', async () => {
    const adapter = createLoggerSinkAdapter();
    await expect(adapter.send(event())).resolves.toEqual({ ok: true });
  });

  it('round-trips through the durable outbox like the test-sink adapter does', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'myfeed-logger-sink-'));
    try {
      const logged: unknown[] = [];
      const adapter = createLoggerSinkAdapter((record) => logged.push(record));
      const outbox = createAlertOutbox(directory);
      const queued = outbox.enqueue(event(), LOGGER_SINK_DESTINATION_ID);
      expect(queued.status).toBe('pending');
      const attempted = await outbox.processPending({ [LOGGER_SINK_DESTINATION_ID]: adapter });
      expect(attempted).toHaveLength(1);
      expect(logged).toHaveLength(1);
      const stored = outbox.get(queued.idempotencyKey);
      expect(stored?.status).toBe('sent');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('dedupes a second enqueue of the same event within the TTL: logger is not called twice', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'myfeed-logger-sink-'));
    try {
      const logged: unknown[] = [];
      const adapter = createLoggerSinkAdapter((record) => logged.push(record));
      const outbox = createAlertOutbox(directory);
      outbox.enqueue(event(), LOGGER_SINK_DESTINATION_ID);
      await outbox.processPending({ [LOGGER_SINK_DESTINATION_ID]: adapter });
      outbox.enqueue(event(), LOGGER_SINK_DESTINATION_ID);
      await outbox.processPending({ [LOGGER_SINK_DESTINATION_ID]: adapter });
      expect(logged).toHaveLength(1);
      expect(outbox.list()).toHaveLength(1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
