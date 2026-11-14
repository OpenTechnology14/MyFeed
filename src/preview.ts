import { connectionFeeds } from '../shared/model';
import {
  createFeed,
  initialState,
  LIMITS,
  feedConfigSchema,
  connectionInputSchema,
  profileSchema,
  localEditSchema,
  type State,
  type Entry,
} from '../shared/model';
import { sampleStories, sampleUpdates } from '../server/sample';

const ids = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
];
function sampleEntries(connectionId: string): Entry[] {
  return [
    ...sampleUpdates.map((s) => ({
      ...s,
      publishedAt: new Date(Date.now() - s.minutesAgo * 60000).toISOString(),
      url: '',
    })),
    ...sampleStories.map((s, i) => ({
      ...s,
      type: 'article' as const,
      externalId: `sample-${i}`,
      publishedAt: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
    })),
  ].map((s) => ({
    ...s,
    id: `${connectionId}-${s.externalId}`,
    connectionId,
    receivedAt: new Date().toISOString(),
    saved: s.externalId === 'sample-0',
    read: false,
  }));
}
export function createPreviewState(): State {
  const state = initialState();
  state.profile = { name: 'Alex Morgan', email: 'alex@example.com', theme: 'light' };
  state.feeds = ['Daily perspective', 'Design & ideas', 'Team conversations'].map((name, i) => ({
    ...createFeed(name),
    id: ids[i],
    color: (['blue', 'violet', 'green'] as const)[i],
    description: [
      'Posts, good reads, and conversations in one place.',
      'Thoughtful publishing and a little space for curiosity.',
      'The discussions you want to keep up with.',
    ][i],
    alertsEnabled: i === 0,
    alertHandles: i === 0 ? ['@alex'] : [],
    context: i === 0 ? 'Open web, independent publishing, thoughtful design, and community.' : '',
    exclude: i === 0 ? ['sponsored', 'giveaway'] : [],
  }));
  state.connections = state.feeds.map((feed, i) => ({
    id: `preview-source-${i}`,
    feedIds: [feed.id],
    background: false,
    kind: 'sample',
    name: ['Sample library', 'Sample reading', 'Sample chats'][i],
    endpoint: '',
    account: '',
    mailbox: 'INBOX',
    roomId: '',
    userId: '',
    enabled: true,
    status: 'active',
    lastSync: new Date().toISOString(),
  }));
  state.entries = state.connections.flatMap((c, i) =>
    sampleEntries(c.id).filter(
      (e) => i === 0 || (i === 1 ? e.type === 'article' : e.type === 'chat'),
    ),
  );
  const tagged = state.entries.find(
    (e) => e.connectionId === 'preview-source-0' && e.type === 'post',
  );
  if (tagged) tagged.content += '\n\n@alex — thought you would enjoy this conversation.';
  return state;
}
// Layout review edits are temporary. This module never calls the API or a provider.
export function updatePreview(
  state: State,
  path: string,
  method: string,
  input: unknown,
): State & { createdId?: string } {
  const next = structuredClone(state) as State & { createdId?: string };
  const body = input as Record<string, unknown>;
  if (path === '/profile') next.profile = profileSchema.parse(input);
  else if (path === '/feeds' && method === 'POST') {
    if (next.feeds.length >= LIMITS.feeds) throw new Error('You can create up to 5 feeds.');
    const feed = createFeed(String(body.name));
    next.feeds.push(feed);
    next.createdId = feed.id;
  } else if (/^\/feeds\/[^/]+$/.test(path)) {
    const id = path.split('/')[2];
    if (method === 'DELETE') {
      if (next.feeds.length === 1) throw new Error('Keep at least one feed.');
      next.feeds = next.feeds.filter((f) => f.id !== id);
      for (const c of next.connections) {
        c.feedIds = connectionFeeds(c).filter((f) => f !== id);
        delete c.feedId;
      }
    } else {
      const feed = next.feeds.find((f) => f.id === id);
      if (feed) Object.assign(feed, feedConfigSchema.parse(input));
    }
  } else if (path.startsWith('/entries/')) {
    const entry = next.entries.find((e) => e.id === path.split('/')[2]);
    if (entry) {
      if (typeof body.saved === 'boolean') entry.saved = body.saved;
      if (typeof body.read === 'boolean') entry.read = body.read;
      if ('localEdit' in body) {
        if (body.editVersion !== (entry.editVersion ?? 0))
          throw Error('This local copy changed. Reopen the editor.');
        if (body.localEdit === null) delete entry.localEdit;
        else
          entry.localEdit = {
            ...localEditSchema.parse(body.localEdit),
            updatedAt: new Date().toISOString(),
          };
        entry.editVersion = (entry.editVersion ?? 0) + 1;
      }
    }
  } else if (path.endsWith('/check')) {
    const connection = next.connections.find((c) => c.id === path.split('/')[2]);
    if (connection)
      connection.check = {
        at: new Date().toISOString(),
        version: connection.configVersion ?? 1,
        fetched: next.entries.filter((e) => e.connectionId === connection.id).length,
        status: 'read-succeeded',
      };
    return next;
  } else if (path.endsWith('/sync')) {
    return next;
  } else if (path === '/connections' && method === 'POST') {
    if (body.kind !== 'sample')
      throw new Error(
        'Use your local workspace to connect a live source. The preview uses sample data.',
      );
    const parsed = connectionInputSchema.parse(input);
    const feedIds = [...new Set(parsed.feedIds ?? (parsed.feedId ? [parsed.feedId] : []))];
    for (const feedId of feedIds) {
      if (!next.feeds.some((f) => f.id === feedId)) throw new Error('Feed not found.');
      if (
        next.connections.filter((c) => connectionFeeds(c).includes(feedId)).length >=
        LIMITS.connectionsPerFeed
      )
        throw new Error('Each feed accepts up to 3 connections.');
    }
    const id = crypto.randomUUID();
    next.connections.push({
      id,
      feedIds,
      background: false,
      configVersion: 1,
      kind: 'sample',
      name: String(body.name),
      endpoint: '',
      account: '',
      mailbox: 'INBOX',
      roomId: '',
      userId: '',
      enabled: true,
      status: 'active',
    });
    next.entries.push(...sampleEntries(id));
  } else if (path.startsWith('/connections/')) {
    const id = path.split('/')[2],
      connection = next.connections.find((c) => c.id === id);
    if (method === 'DELETE') {
      next.connections = next.connections.filter((c) => c.id !== id);
      next.entries = next.entries.filter((e) => e.connectionId !== id);
    } else if (connection) {
      if (body.configuration) {
        const config = connectionInputSchema
          .omit({ feedId: true, feedIds: true, kind: true })
          .parse(body.configuration);
        if (config.secret) throw new Error('Credentials cannot be configured in a preview.');
        if (body.configVersion !== (connection.configVersion ?? 1))
          throw new Error('Connection changed. Reopen the editor.');
        const { secret, ...fields } = config;
        Object.assign(connection, fields);
        connection.configVersion = (connection.configVersion ?? 1) + 1;
        delete connection.check;
      }
      if (typeof body.enabled === 'boolean') {
        connection.enabled = body.enabled;
        connection.status = body.enabled ? 'active' : 'paused';
      }
      if (typeof body.background === 'boolean') connection.background = body.background;
      if (Array.isArray(body.feedIds)) {
        const ids = [...new Set(body.feedIds as string[])];
        for (const feedId of ids) {
          if (!next.feeds.some((f) => f.id === feedId)) throw new Error('Feed not found.');
          if (
            next.connections.filter((c) => c.id !== id && connectionFeeds(c).includes(feedId))
              .length >= LIMITS.connectionsPerFeed
          )
            throw new Error('Each feed accepts up to 3 connections.');
        }
        connection.feedIds = ids;
        delete connection.feedId;
        for (const f of next.feeds) delete f.digest;
      }
    }
  } else
    throw new Error(
      'Configure providers in your local workspace. This preview does not connect accounts or run AI.',
    );
  next.revision++;
  return next;
}
