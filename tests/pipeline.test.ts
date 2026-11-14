import { describe, expect, it } from 'vitest';
import { initialState, type Entry } from '../shared/model';
import { canonicalUrl, evaluateFeed, mergeEntries, plainText, safeUrl } from '../shared/pipeline';
import { isPublicAddress } from '../server/network';

const entry = (overrides: Partial<Entry> = {}): Entry => ({
  id: crypto.randomUUID(),
  connectionId: 'source',
  externalId: '1',
  title: 'The open web',
  content: 'Independent publishing and open source.',
  author: 'Editor',
  url: 'https://example.com/story',
  publishedAt: '2026-10-04T10:00:00Z',
  receivedAt: '2026-10-04T10:00:00Z',
  tags: ['Technology'],
  saved: false,
  read: false,
  ...overrides,
});
function workspace(entries: Entry[]) {
  const s = initialState();
  s.connections = [
    {
      id: 'source',
      feedId: s.feeds[0].id,
      kind: 'rss',
      name: 'Articles',
      endpoint: '',
      account: '',
      mailbox: 'INBOX',
      roomId: '',
      userId: '',
      enabled: true,
      status: 'ready',
    },
  ];
  s.entries = entries;
  return s;
}
describe('feed pipeline', () => {
  it('preserves raw items, applies include-any and exclude-first, and gives an explanation', () => {
    const s = workspace([
      entry(),
      entry({
        id: '2',
        title: 'Sponsored open source',
        externalId: '2',
        url: 'https://example.com/2',
      }),
      entry({ id: '3', title: 'Gardening', content: 'Plants', externalId: '3', url: '' }),
    ]);
    s.feeds[0].include = ['open web', 'open source'];
    s.feeds[0].exclude = ['sponsored'];
    const result = evaluateFeed(s, s.feeds[0]);
    expect(result.filter((d) => d.included)).toHaveLength(1);
    expect(result.find((d) => d.entry.id === '2')?.reason).toBe('Muted keyword: sponsored');
    expect(s.entries).toHaveLength(3);
  });
  it('deduplicates across connections using canonical URLs, and supports disabling deduplication', () => {
    const s = workspace([
      entry(),
      entry({ id: '2', externalId: '2', url: 'https://example.com/story?utm_source=other#share' }),
    ]);
    expect(evaluateFeed(s, s.feeds[0]).filter((d) => d.included)).toHaveLength(1);
    s.feeds[0].deduplicate = false;
    expect(evaluateFeed(s, s.feeds[0]).filter((d) => d.included)).toHaveLength(2);
    expect(canonicalUrl('https://example.com/s?utm_source=a&category=x#b')).toBe(
      'https://example.com/s?category=x',
    );
  });
  it('ranks background context ahead of a newer irrelevant item without inventing AI processing', () => {
    const s = workspace([
      entry(),
      entry({
        id: '2',
        externalId: '2',
        title: 'Plants',
        content: 'Gardening',
        url: '',
        publishedAt: '2026-10-04T12:00:00Z',
      }),
    ]);
    s.feeds[0].context = 'independent publishing';
    s.feeds[0].sort = 'relevance';
    expect(evaluateFeed(s, s.feeds[0])[0].entry.externalId).toBe('1');
  });
  it('keeps paused-source data outside the feed', () => {
    const s = workspace([entry()]);
    s.connections[0].enabled = false;
    expect(evaluateFeed(s, s.feeds[0])[0]).toMatchObject({
      included: false,
      reason: 'Connection paused',
    });
    expect(s.entries).toHaveLength(1);
  });
  it('makes repeated ingest idempotent and preserves read and saved state', () => {
    const previous = entry({ saved: true, read: true });
    const newer = entry({ content: 'Updated content' });
    const result = mergeEntries([previous], [newer]);
    expect(result.added).toBe(0);
    expect(result.entries[0]).toMatchObject({
      id: previous.id,
      saved: true,
      read: true,
      content: 'Updated content',
    });
  });
  it('limits retained unsaved entries while preserving saved items', () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      entry({
        id: String(i),
        externalId: String(i),
        publishedAt: `2026-10-04T0${i}:00:00Z`,
        saved: i === 0,
      }),
    );
    expect(mergeEntries([], rows, 3).entries).toHaveLength(4);
  });
  it('retains the ordinary budget separately from recent bookmarks and reports only retained additions', () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      entry({
        id: String(i),
        externalId: String(i),
        publishedAt: `2026-10-04T0${i}:00:00Z`,
        saved: i >= 6,
      }),
    );
    const result = mergeEntries([], rows, 3);
    expect(result.entries.map((e) => e.externalId)).toEqual(['7', '6', '5', '4', '3']);
    expect(result.added).toBe(5);
    const older = entry({ id: 'old', externalId: 'old', publishedAt: '2026-10-03T00:00:00Z' });
    expect(mergeEntries(result.entries, [older], 3).added).toBe(0);
  });
  it('strips executable content and disallows unsafe link schemes', () => {
    expect(plainText('<script>alert(1)</script><p>Hello &amp; welcome</p>')).toBe(
      'Hello & welcome',
    );
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('https://password:secret@example.com')).toBe('');
  });
  it('rejects loopback, private, reserved, and IPv4-mapped private addresses', () => {
    [
      '127.0.0.1',
      '10.0.0.1',
      '169.254.169.254',
      '192.168.1.1',
      '::1',
      'fc00::1',
      '::ffff:127.0.0.1',
      '0.0.0.0',
      '100.64.0.1',
      '224.0.0.1',
    ].forEach((a) => expect(isPublicAddress(a), a).toBe(false));
    expect(isPublicAddress('1.1.1.1')).toBe(true);
  });
});
