import { connectionFeeds } from './model';
import type { Decision, Entry, Feed, State } from './model';

export function safeUrl(value: string): string {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : '';
  } catch {
    return '';
  }
}
export function plainText(value: string, preserveLines = false): string {
  const text = (preserveLines ? value.replace(/<br\s*\/?\s*>|<\/p>|<\/div>/gi, '\n') : value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(
      /&(?:amp|lt|gt|quot|apos|nbsp);/g,
      (v) =>
        ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' })[
          v
        ] ?? v,
    )
    .replace(preserveLines ? /[^\S\n]+/g : /\s+/g, ' ');
  return text
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
export function canonicalUrl(value: string): string {
  if (!safeUrl(value)) return '';
  const url = new URL(value);
  url.hash = '';
  [...url.searchParams.keys()].forEach((key) => {
    if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  });
  return url.href.replace(/\/$/, '');
}
export function feedFingerprint(feed: Feed): string {
  const values: unknown[] = [feed.context, feed.include, feed.exclude, feed.deduplicate, feed.sort];
  if (feed.aiPipeline?.instructions) values.push(feed.aiPipeline);
  return JSON.stringify(values);
}
export function evaluateFeed(state: State, feed: Feed): Decision[] {
  const connections = new Map(
    state.connections.filter((c) => connectionFeeds(c).includes(feed.id)).map((c) => [c.id, c]),
  );
  const seen = new Set<string>();
  const context = [...new Set(feed.context.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])];
  const result: Decision[] = [];
  const ordered = state.entries
    .filter((e) => connections.has(e.connectionId))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
  for (const entry of ordered) {
    const connection = connections.get(entry.connectionId)!;
    const text =
      `${entry.title} ${entry.content} ${entry.tags.join(' ')} ${entry.author}`.toLowerCase();
    const excluded = feed.exclude.find((k) => text.includes(k.toLowerCase()));
    const includedKeyword = feed.include.find((k) => text.includes(k.toLowerCase()));
    const score = context.filter((k) => text.includes(k)).length;
    // Separate chat messages are events, even if two people send the same text.
    const key =
      entry.type === 'chat' || connection.kind === 'rocket'
        ? `chat:${entry.connectionId}:${entry.externalId}`
        : canonicalUrl(entry.url) || `${entry.title.toLowerCase()}|${entry.content.toLowerCase()}`;
    let reason = score
      ? `${score} matches with your background context`
      : 'Matches your feed rules';
    let included = true;
    if (!connection.enabled) {
      included = false;
      reason = 'Connection paused';
    } else if (excluded) {
      included = false;
      reason = `Muted keyword: ${excluded}`;
    } else if (feed.include.length && !includedKeyword) {
      included = false;
      reason = 'No included keyword matched';
    } else if (feed.deduplicate && seen.has(key)) {
      included = false;
      reason = 'Duplicate story';
    }
    if (included) {
      seen.add(key);
      if (includedKeyword) reason = `Included keyword: ${includedKeyword}`;
    }
    result.push({ entry, connection, included, reason, score });
  }
  return feed.sort === 'relevance'
    ? result.sort(
        (a, b) => b.score - a.score || b.entry.publishedAt.localeCompare(a.entry.publishedAt),
      )
    : result;
}
export function mergeEntries(
  existing: Entry[],
  incoming: Entry[],
  maxPerConnection = 300,
): { entries: Entry[]; added: number } {
  const map = new Map(existing.map((e) => [`${e.connectionId}:${e.externalId}`, e]));
  const originalKeys = new Set(map.keys());
  incoming.forEach((entry) => {
    const key = `${entry.connectionId}:${entry.externalId}`;
    const old = map.get(key);
    map.set(
      key,
      old
        ? {
            ...entry,
            id: old.id,
            receivedAt: old.receivedAt,
            read: old.read,
            saved: old.saved,
            localEdit: old.localEdit,
            editVersion: old.editVersion,
          }
        : entry,
    );
  });
  const count = new Map<string, number>();
  const entries = [...map.values()]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((e) => {
      if (e.saved) return true;
      const n = (count.get(e.connectionId) ?? 0) + 1;
      count.set(e.connectionId, n);
      return n <= maxPerConnection;
    });
  const added = entries.filter(
    (e) => !originalKeys.has(`${e.connectionId}:${e.externalId}`),
  ).length;
  return { entries, added };
}
