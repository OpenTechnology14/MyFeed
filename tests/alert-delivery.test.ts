import { describe, expect, it } from 'vitest';
import {
  alertEventSchema,
  deriveAlertIdempotencyKey,
  nextAlertBackoffMs,
  ALERT_MAX_ATTEMPTS,
  ALERT_RETRY_BACKOFF_MS,
  ALERT_DEDUPE_TTL_MS,
  type AlertEvent,
} from '../shared/alert-delivery';

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

describe('PROP-026 alert delivery contract', () => {
  it('validates a well-formed alert event and rejects malformed fields', () => {
    expect(alertEventSchema.parse(event())).toMatchObject({ handle: '@alex' });
    expect(alertEventSchema.safeParse(event({ feedId: 'not-a-uuid' })).success).toBe(false);
    expect(alertEventSchema.safeParse(event({ handle: 'Alex Morgan' })).success).toBe(false);
    expect(alertEventSchema.safeParse(event({ excerpt: 'x'.repeat(181) })).success).toBe(false);
    expect(alertEventSchema.safeParse(event({ occurredAt: 'not a date' })).success).toBe(false);
    // Extra/unknown fields must not silently pass through a strict contract.
    expect(alertEventSchema.safeParse({ ...event(), extra: 'nope' }).success).toBe(false);
  });

  it('derives a stable, deterministic idempotency key per (feed, handle, entry)', () => {
    const a = deriveAlertIdempotencyKey(event());
    const b = deriveAlertIdempotencyKey(event());
    expect(a).toBe(b);
    // Case/normalization-insensitive on the handle, since matching itself is
    // case-insensitive (shared/alerts.ts lowercases before matching).
    expect(deriveAlertIdempotencyKey(event({ handle: '@Alex' }))).toBe(a);
    // Different excerpt text or occurredAt for the SAME underlying entry must
    // not change the key — a re-sync of the same entry must still dedupe.
    expect(deriveAlertIdempotencyKey(event({ excerpt: 'different text now' }))).toBe(a);
    expect(deriveAlertIdempotencyKey(event({ occurredAt: '2026-10-19T00:00:00.000Z' }))).toBe(a);
    // A different entry, handle or feed must produce a different key.
    expect(deriveAlertIdempotencyKey(event({ entryId: 'entry-2' }))).not.toBe(a);
    expect(deriveAlertIdempotencyKey(event({ handle: '@sara' }))).not.toBe(a);
    expect(
      deriveAlertIdempotencyKey(event({ feedId: '22222222-2222-4222-8222-222222222222' })),
    ).not.toBe(a);
  });

  it('defines a bounded backoff schedule and max-attempts cutoff', () => {
    expect(ALERT_RETRY_BACKOFF_MS[0]).toBe(0);
    expect(ALERT_MAX_ATTEMPTS).toBe(ALERT_RETRY_BACKOFF_MS.length);
    expect(nextAlertBackoffMs(0)).toBe(ALERT_RETRY_BACKOFF_MS[0]);
    expect(nextAlertBackoffMs(1)).toBe(ALERT_RETRY_BACKOFF_MS[1]);
    expect(nextAlertBackoffMs(ALERT_MAX_ATTEMPTS - 1)).toBe(
      ALERT_RETRY_BACKOFF_MS[ALERT_MAX_ATTEMPTS - 1],
    );
    expect(nextAlertBackoffMs(ALERT_MAX_ATTEMPTS)).toBeNull();
    expect(nextAlertBackoffMs(ALERT_MAX_ATTEMPTS + 10)).toBeNull();
  });

  it('exposes a positive, bounded dedupe TTL', () => {
    expect(ALERT_DEDUPE_TTL_MS).toBeGreaterThan(0);
    expect(ALERT_DEDUPE_TTL_MS).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);
  });
});
