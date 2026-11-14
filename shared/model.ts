import { z } from 'zod';
import { apiSourceConfigSchema } from './api-source';
import type { PostingSettings, PostingDraft, PostReceipt } from './posting';

export const LIMITS = {
  feeds: 5,
  connectionsPerFeed: 3,
  itemsPerConnection: 300,
  postingDrafts: 50,
  postingReceipts: 100,
} as const;
export const kinds = [
  'rss',
  'mastodon',
  'bluesky',
  'youtube',
  'email',
  'rocket',
  'api',
  'sample',
] as const;
export type Kind = (typeof kinds)[number];
export const youtubeConfigSchema = z
  .object({
    source: z.enum(['channel', 'playlist', 'shorts-playlist']).default('channel'),
  })
  .strict();
export type YouTubeConfig = z.infer<typeof youtubeConfigSchema>;
export const textLimitSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('default') }),
  z.object({ mode: z.literal('words'), value: z.number().int().min(1).max(5000) }),
  z.object({ mode: z.literal('characters'), value: z.number().int().min(1).max(20000) }),
]);
export type TextLimit = z.infer<typeof textLimitSchema>;
export const feedConfigSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().max(240),
  color: z.enum(['blue', 'violet', 'green', 'orange', 'rose']),
  background: z.boolean(),
  context: z.string().max(2000),
  aiPipeline: z
    .object({
      profile: z.literal('digest').default('digest'),
      instructions: z.string().max(2000).default(''),
    })
    .default({ profile: 'digest', instructions: '' }),
  include: z.array(z.string().trim().min(1).max(80)).max(30),
  exclude: z.array(z.string().trim().min(1).max(80)).max(30),
  deduplicate: z.boolean(),
  sort: z.enum(['newest', 'relevance']),
  layout: z.enum(['cards', 'compact']),
  textLimit: textLimitSchema.default({ mode: 'default' }),
  textOverrides: z
    .object({
      post: textLimitSchema.optional(),
      article: textLimitSchema.optional(),
      chat: textLimitSchema.optional(),
    })
    .default({}),
  showMedia: z.boolean().default(true),
  mediaSize: z.enum(['small', 'normal', 'large']).default('normal'),
  fontSize: z.number().int().min(14).max(24).default(14),
  lineSpacing: z.number().min(1.2).max(2.2).default(1.7),
  readingWidth: z.enum(['full', 'medium', 'narrow']).default('full'),
  conversationPreviewCount: z.number().int().min(1).max(10).default(3),
  alertsEnabled: z.boolean().default(false),
  alertHandles: z
    .array(
      z
        .string()
        .trim()
        .regex(/^@[\p{L}\p{N}_][\p{L}\p{N}_.@-]{0,198}$/u, 'Use an @handle without spaces.'),
    )
    .max(20)
    .default([]),
});
export type FeedConfig = z.infer<typeof feedConfigSchema>;
export interface Feed extends FeedConfig {
  id: string;
  createdAt: string;
  digest?: Digest;
}
export interface Digest {
  text: string;
  createdAt: string;
  model: string;
  itemIds: string[];
  configHash: string;
}
export const connectionInputSchema = z.object({
  feedId: z.string().uuid().optional(),
  feedIds: z.array(z.string().uuid()).max(LIMITS.feeds).optional(),
  kind: z.enum(kinds),
  name: z.string().trim().min(1).max(80),
  endpoint: z.string().trim().max(500).default(''),
  account: z.string().trim().max(200).default(''),
  roomId: z.string().trim().max(120).default(''),
  userId: z.string().trim().max(120).default(''),
  mailbox: z.string().trim().max(100).default('INBOX'),
  secret: z.string().max(2000).default(''),
  api: apiSourceConfigSchema.optional(),
  youtube: youtubeConfigSchema.optional(),
});
export type ConnectionInput = z.infer<typeof connectionInputSchema>;
export interface SourceProgress {
  newestId?: string;
  oldestId?: string;
  latestAt?: string;
  oldestAt?: string;
  skyCursor?: string;
  catchupCursor?: string;
  partial?: boolean;
  uidValidity?: string;
  maxUid?: number;
  minUid?: number;
  skippedOversized?: number;
  historyComplete?: boolean;
  apiNextCursor?: string;
  youtubeCursor?: string;
  youtubeCatchupCursor?: string;
}
export interface Connection extends Omit<ConnectionInput, 'secret'> {
  posting?: PostingSettings;
  id: string;
  progress?: SourceProgress;
  syncHealth?: { failures: number; nextRetryAt?: string; lastSuccess?: string };
  configVersion?: number;
  check?: {
    at: string;
    version: number;
    fetched: number;
    status: 'read-succeeded' | 'needs-attention';
    message?: string;
  };
  background?: boolean;
  enabled: boolean;
  status: 'ready' | 'active' | 'error' | 'paused';
  lastSync?: string;
  error?: string;
  secretCipher?: string;
  hasSecret?: boolean;
}
export const localEditSchema = z
  .object({
    title: z
      .string()
      .max(500)
      .refine((text) => text.trim().length > 0, 'Title cannot be blank.'),
    content: z.string().max(100000),
  })
  .strict();
export interface Entry {
  id: string;
  connectionId: string;
  externalId: string;
  editVersion?: number;
  localEdit?: { title: string; content: string; updatedAt: string };
  title: string;
  content: string;
  author: string;
  url: string;
  publishedAt: string;
  receivedAt: string;
  tags: string[];
  image?: string;
  type?: 'article' | 'post' | 'chat' | 'email';
  authorHandle?: string;
  avatar?: string;
  media?: { url: string; alt: string }[];
  chat?: { channelId: string; channelName: string; threadId?: string };
  contentWarning?: string;
  saved: boolean;
  read: boolean;
}
export interface Decision {
  entry: Entry;
  included: boolean;
  reason: string;
  score: number;
  connection: Connection;
}
export interface Run {
  id: string;
  feedId?: string;
  connectionId?: string;
  at: string;
  fetched: number;
  added: number;
  errors: string[];
  trigger: 'manual' | 'background';
}
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.union([z.literal(''), z.string().email()]),
  theme: z.enum(['light', 'dark', 'system']),
});
export interface GenerationReceipt {
  id: string;
  feedId: string;
  at: string;
  model: string;
  status: 'submitted' | 'completed' | 'uncertain' | 'blocked';
  reservedUsd: number;
  inputTokens?: number;
  outputTokens?: number;
  message?: string;
}
export interface State {
  schemaVersion: 1;
  revision: number;
  counts?: {
    entries: number;
    saved: number;
    connections: Record<string, number>;
    feeds: Record<
      string,
      { total: number; included: number; saved: number; alerts?: number; unreadAlerts?: number }
    >;
  };
  feeds: Feed[];
  connections: Connection[];
  entries: Entry[];
  runs: Run[];
  outbound?: { drafts: PostingDraft[]; receipts: PostReceipt[] };
  profile: z.infer<typeof profileSchema>;
  ai: { model: string; secretCipher?: string; hasSecret?: boolean; receipts?: GenerationReceipt[] };
}
export function createFeed(name: string): Feed {
  return {
    id: crypto.randomUUID(),
    name,
    description: 'A little of everything, all in one place.',
    color: 'blue',
    createdAt: new Date().toISOString(),
    background: false,
    context: '',
    aiPipeline: { profile: 'digest', instructions: '' },
    include: [],
    exclude: [],
    deduplicate: true,
    sort: 'newest',
    layout: 'cards',
    textLimit: { mode: 'default' },
    textOverrides: {},
    showMedia: true,
    mediaSize: 'normal',
    fontSize: 14,
    lineSpacing: 1.7,
    readingWidth: 'full',
    conversationPreviewCount: 3,
    alertsEnabled: false,
    alertHandles: [],
  };
}
export function initialState(): State {
  return {
    schemaVersion: 1,
    revision: 0,
    feeds: [createFeed('My starter feed')],
    connections: [],
    entries: [],
    runs: [],
    profile: { name: 'Local reader', email: '', theme: 'light' },
    ai: { model: '' },
  };
}
export const PROVIDERS: Record<Kind, { name: string; description: string; color: string }> = {
  rss: { name: 'RSS & Atom', description: 'Articles, blogs, podcasts, and news.', color: 'orange' },
  mastodon: {
    name: 'Fediverse',
    description: 'Public Mastodon accounts and timelines.',
    color: 'violet',
  },
  bluesky: { name: 'Bluesky', description: 'Posts from a public social account.', color: 'blue' },
  email: { name: 'Email', description: 'Newsletters and messages via IMAP.', color: 'green' },
  rocket: { name: 'Rocket.Chat', description: 'Messages from your team channels.', color: 'rose' },
  sample: {
    name: 'Sample library',
    description: 'Example posts, conversations, and articles.',
    color: 'violet',
  },
  api: {
    name: 'API source',
    description: 'Read-only JSON feeds and external pipeline results.',
    color: 'blue',
  },
  youtube: {
    name: 'YouTube videos',
    description: 'Public channel uploads or an explicit playlist.',
    color: 'rose',
  },
};

export function connectionFeeds(connection: Pick<Connection, 'feedIds' | 'feedId'>): string[] {
  return connection.feedIds ?? (connection.feedId ? [connection.feedId] : []);
}
