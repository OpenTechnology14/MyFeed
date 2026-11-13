import type { Decision, Entry } from './model';

export function entryType(decision: Decision): NonNullable<Entry['type']> {
  if (decision.entry.type) return decision.entry.type;
  if (decision.connection.kind === 'rocket') return 'chat';
  if (['mastodon', 'bluesky'].includes(decision.connection.kind)) return 'post';
  if (decision.connection.kind === 'email') return 'email';
  return 'article';
}
export interface Conversation {
  id: string;
  channel: string;
  thread: boolean;
  source: Decision['connection'];
  messages: Decision[];
  latestAt: string;
}
export function groupConversations(decisions: Decision[]): Conversation[] {
  const chats = decisions.filter((d) => entryType(d) === 'chat');
  // Reply metadata identifies a thread's root even when the root has no threadId.
  const roots = new Set(
    chats
      .filter((d) => d.entry.chat?.threadId)
      .map((d) =>
        JSON.stringify([d.connection.id, d.entry.chat!.channelId, d.entry.chat!.threadId]),
      ),
  );
  const groups = new Map<string, Conversation>();
  for (const d of chats) {
    const channelId = d.entry.chat?.channelId || d.connection.roomId || d.connection.id;
    const rootKey = JSON.stringify([d.connection.id, channelId, d.entry.externalId]);
    const threadId =
      d.entry.chat?.threadId || (roots.has(rootKey) ? d.entry.externalId : undefined);
    const id = JSON.stringify([d.connection.id, channelId, threadId || null]);
    const group = groups.get(id) || {
      id,
      channel: d.entry.chat?.channelName || d.connection.name,
      thread: !!threadId,
      source: d.connection,
      messages: [],
      latestAt: d.entry.publishedAt,
    };
    group.messages.push(d);
    if (d.entry.publishedAt > group.latestAt) group.latestAt = d.entry.publishedAt;
    groups.set(id, group);
  }
  return [...groups.values()]
    .map((g) => ({
      ...g,
      messages: g.messages.sort(
        (a, b) =>
          a.entry.publishedAt.localeCompare(b.entry.publishedAt) ||
          a.entry.externalId.localeCompare(b.entry.externalId),
      ),
    }))
    .sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}
export type TimelineItem =
  | { type: 'entry'; decision: Decision }
  | { type: 'conversation'; conversation: Conversation };
export function timelineItems(decisions: Decision[]): TimelineItem[] {
  const groups = groupConversations(decisions);
  const lookup = new Map(groups.flatMap((g) => g.messages.map((d) => [d.entry.id, g] as const)));
  const seen = new Set<string>();
  // Follow the supplied order, including context ranking. Collapse each conversation once.
  return decisions.flatMap((d): TimelineItem[] => {
    const conversation = lookup.get(d.entry.id);
    if (!conversation) return [{ type: 'entry', decision: d }];
    if (seen.has(conversation.id)) return [];
    seen.add(conversation.id);
    return [{ type: 'conversation', conversation }];
  });
}
