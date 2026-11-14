import { describe, expect, it } from 'vitest';
import { initialState, type Connection, type Decision, type Entry } from '../shared/model';
import { evaluateFeed } from '../shared/pipeline';
import { entryType, groupConversations, timelineItems } from '../shared/presentation';

const source: Connection = {
  id: 'chat-source',
  feedId: 'feed',
  kind: 'rocket',
  name: 'Team',
  endpoint: '',
  account: '',
  roomId: 'general',
  userId: '',
  mailbox: 'INBOX',
  enabled: true,
  status: 'active',
};
function message(
  id: string,
  minutes: number,
  overrides: Partial<Entry> = {},
  connection = source,
): Decision {
  return {
    connection,
    included: true,
    reason: 'Included by feed rules',
    score: 0,
    entry: {
      id,
      connectionId: connection.id,
      externalId: id,
      type: 'chat',
      title: id,
      content: 'Same message',
      author: 'Reader',
      url: '',
      tags: [],
      saved: false,
      read: false,
      publishedAt: new Date(Date.UTC(2026, 9, 4, 10, minutes)).toISOString(),
      receivedAt: '2026-10-04T11:00:00Z',
      chat: { channelId: 'general', channelName: 'general' },
      ...overrides,
    },
  };
}
describe('timeline and conversations', () => {
  it('joins a thread root to its replies, keeps channel messages separate, and orders messages chronologically', () => {
    const rows = [
      message('reply', 20, {
        chat: { channelId: 'general', channelName: 'general', threadId: 'root' },
      }),
      message('channel', 15),
      message('root', 10),
    ];
    const groups = groupConversations(rows);
    expect(
      groups.map((g) => ({ thread: g.thread, ids: g.messages.map((d) => d.entry.id) })),
    ).toEqual([
      { thread: true, ids: ['root', 'reply'] },
      { thread: false, ids: ['channel'] },
    ]);
  });
  it('isolates identical room and thread IDs across sources and channels', () => {
    const other = { ...source, id: 'other-source' };
    const rows = [
      message('root', 10),
      message('other', 11, { externalId: 'root' }, other),
      message('another-room', 12, { chat: { channelId: 'another', channelName: 'another' } }),
    ];
    expect(groupConversations(rows)).toHaveLength(3);
  });
  it('preserves identical chat events while filtering messages before grouping without restoring excluded roots', () => {
    const state = initialState();
    state.connections = [{ ...source, feedId: state.feeds[0].id }];
    state.entries = [
      message('root', 10, { content: 'Muted detail' }).entry,
      message('reply', 20, {
        chat: { channelId: 'general', channelName: 'general', threadId: 'root' },
      }).entry,
      message('another', 25).entry,
    ];
    expect(evaluateFeed(state, state.feeds[0]).filter((d) => d.included)).toHaveLength(3);
    state.feeds[0].exclude = ['muted'];
    const groups = groupConversations(
      evaluateFeed(state, state.feeds[0]).filter((d) => d.included),
    );
    expect(groups.flatMap((g) => g.messages.map((d) => d.entry.id)).sort()).toEqual([
      'another',
      'reply',
    ]);
    expect(state.entries).toHaveLength(3);
  });
  it('collapses conversations without reordering a context-ranked timeline and infers older stored entry types', () => {
    const post = message('post', 30, { type: undefined }, { ...source, kind: 'bluesky' });
    const rows = [message('first', 10), post, message('second', 20)];
    const timeline = timelineItems(rows);
    expect(timeline.map((i) => i.type)).toEqual(['conversation', 'entry']);
    expect(entryType(post)).toBe('post');
    expect(entryType(message('legacy', 0, { type: undefined, chat: undefined }))).toBe('chat');
  });
});
