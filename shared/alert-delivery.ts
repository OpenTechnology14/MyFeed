import { z } from 'zod';

// Contract for PROP-026 (external alert delivery). This file defines the payload
// shape, retry policy, idempotency-key derivation and the abstract destination
// adapter interface. No concrete network provider lives here or anywhere in this
// slice — only a local recording test sink (server/alert-sink-test.ts) implements
// the adapter interface today. See docs/readable/PROPOSAL_WORK_QUEUE.md PROP-026.

// --- Payload shape -----------------------------------------------------------

// Mirrors the local mention-alert fields already produced by shared/alerts.ts
// (mentionAlerts/alertExcerpt): a feed-scoped match against one explicit @handle,
// with a bounded local excerpt rather than full item content.
export const alertEventSchema = z
  .object({
    feedId: z.string().uuid(),
    connectionId: z.string().min(1).max(200),
    entryId: z.string().min(1).max(200),
    handle: z
      .string()
      .trim()
      .regex(/^@[\p{L}\p{N}_][\p{L}\p{N}_.@-]{0,198}$/u, 'Use an @handle without spaces.'),
    excerpt: z.string().max(180),
    source: z.string().min(1).max(200),
    occurredAt: z.string().datetime(),
  })
  .strict();
export type AlertEvent = z.infer<typeof alertEventSchema>;

// --- Idempotency key derivation ----------------------------------------------

// Stable per (feed, handle, entry) — NOT per excerpt text or timestamp, so a
// re-sync or a later re-run of the mention matcher over the same collected
// entry never produces a second delivery attempt for the same alert event.
// This is intentionally plain string composition (no hashing) so it stays
// usable from both shared and server code without a node:crypto dependency.
export function deriveAlertIdempotencyKey(
  event: Pick<AlertEvent, 'feedId' | 'handle' | 'entryId'>,
): string {
  const handle = event.handle.normalize('NFC').toLowerCase();
  return `alert:${event.feedId}:${handle}:${event.entryId}`;
}

// --- Retry policy --------------------------------------------------------------

// Attempt 1 is the initial send; attempts 2-4 are retries after the listed
// backoff from the previous attempt. After MAX_ATTEMPTS failed attempts the
// record is marked 'failed' and is not retried further.
export const ALERT_RETRY_BACKOFF_MS = [0, 30_000, 2 * 60_000, 10 * 60_000] as const;
export const ALERT_MAX_ATTEMPTS = ALERT_RETRY_BACKOFF_MS.length;

export function nextAlertBackoffMs(attemptsSoFar: number): number | null {
  // attemptsSoFar = number of attempts already made (0 before the first send).
  if (attemptsSoFar >= ALERT_MAX_ATTEMPTS) return null;
  return ALERT_RETRY_BACKOFF_MS[attemptsSoFar];
}

// Same-key delivery within this window is a no-op (dedupe), not a re-send,
// even if the record has already settled as 'sent' or 'failed'.
export const ALERT_DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;

// --- Outbox record + delivery result -----------------------------------------

export type AlertDeliveryStatus = 'pending' | 'sent' | 'failed';

export interface AlertOutboxRecord {
  idempotencyKey: string;
  event: AlertEvent;
  destinationId: string;
  status: AlertDeliveryStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt: string;
  lastError?: string;
}

export type AlertDeliveryResult =
  | { ok: true }
  | { ok: false; retryable: boolean; message: string };

// --- Destination adapter interface --------------------------------------------

// Any real provider (webhook, email, Slack, ...) implements this interface as a
// thin additional adapter. The only implementation in this slice is the local
// recording test sink in server/alert-sink-test.ts; no network call is made.
export interface AlertDestinationAdapter {
  id: string;
  send(event: AlertEvent): Promise<AlertDeliveryResult>;
}
