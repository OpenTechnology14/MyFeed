import { createHash, randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Store } from './store';
import { LIMITS, type Connection, type State } from '../shared/model';
import {
  draftBodySchema,
  postingConfigSchema,
  type PostingDraft,
  type PostingReview,
} from '../shared/posting';
import {
  checkWritingAccount,
  checkReplyTarget,
  postingDestination,
  validatePostingBody,
  sendProviderPost,
  checkProviderOutcome,
} from './posting';

export function createPostingHandlers(
  store: Store,
  fault: (status: number, message: string) => Error,
  publicState: (req: Request) => unknown,
) {
  const reviews = new Map<string, { hash: string; draftId: string; expires: number }>();
  const sending = new Set<string>();
  const connection = (id: string) => {
    const c = store.read().connections.find((c) => c.id === id);
    if (!c) throw fault(404, 'Connection not found.');
    if (!['rocket', 'mastodon'].includes(c.kind))
      throw fault(400, 'This connection has no supported posting adapter.');
    return c;
  };
  const draft = (id: string) => {
    const value = store.read().outbound?.drafts.find((draft) => draft.id === id);
    if (!value) throw fault(404, 'Draft not found.');
    return value;
  };
  const writable = (c: Connection) => {
    if (!c.enabled || !c.posting?.enabled || !c.posting.secretCipher)
      throw fault(
        409,
        'Enable posting with its separate writing credential and resume the connection.',
      );
    if (!c.posting.identity || Date.now() - Date.parse(c.posting.identity.checkedAt) > 30 * 60000)
      throw fault(409, 'Check the writing account before reviewing this draft.');
    return c.posting.identity;
  };
  function replyTarget(c: Connection, d: PostingDraft, state: State) {
    if (!d.body.replyEntryId) return '';
    const item = state.entries.find(
      (entry) => entry.id === d.body.replyEntryId && entry.connectionId === c.id,
    );
    if (!item) throw fault(409, 'The reply target was removed or belongs to another connection.');
    if (c.kind === 'rocket') {
      if (!item.chat || item.chat.channelId !== c.roomId)
        throw fault(409, 'The reply target belongs to another channel.');
      return item.chat.threadId || item.externalId;
    }
    if (!/^\d+$/.test(item.externalId))
      throw fault(409, 'Reply target needs a Mastodon status ID from this connection.');
    return item.externalId;
  }
  function plan(c: Connection, d: PostingDraft) {
    const identity = writable(c);
    if (d.status !== 'draft')
      throw fault(
        409,
        'This draft has already been submitted. Review its receipt before another post.',
      );
    if (stateHasAttempt(d))
      throw fault(
        409,
        'This draft version already has a send receipt. Edit/save before reviewing another manual attempt.',
      );
    validatePostingBody(c, d.body, identity);
    const replyId = replyTarget(c, d, store.read());
    const value = {
      draftId: d.id,
      draftVersion: d.version,
      sourceVersion: c.configVersion ?? 1,
      writerVersion: c.posting!.version,
      senderId: identity.id,
      sender: identity.username,
      destination: postingDestination(c, d.body),
      body: d.body,
      replyId,
      maxCharacters: identity.maxCharacters,
    };
    return { ...value, hash: createHash('sha256').update(JSON.stringify(value)).digest('hex') };
  }
  function outbound(state: State) {
    return (state.outbound ??= { drafts: [], receipts: [] });
  }
  function stateHasAttempt(d: PostingDraft) {
    return store
      .read()
      .outbound?.receipts.some(
        (receipt) => receipt.draftId === d.id && receipt.draftVersion === d.version,
      );
  }
  return {
    async configure(req: Request, res: Response) {
      const c = connection(req.params.id),
        config = postingConfigSchema.parse(req.body);
      if (config.version !== (c.posting?.version ?? 0))
        throw fault(409, 'Writing configuration changed. Reopen setup.');
      if (config.sourceVersion !== (c.configVersion ?? 1))
        throw fault(409, 'Source address or account changed. Reopen writing setup.');
      if (/[\r\n]/.test(config.secret) || /[\r\n]/.test(config.userId))
        throw fault(400, 'Writing credentials must not contain newlines.');
      const secretCipher = config.secret ? store.encrypt(config.secret) : c.posting?.secretCipher;
      if (config.enabled && (!secretCipher || (c.kind === 'rocket' && !config.userId)))
        throw fault(
          400,
          'Enter a separate writing token and the Rocket.Chat writing user ID when required.',
        );
      store.update((state) => {
        state.connections.find((item) => item.id === c.id)!.posting = {
          enabled: config.enabled,
          userId: config.userId,
          secretCipher,
          version: config.version + 1,
        };
      });
      res.json(publicState(req));
    },
    async check(req: Request, res: Response) {
      z.object({}).strict().parse(req.body);
      const c = connection(req.params.id);
      if (!c.posting?.enabled || !c.posting.secretCipher || !c.enabled)
        throw fault(409, 'Configure and enable the writing account first.');
      const version = c.posting.version,
        sourceVersion = c.configVersion ?? 1;
      let identity;
      try {
        identity = await checkWritingAccount(c, store.decrypt(c.posting.secretCipher));
      } catch {
        throw fault(
          409,
          'Could not verify the writing account and supported destination. Check token permissions, server version and channel restrictions. No message was sent.',
        );
      }
      const current = connection(c.id);
      if (
        !current.enabled ||
        !current.posting?.enabled ||
        current.posting.version !== version ||
        (current.configVersion ?? 1) !== sourceVersion
      )
        throw fault(409, 'Connection changed during the writing check. Check it again.');
      store.update((state) => {
        state.connections.find((item) => item.id === c.id)!.posting!.identity = identity;
      });
      res.json(publicState(req));
    },
    async create(req: Request, res: Response) {
      const input = z
        .object({ connectionId: z.string(), body: draftBodySchema })
        .strict()
        .parse(req.body);
      connection(input.connectionId);
      if ((store.read().outbound?.drafts.length ?? 0) >= LIMITS.postingDrafts)
        throw fault(409, 'Keep at most 50 local drafts. Remove a finished draft first.');
      const value: PostingDraft = {
        id: randomUUID(),
        connectionId: input.connectionId,
        body: input.body,
        version: 1,
        status: 'draft',
        updatedAt: new Date().toISOString(),
      };
      store.update((state) => {
        outbound(state).drafts.unshift(value);
      });
      res.status(201).json(publicState(req));
    },
    async update(req: Request, res: Response) {
      const value = draft(req.params.id);
      const input = z
        .object({ version: z.number().int(), body: draftBodySchema })
        .strict()
        .parse(req.body);
      if (value.version !== input.version || value.status !== 'draft' || sending.has(value.id))
        throw fault(
          409,
          'Draft changed or has already been submitted. Reopen its current version.',
        );
      connection(value.connectionId);
      store.update((state) => {
        Object.assign(outbound(state).drafts.find((item) => item.id === value.id)!, {
          body: input.body,
          version: input.version + 1,
          updatedAt: new Date().toISOString(),
        });
      });
      res.json(publicState(req));
    },
    async remove(req: Request, res: Response) {
      const value = draft(req.params.id);
      if (value.status === 'sending' || value.status === 'unknown' || sending.has(value.id))
        throw fault(409, 'An uncertain or active send must remain available for outcome review.');
      store.update((state) => {
        outbound(state).drafts = outbound(state).drafts.filter((item) => item.id !== value.id);
      });
      res.json(publicState(req));
    },
    async review(req: Request, res: Response) {
      const value = draft(req.params.id),
        c = connection(value.connectionId);
      let current;
      try {
        current = plan(c, value);
      } catch (error) {
        if (error instanceof Error && 'status' in error) throw error;
        throw fault(400, error instanceof Error ? error.message : 'Invalid draft.');
      }
      for (const [key, review] of reviews) if (review.expires < Date.now()) reviews.delete(key);
      if (reviews.size >= 100)
        throw fault(
          429,
          'Too many active posting reviews. Wait five minutes before creating another.',
        );
      const token = randomUUID(),
        expires = Date.now() + 5 * 60000;
      reviews.set(token, { draftId: value.id, hash: current.hash, expires });
      const response: PostingReview = {
        token,
        expiresAt: new Date(expires).toISOString(),
        draftId: value.id,
        draftVersion: value.version,
        sender: current.sender,
        destination: current.destination,
        body: current.body,
        replyId: current.replyId,
        maxCharacters: current.maxCharacters,
      };
      res.json(response);
    },
    async checkOutcome(req: Request, res: Response) {
      const { providerId } = z
        .object({ providerId: z.string().max(500).default('') })
        .strict()
        .parse(req.body);
      const receipt = store.read().outbound?.receipts.find((item) => item.id === req.params.id);
      if (!receipt) throw fault(404, 'Send receipt not found.');
      if (receipt.status !== 'unknown')
        throw fault(409, 'Only an unknown outcome needs a provider lookup.');
      const saved = store.read().outbound?.drafts.find((item) => item.id === receipt.draftId);
      if (
        !saved ||
        saved.version !== receipt.draftVersion ||
        saved.status !== 'unknown' ||
        !receipt.senderId ||
        receipt.replyId === undefined
      )
        throw fault(
          409,
          'Original draft/identity evidence is unavailable. Inspect the provider manually; the receipt stays unknown.',
        );
      const c = connection(receipt.connectionId);
      if (
        !c.posting?.secretCipher ||
        receipt.kind !== c.kind ||
        postingDestination(c, saved.body) !== receipt.destination
      )
        throw fault(
          409,
          'The original writing connection/destination is unavailable or changed. No request was sent.',
        );
      const sourceVersion = c.configVersion ?? 1,
        writerVersion = c.posting.version;
      let acknowledgment;
      try {
        acknowledgment = await checkProviderOutcome(
          c,
          store.decrypt(c.posting.secretCipher),
          saved.body,
          receipt,
          providerId,
        );
      } catch {
        const current = store.read().outbound?.receipts.find((item) => item.id === receipt.id);
        if (current?.status === 'unknown')
          store.update((state) => {
            const item = state.outbound!.receipts.find((item) => item.id === receipt.id)!;
            item.checkedAt = new Date().toISOString();
            item.message =
              'Provider lookup did not establish a matching outcome. A missing result is not proof of failure; the draft remains locked. Nothing was resent.';
          });
        res.json(publicState(req));
        return;
      }
      const current = store.read().connections.find((item) => item.id === c.id);
      const currentDraft = store.read().outbound?.drafts.find((item) => item.id === saved.id);
      const currentReceipt = store.read().outbound?.receipts.find((item) => item.id === receipt.id);
      if (
        !current ||
        (current.configVersion ?? 1) !== sourceVersion ||
        current.posting?.version !== writerVersion ||
        currentDraft?.version !== saved.version ||
        currentDraft.status !== 'unknown' ||
        currentReceipt?.status !== 'unknown'
      )
        throw fault(
          409,
          'Connection or draft changed during lookup. The existing outcome was preserved.',
        );
      store.update((state) => {
        Object.assign(
          state.outbound!.receipts.find((item) => item.id === receipt.id)!,
          acknowledgment,
          {
            status: 'sent',
            checkedAt: new Date().toISOString(),
            confirmation: 'provider-lookup',
            message:
              c.kind === 'rocket'
                ? 'Read-only lookup confirmed the original client message ID, sender, channel, body and reply. Nothing was resent.'
                : 'Read-only lookup confirmed the supplied post ID matches the sender, body, audience, warning, language, reply and attempt time. Original idempotency-key attribution is not independently available. Nothing was resent.',
          },
        );
        state.outbound!.drafts.find((item) => item.id === saved.id)!.status = 'sent';
      });
      res.json(publicState(req));
    },
    async send(req: Request, res: Response) {
      const { token } = z
        .object({ token: z.string().uuid(), confirmed: z.literal(true) })
        .strict()
        .parse(req.body);
      const recorded = store.read().outbound?.receipts.find((receipt) => receipt.id === token);
      if (recorded) {
        if (recorded.draftId !== req.params.id)
          throw fault(409, 'Receipt belongs to another draft.');
        res.json(publicState(req));
        return;
      }
      const review = reviews.get(token);
      if (!review || review.draftId !== req.params.id || review.expires < Date.now())
        throw fault(
          409,
          'Posting review expired or the server restarted. Review again before sending.',
        );
      const value = draft(req.params.id),
        c = connection(value.connectionId),
        current = plan(c, value);
      if (review.hash !== current.hash || sending.has(value.id))
        throw fault(409, 'Draft, account or audience changed. Review its current version.');
      sending.add(value.id);
      let submitted = false;
      try {
        let identity;
        try {
          identity = await checkWritingAccount(c, store.decrypt(c.posting!.secretCipher));
          await checkReplyTarget(c, store.decrypt(c.posting!.secretCipher), current.replyId);
        } catch {
          throw fault(
            409,
            'Writing preflight failed. No message was submitted; check the writing account again.',
          );
        }
        const freshConnection = connection(c.id),
          fresh = plan(freshConnection, draft(value.id));
        if (
          fresh.hash !== review.hash ||
          identity.id !== c.posting!.identity!.id ||
          identity.username !== current.sender ||
          identity.maxCharacters !== current.maxCharacters
        )
          throw fault(
            409,
            'Writing account, destination or limits changed. Check it and review again.',
          );
        store.update((state) => {
          const data = outbound(state);
          if (data.receipts.length >= LIMITS.postingReceipts) {
            const settled = data.receipts
              .map((receipt, index) => ({ receipt, index }))
              .reverse()
              .find(({ receipt }) => receipt.status === 'sent' || receipt.status === 'failed');
            if (!settled)
              throw fault(
                409,
                'Send history contains 100 unresolved attempts. Check their provider outcomes before sending more.',
              );
            data.receipts.splice(settled.index, 1);
          }
          data.receipts.unshift({
            id: token,
            draftId: value.id,
            draftVersion: value.version,
            connectionId: c.id,
            kind: c.kind as 'rocket' | 'mastodon',
            at: new Date().toISOString(),
            status: 'sending',
            sender: current.sender,
            senderId: identity.id,
            replyId: current.replyId,
            destination: current.destination,
            payloadHash: current.hash,
          });
          data.drafts.find((item) => item.id === value.id)!.status = 'sending';
        });
        submitted = true;
        const acknowledgment = await sendProviderPost(
          c,
          store.decrypt(c.posting!.secretCipher),
          value.body,
          current.replyId,
          token,
          identity,
        );
        store.update((state) => {
          const receipt = outbound(state).receipts.find((receipt) => receipt.id === token)!;
          Object.assign(receipt, {
            ...acknowledgment,
            status: 'sent',
            confirmation: 'send-response',
            message:
              'Provider acknowledged this send. Local deletion does not remove the remote message.',
          });
          const item = state.outbound!.drafts.find((item) => item.id === value.id);
          if (item) item.status = 'sent';
        });
        res.json(publicState(req));
      } catch (error) {
        if (!submitted) throw error;
        const status =
          error && typeof error === 'object' && 'httpStatus' in error
            ? Number(error.httpStatus)
            : 0;
        const rejected = [400, 401, 403, 404, 413, 422, 429].includes(status);
        store.update((state) => {
          const receipt = outbound(state).receipts.find((receipt) => receipt.id === token)!;
          receipt.status = rejected ? 'failed' : 'unknown';
          receipt.message = rejected
            ? `Provider rejected the send (HTTP ${status}). Edit/save and review before another manual attempt.`
            : 'The provider may have received this message. Check its outcome; no automatic retry.';
          const item = state.outbound!.drafts.find((item) => item.id === value.id);
          if (item) item.status = rejected ? 'draft' : 'unknown';
        });
        res.json(publicState(req));
      } finally {
        sending.delete(value.id);
        reviews.delete(token);
      }
    },
  };
}
