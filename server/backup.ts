import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto';
import { z } from 'zod';
import { postingSettingsSchema, outboundSchema } from '../shared/posting';
import {
  feedConfigSchema,
  profileSchema,
  connectionInputSchema,
  LIMITS,
  localEditSchema,
} from '../shared/model';

const MAX_BYTES = 64 * 1024 * 1024;
const archiveSchema = z
  .object({
    format: z.literal('myfeed-backup'),
    version: z.literal(1),
    iterations: z.literal(210000),
    salt: z.string().max(100),
    iv: z.string().max(100),
    tag: z.string().max(100),
    payload: z.string().max(MAX_BYTES * 2),
  })
  .strict();
function bytes(path: string) {
  const value = readFileSync(path);
  if (value.length > MAX_BYTES) throw Error('Backup file exceeds the 64 MiB limit.');
  return value;
}
function decode(value: string, length?: number) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw Error('Invalid backup encoding.');
  const b = Buffer.from(value, 'base64');
  if (length && b.length !== length) throw Error('Invalid backup encoding.');
  return b;
}
export function validateLocalState(state: unknown, key: Buffer) {
  const timestamp = z
    .string()
    .refine((value) => Number.isFinite(Date.parse(value)), 'Invalid timestamp.');
  const progress = z.object({
    newestId: z.string().max(4000).optional(),
    oldestId: z.string().max(4000).optional(),
    latestAt: timestamp.optional(),
    oldestAt: timestamp.optional(),
    skyCursor: z.string().max(4000).optional(),
    catchupCursor: z.string().max(4000).optional(),
    partial: z.boolean().optional(),
    uidValidity: z.string().optional(),
    maxUid: z.number().int().nonnegative().optional(),
    minUid: z.number().int().nonnegative().optional(),
    skippedOversized: z.number().int().nonnegative().optional(),
    historyComplete: z.boolean().optional(),
    apiNextCursor: z.string().max(500).optional(),
    youtubeCursor: z.string().max(1000).optional(),
    youtubeCatchupCursor: z.string().max(1000).optional(),
  });
  const receipt = z.object({
    id: z.string(),
    feedId: z.string(),
    at: timestamp,
    model: z.string(),
    status: z.enum(['submitted', 'completed', 'uncertain', 'blocked']),
    reservedUsd: z.number().nonnegative(),
    inputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    message: z.string().optional(),
  });
  const entry = z
    .object({
      id: z.string(),
      connectionId: z.string(),
      externalId: z.string(),
      title: z.string(),
      content: z.string(),
      author: z.string(),
      url: z.string(),
      publishedAt: z.string(),
      receivedAt: z.string(),
      tags: z.array(z.string()),
      saved: z.boolean(),
      read: z.boolean(),
      editVersion: z.number().int().nonnegative().optional(),
      localEdit: localEditSchema.extend({ updatedAt: z.string() }).optional(),
    })
    .passthrough();
  const schema = z
    .object({
      schemaVersion: z.literal(1),
      revision: z.number().int().nonnegative(),
      feeds: z
        .array(feedConfigSchema.extend({ id: z.string().uuid(), createdAt: z.string() }))
        .min(1)
        .max(LIMITS.feeds),
      connections: z
        .array(
          connectionInputSchema
            .omit({ secret: true })
            .extend({
              id: z.string(),
              enabled: z.boolean(),
              status: z.enum(['ready', 'active', 'error', 'paused']),
              secretCipher: z.string().optional(),
              posting: postingSettingsSchema.optional(),
              configVersion: z.number().int().positive().optional(),
              progress: progress.optional(),
              syncHealth: z
                .object({
                  failures: z.number().int().nonnegative(),
                  nextRetryAt: timestamp.optional(),
                  lastSuccess: timestamp.optional(),
                })
                .optional(),
              check: z
                .object({
                  at: timestamp,
                  version: z.number().int().positive(),
                  fetched: z.number().int().nonnegative(),
                  status: z.enum(['read-succeeded', 'needs-attention']),
                  message: z.string().optional(),
                })
                .optional(),
            })
            .refine(
              (connection) => connection.kind !== 'api' || !!connection.api,
              'API sources require their mapping configuration.',
            )
            .refine(
              (connection) =>
                !connection.posting?.enabled ||
                (['rocket', 'mastodon'].includes(connection.kind) &&
                  !!connection.posting.secretCipher &&
                  (connection.kind !== 'rocket' || !!connection.posting.userId)),
              'Enabled writers require a supported provider and independent writing credentials.',
            ),
        )
        .max(10000),
      entries: z.array(entry),
      outbound: outboundSchema.optional(),
      runs: z
        .array(
          z
            .object({
              id: z.string(),
              at: z.string(),
              fetched: z.number(),
              added: z.number(),
              errors: z.array(z.string()),
              trigger: z.enum(['manual', 'background']),
            })
            .passthrough(),
        )
        .max(100),
      profile: profileSchema,
      ai: z.object({
        model: z.string(),
        secretCipher: z.string().optional(),
        receipts: z.array(receipt).max(50).optional(),
      }),
    })
    .passthrough();
  const parsed = schema.parse(state);
  if (key.length !== 32) throw Error('Backup encryption key is invalid.');
  const ids = new Set(parsed.connections.map((c) => c.id));
  if (
    ids.size !== parsed.connections.length ||
    new Set(parsed.entries.map((e) => e.id)).size !== parsed.entries.length ||
    new Set(parsed.feeds.map((f) => f.id)).size !== parsed.feeds.length
  )
    throw Error('Backup contains duplicate identities.');
  if (parsed.entries.some((e) => !ids.has(e.connectionId)))
    throw Error('Backup contains orphaned items.');
  if (
    parsed.outbound &&
    (parsed.outbound.drafts.some((draft) => !ids.has(draft.connectionId)) ||
      new Set(parsed.outbound.drafts.map((draft) => draft.id)).size !==
        parsed.outbound.drafts.length ||
      new Set(parsed.outbound.receipts.map((receipt) => receipt.id)).size !==
        parsed.outbound.receipts.length)
  )
    throw Error('Backup contains invalid outbound identities.');
  const feedIds = new Set(parsed.feeds.map((f) => f.id));
  for (const c of parsed.connections) {
    const links = c.feedIds ?? (c.feedId ? [c.feedId] : []);
    if (links.some((id) => !feedIds.has(id)) || new Set(links).size !== links.length)
      throw Error('Backup contains invalid feed links.');
  }
  for (const f of parsed.feeds)
    if (
      parsed.connections.filter((c) => (c.feedIds ?? (c.feedId ? [c.feedId] : [])).includes(f.id))
        .length > LIMITS.connectionsPerFeed
    )
      throw Error('Backup exceeds connection limits.');
  for (const encrypted of [
    ...parsed.connections.map((c) => c.secretCipher),
    ...parsed.connections.map((c) => c.posting?.secretCipher),
    parsed.ai.secretCipher,
  ].filter((s): s is string => !!s)) {
    const data = decode(encrypted);
    if (data.length < 28) throw Error('Backup credential is invalid.');
    const cipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
    cipher.setAuthTag(data.subarray(12, 28));
    Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]);
  }
}
export function createBackup(directory: string, password: string) {
  if (password.length < 12 || password.length > 500)
    throw Error('Use a backup password with 12–500 characters.');
  const store = bytes(resolve(directory, 'store.json')),
    key = bytes(resolve(directory, 'secret.key'));
  validateLocalState(JSON.parse(store.toString('utf8')), key);
  const salt = randomBytes(16),
    iv = randomBytes(12),
    derived = pbkdf2Sync(password, salt, 210000, 32, 'sha256'),
    cipher = createCipheriv('aes-256-gcm', derived, iv);
  const body = Buffer.from(
    JSON.stringify({ store: store.toString('base64'), key: key.toString('base64') }),
  );
  const payload = Buffer.concat([cipher.update(body), cipher.final()]);
  const archive = JSON.stringify({
    format: 'myfeed-backup',
    version: 1,
    iterations: 210000,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    payload: payload.toString('base64'),
  });
  if (Buffer.byteLength(archive) > MAX_BYTES)
    throw Error('Backup exceeds the 64 MiB archive limit.');
  return archive;
}
export function restoreBackup(directory: string, archive: string, password: string) {
  if (Buffer.byteLength(archive) > MAX_BYTES) throw Error('Backup exceeds the 64 MiB limit.');
  let store: Buffer, key: Buffer;
  try {
    const a = archiveSchema.parse(JSON.parse(archive));
    const derived = pbkdf2Sync(password, decode(a.salt, 16), a.iterations, 32, 'sha256'),
      cipher = createDecipheriv('aes-256-gcm', derived, decode(a.iv, 12));
    cipher.setAuthTag(decode(a.tag, 16));
    const bundle = z
      .object({ store: z.string(), key: z.string() })
      .strict()
      .parse(
        JSON.parse(
          Buffer.concat([cipher.update(decode(a.payload)), cipher.final()]).toString('utf8'),
        ),
      );
    store = decode(bundle.store);
    key = decode(bundle.key, 32);
    validateLocalState(JSON.parse(store.toString('utf8')), key);
  } catch {
    throw Error(
      'Backup validation failed. Check its version, integrity, and password. Destination was not changed.',
    );
  }
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const storePath = resolve(directory, 'store.json'),
    keyPath = resolve(directory, 'secret.key');
  const oldStore = existsSync(storePath) ? bytes(storePath) : undefined,
    oldKey = existsSync(keyPath) ? bytes(keyPath) : undefined;
  // A recovery copy is written before either live file is replaced. Never overwrite it.
  if (oldStore || oldKey) {
    const recovery = join(directory, 'recovery', `${Date.now()}-${randomBytes(4).toString('hex')}`);
    mkdirSync(recovery, { recursive: true, mode: 0o700 });
    if (oldStore) writeFileSync(join(recovery, 'store.json'), oldStore, { mode: 0o600 });
    if (oldKey) writeFileSync(join(recovery, 'secret.key'), oldKey, { mode: 0o600 });
  }
  const pending = join(directory, '.restore-pending');
  if (existsSync(pending))
    throw Error('An interrupted restore exists. Recover its paired files before restoring again.');
  mkdirSync(pending, { mode: 0o700 });
  writeFileSync(join(pending, 'store.json'), store, { mode: 0o600 });
  writeFileSync(join(pending, 'secret.key'), key, { mode: 0o600 });
  try {
    renameSync(join(pending, 'secret.key'), keyPath);
    renameSync(join(pending, 'store.json'), storePath);
    rmSync(pending, { recursive: true });
  } catch {
    if (oldKey) writeFileSync(keyPath, oldKey, { mode: 0o600 });
    else rmSync(keyPath, { force: true });
    if (oldStore) writeFileSync(storePath, oldStore, { mode: 0o600 });
    else rmSync(storePath, { force: true });
    rmSync(pending, { recursive: true, force: true });
    throw Error('Restore write failed; original files were restored.');
  }
}
export function contentExport(directory: string) {
  const state = JSON.parse(bytes(resolve(directory, 'store.json')).toString('utf8'));
  return JSON.stringify(
    {
      format: 'myfeed-content-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      feeds: state.feeds,
      entries: state.entries,
      outbound: state.outbound,
      profile: state.profile,
      connections: state.connections.map(
        (c: { id: string; kind: string; name: string; feedIds?: string[] }) => ({
          id: c.id,
          kind: c.kind,
          name: c.name,
          feedIds: c.feedIds,
        }),
      ),
      runs: state.runs,
    },
    null,
    2,
  );
}
