import { mentionAlerts } from './alerts';
import { z } from 'zod';
import type { Decision, State } from './model';
import { evaluateFeed } from './pipeline';
import { groupConversations } from './presentation';
export const historyQuerySchema = z
  .object({
    feedId: z.string().optional(),
    connectionId: z.string().optional(),
    entryId: z.string().optional(),
    conversation: z.string().max(1000).optional(),
    decision: z.enum(['all', 'included', 'filtered']).default('all'),
    alerts: z.enum(['true', 'false']).default('false'),
    mode: z.enum(['included', 'all']).default('included'),
    saved: z.enum(['true', 'false']).default('false'),
    unread: z.enum(['true', 'false']).default('false'),
    q: z.string().max(500).default(''),
    limit: z.coerce.number().int().min(1).max(50).default(30),
    cursor: z.string().max(4000).optional(),
  })
  .strict();
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export interface HistoryPage {
  revision: number;
  decisions: Decision[];
  total: number;
  includedTotal: number;
  nextCursor?: string;
}
export function historyPage(state: State, query: HistoryQuery): HistoryPage {
  const { cursor, limit, ...scope } = query;
  let rows: Decision[];
  if (query.feedId) {
    const feed = state.feeds.find((f) => f.id === query.feedId);
    if (!feed) throw Error('Feed not found.');
    rows = evaluateFeed(state, feed);
    if (query.alerts === 'true') rows = mentionAlerts(rows, feed);
  } else {
    rows = state.entries
      .map((entry) => ({
        entry,
        connection: state.connections.find((c) => c.id === entry.connectionId)!,
        included: true,
        reason: 'Collected original; feed rules have not been applied.',
        score: 0,
      }))
      .filter((d) => !!d.connection)
      .sort(
        (a, b) =>
          b.entry.publishedAt.localeCompare(a.entry.publishedAt) ||
          a.entry.id.localeCompare(b.entry.id),
      );
  }
  const includedTotal = rows.filter((d) => d.included).length;
  rows = rows.filter(
    (d) =>
      (query.decision === 'all' || (query.decision === 'included' ? d.included : !d.included)) &&
      (!query.connectionId || d.connection.id === query.connectionId) &&
      (!query.entryId || d.entry.id === query.entryId) &&
      (query.saved === 'true' ? d.entry.saved : query.mode === 'all' || d.included) &&
      (query.unread !== 'true' || !d.entry.read) &&
      `${d.entry.title} ${d.entry.content} ${d.entry.author} ${d.entry.authorHandle || ''} ${d.entry.chat?.channelName || ''}`
        .toLowerCase()
        .includes(query.q.toLowerCase()),
  );
  if (query.conversation)
    rows = groupConversations(rows).find((c) => c.id === query.conversation)?.messages ?? [];
  const key = JSON.stringify(scope);
  let offset = 0;
  if (cursor) {
    let decoded: unknown;
    try {
      decoded = JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(cursor), (character) => character.charCodeAt(0)),
        ),
      );
    } catch {
      throw Error('Invalid history cursor.');
    }
    const page = z
      .object({
        revision: z.number().int(),
        key: z.string(),
        offset: z.number().int().nonnegative(),
      })
      .strict()
      .parse(decoded);
    if (page.revision !== state.revision || page.key !== key)
      throw Error('History changed. Reload from the first page.');
    offset = page.offset;
  }
  const nextOffset = offset + limit;
  return {
    revision: state.revision,
    decisions: rows.slice(offset, nextOffset),
    total: rows.length,
    includedTotal,
    ...(nextOffset < rows.length
      ? {
          nextCursor: btoa(
            Array.from(
              new TextEncoder().encode(
                JSON.stringify({ revision: state.revision, key, offset: nextOffset }),
              ),
              (byte) => String.fromCharCode(byte),
            ).join(''),
          ),
        }
      : {}),
  };
}
