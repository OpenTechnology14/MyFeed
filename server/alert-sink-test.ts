import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AlertDestinationAdapter, AlertDeliveryResult, AlertEvent } from '../shared/alert-delivery';

// The only destination adapter wired up in this slice of PROP-026. It records
// "delivered" alerts to a local file under the existing data/ directory instead
// of sending anywhere over the network — there is no real external destination
// yet (see docs/readable/PROPOSAL_WORK_QUEUE.md PROP-026, "waiting for input").
//
// data/ is already gitignored (see .gitignore) and kept at restricted 0700/0600
// permissions, matching how server/store.ts keeps local entry content plaintext
// on disk today. A real provider (webhook, email, Slack, ...) implements the
// same AlertDestinationAdapter interface as a thin additional adapter; nothing
// about the outbox needs to change to add one.
export const TEST_SINK_DESTINATION_ID = 'local-test-sink';

export interface TestSinkDeliveredRecord {
  deliveredAt: string;
  feedId: string;
  connectionId: string;
  entryId: string;
  handle: string;
  source: string;
  occurredAt: string;
  excerpt: string;
}

export function createTestSinkAdapter(
  directory = process.env.MYFEED_DATA_DIR || resolve('data'),
  fileName = 'alert-sink-test.log',
): AlertDestinationAdapter {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = resolve(directory, fileName);
  return {
    id: TEST_SINK_DESTINATION_ID,
    async send(event: AlertEvent): Promise<AlertDeliveryResult> {
      const record: TestSinkDeliveredRecord = {
        deliveredAt: new Date().toISOString(),
        feedId: event.feedId,
        connectionId: event.connectionId,
        entryId: event.entryId,
        handle: event.handle,
        source: event.source,
        occurredAt: event.occurredAt,
        excerpt: event.excerpt,
      };
      appendFileSync(path, JSON.stringify(record) + '\n', { mode: 0o600 });
      return { ok: true };
    },
  };
}
