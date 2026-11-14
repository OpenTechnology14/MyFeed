import { mentionAlerts } from '../shared/alerts';
import { historyPage, historyQuerySchema } from '../shared/history';
import {
  generationOptionsSchema,
  generationInput,
  generationReviewItems,
  pipelineInstructions,
  reservedCost,
} from '../shared/generation';
import { localEditSchema } from '../shared/model';
import express, { type RequestHandler, type ErrorRequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  LIMITS,
  connectionFeeds,
  type Run,
  createFeed,
  connectionInputSchema,
  feedConfigSchema,
  profileSchema,
  type Feed,
  type ConnectionInput,
} from '../shared/model';
import { evaluateFeed, mergeEntries, feedFingerprint } from '../shared/pipeline';
import { fetchConnection } from './connectors';
import { fetchPublic } from './network';
import type { Store } from './store';
import { createPostingHandlers } from './posting-routes';
import { validatedTestSession, TEST_SESSION_HEADER } from './test-session';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function createApp(store: Store, connector = fetchConnection) {
  const testSession = validatedTestSession(store.directory);
  const app = express();
  app.disable('x-powered-by');
  const syncs = new Map<string, Promise<void>>(),
    digests = new Set<string>();
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      const supplied = req.get(TEST_SESSION_HEADER);
      if ((testSession && supplied !== testSession) || (!testSession && supplied))
        return res.status(403).json({
          error:
            'Browser-test session does not match this API. Stop the normal server and use the isolated test workspace.',
        });
      if (testSession) res.setHeader(TEST_SESSION_HEADER, testSession);
    }
    const host = req.headers.host?.split(':')[0];
    if (!['127.0.0.1', 'localhost'].includes(host ?? ''))
      return res.status(403).json({ error: 'MyFeed is a local workspace.' });
    if (req.headers.origin) {
      try {
        const origin = new URL(req.headers.origin);
        if (
          ![
            'http://127.0.0.1:5188',
            'http://localhost:5188',
            'http://127.0.0.1:3188',
            'http://localhost:3188',
          ].includes(origin.origin)
        )
          throw new Error();
      } catch {
        return res.status(403).json({ error: 'Cross-origin access is blocked.' });
      }
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (
      req.path.startsWith('/api') &&
      ['POST', 'PUT', 'PATCH'].includes(req.method) &&
      !req.is('application/json')
    )
      return res.status(415).json({ error: 'Send application/json.' });
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  const wrap =
    (fn: RequestHandler): RequestHandler =>
    (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  function feed(id: string) {
    const value = store.read().feeds.find((f) => f.id === id);
    if (!value) throw new ApiError(404, 'Feed not found.');
    return value;
  }
  function checkRevision(value: unknown) {
    if (value !== store.read().revision)
      throw new ApiError(409, 'This workspace changed. Refresh and apply your edit again.');
  }

  const sourceEpochs = new Map<string, number>();
  function publicState(req: express.Request) {
    const state = store.public();
    if (req.get('X-MyFeed-Summary') !== '1') return state;
    const counts = {
      entries: state.entries.length,
      saved: state.entries.filter((e) => e.saved).length,
      connections: Object.fromEntries(
        state.connections.map((c) => [
          c.id,
          state.entries.filter((e) => e.connectionId === c.id).length,
        ]),
      ),
      feeds: Object.fromEntries(
        state.feeds.map((f) => {
          const rows = evaluateFeed(state, f);
          return [
            f.id,
            {
              total: rows.length,
              included: rows.filter((d) => d.included).length,
              saved: rows.filter((d) => d.entry.saved).length,
              alerts: mentionAlerts(rows, f).length,
              unreadAlerts: mentionAlerts(rows, f).filter((d) => !d.entry.read).length,
            },
          ];
        }),
      ),
    };
    return { ...state, entries: [], counts };
  }
  app.get(
    '/api/history',
    wrap((req, res) => {
      const query = historyQuerySchema.parse(req.query);
      try {
        res.json(historyPage(store.public(), query));
      } catch (error) {
        throw new ApiError(
          error instanceof Error && error.message.includes('changed') ? 409 : 400,
          error instanceof Error ? error.message : 'History query failed.',
        );
      }
    }),
  );
  app.get(
    '/api/feeds/:id/digest-plan',
    wrap((req, res) => {
      const limits = z
        .object({
          maxItems: z.coerce.number().int().min(1).max(20).default(20),
          charactersPerItem: z.coerce.number().int().min(100).max(2000).default(2000),
        })
        .strict()
        .parse(req.query);
      const f = feed(req.params.id);
      const plan = generationInput(store.public(), f, limits);
      res.json({
        revision: store.read().revision,
        items: generationReviewItems(plan.items, limits.charactersPerItem),
        context: f.context,
        model: store.read().ai.model,
        instructions: pipelineInstructions(f),
      });
    }),
  );
  const sourceSyncs = new Map<string, Promise<Run>>();
  const sourceSyncContext = new Map<string, { version: number; older: boolean }>();
  async function runConnection(
    id: string,
    trigger: 'manual' | 'background',
    older = false,
  ): Promise<Run> {
    const c = store.read().connections.find((c) => c.id === id);
    if (!c) throw new ApiError(404, 'Connection not found.');
    if (sourceSyncs.has(id)) {
      const context = sourceSyncContext.get(id);
      const pending = sourceSyncs.get(id)!;
      if (context?.version !== (c.configVersion ?? 1) || context?.older !== older) {
        await pending;
        return runConnection(id, trigger, older);
      }
      return pending;
    }
    const epoch = sourceEpochs.get(id) ?? 0;
    const currentSource = () =>
      (sourceEpochs.get(id) ?? 0) === epoch &&
      store.read().connections.some((s) => s.id === id && s.enabled);
    const task = (async () => {
      const run: Run = {
        id: randomUUID(),
        connectionId: id,
        at: new Date().toISOString(),
        fetched: 0,
        added: 0,
        errors: [],
        trigger,
      };
      if (!c.enabled) return run;
      try {
        const items = await connector(c, store.decrypt(c.secretCipher), { older });
        if (!currentSource()) return run;
        store.update((s) => {
          const result = mergeEntries(s.entries, items, LIMITS.itemsPerConnection);
          s.entries = result.entries;
          run.fetched = items.length;
          run.added = result.added;
          const current = s.connections.find((x) => x.id === id)!;
          if ('progress' in items && items.progress) current.progress = items.progress;
          current.syncHealth = { failures: 0, lastSuccess: new Date().toISOString() };
          current.status = 'active';
          current.lastSync = new Date().toISOString();
          delete current.error;
        });
      } catch (error) {
        const message =
          error instanceof z.ZodError
            ? 'Source returned an unexpected data format.'
            : error instanceof Error &&
                /^(Use |Source |Authenticated |Too many)/.test(error.message)
              ? error.message
              : 'Could not read this source. Check its address, permissions, and credentials, then retry.';
        run.errors.push(`${c.name}: ${message}`);
        if (currentSource())
          store.update((s) => {
            const current = s.connections.find((x) => x.id === id)!;
            current.status = 'error';
            current.error = message;
            const failures = (current.syncHealth?.failures ?? 0) + 1;
            current.syncHealth = {
              ...current.syncHealth,
              failures,
              nextRetryAt: new Date(
                Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(6, failures - 1)),
              ).toISOString(),
            };
          });
      }
      if (currentSource())
        store.update((s) => {
          s.runs = [run, ...s.runs].slice(0, 100);
        });
      return run;
    })();
    sourceSyncs.set(id, task);
    sourceSyncContext.set(id, { version: c.configVersion ?? 1, older });
    try {
      return await task;
    } finally {
      sourceSyncs.delete(id);
      sourceSyncContext.delete(id);
    }
  }
  async function runSync(id: string, trigger: 'manual' | 'background') {
    feed(id);
    if (syncs.has(id)) return syncs.get(id)!;
    const task = (async () => {
      const sources = store
        .read()
        .connections.filter((c) => connectionFeeds(c).includes(id) && c.enabled);
      const results = await Promise.all(sources.map((c) => runConnection(c.id, trigger)));
      if (store.read().feeds.some((f) => f.id === id))
        store.update((s) => {
          s.runs = [
            {
              id: randomUUID(),
              feedId: id,
              at: new Date().toISOString(),
              fetched: results.reduce((n, r) => n + r.fetched, 0),
              added: results.reduce((n, r) => n + r.added, 0),
              errors: results.flatMap((r) => r.errors),
              trigger,
            },
            ...s.runs,
          ].slice(0, 100);
        });
    })();
    syncs.set(id, task);
    try {
      await task;
    } finally {
      syncs.delete(id);
    }
  }
  function validateLinks(ids: string[], except?: string) {
    for (const id of ids) {
      feed(id);
      if (
        store.read().connections.filter((c) => c.id !== except && connectionFeeds(c).includes(id))
          .length >= LIMITS.connectionsPerFeed
      )
        throw new ApiError(409, 'This feed has the maximum of 3 connections.');
    }
  }
  function validateConnection(input: Omit<ConnectionInput, 'secret'>, secret: string) {
    if (/\r|\n/.test(secret)) throw new ApiError(400, 'Credentials must not contain newlines.');
    if (['rss', 'mastodon', 'rocket', 'api'].includes(input.kind)) {
      let url: URL;
      try {
        url = new URL(input.endpoint);
      } catch {
        throw new ApiError(400, 'Enter a complete HTTPS source URL.');
      }
      if (url.protocol !== 'https:' || url.username || url.password)
        throw new ApiError(400, 'Enter an HTTPS URL without embedded credentials.');
    }
    if (input.kind === 'api') {
      if (!input.api) throw new ApiError(400, 'Configure the API item field mappings.');
      const url = new URL(input.endpoint);
      if (url.port && url.port !== '443') throw new ApiError(400, 'Use the standard HTTPS port.');
      if (
        [...url.searchParams.keys()].some((key) =>
          /^(key|api[-_]?key|token|access[-_]?token|auth|secret|password)$/i.test(key),
        )
      )
        throw new ApiError(
          400,
          'Keep API credentials in the encrypted credential field, not the URL.',
        );
      if (input.api.auth !== 'none' && !secret)
        throw new ApiError(400, 'API authentication requires a credential.');
    }
    if (input.kind === 'bluesky' && !input.account)
      throw new ApiError(400, 'Enter a Bluesky handle.');
    if (input.kind === 'youtube') {
      if (!input.youtube) throw new ApiError(400, 'Choose a YouTube channel or playlist source.');
      if (!input.account)
        throw new ApiError(400, 'Enter a public YouTube channel ID or playlist ID.');
      if (!secret)
        throw new ApiError(400, 'YouTube requires an API key from your enabled project.');
    }
    if (input.kind === 'email' && (!input.endpoint || !input.account || !secret))
      throw new ApiError(400, 'Email requires an IMAP hostname, account, and app password.');
    if (input.kind === 'rocket' && (!input.roomId || !input.userId || !secret))
      throw new ApiError(400, 'Rocket.Chat requires a channel ID, user ID, and access token.');
  }
  app.get('/api/state', (req, res) => res.json(publicState(req)));
  app.post(
    '/api/feeds',
    wrap((req, res) => {
      const { name } = z.object({ name: z.string().trim().min(1).max(60) }).parse(req.body);
      if (store.read().feeds.length >= LIMITS.feeds)
        throw new ApiError(409, 'You have reached the limit of 5 feeds.');
      const created = createFeed(name);
      store.update((s) => {
        s.feeds.push(created);
      });
      res.status(201).json({ ...publicState(req), createdId: created.id });
    }),
  );
  app.patch(
    '/api/feeds/:id',
    wrap((req, res) => {
      feed(req.params.id);
      const { revision, ...raw } = req.body;
      checkRevision(revision);
      const config = feedConfigSchema.parse(raw);
      store.update((s) => {
        Object.assign(s.feeds.find((f) => f.id === req.params.id)!, config);
      });
      res.json(publicState(req));
    }),
  );
  app.delete(
    '/api/feeds/:id',
    wrap((req, res) => {
      feed(req.params.id);
      if (store.read().feeds.length <= 1)
        throw new ApiError(409, 'Keep at least one feed in your workspace.');
      store.update((s) => {
        s.feeds = s.feeds.filter((f) => f.id !== req.params.id);
        for (const c of s.connections) {
          c.feedIds = connectionFeeds(c).filter((id) => id !== req.params.id);
          delete c.feedId;
        }
        s.runs = s.runs.filter((r) => r.feedId !== req.params.id);
      });
      res.json(publicState(req));
    }),
  );
  app.post(
    '/api/connections',
    wrap((req, res) => {
      const { secret, ...input } = connectionInputSchema.parse(req.body);
      const feedIds = [...new Set(input.feedIds ?? (input.feedId ? [input.feedId] : []))];
      validateLinks(feedIds);
      delete input.feedId;
      validateConnection(input, secret);
      store.update((s) => {
        s.connections.push({
          ...input,
          feedIds,
          background: false,
          configVersion: 1,
          id: randomUUID(),
          enabled: true,
          status: 'ready',
          secretCipher: secret ? store.encrypt(secret) : undefined,
        });
      });
      res.status(201).json(publicState(req));
    }),
  );
  app.patch(
    '/api/connections/:id',
    wrap((req, res) => {
      const { enabled, background, feedIds, configuration, configVersion, resetItems } = z
        .object({
          configuration: connectionInputSchema
            .omit({ feedId: true, feedIds: true, kind: true })
            .optional(),
          configVersion: z.number().int().positive().optional(),
          resetItems: z.boolean().optional(),
          enabled: z.boolean().optional(),
          background: z.boolean().optional(),
          feedIds: z.array(z.string().uuid()).max(LIMITS.feeds).optional(),
        })
        .strict()
        .parse(req.body);
      if (!store.read().connections.some((c) => c.id === req.params.id))
        throw new ApiError(404, 'Connection not found.');
      const existing = store.read().connections.find((c) => c.id === req.params.id)!;
      if (configuration) {
        if (configVersion !== (existing.configVersion ?? 1))
          throw new ApiError(
            409,
            'This connection changed. Reopen the editor to use its current configuration.',
          );
        const changedIdentity =
          ['endpoint', 'account', 'roomId', 'userId', 'mailbox'].some(
            (k) =>
              configuration[k as keyof typeof configuration] !==
              existing[k as keyof typeof existing],
          ) ||
          (existing.kind === 'api' &&
            JSON.stringify(configuration.api) !== JSON.stringify(existing.api)) ||
          (existing.kind === 'youtube' &&
            JSON.stringify(configuration.youtube) !== JSON.stringify(existing.youtube));
        if (changedIdentity && !resetItems)
          throw new ApiError(
            409,
            'Changing the account or source address requires an explicit reset of this connection’s collected data.',
          );
        validateConnection(
          { ...configuration, kind: existing.kind },
          configuration.secret || store.decrypt(existing.secretCipher),
        );
      }
      if (enabled !== undefined || configuration)
        sourceEpochs.set(req.params.id, (sourceEpochs.get(req.params.id) ?? 0) + 1);
      if (feedIds) validateLinks([...new Set(feedIds)], req.params.id);
      store.update((s) => {
        const c = s.connections.find((c) => c.id === req.params.id)!;
        if (configuration) {
          const { secret, ...config } = configuration;
          Object.assign(c, config);
          if (secret) c.secretCipher = store.encrypt(secret);
          c.configVersion = (c.configVersion ?? 1) + 1;
          if (c.posting) {
            c.posting.enabled = false;
            c.posting.version++;
            delete c.posting.identity;
          }
          c.status = c.enabled ? 'ready' : 'paused';
          delete c.error;
          delete c.check;
          delete c.progress;
          delete c.syncHealth;
          if (resetItems) {
            s.entries = s.entries.filter((e) => e.connectionId !== c.id);
            delete c.lastSync;
            s.runs = s.runs.filter((r) => r.connectionId !== c.id);
          }
          for (const f of s.feeds.filter((f) => connectionFeeds(c).includes(f.id))) delete f.digest;
        }
        if (enabled !== undefined) {
          c.enabled = enabled;
          c.status = enabled ? 'ready' : 'paused';
          if (enabled) delete c.syncHealth?.nextRetryAt;
        }
        if (background !== undefined) c.background = background;
        if (feedIds) {
          for (const f of s.feeds.filter(
            (f) => connectionFeeds(c).includes(f.id) || feedIds.includes(f.id),
          ))
            delete f.digest;
          c.feedIds = [...new Set(feedIds)];
          delete c.feedId;
        }
      });
      res.json(publicState(req));
    }),
  );
  app.delete(
    '/api/connections/:id',
    wrap((req, res) => {
      if (!store.read().connections.some((c) => c.id === req.params.id))
        throw new ApiError(404, 'Connection not found.');
      store.update((s) => {
        const removed = s.connections.find((c) => c.id === req.params.id)!;
        for (const f of s.feeds.filter((f) => connectionFeeds(removed).includes(f.id)))
          delete f.digest;
        s.runs = s.runs.filter((r) => r.connectionId !== req.params.id);
        s.connections = s.connections.filter((c) => c.id !== req.params.id);
        s.entries = s.entries.filter((e) => e.connectionId !== req.params.id);
        if (s.outbound)
          s.outbound.drafts = s.outbound.drafts.filter(
            (draft) => draft.connectionId !== req.params.id,
          );
      });
      res.json(publicState(req));
    }),
  );
  app.post(
    '/api/connections/:id/check',
    wrap(async (req, res) => {
      const c = store.read().connections.find((c) => c.id === req.params.id);
      if (!c) throw new ApiError(404, 'Connection not found.');
      if (!c.enabled) throw new ApiError(409, 'Resume this connection before checking it.');
      const version = c.configVersion ?? 1,
        epoch = sourceEpochs.get(c.id) ?? 0;
      let fetched = 0,
        status: 'read-succeeded' | 'needs-attention' = 'read-succeeded';
      try {
        fetched = (await connector(c, store.decrypt(c.secretCipher))).length;
      } catch {
        status = 'needs-attention';
      }
      if (
        !store
          .read()
          .connections.some(
            (x) => x.id === c.id && (x.configVersion ?? 1) === version && x.enabled,
          ) ||
        (sourceEpochs.get(c.id) ?? 0) !== epoch
      )
        throw new ApiError(
          409,
          'The connection changed while checking. Check the current configuration again.',
        );
      store.update((s) => {
        s.connections.find((x) => x.id === c.id)!.check = {
          at: new Date().toISOString(),
          version,
          fetched,
          status,
          ...(status === 'needs-attention'
            ? {
                message: 'Could not read this source. Check address, permissions, and credentials.',
              }
            : {}),
        };
      });
      res.json(publicState(req));
    }),
  );
  app.post(
    '/api/connections/:id/history',
    wrap(async (req, res) => {
      const c = store.read().connections.find((x) => x.id === req.params.id);
      if (!c) throw new ApiError(404, 'Connection not found.');
      if (!c.enabled) throw new ApiError(409, 'Resume this source before loading history.');
      if (!['rocket', 'mastodon', 'bluesky', 'youtube', 'email'].includes(c.kind))
        throw new ApiError(409, 'This source has no older-history adapter.');
      if (!c.lastSync)
        throw new ApiError(409, 'Refresh this connection before loading older history.');
      if (!c.progress?.historyComplete) await runConnection(c.id, 'manual', true);
      res.json(publicState(req));
    }),
  );
  app.post(
    '/api/connections/:id/sync',
    wrap(async (req, res) => {
      await runConnection(req.params.id, 'manual');
      res.json(publicState(req));
    }),
  );
  app.post(
    '/api/feeds/:id/sync',
    wrap(async (req, res) => {
      await runSync(req.params.id, 'manual');
      res.json(publicState(req));
    }),
  );
  app.patch(
    '/api/entries/:id',
    wrap((req, res) => {
      const patch = z
        .object({
          saved: z.boolean().optional(),
          read: z.boolean().optional(),
          localEdit: localEditSchema.nullable().optional(),
          editVersion: z.number().int().nonnegative().optional(),
        })
        .strict()
        .parse(req.body);
      if (!store.read().entries.some((e) => e.id === req.params.id))
        throw new ApiError(404, 'Item not found.');
      const current = store.read().entries.find((e) => e.id === req.params.id)!;
      if ('localEdit' in patch && patch.editVersion !== (current.editVersion ?? 0))
        throw new ApiError(
          409,
          'This local copy changed. Reopen the editor to compare current text.',
        );
      store.update((s) => {
        const entry = s.entries.find((e) => e.id === req.params.id)!;
        if (patch.saved !== undefined) entry.saved = patch.saved;
        if (patch.read !== undefined) entry.read = patch.read;
        if ('localEdit' in patch) {
          if (patch.localEdit === null) delete entry.localEdit;
          else entry.localEdit = { ...patch.localEdit!, updatedAt: new Date().toISOString() };
          entry.editVersion = (entry.editVersion ?? 0) + 1;
        }
      });
      res.json(publicState(req));
    }),
  );
  app.patch(
    '/api/profile',
    wrap((req, res) => {
      const { revision, ...input } = req.body;
      checkRevision(revision);
      const profile = profileSchema.parse(input);
      store.update((s) => {
        s.profile = profile;
      });
      res.json(publicState(req));
    }),
  );
  app.put(
    '/api/ai',
    wrap((req, res) => {
      const { model, secret, disconnect } = z
        .object({
          model: z.string().trim().max(100).default(''),
          secret: z.string().max(2000).default(''),
          disconnect: z.boolean().default(false),
        })
        .parse(req.body);
      if (!disconnect && (!model || (!secret && !store.read().ai.secretCipher)))
        throw new ApiError(400, 'Enter an API key and a model available to your OpenAI account.');
      if (/\r|\n/.test(secret)) throw new ApiError(400, 'Credentials must not contain newlines.');
      store.update((s) => {
        s.ai = disconnect
          ? { model: '', receipts: s.ai.receipts }
          : {
              model,
              secretCipher: secret ? store.encrypt(secret) : s.ai.secretCipher,
              receipts: s.ai.receipts,
            };
      });
      res.json(publicState(req));
    }),
  );
  app.post(
    '/api/feeds/:id/digest',
    wrap(async (req, res) => {
      const f = feed(req.params.id);
      const ai = store.read().ai;
      if (!ai.secretCipher) throw new ApiError(409, 'Connect your AI provider in Settings first.');
      if (digests.has(f.id)) throw new ApiError(409, 'A digest is already being generated.');
      const { revision, options, confirmed } = z
        .object({
          revision: z.number().int(),
          options: generationOptionsSchema,
          confirmed: z.literal(true),
        })
        .strict()
        .parse(req.body);
      checkRevision(revision);
      const { items, input } = generationInput(store.read(), f, options);
      if (!items.length)
        throw new ApiError(409, 'Add items to this feed before generating a digest.');
      digests.add(f.id);
      let submitted = false;
      const receipt: import('../shared/model').GenerationReceipt = {
        id: randomUUID(),
        feedId: f.id,
        at: new Date().toISOString(),
        model: ai.model,
        status: 'blocked' as import('../shared/model').GenerationReceipt['status'],
        reservedUsd: 0,

        message: '',
      };
      try {
        const headers = {
          Authorization: `Bearer ${store.decrypt(ai.secretCipher)}`,
          'Content-Type': 'application/json',
        };
        const request = { model: ai.model, instructions: pipelineInstructions(f), input };
        const count = z.object({ input_tokens: z.number().int().nonnegative() }).parse(
          JSON.parse(
            await fetchPublic('https://api.openai.com/v1/responses/input_tokens', {
              method: 'POST',
              headers,
              body: JSON.stringify(request),
            }),
          ),
        ).input_tokens;
        checkRevision(revision);
        receipt.inputTokens = count;
        receipt.reservedUsd = reservedCost(count, options);
        if (count > options.maxInputTokens || receipt.reservedUsd > options.maximumUsd)
          throw new ApiError(
            409,
            'Generation exceeds your input or spending limit. Reduce inputs/output, then review again. No generation request was sent.',
          );
        receipt.status = 'submitted';
        store.update((s) => {
          s.ai.receipts = [receipt, ...(s.ai.receipts ?? [])].slice(0, 50);
        });
        submitted = true;
        const output = JSON.parse(
          await fetchPublic('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              ...request,
              store: false,
              service_tier: 'default',
              max_output_tokens: options.maxOutputTokens,
            }),
          }),
        );
        const data = z
          .object({
            model: z.string(),
            service_tier: z.literal('default'),
            status: z.string(),
            usage: z.object({
              input_tokens: z.number().int().nonnegative(),
              output_tokens: z.number().int().nonnegative(),
              total_tokens: z.number().int().nonnegative(),
            }),
            output: z.array(
              z.object({
                type: z.string(),
                content: z
                  .array(z.object({ type: z.string(), text: z.string().optional() }))
                  .optional(),
              }),
            ),
          })
          .parse(output);
        receipt.outputTokens = data.usage.output_tokens;
        if (
          data.model !== ai.model ||
          data.usage.input_tokens !== receipt.inputTokens ||
          data.usage.output_tokens > options.maxOutputTokens ||
          data.usage.total_tokens !== data.usage.input_tokens + data.usage.output_tokens ||
          data.status !== 'completed'
        )
          throw new ApiError(
            502,
            'Generation usage or completion could not be confirmed. Check the receipt and provider billing before another manual attempt.',
          );
        receipt.status = 'completed';
        const text = data.output
          .filter((i) => i.type === 'message')
          .flatMap((i) => i.content ?? [])
          .filter((i) => i.type === 'output_text')
          .map((i) => i.text || '')
          .join('\n');
        if (!text) throw new ApiError(502, 'The AI provider returned no digest text.');
        if (
          store.read().feeds.some((x) => x.id === f.id) &&
          items.every((item) =>
            evaluateFeed(store.read(), feed(f.id)).some(
              (d) => d.included && d.entry.id === item.id,
            ),
          ) &&
          feedFingerprint(feed(f.id)) === feedFingerprint(f) &&
          store.read().ai.model === ai.model &&
          store.read().ai.secretCipher === ai.secretCipher &&
          generationInput(store.read(), feed(f.id), options).input === input
        )
          store.update((s) => {
            s.feeds.find((x) => x.id === f.id)!.digest = {
              text,
              createdAt: new Date().toISOString(),
              model: ai.model,
              itemIds: items.map((e) => e.id),
              configHash: feedFingerprint(f),
            };
          });
        else
          receipt.message =
            'Digest discarded because source content or configuration changed during generation.';
        store.update((s) => {
          s.ai.receipts = [
            { ...receipt },
            ...(s.ai.receipts ?? []).filter((r) => r.id !== receipt.id),
          ].slice(0, 50);
        });
        res.json(publicState(req));
      } catch (error) {
        receipt.status = submitted ? 'uncertain' : 'blocked';
        receipt.message = submitted
          ? 'Request may have incurred a charge; no automatic retry. Review provider usage before another attempt.'
          : 'Generation was not submitted.';
        throw error;
      } finally {
        if (receipt.status !== 'completed')
          store.update((s) => {
            s.ai.receipts = [
              { ...receipt },
              ...(s.ai.receipts ?? []).filter((r) => r.id !== receipt.id),
            ].slice(0, 50);
          });
        digests.delete(f.id);
      }
    }),
  );
  const posting = createPostingHandlers(
    store,
    (status, message) => new ApiError(status, message),
    publicState,
  );
  app.put('/api/connections/:id/posting', wrap(posting.configure));
  app.post('/api/connections/:id/posting/check', wrap(posting.check));
  app.post('/api/outbound/drafts', wrap(posting.create));
  app.patch('/api/outbound/drafts/:id', wrap(posting.update));
  app.delete('/api/outbound/drafts/:id', wrap(posting.remove));
  app.get('/api/outbound/drafts/:id/review', wrap(posting.review));
  app.post('/api/outbound/drafts/:id/send', wrap(posting.send));
  app.post('/api/outbound/receipts/:id/check', wrap(posting.checkOutcome));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof z.ZodError)
      return res
        .status(400)
        .json({ error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    if (error instanceof ApiError) return res.status(error.status).json({ error: error.message });
    if (error instanceof SyntaxError) return res.status(400).json({ error: 'Invalid JSON.' });
    res
      .status(500)
      .json({ error: 'The operation failed. Check the source configuration and try again.' });
  };
  app.use(handleError);
  return {
    app,
    runSync,
    runConnection,
    async tick() {
      for (const c of store.read().connections.filter((c) => c.enabled && c.background)) {
        const last = store.read().runs.find((r) => r.connectionId === c.id);
        if (c.syncHealth?.nextRetryAt && Date.parse(c.syncHealth.nextRetryAt) > Date.now())
          continue;
        if (c.syncHealth?.nextRetryAt || !last || Date.now() - Date.parse(last.at) >= 300000)
          await runConnection(c.id, 'background');
      }
    },
  };
}
