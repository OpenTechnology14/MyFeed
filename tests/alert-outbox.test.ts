import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAlertOutbox, type AlertOutbox } from '../server/alert-outbox';
import { createTestSinkAdapter, TEST_SINK_DESTINATION_ID } from '../server/alert-sink-test';
import { ALERT_MAX_ATTEMPTS, ALERT_DEDUPE_TTL_MS, type AlertEvent } from '../shared/alert-delivery';
import type { AlertDestinationAdapter, AlertDeliveryResult } from '../shared/alert-delivery';

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
function flakyAdapter(resultsQueue: AlertDeliveryResult[]): AlertDestinationAdapter {
  const calls: AlertEvent[] = [];
  return {
    id: 'flaky',
    async send(e) {
      calls.push(e);
      const next = resultsQueue.shift();
      if (!next) throw new Error('No scripted result left for flakyAdapter.');
      return next;
    },
    // test-only introspection
    // @ts-expect-error augmenting for assertions in this file only
    calls,
  };
}

describe('PROP-026 alert outbox (durable, deduplicating, retrying)', () => {
  let directory: string, outbox: AlertOutbox;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'myfeed-alert-outbox-'));
    outbox = createAlertOutbox(directory);
  });
  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('enqueues a pending record with an attached idempotency key', () => {
    const record = outbox.enqueue(event(), TEST_SINK_DESTINATION_ID);
    expect(record.status).toBe('pending');
    expect(record.attempts).toBe(0);
    expect(record.idempotencyKey).toMatch(/^alert:/);
    expect(outbox.list()).toHaveLength(1);
  });

  it('persists durably across process restarts (reload from disk)', () => {
    outbox.enqueue(event(), TEST_SINK_DESTINATION_ID);
    const reopened = createAlertOutbox(directory);
    expect(reopened.list()).toHaveLength(1);
    expect(reopened.list()[0].event).toMatchObject({ entryId: 'entry-1' });
  });

  it('dedupes a repeat enqueue of the same event within the TTL window as a no-op', () => {
    let clock = Date.parse('2026-10-18T12:00:00.000Z');
    const now = () => new Date(clock);
    const first = outbox.enqueue(event(), TEST_SINK_DESTINATION_ID, now);
    clock += 60_000;
    const second = outbox.enqueue(event(), TEST_SINK_DESTINATION_ID, now);
    expect(second).toEqual(first);
    expect(outbox.list()).toHaveLength(1);
  });

  it('queues a fresh delivery again once the dedupe TTL has elapsed', () => {
    let clock = Date.parse('2026-10-18T12:00:00.000Z');
    const now = () => new Date(clock);
    outbox.enqueue(event(), TEST_SINK_DESTINATION_ID, now);
    clock += ALERT_DEDUPE_TTL_MS + 1;
    const later = outbox.enqueue(event(), TEST_SINK_DESTINATION_ID, now);
    expect(later.status).toBe('pending');
    expect(outbox.list()).toHaveLength(1);
    expect(outbox.list()[0].createdAt).not.toBe(outbox.list()[0].updatedAt);
  });

  it('retries on failure per the backoff policy and eventually marks failed', async () => {
    let clock = Date.parse('2026-10-18T12:00:00.000Z');
    const now = () => new Date(clock);
    outbox.enqueue(event(), 'flaky', now);
    const results: AlertDeliveryResult[] = Array.from({ length: ALERT_MAX_ATTEMPTS }, () => ({
      ok: false,
      retryable: true,
      message: 'simulated failure',
    }));
    const adapter = flakyAdapter(results);
    for (let i = 0; i < ALERT_MAX_ATTEMPTS; i++) {
      const attempted = await outbox.processPending({ flaky: adapter }, now);
      if (i < ALERT_MAX_ATTEMPTS - 1) {
        expect(attempted).toHaveLength(1);
        expect(attempted[0].status).toBe('pending');
        // Advance time well past the scheduled backoff before the next attempt.
        clock = Date.parse(attempted[0].nextAttemptAt) + 1;
      }
    }
    const final = outbox.get(outbox.list()[0].idempotencyKey)!;
    expect(final.status).toBe('failed');
    expect(final.attempts).toBe(ALERT_MAX_ATTEMPTS);
    expect(final.lastError).toBe('simulated failure');
  });

  it('does not retry before the scheduled backoff has elapsed', async () => {
    let clock = Date.parse('2026-10-18T12:00:00.000Z');
    const now = () => new Date(clock);
    outbox.enqueue(event(), 'flaky', now);
    const adapter = flakyAdapter([{ ok: false, retryable: true, message: 'first failure' }]);
    await outbox.processPending({ flaky: adapter }, now);
    // Still well before the scheduled backoff window.
    clock += 1_000;
    const attempted = await outbox.processPending({ flaky: adapter }, now);
    expect(attempted).toHaveLength(0);
    expect(outbox.list()[0].attempts).toBe(1);
  });

  it('marks a non-retryable failure as failed immediately, without consuming the full backoff schedule', async () => {
    outbox.enqueue(event(), 'flaky', () => new Date());
    const adapter = flakyAdapter([
      { ok: false, retryable: false, message: 'destination permanently rejected this payload' },
    ]);
    const attempted = await outbox.processPending({ flaky: adapter });
    expect(attempted).toHaveLength(1);
    expect(attempted[0].status).toBe('failed');
    expect(attempted[0].attempts).toBe(1);
  });

  it('marks sent on success and never attempts again', async () => {
    outbox.enqueue(event(), 'flaky', () => new Date());
    const adapter = flakyAdapter([{ ok: true }]);
    const attempted = await outbox.processPending({ flaky: adapter });
    expect(attempted[0].status).toBe('sent');
    const again = await outbox.processPending({ flaky: adapter });
    expect(again).toHaveLength(0);
  });

  it('delivers through the local test sink adapter, writing a record to a local file (no network)', async () => {
    const sinkDir = mkdtempSync(join(tmpdir(), 'myfeed-alert-sink-'));
    try {
      const sink = createTestSinkAdapter(sinkDir, 'alert-sink-test.log');
      expect(sink.id).toBe(TEST_SINK_DESTINATION_ID);
      outbox.enqueue(event(), TEST_SINK_DESTINATION_ID);
      const attempted = await outbox.processPending({ [TEST_SINK_DESTINATION_ID]: sink });
      expect(attempted[0].status).toBe('sent');
      const path = join(sinkDir, 'alert-sink-test.log');
      expect(existsSync(path)).toBe(true);
      const lines = readFileSync(path, 'utf8').trim().split('\n');
      expect(lines).toHaveLength(1);
      const record = JSON.parse(lines[0]);
      expect(record).toMatchObject({
        feedId: event().feedId,
        entryId: event().entryId,
        handle: '@alex',
      });
    } finally {
      rmSync(sinkDir, { recursive: true, force: true });
    }
  });

  it('reports an explicit error and marks failed when no adapter is configured for a destination', async () => {
    outbox.enqueue(event(), 'unregistered-destination', () => new Date());
    const attempted = await outbox.processPending({});
    expect(attempted[0].status).toBe('failed');
    expect(attempted[0].lastError).toMatch(/No adapter configured/);
  });
});
