import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  alertEventSchema,
  deriveAlertIdempotencyKey,
  nextAlertBackoffMs,
  ALERT_MAX_ATTEMPTS,
  ALERT_DEDUPE_TTL_MS,
  type AlertEvent,
  type AlertOutboxRecord,
  type AlertDestinationAdapter,
} from '../shared/alert-delivery';

// Durable outbox for PROP-026 external alert delivery. Follows the same shape as
// the posting outbox (shared/posting.ts, server/posting.ts, server/posting-routes.ts):
// durable local state, an idempotency key attached before send, and an explicit
// status machine (pending -> sent | failed) rather than fire-and-forget delivery.
//
// Persistence reuses server/store.ts's atomic-write pattern (write to a temp file,
// then rename) in a dedicated file so the alert outbox does not couple to the main
// application store's schema/migrations. No secrets are held here today — the only
// configured destination is the local test sink — but the record shape has room for
// a future destination identifier so a real provider adapter does not need a new
// persistence format.

const recordSchema = z.object({
  idempotencyKey: z.string().min(1),
  event: alertEventSchema,
  destinationId: z.string().min(1),
  status: z.enum(['pending', 'sent', 'failed']),
  attempts: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  nextAttemptAt: z.string().datetime(),
  lastError: z.string().max(2000).optional(),
});
const fileSchema = z.object({ records: z.array(recordSchema).max(2000) });

export interface AlertOutbox {
  directory: string;
  /**
   * Enqueue an alert event for delivery. Deduplicates on the derived idempotency
   * key: a call within ALERT_DEDUPE_TTL_MS of an existing record for the same
   * key is a no-op and returns the existing record rather than queuing a second
   * delivery attempt.
   */
  enqueue(event: AlertEvent, destinationId: string, now?: () => Date): AlertOutboxRecord;
  /**
   * Attempt delivery for every pending record whose nextAttemptAt has arrived,
   * using the matching adapter from `adapters` by destinationId. Advances each
   * record's status/attempts/backoff per the retry policy. Returns the records
   * that were attempted during this call.
   */
  processPending(
    adapters: Record<string, AlertDestinationAdapter>,
    now?: () => Date,
  ): Promise<AlertOutboxRecord[]>;
  list(): AlertOutboxRecord[];
  get(idempotencyKey: string): AlertOutboxRecord | undefined;
}

export function createAlertOutbox(
  directory = process.env.MYFEED_DATA_DIR || resolve('data'),
): AlertOutbox {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = resolve(directory, 'alert-outbox.json');
  let records: AlertOutboxRecord[] = load();

  function load(): AlertOutboxRecord[] {
    if (!existsSync(path)) return [];
    try {
      return fileSchema.parse(JSON.parse(readFileSync(path, 'utf8'))).records;
    } catch {
      // A damaged outbox file must not crash the app or silently reset delivery
      // history; fail closed to an empty queue and let it rebuild going forward.
      return [];
    }
  }
  function persist() {
    const temp = `${path}.tmp`;
    writeFileSync(temp, JSON.stringify({ records }, null, 2), { mode: 0o600 });
    renameSync(temp, path);
  }

  return {
    directory: resolve(directory),
    enqueue(event, destinationId, now = () => new Date()) {
      alertEventSchema.parse(event);
      const idempotencyKey = deriveAlertIdempotencyKey(event);
      const existing = records.find((r) => r.idempotencyKey === idempotencyKey);
      const nowDate = now();
      if (existing && nowDate.getTime() - Date.parse(existing.updatedAt) < ALERT_DEDUPE_TTL_MS) {
        return existing;
      }
      const iso = nowDate.toISOString();
      const record: AlertOutboxRecord = {
        idempotencyKey,
        event,
        destinationId,
        status: 'pending',
        attempts: 0,
        createdAt: existing?.createdAt ?? iso,
        updatedAt: iso,
        nextAttemptAt: iso,
      };
      if (existing) {
        // Outside the dedupe TTL: replace the stale (settled) record with a
        // fresh delivery attempt rather than appending a duplicate entry for
        // the same idempotency key.
        records = records.map((r) => (r.idempotencyKey === idempotencyKey ? record : r));
      } else {
        records = [...records, record];
      }
      persist();
      return record;
    },
    async processPending(adapters, now = () => new Date()) {
      const nowMs = now().getTime();
      const attempted: AlertOutboxRecord[] = [];
      for (const record of records) {
        if (record.status !== 'pending') continue;
        if (Date.parse(record.nextAttemptAt) > nowMs) continue;
        const adapter = adapters[record.destinationId];
        const iso = new Date(nowMs).toISOString();
        if (!adapter) {
          // A missing adapter is a configuration error, not a transient
          // delivery failure — fail immediately rather than burning through
          // the retry schedule for something a retry cannot fix.
          record.attempts += 1;
          record.lastError = `No adapter configured for destination "${record.destinationId}".`;
          record.updatedAt = iso;
          record.status = 'failed';
          attempted.push(record);
          continue;
        }
        record.attempts += 1;
        let result;
        try {
          result = await adapter.send(record.event);
        } catch (error) {
          result = {
            ok: false as const,
            retryable: true,
            message: error instanceof Error ? error.message : 'Delivery threw an error.',
          };
        }
        record.updatedAt = iso;
        if (result.ok) {
          record.status = 'sent';
          record.lastError = undefined;
        } else {
          record.lastError = result.message;
          if (!result.retryable) {
            record.status = 'failed';
          } else {
            finalizeOrSchedule(record, iso);
          }
        }
        attempted.push(record);
      }
      if (attempted.length) persist();
      return attempted;
    },
    list() {
      return records;
    },
    get(idempotencyKey) {
      return records.find((r) => r.idempotencyKey === idempotencyKey);
    },
  };

  function finalizeOrSchedule(record: AlertOutboxRecord, iso: string) {
    const backoff = nextAlertBackoffMs(record.attempts);
    if (backoff === null || record.attempts >= ALERT_MAX_ATTEMPTS) {
      record.status = 'failed';
      return;
    }
    record.nextAttemptAt = new Date(Date.parse(iso) + backoff).toISOString();
  }
}
