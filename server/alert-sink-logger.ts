import type { AlertDestinationAdapter, AlertDeliveryResult, AlertEvent } from '../shared/alert-delivery';

// A second destination adapter alongside server/alert-sink-test.ts, for PROP-026
// slice 1. Still no real external destination — this one writes a one-line
// delivery record to a provided logger (console by default) instead of a file.
//
// Deliberately omits `event.excerpt`: that field is a bounded slice of the
// user's own collected content, which can originate from an IMAP mailbox (see
// shared/alerts.ts / shared/connectors for sources feeding mentionAlerts). A
// console/log stream is far more exposed than the test-sink's gitignored local
// file (terminal scrollback, process logs, potential log aggregation), so this
// adapter logs only delivery metadata, matching CLAUDE.md's "never log
// credentials, source response bodies, or mailbox message contents" boundary.
// A real provider adapter still implements AlertDestinationAdapter directly;
// nothing about the outbox or this file needs to change to add one.
export const LOGGER_SINK_DESTINATION_ID = 'local-logger-sink';

export interface LoggerSinkDeliveredRecord {
  deliveredAt: string;
  destinationId: string;
  feedId: string;
  connectionId: string;
  entryId: string;
  handle: string;
  source: string;
  occurredAt: string;
}

export type LoggerSinkLogFn = (record: LoggerSinkDeliveredRecord) => void;

export function createLoggerSinkAdapter(
  log: LoggerSinkLogFn = (record) => console.log('[alert-sink-logger]', JSON.stringify(record)),
): AlertDestinationAdapter {
  return {
    id: LOGGER_SINK_DESTINATION_ID,
    async send(event: AlertEvent): Promise<AlertDeliveryResult> {
      const record: LoggerSinkDeliveredRecord = {
        deliveredAt: new Date().toISOString(),
        destinationId: LOGGER_SINK_DESTINATION_ID,
        feedId: event.feedId,
        connectionId: event.connectionId,
        entryId: event.entryId,
        handle: event.handle,
        source: event.source,
        occurredAt: event.occurredAt,
      };
      log(record);
      return { ok: true };
    },
  };
}
