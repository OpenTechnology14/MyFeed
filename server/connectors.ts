import { createHash, randomUUID } from 'node:crypto';
import Parser from 'rss-parser';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { z } from 'zod';
import type { Connection, Entry, SourceProgress } from '../shared/model';
import { plainText, safeUrl } from '../shared/pipeline';
import { fetchPublic, resolvePublicHost } from './network';
import { sampleStories, sampleUpdates } from './sample';
import { apiSourceConfigSchema, apiItems, apiValue } from '../shared/api-source';

type RawEntry = {
  externalId?: string;
  title?: string;
  content?: string;
  author?: string;
  url?: string;
  publishedAt?: string;
  tags?: string[];
  image?: string;
  type?: Entry['type'];
  authorHandle?: string;
  avatar?: string;
  media?: Entry['media'];
  chat?: Entry['chat'];
  contentWarning?: string;
};
function normalize(c: Connection, raw: RawEntry): Entry {
  const content = plainText(raw.content ?? '', true).slice(0, 12000),
    title = plainText(raw.title || content.slice(0, 120) || 'Untitled').slice(0, 300);
  const date = Date.parse(raw.publishedAt ?? '');
  return {
    id: randomUUID(),
    connectionId: c.id,
    externalId: String(
      raw.externalId ||
        raw.url ||
        createHash('sha256')
          .update(`${title}|${content}|${raw.publishedAt ?? ''}`)
          .digest('hex'),
    ),
    title,
    content,
    author: plainText(raw.author || c.name).slice(0, 200),
    url: safeUrl(raw.url ?? ''),
    publishedAt: Number.isFinite(date) ? new Date(date).toISOString() : new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    tags: (raw.tags ?? []).map((tag) => plainText(tag)).slice(0, 12),
    image: safeUrl(raw.image ?? '') || undefined,
    type:
      raw.type ||
      (c.kind === 'rocket'
        ? 'chat'
        : ['mastodon', 'bluesky'].includes(c.kind)
          ? 'post'
          : c.kind === 'email'
            ? 'email'
            : 'article'),
    authorHandle: raw.authorHandle ? plainText(raw.authorHandle).slice(0, 200) : undefined,
    avatar: safeUrl(raw.avatar ?? '') || undefined,
    media: raw.media
      ?.map((m) => ({ url: safeUrl(m.url), alt: plainText(m.alt).slice(0, 500) }))
      .filter((m) => m.url)
      .slice(0, 4),
    chat: raw.chat,
    contentWarning: raw.contentWarning ? plainText(raw.contentWarning).slice(0, 300) : undefined,
    read: false,
    saved: false,
  };
}
const statusSchema = z.object({
  id: z.string(),
  content: z.string(),
  created_at: z.string(),
  url: z.string().nullable(),
  account: z.object({
    display_name: z.string(),
    acct: z.string(),
    avatar_static: z.string().optional(),
  }),
  spoiler_text: z.string().optional(),
  sensitive: z.boolean().optional(),
  tags: z.array(z.object({ name: z.string() })).default([]),
  media_attachments: z
    .array(
      z.object({
        type: z.string(),
        preview_url: z.string().nullable(),
        url: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
      }),
    )
    .default([]),
});
const skySchema = z.object({
  cursor: z.string().max(2000).optional(),
  feed: z.array(
    z.object({
      reason: z
        .object({ indexedAt: z.string().optional(), $type: z.string().optional() })
        .passthrough()
        .optional(),
      post: z.object({
        uri: z.string(),
        indexedAt: z.string().optional(),
        author: z.object({
          handle: z.string(),
          displayName: z.string().optional(),
          avatar: z.string().optional(),
        }),
        embed: z
          .object({
            images: z
              .array(
                z.object({
                  thumb: z.string(),
                  fullsize: z.string().optional(),
                  alt: z.string().default(''),
                }),
              )
              .optional(),
          })
          .passthrough()
          .optional(),
        record: z.object({ text: z.string(), createdAt: z.string() }),
      }),
    }),
  ),
});
function skyTime(row: z.infer<typeof skySchema>['feed'][number]) {
  return row.reason?.indexedAt || row.post.indexedAt || row.post.record.createdAt;
}
function skyMarker(row: z.infer<typeof skySchema>['feed'][number]) {
  return `${row.post.uri}|${skyTime(row)}`;
}
const rocketSchema = z.object({
  messages: z.array(
    z.object({
      _id: z.string(),
      msg: z.string(),
      ts: z.string(),
      rid: z.string().optional(),
      tmid: z.string().optional(),
      u: z.object({ username: z.string().optional(), name: z.string().optional() }),
    }),
  ),
});
const youtubeChannelSchema = z.object({
  items: z
    .array(
      z.object({
        contentDetails: z.object({
          relatedPlaylists: z.object({ uploads: z.string().min(1).max(200) }),
        }),
      }),
    )
    .max(1),
});
const youtubePlaylistSchema = z.object({
  nextPageToken: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        contentDetails: z.object({ videoId: z.string().min(1).max(200) }),
        snippet: z.object({
          title: z.string().default(''),
          description: z.string().default(''),
          channelTitle: z.string().default(''),
          channelId: z.string().max(200).optional(),
          publishedAt: z.string().optional(),
          thumbnails: z
            .record(z.string(), z.object({ url: z.string(), width: z.number().optional() }))
            .default({}),
        }),
      }),
    )
    .max(50),
});
const youtubeVideosSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        contentDetails: z.object({ duration: z.string() }),
      }),
    )
    .max(50),
});

/** Converts the bounded ISO-8601 duration returned by YouTube into seconds. */
export function youtubeDurationSeconds(value: string) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return undefined;
  const hours = Number(match[1] ?? 0),
    minutes = Number(match[2] ?? 0),
    seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return Number.isSafeInteger(total) && total <= 7 * 24 * 3600 ? total : undefined;
}
function youtubeDurationLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60),
    remainder = seconds % 60;
  return [hours && `${hours}h`, minutes && `${minutes}m`, `${remainder}s`]
    .filter(Boolean)
    .join(' ');
}

export type CollectedBatch = Entry[] & { progress?: SourceProgress };
export async function fetchConnection(
  c: Connection,
  secret: string,
  options: { older?: boolean } = {},
): Promise<CollectedBatch> {
  let progress: SourceProgress | undefined;
  const previous = c.progress ?? {};
  let rows: RawEntry[];
  if (c.kind === 'sample') {
    rows = [
      ...sampleStories.map((s, i) => ({
        ...s,
        externalId: `sample-${i}`,
        publishedAt: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
      })),
      ...sampleUpdates.map((s) => ({
        ...s,
        publishedAt: new Date(Date.now() - s.minutesAgo * 60000).toISOString(),
      })),
    ];
  } else if (c.kind === 'api') {
    const config = apiSourceConfigSchema.parse(c.api);
    const headers: Record<string, string> = {};
    if (config.auth !== 'none' && !secret)
      throw new Error('API authentication needs a configured credential.');
    if (config.auth === 'bearer') headers.Authorization = `Bearer ${secret}`;
    if (config.auth === 'header') headers[config.headerName] = secret;
    rows = [];
    let cursor = options.older ? previous.apiNextCursor : undefined;
    if (options.older && !cursor) return Object.assign([], { progress: previous });
    const visited = new Set<string>();
    for (let page = 0; page < config.maxPages; page++) {
      if (cursor) visited.add(cursor);
      const url = new URL(c.endpoint);
      if (cursor) url.searchParams.set(config.cursorParameter, cursor);
      let payload: unknown;
      try {
        payload = JSON.parse(await fetchPublic(url.toString(), { headers }));
      } catch (error) {
        if (error instanceof SyntaxError) throw new Error('API response must be valid JSON.');
        throw error;
      }
      rows.push(...apiItems(payload, config));
      const next = config.nextCursorPath ? apiValue(payload, config.nextCursorPath) : undefined;
      if (next === undefined || next === null || next === '') {
        cursor = undefined;
        break;
      }
      if (typeof next !== 'string' || next.length > 500)
        throw new Error('API pagination cursor must be a string of at most 500 characters.');
      if (visited.has(next)) throw new Error('API returned a repeated pagination cursor.');
      cursor = next;
    }
    progress = { ...previous, apiNextCursor: cursor, historyComplete: !cursor, partial: false };
  } else if (c.kind === 'rss') {
    const feed = await new Parser().parseString(await fetchPublic(c.endpoint));
    rows = feed.items.slice(0, 150).map((i) => ({
      externalId: i.guid,
      title: i.title,
      content: i.contentSnippet || i.content || i.summary,
      author: i.creator || feed.title,
      url: i.link,
      publishedAt: i.isoDate || i.pubDate,
      tags: i.categories,
      image: i.enclosure?.type?.startsWith('image/') ? i.enclosure.url : undefined,
    }));
  } else if (c.kind === 'mastodon') {
    const base = new URL(c.endpoint).origin;
    const headers = secret ? { Authorization: `Bearer ${secret}` } : undefined;
    let path = '/api/v1/timelines/public?local=true&limit=40';
    if (c.account) {
      const account = z
        .object({ id: z.string() })
        .parse(
          JSON.parse(
            await fetchPublic(
              `${base}/api/v1/accounts/lookup?acct=${encodeURIComponent(c.account.replace(/^@/, ''))}`,
              { headers },
            ),
          ),
        );
      path = `/api/v1/accounts/${encodeURIComponent(account.id)}/statuses?limit=40&exclude_reblogs=true`;
    }
    const statuses: z.infer<typeof statusSchema>[] = [];
    let cursor = options.older ? previous.oldestId : undefined,
      complete = false;
    for (let page = 0; page < 3; page++) {
      const url = new URL(base + path);
      if (cursor) url.searchParams.set('max_id', cursor);
      const batch = z
        .array(statusSchema)
        .parse(JSON.parse(await fetchPublic(url.toString(), { headers })));
      statuses.push(...batch);
      if (
        !batch.length ||
        (!options.older &&
          previous.newestId &&
          (batch.some((x) => x.id === previous.newestId) ||
            (previous.latestAt &&
              batch.some((x) => Date.parse(x.created_at) <= Date.parse(previous.latestAt!))))) ||
        batch.length < 40
      ) {
        complete = true;
        break;
      }
      const next =
        page === 0 && !options.older && previous.catchupCursor
          ? previous.catchupCursor
          : batch[batch.length - 1].id;
      if (next === cursor) {
        throw Error('Source pagination did not advance. Retry or check provider support.');
      }
      cursor = next;
    }
    progress = {
      ...previous,
      oldestId:
        options.older || !previous.oldestId
          ? (statuses.at(-1)?.id ?? previous.oldestId)
          : previous.oldestId,
      newestId: options.older
        ? previous.newestId
        : complete || !previous.newestId
          ? (statuses[0]?.id ?? previous.newestId)
          : previous.newestId,
      latestAt: options.older
        ? previous.latestAt
        : complete || !previous.newestId
          ? (statuses[0]?.created_at ?? previous.latestAt)
          : previous.latestAt,
      catchupCursor:
        !options.older && !!previous.newestId && !complete ? statuses.at(-1)?.id : undefined,
      partial: !complete && (options.older || !!previous.newestId),
      historyComplete: options.older || !previous.newestId ? complete : previous.historyComplete,
    };
    rows = statuses.map((s) => ({
      externalId: s.id,
      content: s.content,
      author: s.account.display_name || s.account.acct,
      authorHandle: `@${s.account.acct}`,
      avatar: s.account.avatar_static,
      contentWarning: s.spoiler_text || (s.sensitive ? 'Sensitive content' : undefined),
      url: s.url || '',
      publishedAt: s.created_at,
      tags: s.tags.map((t) => t.name),
      image: s.media_attachments.find((m) => m.type === 'image')?.preview_url ?? undefined,
      media: s.media_attachments
        .filter((m) => m.type === 'image')
        .map((m) => ({ url: m.url || m.preview_url || '', alt: m.description || '' })),
    }));
  } else if (c.kind === 'bluesky') {
    const data: { feed: z.infer<typeof skySchema>['feed'] } = { feed: [] };
    let cursor = options.older ? previous.skyCursor : undefined,
      complete = false;
    for (let page = 0; page < 3; page++) {
      const url = new URL('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed');
      url.searchParams.set('actor', c.account);
      url.searchParams.set('limit', '40');
      url.searchParams.set('includePins', 'false');
      if (cursor) url.searchParams.set('cursor', cursor);
      const batch = skySchema.parse(JSON.parse(await fetchPublic(url.toString())));
      data.feed.push(...batch.feed);
      if (
        !batch.cursor ||
        !batch.feed.length ||
        (!options.older &&
          previous.newestId &&
          (batch.feed.some(
            (x) => skyMarker(x) === previous.newestId || x.post.uri === previous.newestId,
          ) ||
            (previous.latestAt &&
              batch.feed.some((x) => Date.parse(skyTime(x)) <= Date.parse(previous.latestAt!)))))
      ) {
        complete = true;
        cursor = batch.cursor;
        break;
      }
      const next =
        page === 0 && !options.older && previous.catchupCursor
          ? previous.catchupCursor
          : batch.cursor;
      if (next === cursor) {
        throw Error('Source pagination did not advance. Retry or check provider support.');
      }
      cursor = next;
    }
    progress = {
      ...previous,
      newestId: options.older
        ? previous.newestId
        : complete || !previous.newestId
          ? data.feed[0]
            ? skyMarker(data.feed[0])
            : previous.newestId
          : previous.newestId,
      skyCursor: options.older || !previous.skyCursor ? cursor : previous.skyCursor,
      latestAt: options.older
        ? previous.latestAt
        : complete || !previous.newestId
          ? data.feed[0]
            ? skyTime(data.feed[0])
            : previous.latestAt
          : previous.latestAt,
      catchupCursor: !options.older && !!previous.newestId && !complete ? cursor : undefined,
      partial: !complete && (options.older || !!previous.newestId),
      historyComplete:
        options.older || !previous.newestId ? complete && !cursor : previous.historyComplete,
    };
    rows = data.feed.map(({ post: p }) => ({
      externalId: p.uri,
      content: p.record.text,
      author: p.author.displayName || p.author.handle,
      authorHandle: `@${p.author.handle}`,
      avatar: p.author.avatar,
      media: p.embed?.images?.map((m) => ({ url: m.fullsize || m.thumb, alt: m.alt })),
      url: `https://bsky.app/profile/${p.author.handle}/post/${p.uri.split('/').pop()}`,
      publishedAt: p.record.createdAt,
      tags: ['Bluesky'],
    }));
  } else if (c.kind === 'youtube') {
    if (!secret)
      throw new Error('YouTube needs an API key from your enabled Google Cloud project.');
    if (!c.youtube) throw new Error('YouTube source configuration is missing. Reopen and save it.');
    let playlistId = c.account;
    if (c.youtube.source === 'channel') {
      const url = new URL('https://www.googleapis.com/youtube/v3/channels');
      url.searchParams.set('part', 'contentDetails');
      url.searchParams.set('id', c.account);
      url.searchParams.set('key', secret);
      const channel = youtubeChannelSchema.parse(JSON.parse(await fetchPublic(url.toString())));
      if (!channel.items[0])
        throw new Error('YouTube channel was not found or is not publicly readable.');
      playlistId = channel.items[0].contentDetails.relatedPlaylists.uploads;
    }
    const items: z.infer<typeof youtubePlaylistSchema>['items'] = [];
    let cursor = options.older ? previous.youtubeCursor : undefined,
      complete = false,
      caughtUp = false;
    if (options.older && !cursor) return Object.assign([], { progress: previous });
    for (let page = 0; page < 3; page++) {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      url.searchParams.set('part', 'contentDetails,snippet');
      url.searchParams.set('playlistId', playlistId);
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('key', secret);
      if (cursor) url.searchParams.set('pageToken', cursor);
      const batch = youtubePlaylistSchema.parse(JSON.parse(await fetchPublic(url.toString())));
      items.push(...batch.items);
      caughtUp =
        !options.older &&
        !!previous.newestId &&
        batch.items.some((item) => item.contentDetails.videoId === previous.newestId);
      if (!batch.nextPageToken || !batch.items.length || caughtUp) {
        complete = true;
        cursor = batch.nextPageToken;
        break;
      }
      const next =
        page === 0 && !options.older && previous.youtubeCatchupCursor
          ? previous.youtubeCatchupCursor
          : batch.nextPageToken;
      if (next === cursor)
        throw new Error('YouTube playlist pagination did not advance. Retry or check the source.');
      cursor = next;
    }
    const durations = new Map<string, number>();
    for (let start = 0; start < items.length; start += 50) {
      const ids = items.slice(start, start + 50).map((item) => item.contentDetails.videoId);
      if (!ids.length) continue;
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'contentDetails');
      url.searchParams.set('id', ids.join(','));
      url.searchParams.set('key', secret);
      const videos = youtubeVideosSchema.parse(JSON.parse(await fetchPublic(url.toString())));
      for (const video of videos.items) {
        const duration = youtubeDurationSeconds(video.contentDetails.duration);
        if (duration !== undefined) durations.set(video.id, duration);
      }
    }
    progress = {
      ...previous,
      newestId: options.older
        ? previous.newestId
        : complete || !previous.newestId
          ? (items[0]?.contentDetails.videoId ?? previous.newestId)
          : previous.newestId,
      oldestId:
        options.older || !previous.oldestId
          ? (items.at(-1)?.contentDetails.videoId ?? previous.oldestId)
          : previous.oldestId,
      youtubeCursor: options.older || !previous.youtubeCursor ? cursor : previous.youtubeCursor,
      youtubeCatchupCursor:
        !options.older && !!previous.newestId && !complete && !caughtUp ? cursor : undefined,
      partial: !complete && (options.older || !!previous.newestId),
      historyComplete:
        options.older || !previous.newestId ? complete && !cursor : previous.historyComplete,
    };
    rows = items.map((item) => {
      const id = item.contentDetails.videoId;
      const duration = durations.get(id);
      const thumbnail = Object.values(item.snippet.thumbnails)
        .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
        .at(0)?.url;
      const tags = ['YouTube'];
      if (duration !== undefined) tags.push(`Duration ${youtubeDurationLabel(duration)}`);
      if (c.youtube!.source === 'shorts-playlist') tags.push('Explicit Shorts playlist');
      else if (duration !== undefined && duration < 240)
        tags.push('Under four minutes — Shorts candidate, not verified');
      return {
        externalId: id,
        title: item.snippet.title,
        content: item.snippet.description,
        author: item.snippet.channelTitle || c.name,
        authorHandle: item.snippet.channelId ? `@${item.snippet.channelId}` : undefined,
        url: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
        publishedAt: item.snippet.publishedAt,
        image: thumbnail,
        tags,
      };
    });
  } else if (c.kind === 'rocket') {
    const base = new URL(c.endpoint).origin;
    const data: { messages: z.infer<typeof rocketSchema>['messages'] } = { messages: [] };
    let latest = options.older ? previous.oldestAt : undefined,
      complete = false;
    for (let page = 0; page < 3; page++) {
      const url = new URL(base + '/api/v1/channels.history');
      url.searchParams.set('roomId', c.roomId);
      url.searchParams.set('count', '40');
      url.searchParams.set('showThreadMessages', 'true');
      url.searchParams.set('inclusive', 'true');
      if (latest) url.searchParams.set('latest', latest);
      if (!options.older && previous.latestAt)
        url.searchParams.set(
          'oldest',
          new Date(Date.parse(previous.latestAt) - 300000).toISOString(),
        );
      const batch = rocketSchema.parse(
        JSON.parse(
          await fetchPublic(url.toString(), {
            headers: { 'X-Auth-Token': secret, 'X-User-Id': c.userId },
          }),
        ),
      );
      data.messages.push(...batch.messages);
      if (batch.messages.length < 40) {
        complete = true;
        break;
      }
      const next = batch.messages.reduce(
        (date, m) => (m.ts < date ? m.ts : date),
        batch.messages[0].ts,
      );
      if (next === latest) {
        throw Error('Source pagination did not advance. Retry or check provider support.');
      }
      latest =
        page === 0 && !options.older && previous.catchupCursor ? previous.catchupCursor : next;
    }
    const dates = data.messages.map((m) => new Date(m.ts).toISOString()).sort();
    progress = {
      ...previous,
      latestAt: options.older
        ? previous.latestAt
        : complete || !previous.latestAt
          ? (dates.at(-1) ?? previous.latestAt)
          : previous.latestAt,
      oldestAt:
        options.older || !previous.oldestAt ? (dates[0] ?? previous.oldestAt) : previous.oldestAt,
      partial: !complete && (options.older || !!previous.latestAt),
      catchupCursor: !options.older && !!previous.latestAt && !complete ? latest : undefined,
      historyComplete: options.older
        ? complete
        : !previous.latestAt
          ? complete
          : previous.historyComplete,
    };
    rows = data.messages.map((m) => ({
      externalId: m._id,
      content: m.msg,
      author: m.u.name || m.u.username,
      authorHandle: m.u.username,
      chat: { channelId: m.rid || c.roomId, channelName: c.name, threadId: m.tmid },
      publishedAt: m.ts,
      tags: ['Team chat'],
    }));
  } else {
    const host = c.endpoint.replace(/^imaps:\/\//, '').replace(/\/$/, '');
    const address = await resolvePublicHost(host);
    const client = new ImapFlow({
      host: address.address,
      port: 993,
      secure: true,
      tls: { servername: host },
      auth: { user: c.account, pass: secret },
      logger: false,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
    rows = [];
    try {
      await client.connect();
      const lock = await client.getMailboxLock(c.mailbox || 'INBOX', { readOnly: true });
      try {
        const count = client.mailbox && client.mailbox.exists;
        if (count) {
          // Fetch metadata first; never download oversized messages or change Seen flags.
          const validity = String(client.mailbox && client.mailbox.uidValidity);
          const sameMailbox = previous.uidValidity === validity;
          const lastUID = Number(client.mailbox && client.mailbox.uidNext) - 1;
          const endOlder =
            options.older && sameMailbox && previous.minUid ? previous.minUid - 1 : undefined;
          const start =
            !options.older && sameMailbox && previous.maxUid
              ? Math.max(1, previous.maxUid - 10)
              : undefined;
          const range =
            endOlder !== undefined
              ? `${Math.max(1, endOlder - 99)}:${Math.max(1, endOlder)}`
              : start
                ? `${start}:${Math.max(start, Math.min(lastUID, start + 99))}`
                : `${Math.max(1, count - 99)}:*`;
          const messages =
            endOlder === 0
              ? []
              : await client.fetchAll(
                  range,
                  { uid: true, size: true, envelope: true },
                  start || endOlder !== undefined ? { uid: true } : {},
                );
          const uids = messages.map((m) => m.uid);
          progress = {
            ...previous,
            uidValidity: validity,
            maxUid:
              options.older && sameMailbox
                ? previous.maxUid
                : start
                  ? Math.min(lastUID, start + 99)
                  : Math.max(0, ...uids),
            minUid:
              options.older && endOlder !== undefined
                ? Math.max(1, endOlder - 99)
                : !sameMailbox || !previous.minUid
                  ? Math.min(lastUID || 1, ...uids)
                  : previous.minUid,
            partial: !options.older && !!start && start + 99 < lastUID,
            historyComplete: options.older
              ? endOlder === 0 || (endOlder !== undefined && endOlder <= 100)
              : !sameMailbox
                ? count <= 100
                : previous.historyComplete,
            skippedOversized: messages.filter((m) => (m.size ?? 0) > 1000000).length,
          };
          for (const m of messages) {
            if ((m.size ?? 0) > 1_000_000) continue;
            const full = await client.fetchOne(m.uid, { source: true }, { uid: true });
            if (!full || !full.source) continue;
            const mail = await simpleParser(full.source, {
              skipHtmlToText: false,
              skipImageLinks: true,
            });
            rows.push({
              externalId: `${client.mailbox && client.mailbox.uidValidity}:${m.uid}`,
              title: mail.subject,
              content: mail.text || '',
              author: mail.from?.text,
              publishedAt: mail.date?.toISOString(),
              tags: ['Email'],
            });
          }
        } else {
          const validity = String(client.mailbox && client.mailbox.uidValidity);
          progress = {
            ...previous,
            uidValidity: validity,
            maxUid: previous.uidValidity === validity ? previous.maxUid : 0,
            minUid: 0,
            partial: false,
            historyComplete: true,
            skippedOversized: 0,
          };
        }
      } finally {
        lock.release();
      }
    } finally {
      try {
        await client.logout();
      } catch {
        client.close();
      }
    }
  }
  const entries = rows.map((row) => normalize(c, row));
  if (!progress)
    progress = {
      ...previous,
      latestAt:
        entries
          .map((e) => e.publishedAt)
          .sort()
          .at(-1) ?? previous.latestAt,
      oldestAt: entries.map((e) => e.publishedAt).sort()[0] ?? previous.oldestAt,
      partial: c.kind === 'rss' ? rows.length >= 150 : false,
    };
  return Object.assign(entries, { progress });
}
