import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Connection } from '../shared/model';
vi.mock('../server/network', () => ({ fetchPublic: vi.fn(), resolvePublicHost: vi.fn() }));
import { fetchConnection } from '../server/connectors';
import { fetchPublic } from '../server/network';
const fetchMock = vi.mocked(fetchPublic);
const source: Connection = {
  id: 'source',
  feedId: 'feed',
  kind: 'rocket',
  name: 'General',
  endpoint: 'https://chat.example.com',
  account: '',
  roomId: 'room',
  userId: 'user',
  mailbox: 'INBOX',
  enabled: true,
  status: 'active',
};
describe('social and conversation normalization (mocked upstream)', () => {
  beforeEach(() => vi.clearAllMocks());
  it('requests Rocket.Chat replies and retains room, thread, author, and message paragraphs', async () => {
    fetchMock.mockResolvedValue(
      JSON.stringify({
        messages: [
          {
            _id: 'reply',
            rid: 'room',
            tmid: 'root',
            msg: 'First line\n\nSecond line',
            ts: '2026-10-04T10:00:00Z',
            u: { name: 'Sam', username: 'sam' },
          },
        ],
      }),
    );
    const [entry] = await fetchConnection(source, 'test-token');
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('showThreadMessages')).toBe('true');
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
      'X-Auth-Token': 'test-token',
      'X-User-Id': 'user',
    });
    expect(entry).toMatchObject({
      type: 'chat',
      content: 'First line\n\nSecond line',
      author: 'Sam',
      authorHandle: 'sam',
      chat: { channelId: 'room', channelName: 'General', threadId: 'root' },
    });
  });
  it('retains Mastodon image descriptions and warnings while stripping remote HTML and unsafe media URLs', async () => {
    fetchMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'status',
          content: '<p>Hello</p><p>World<script>bad()</script></p>',
          created_at: '2026-10-04T10:00:00Z',
          url: 'https://social.example.com/status',
          account: {
            display_name: 'Maya',
            acct: 'maya',
            avatar_static: 'https://social.example.com/avatar.png',
          },
          spoiler_text: 'Spoiler',
          tags: [],
          media_attachments: [
            {
              type: 'image',
              preview_url: 'https://social.example.com/thumb.png',
              url: 'https://social.example.com/full.png',
              description: 'A garden',
            },
            { type: 'image', preview_url: null, url: 'javascript:alert(1)', description: 'Unsafe' },
          ],
        },
      ]),
    );
    const [entry] = await fetchConnection(
      { ...source, kind: 'mastodon', endpoint: 'https://social.example.com' },
      '',
    );
    expect(entry).toMatchObject({
      type: 'post',
      content: 'Hello\nWorld',
      authorHandle: '@maya',
      contentWarning: 'Spoiler',
      avatar: 'https://social.example.com/avatar.png',
      media: [{ url: 'https://social.example.com/full.png', alt: 'A garden' }],
    });
  });
  it('retains Bluesky author identity and image embeds with alt text', async () => {
    fetchMock.mockResolvedValue(
      JSON.stringify({
        feed: [
          {
            post: {
              uri: 'at://did:plc:test/app.bsky.feed.post/id',
              author: {
                handle: 'reader.example',
                displayName: 'Reader',
                avatar: 'https://cdn.example.com/avatar.jpg',
              },
              record: { text: 'A photo\n\nSome context', createdAt: '2026-10-04T10:00:00Z' },
              embed: {
                $type: 'app.bsky.embed.images#view',
                images: [
                  {
                    thumb: 'https://cdn.example.com/thumb.jpg',
                    fullsize: 'https://cdn.example.com/photo.jpg',
                    alt: 'An open book',
                  },
                ],
              },
            },
          },
        ],
      }),
    );
    const [entry] = await fetchConnection(
      { ...source, kind: 'bluesky', account: 'reader.example' },
      '',
    );
    expect(entry).toMatchObject({
      type: 'post',
      authorHandle: '@reader.example',
      content: 'A photo\n\nSome context',
      media: [{ url: 'https://cdn.example.com/photo.jpg', alt: 'An open book' }],
      url: 'https://bsky.app/profile/reader.example/post/id',
    });
  });
  it('collects public YouTube channel-upload metadata with canonical links and honest Shorts candidates', async () => {
    fetchMock
      .mockResolvedValueOnce(
        JSON.stringify({
          items: [{ contentDetails: { relatedPlaylists: { uploads: 'uploads' } } }],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          items: [
            {
              contentDetails: { videoId: 'video-id' },
              snippet: {
                title: 'A short video',
                description: 'Original description',
                channelTitle: 'Video maker',
                channelId: 'channel-id',
                publishedAt: '2026-10-04T10:00:00Z',
                thumbnails: {
                  low: { url: 'https://img.example/low.jpg', width: 120 },
                  high: { url: 'https://img.example/high.jpg', width: 480 },
                },
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({ items: [{ id: 'video-id', contentDetails: { duration: 'PT3M59S' } }] }),
      );
    const [entry] = await fetchConnection(
      {
        ...source,
        kind: 'youtube',
        account: 'channel-id',
        youtube: { source: 'channel' },
      },
      'test-api-key',
    );
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe('/youtube/v3/channels');
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('playlistId')).toBe('uploads');
    expect(entry).toMatchObject({
      externalId: 'video-id',
      title: 'A short video',
      author: 'Video maker',
      authorHandle: '@channel-id',
      image: 'https://img.example/high.jpg',
      url: 'https://www.youtube.com/watch?v=video-id',
    });
    expect(entry.tags).toContain('Under four minutes — Shorts candidate, not verified');
    expect(entry.tags).not.toContain('Shorts');
  });
  it('labels an explicitly selected Shorts playlist without inferring it from duration', async () => {
    fetchMock
      .mockResolvedValueOnce(
        JSON.stringify({
          items: [
            {
              contentDetails: { videoId: 'video-id' },
              snippet: {
                title: 'Playlist entry',
                description: '',
                channelTitle: 'Maker',
                thumbnails: {},
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({ items: [{ id: 'video-id', contentDetails: { duration: 'PT10M' } }] }),
      );
    const [entry] = await fetchConnection(
      {
        ...source,
        kind: 'youtube',
        account: 'playlist-id',
        youtube: { source: 'shorts-playlist' },
      },
      'test-api-key',
    );
    expect(entry.tags).toContain('Explicit Shorts playlist');
    expect(entry.tags).not.toContain('Under four minutes — Shorts candidate, not verified');
  });
});

describe('bounded cursor collection', () => {
  beforeEach(() => fetchMock.mockReset());
  const status = (id: string) => ({
    id,
    content: 'Original ' + id,
    created_at: '2026-10-04T10:00:00Z',
    url: 'https://social.example.com/status/' + id,
    account: { acct: 'reader', display_name: 'Reader' },
    tags: [],
    media_attachments: [],
  });
  it('continues a Mastodon catch-up after the latest page and leaves the supplied checkpoint unchanged', async () => {
    const progress = { newestId: 'old', oldestId: 'older', catchupCursor: 'resume', partial: true };
    const c = { ...source, kind: 'mastodon' as const, progress };
    fetchMock.mockResolvedValueOnce(
      JSON.stringify(Array.from({ length: 40 }, (_, i) => status('fresh-' + i))),
    );
    fetchMock.mockResolvedValueOnce(JSON.stringify([status('caught-up'), status('old')]));
    const rows = await fetchConnection(c, '');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('max_id')).toBe('resume');
    expect(rows.progress).toMatchObject({ newestId: 'fresh-0', oldestId: 'older', partial: false });
    expect(rows.progress?.catchupCursor).toBeUndefined();
    expect(c.progress).toEqual(progress);
  });
  it('sets an initial bounded high-water mark without scheduling old history as catch-up', async () => {
    const c = { ...source, kind: 'mastodon' as const };
    for (let page = 0; page < 3; page++) {
      fetchMock.mockResolvedValueOnce(
        JSON.stringify(Array.from({ length: 40 }, (_, i) => status(`page-${page}-${i}`))),
      );
    }
    const first = await fetchConnection(c, '');
    expect(first).toHaveLength(120);
    expect(first.progress).toMatchObject({
      newestId: 'page-0-0',
      oldestId: 'page-2-39',
      partial: false,
      historyComplete: false,
    });
    expect(first.progress?.catchupCursor).toBeUndefined();
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(JSON.stringify([status('page-0-0'), status('page-0-1')]));
    const refreshed = await fetchConnection({ ...c, progress: first.progress }, '');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refreshed.progress).toMatchObject({
      newestId: 'page-0-0',
      oldestId: 'page-2-39',
      partial: false,
      historyComplete: false,
    });
  });
  it('fails without advancing the checkpoint when a later provider page fails', async () => {
    const c = { ...source, kind: 'mastodon' as const, progress: { newestId: 'old' } };
    fetchMock.mockResolvedValueOnce(
      JSON.stringify(Array.from({ length: 40 }, (_, i) => status('fresh-' + i))),
    );
    fetchMock.mockRejectedValueOnce(Error('timeout'));
    await expect(fetchConnection(c, '')).rejects.toThrow('timeout');
    expect(c.progress).toEqual({ newestId: 'old' });
  });
  it('requests older Rocket.Chat history and preserves the latest checkpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      JSON.stringify({
        messages: [
          {
            _id: 'older',
            msg: 'Older message',
            ts: '2026-10-03T10:00:00Z',
            u: { username: 'sam' },
          },
        ],
      }),
    );
    const rows = await fetchConnection(
      {
        ...source,
        progress: { latestAt: '2026-10-04T10:00:00Z', oldestAt: '2026-10-04T09:00:00Z' },
      },
      'test-token',
      { older: true },
    );
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('latest')).toBe('2026-10-04T09:00:00Z');
    expect(url.searchParams.has('oldest')).toBe(false);
    expect(rows.progress).toMatchObject({
      latestAt: '2026-10-04T10:00:00Z',
      oldestAt: '2026-10-03T10:00:00.000Z',
      historyComplete: true,
    });
  });
  it('uses the saved YouTube playlist page for older collection and preserves the newest video', async () => {
    fetchMock
      .mockResolvedValueOnce(
        JSON.stringify({
          items: [
            {
              contentDetails: { videoId: 'older-video' },
              snippet: { title: 'Older', description: '', channelTitle: 'Maker', thumbnails: {} },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({ items: [{ id: 'older-video', contentDetails: { duration: 'PT5M' } }] }),
      );
    const rows = await fetchConnection(
      {
        ...source,
        kind: 'youtube',
        account: 'playlist-id',
        youtube: { source: 'playlist' },
        progress: { newestId: 'newest-video', oldestId: 'old', youtubeCursor: 'next-page' },
      },
      'test-api-key',
      { older: true },
    );
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('pageToken')).toBe('next-page');
    expect(rows.progress).toMatchObject({
      newestId: 'newest-video',
      oldestId: 'older-video',
      historyComplete: true,
    });
  });
});

describe('YouTube refresh checkpoints', () => {
  beforeEach(() => fetchMock.mockReset());
  const c: Connection = {
    ...source,
    kind: 'youtube',
    account: 'playlist',
    youtube: { source: 'playlist' },
  };
  const item = (id: string) => ({
    contentDetails: { videoId: id },
    snippet: { title: id, description: '', channelTitle: 'Maker', thumbnails: {} },
  });
  const page = (ids: string[], nextPageToken?: string) =>
    JSON.stringify({ items: ids.map(item), nextPageToken });
  const videos = JSON.stringify({ items: [] });

  it('keeps initial older pages explicit instead of scheduling automatic historical catch-up', async () => {
    fetchMock
      .mockResolvedValueOnce(page(['newest'], 'p1'))
      .mockResolvedValueOnce(page(['middle'], 'p2'))
      .mockResolvedValueOnce(page(['oldest'], 'p3'))
      .mockResolvedValueOnce(videos);
    const rows = await fetchConnection(c, 'fixture-key');
    expect(rows.progress).toMatchObject({
      newestId: 'newest',
      oldestId: 'oldest',
      youtubeCursor: 'p3',
      historyComplete: false,
      partial: false,
    });
    expect(rows.progress?.youtubeCatchupCursor).toBeUndefined();
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(page(['fresh', 'newest'], 'p1')).mockResolvedValueOnce(videos);
    const refreshed = await fetchConnection({ ...c, progress: rows.progress }, 'fixture-key');
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.has('pageToken')).toBe(false);
    expect(refreshed.progress).toMatchObject({
      newestId: 'fresh',
      youtubeCursor: 'p3',
      oldestId: 'oldest',
      historyComplete: false,
    });
  });

  it('reads the current first page before resuming catch-up and commits the high-water mark only on completion', async () => {
    const progress = {
      newestId: 'boundary',
      oldestId: 'historical',
      youtubeCursor: 'older',
      youtubeCatchupCursor: 'resume',
    };
    fetchMock
      .mockResolvedValueOnce(page(['latest'], 'first-next'))
      .mockResolvedValueOnce(page(['pending'], 'resume-next'))
      .mockResolvedValueOnce(page(['pending2'], 'continue'))
      .mockResolvedValueOnce(videos);
    const partial = await fetchConnection({ ...c, progress }, 'fixture-key');
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.has('pageToken')).toBe(false);
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('pageToken')).toBe('resume');
    expect(partial.progress).toMatchObject({
      newestId: 'boundary',
      youtubeCatchupCursor: 'continue',
      partial: true,
    });
    expect(progress.newestId).toBe('boundary');
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(page(['newest-now'], 'first-next'))
      .mockResolvedValueOnce(page(['final', 'boundary'], 'history'))
      .mockResolvedValueOnce(videos);
    const complete = await fetchConnection({ ...c, progress: partial.progress }, 'fixture-key');
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('pageToken')).toBe('continue');
    expect(complete.progress).toMatchObject({
      newestId: 'newest-now',
      oldestId: 'historical',
      youtubeCursor: 'older',
      partial: false,
    });
    expect(complete.progress?.youtubeCatchupCursor).toBeUndefined();
  });

  it('preserves supplied checkpoints when pagination or duration lookup fails', async () => {
    const progress = {
      newestId: 'boundary',
      youtubeCatchupCursor: 'resume',
      youtubeCursor: 'history',
    };
    fetchMock
      .mockResolvedValueOnce(page(['latest'], 'next'))
      .mockRejectedValueOnce(Error('timeout'));
    await expect(fetchConnection({ ...c, progress }, 'fixture-key')).rejects.toThrow('timeout');
    expect(progress).toEqual({
      newestId: 'boundary',
      youtubeCatchupCursor: 'resume',
      youtubeCursor: 'history',
    });
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(page(['latest', 'boundary']))
      .mockRejectedValueOnce(Error('quota'));
    await expect(fetchConnection({ ...c, progress }, 'fixture-key')).rejects.toThrow('quota');
    expect(progress.newestId).toBe('boundary');
  });
});
