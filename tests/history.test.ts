import { describe, it, expect } from 'vitest';
import { initialState, type Entry } from '../shared/model';
import { historyPage, historyQuerySchema } from '../shared/history';
import { createFeed } from '../shared/model';
function fixture(count = 95) {
  const state = initialState();
  state.connections = [
    {
      id: 'source',
      feedIds: [state.feeds[0].id],
      kind: 'sample',
      name: 'Fictional history',
      endpoint: '',
      account: '',
      userId: '',
      roomId: '',
      mailbox: 'INBOX',
      enabled: true,
      status: 'active',
    },
  ];
  state.entries = Array.from(
    { length: count },
    (_, i): Entry => ({
      id: `item-${String(i).padStart(5, '0')}`,
      externalId: String(i),
      connectionId: 'source',
      title: `Reading 🧭 ${i}`,
      content: i === 10 ? 'muted @alex' : 'Original body',
      publishedAt: new Date(Date.UTC(2026, 9, 5, 0, i)).toISOString(),
      receivedAt: '2026-10-05T00:00:00Z',
      author: 'Reader',
      url: '',
      tags: [],
      read: i % 2 === 0,
      saved: i % 3 === 0,
      type: 'post',
    }),
  );
  state.feeds[0].exclude = ['muted'];
  state.feeds[0].alertsEnabled = true;
  state.feeds[0].alertHandles = ['@alex'];
  return state;
}
describe('retained history paging', () => {
  it('uses stable boundaries and Unicode cursors; rejects a changed collection or query', () => {
    const state = fixture();
    const query = historyQuerySchema.parse({ feedId: state.feeds[0].id, q: '🧭', limit: 20 });
    const ids: string[] = [];
    let cursor: string | undefined;
    do {
      const page = historyPage(state, { ...query, cursor });
      ids.push(...page.decisions.map((d) => d.entry.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(ids).toHaveLength(94);
    expect(new Set(ids).size).toBe(94);
    expect(ids).not.toContain('item-00010');
    const first = historyPage(state, query);
    expect(() =>
      historyPage({ ...state, revision: 1 }, { ...query, cursor: first.nextCursor }),
    ).toThrow('History changed');
    expect(() =>
      historyPage(state, { ...query, q: 'different', cursor: first.nextCursor }),
    ).toThrow('History changed');
  });
  it('keeps saved originals accessible while inclusion, alerts, search and unread filters agree', () => {
    const state = fixture();
    state.entries[10].saved = true;
    state.entries[10].localEdit = {
      title: 'Innocent local copy',
      content: 'Display @invented',
      updatedAt: '2026-10-05T00:00:00Z',
    };
    const base = { feedId: state.feeds[0].id };
    expect(
      historyPage(state, historyQuerySchema.parse({ ...base, saved: 'true', q: 'muted' }))
        .decisions[0].included,
    ).toBe(false);
    expect(historyPage(state, historyQuerySchema.parse({ ...base, alerts: 'true' })).total).toBe(0);
    expect(historyPage(state, historyQuerySchema.parse({ ...base, q: 'invented' })).total).toBe(0);
    expect(
      historyPage(
        state,
        historyQuerySchema.parse({ ...base, unread: 'true', limit: 50 }),
      ).decisions.every((d) => !d.entry.read && d.included),
    ).toBe(true);
  });
  it('pages chronological conversations after all exclusions and reading filters', () => {
    const state = fixture(60);
    state.entries.forEach((entry) => {
      entry.type = 'chat';
      entry.chat = { channelId: 'room', channelName: 'Team', threadId: 'thread' };
    });
    const conversation = JSON.stringify(['source', 'room', 'thread']);
    const query = historyQuerySchema.parse({ feedId: state.feeds[0].id, conversation, limit: 20 });
    const first = historyPage(state, query),
      second = historyPage(state, { ...query, cursor: first.nextCursor });
    expect(first.total).toBe(59);
    expect(first.decisions[0].entry.id).toBe('item-00000');
    expect(second.decisions[0].entry.id).toBe('item-00021');
    expect([...first.decisions, ...second.decisions].some((d) => d.entry.id === 'item-00010')).toBe(
      false,
    );
  });
  it('bounds the history response for five feeds, fifteen sources and accumulated bookmarks', () => {
    const state = fixture(9500);
    state.feeds = Array.from({ length: 5 }, (_, i) => createFeed(`Lens ${i}`));
    state.connections = Array.from({ length: 15 }, (_, i) => ({
      ...state.connections[0],
      id: `source-${i}`,
      feedIds: [state.feeds[Math.floor(i / 3)].id],
    }));
    state.entries.forEach((entry, i) => {
      entry.connectionId = `source-${i % 15}`;
      entry.saved = i >= 4500;
      entry.content = 'Source body '.repeat(100);
    });
    const before = Buffer.byteLength(JSON.stringify(state));
    const start = performance.now();
    const page = historyPage(
      state,
      historyQuerySchema.parse({ feedId: state.feeds[0].id, limit: 30 }),
    );
    const elapsed = performance.now() - start;
    const after = Buffer.byteLength(JSON.stringify(page));
    expect(page.decisions.length).toBeLessThanOrEqual(30);
    expect(after).toBeLessThan(before / 100);
    console.log(
      `Synthetic 9500 items: full ${before} bytes; page ${after} bytes; query ${elapsed.toFixed(1)} ms (local fixture, not provider proof).`,
    );
  });
});
