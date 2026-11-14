import { useEffect, useState } from 'react';
import type { Connection, Entry, State, Feed } from '../../shared/model';
import { evaluateFeed, feedFingerprint } from '../../shared/pipeline';
import { reviewedDigestCopy } from '../../shared/generation';
import type { HistoryPage } from '../../shared/history';
import {
  DEFAULT_DRAFT_BODY,
  type PostingDraft,
  type PostingReview,
  type PostReceipt,
} from '../../shared/posting';
import { Button, Field, Modal } from './ui';
import { SendOutcomeCheck } from './SendOutcomeCheck';
import { query } from '../api';
import { useSessionDraft } from '../drafts';

export function PostingPanel({
  connection,
  state,
  entries,
  preview,
  busy,
  mutate,
  initialReplyEntryId,
  digestFeed,
}: {
  connection: Connection;
  state: State;
  entries: Entry[];
  preview: boolean;
  busy: boolean;
  mutate: (path: string, method: string, body?: unknown) => Promise<State>;
  initialReplyEntryId?: string;
  digestFeed?: Feed;
}) {
  const [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const [config, setConfig] = useState({
    enabled: connection.posting?.enabled ?? false,
    version: connection.posting?.version ?? 0,
    sourceVersion: connection.configVersion ?? 1,
    userId: connection.posting?.userId ?? '',
    secret: '',
  });
  const [demoConfigured, setDemoConfigured] = useState(false);
  const [demoDrafts, setDemoDrafts] = useState<PostingDraft[]>([]),
    [demoReceipts, setDemoReceipts] = useState<PostReceipt[]>([]);
  const [open, setOpen] = useState(false),
    [review, setReview] = useState<PostingReview>(),
    [loading, setLoading] = useState(false);
  const empty = { id: '', version: 0, body: DEFAULT_DRAFT_BODY };
  const [form, setForm, reset, dirty] = useSessionDraft(
    `${preview ? 'preview' : 'workspace'}:posting:${connection.id}`,
    empty,
  );
  const rocket = connection.kind === 'rocket';
  const drafts = preview
    ? demoDrafts
    : (state.outbound?.drafts.filter((draft) => draft.connectionId === connection.id) ?? []);
  const current = drafts.find((draft) => draft.id === form.id);
  const receipts = preview
    ? demoReceipts
    : (state.outbound?.receipts.filter((receipt) => receipt.connectionId === connection.id) ?? []);
  const ready = preview
    ? demoConfigured
    : !!connection.posting?.enabled && !!connection.posting.identity && connection.enabled;
  const identity = preview
    ? { username: 'fictional.writer', maxCharacters: 500 }
    : connection.posting?.identity;
  useEffect(() => {
    if (initialReplyEntryId) {
      if (dirty) {
        setMessage(
          'Unsaved composer retained. Save or discard it before choosing a different reply target.',
        );
        setOpen(true);
        return;
      }
      reset({ ...empty, body: { ...DEFAULT_DRAFT_BODY, replyEntryId: initialReplyEntryId } });
      setReview(undefined);
      setOpen(true);
    }
  }, [initialReplyEntryId]);
  async function act(action: () => Promise<void>) {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Posting action failed.');
    } finally {
      setLoading(false);
    }
  }
  function edit(key: keyof typeof form.body, value: string) {
    setForm((form) => ({ ...form, body: { ...form.body, [key]: value } }));
    setReview(undefined);
  }
  return (
    <section className="settings-info-card" aria-label="Manual posting">
      <h3>{preview ? 'Fictional posting preview' : 'Manual posting'}</h3>
      <p>
        {preview
          ? 'Layout demonstration only. No credentials or messages leave this preview.'
          : 'Configure a writing account separately from the account you read. Draft and review first; only Send publishes.'}
      </p>
      <details>
        <summary>Configure writing account</summary>
        <form
          className="settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            void act(async () => {
              if (preview) {
                setDemoConfigured(config.enabled);
                setConfig({ ...config, secret: '' });
                setMessage('Fictional writing setup updated. No provider call.');
                return;
              }
              const next = await mutate(`/connections/${connection.id}/posting`, 'PUT', config);
              const saved = next.connections.find((item) => item.id === connection.id)!.posting!;
              setConfig({
                enabled: saved.enabled,
                version: saved.version,
                sourceVersion: connection.configVersion ?? 1,
                userId: saved.userId,
                secret: '',
              });
              setReview(undefined);
              setMessage('Writing setup saved. Check the account before reviewing a send.');
            });
          }}
        >
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(event) => setConfig({ ...config, enabled: event.target.checked })}
            />{' '}
            Enable manual posting on this connection
          </label>
          <p>
            Destination server: {preview ? 'Fictional server' : connection.endpoint}
            {rocket ? ` · channel ${connection.roomId}` : ''}
          </p>
          {rocket && (
            <Field label="Writing user ID">
              <input
                aria-label="Writing user ID"
                maxLength={120}
                required={config.enabled}
                value={config.userId}
                onChange={(event) => setConfig({ ...config, userId: event.target.value })}
                disabled={preview}
              />
            </Field>
          )}
          <Field
            label="Writing token"
            help={
              rocket
                ? 'Use your writing account’s token, not a public author or assumed read identity.'
                : 'Use a token with write:statuses and profile/read:accounts; v2 instance metadata is required.'
            }
          >
            <input
              aria-label="Writing token"
              type="password"
              autoComplete="off"
              maxLength={2000}
              disabled={preview}
              required={!preview && config.enabled && !connection.posting?.hasSecret}
              value={config.secret}
              placeholder={
                connection.posting?.hasSecret
                  ? 'Leave blank to keep writing credential'
                  : preview
                    ? 'Disabled in preview'
                    : 'Separate writing credential'
              }
              onChange={(event) => setConfig({ ...config, secret: event.target.value })}
            />
          </Field>
          <Button type="submit" disabled={busy || loading}>
            Save writing setup
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              setConfig({
                enabled: connection.posting?.enabled ?? false,
                version: connection.posting?.version ?? 0,
                sourceVersion: connection.configVersion ?? 1,
                userId: connection.posting?.userId ?? '',
                secret: '',
              })
            }
          >
            Reload writing setup
          </Button>
        </form>
      </details>
      <Button
        variant="secondary"
        disabled={busy || loading || (!preview && !connection.posting?.enabled)}
        onClick={() =>
          void act(async () => {
            if (preview) {
              setDemoConfigured(true);
              setMessage('Fictional identity only; no provider contacted.');
              return;
            }
            await mutate(`/connections/${connection.id}/posting/check`, 'POST', {});
            setMessage(
              'Writing identity and destination checked without sending. The provider still enforces write permission on Send.',
            );
          })
        }
      >
        Check writing account
      </Button>
      <p>
        {identity
          ? `Writing as ${identity.username} · local limit ${identity.maxCharacters} characters`
          : 'Writing identity not checked.'}{' '}
        {preview ? '' : 'No live send is implied by saving or checking.'}
      </p>
      <Button
        variant="secondary"
        onClick={() => {
          if (dirty && !window.confirm('Discard unsaved composer changes?')) return;
          reset(empty);
          setReview(undefined);
          setOpen(true);
        }}
      >
        New message
      </Button>
      {drafts.map((draft) => (
        <div key={draft.id} className="section-title">
          <span>
            {draft.body.text.slice(0, 80) || 'Empty draft'} · {draft.status}
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              if (dirty && !window.confirm('Discard unsaved composer changes?')) return;
              reset({ id: draft.id, version: draft.version, body: draft.body });
              setReview(undefined);
              setOpen(true);
            }}
          >
            Open draft
          </Button>
          {!['sending', 'unknown'].includes(draft.status) && (
            <Button
              variant="ghost"
              disabled={busy || loading}
              onClick={() => {
                if (!window.confirm('Remove this local draft? Remote posts are unchanged.')) return;
                void act(async () => {
                  if (preview)
                    setDemoDrafts((items) => items.filter((item) => item.id !== draft.id));
                  else await mutate(`/outbound/drafts/${draft.id}`, 'DELETE');
                  if (form.id === draft.id) reset(empty);
                });
              }}
            >
              Remove draft
            </Button>
          )}
        </div>
      ))}
      {!!receipts.length && (
        <details>
          <summary>Posting receipts · {receipts.length}</summary>
          {receipts.map((receipt) => (
            <article key={receipt.id}>
              <p>
                {new Date(receipt.at).toLocaleString()} · {receipt.sender} → {receipt.destination} ·{' '}
                <strong>{receipt.status}</strong>
              </p>
              <p>{receipt.message}</p>
              <p>Attempt: {receipt.id}</p>
              {receipt.kind === 'rocket' && !receipt.providerId && (
                <p>Client message ID (unconfirmed): {receipt.id.replaceAll('-', '')}</p>
              )}
              {receipt.providerId && <p>Provider ID: {receipt.providerId}</p>}
              {receipt.url && (
                <a href={receipt.url} target="_blank" rel="noreferrer">
                  Open provider post
                </a>
              )}
              <SendOutcomeCheck
                receipt={receipt}
                connection={connection}
                preview={preview}
                busy={busy}
                mutate={mutate}
              />
            </article>
          ))}
        </details>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {open && (
        <Modal
          title={form.body.replyEntryId ? 'Compose reply' : 'Compose message'}
          subtitle={
            preview
              ? 'Fictional preview; nothing is transmitted.'
              : `Connection: ${connection.name}`
          }
          wide
          onClose={() => {
            setOpen(false);
            setReview(undefined);
          }}
        >
          {current && current.status !== 'draft' && (
            <p className="notice">
              {current.status === 'unknown'
                ? 'Outcome unknown. Check the provider before another post; this draft cannot be retried.'
                : `This draft is ${current.status}. See its receipt.`}
            </p>
          )}
          {review ? (
            <>
              <h3>Review this exact send</h3>
              <p>Sender: {review.sender}</p>
              <p>Destination: {review.destination}</p>
              {review.replyId && <p>Reply target: {review.replyId}</p>}
              {review.body.warning && <p>Content warning: {review.body.warning}</p>}
              <p className="reading-body">{review.body.text}</p>
              <p>
                Language: {review.body.language || 'Provider default'} · Review expires{' '}
                {new Date(review.expiresAt).toLocaleTimeString()}
              </p>
              <Button
                variant="ghost"
                onClick={() => setReview(undefined)}
                disabled={busy || loading}
              >
                Back to draft
              </Button>
              <Button
                disabled={busy || loading || !ready}
                onClick={() =>
                  void act(async () => {
                    if (preview) {
                      const receipt: PostReceipt = {
                        id: review.token,
                        draftId: review.draftId,
                        draftVersion: review.draftVersion,
                        connectionId: connection.id,
                        status: 'sent',
                        at: new Date().toISOString(),
                        sender: review.sender,
                        destination: review.destination,
                        payloadHash: 'fictional',
                        message: 'Preview simulation only. Nothing was sent.',
                      };
                      setDemoReceipts((items) => [receipt, ...items]);
                      setDemoDrafts((items) =>
                        items.map((item) =>
                          item.id === review.draftId ? { ...item, status: 'sent' } : item,
                        ),
                      );
                      setMessage('Preview simulation only. Nothing was sent.');
                    } else {
                      const next = await mutate(`/outbound/drafts/${review.draftId}/send`, 'POST', {
                        token: review.token,
                        confirmed: true,
                      });
                      const receipt = next.outbound?.receipts.find(
                        (receipt) => receipt.id === review.token,
                      );
                      setMessage(
                        receipt?.message || 'Inspect the send receipt before another attempt.',
                      );
                    }
                    setReview(undefined);
                    setOpen(false);
                    reset(empty);
                  })
                }
              >
                {preview ? 'Simulate send' : 'Send reviewed message'}
              </Button>
            </>
          ) : (
            <form
              className="settings-form"
              onSubmit={(event) => {
                event.preventDefault();
                void act(async () => {
                  if (preview) {
                    const value: PostingDraft = {
                      id: form.id || crypto.randomUUID(),
                      connectionId: connection.id,
                      version: form.version + 1,
                      body: form.body,
                      status: 'draft',
                      updatedAt: new Date().toISOString(),
                    };
                    setDemoDrafts((items) => [
                      value,
                      ...items.filter((item) => item.id !== value.id),
                    ]);
                    reset({ id: value.id, version: value.version, body: value.body });
                  } else {
                    const next = await mutate(
                      form.id ? `/outbound/drafts/${form.id}` : '/outbound/drafts',
                      form.id ? 'PATCH' : 'POST',
                      form.id
                        ? { version: form.version, body: form.body }
                        : { connectionId: connection.id, body: form.body },
                    );
                    const value = next.outbound!.drafts.find((draft) =>
                      form.id ? draft.id === form.id : draft.connectionId === connection.id,
                    )!;
                    reset({ id: value.id, version: value.version, body: value.body });
                  }
                  setMessage('Draft saved locally. Nothing sent.');
                });
              }}
            >
              <Field label="Message text">
                <textarea
                  aria-label="Message text"
                  rows={7}
                  maxLength={5000}
                  value={form.body.text}
                  disabled={current?.status !== undefined && current.status !== 'draft'}
                  onChange={(event) => edit('text', event.target.value)}
                />
              </Field>
              {!rocket && (
                <>
                  <Field label="Post audience">
                    <select
                      aria-label="Post audience"
                      value={form.body.visibility}
                      onChange={(event) => edit('visibility', event.target.value)}
                      disabled={current?.status !== undefined && current.status !== 'draft'}
                    >
                      <option value="unlisted">Unlisted</option>
                      <option value="public">Public</option>
                      <option value="private">Followers only</option>
                    </select>
                  </Field>
                  <Field label="Content warning">
                    <input
                      aria-label="Content warning"
                      maxLength={500}
                      value={form.body.warning}
                      onChange={(event) => edit('warning', event.target.value)}
                      disabled={current?.status !== undefined && current.status !== 'draft'}
                    />
                  </Field>
                  <Field label="Post language" help="Optional ISO language code.">
                    <input
                      aria-label="Post language"
                      maxLength={3}
                      value={form.body.language}
                      onChange={(event) => edit('language', event.target.value)}
                      disabled={current?.status !== undefined && current.status !== 'draft'}
                    />
                  </Field>
                </>
              )}
              <Field label="Reply to collected item">
                <select
                  aria-label="Reply to collected item"
                  value={form.body.replyEntryId}
                  onChange={(event) => edit('replyEntryId', event.target.value)}
                  disabled={current?.status !== undefined && current.status !== 'draft'}
                >
                  <option value="">New message</option>
                  {form.body.replyEntryId &&
                    !entries.some((entry) => entry.id === form.body.replyEntryId) && (
                      <option value={form.body.replyEntryId}>
                        Selected item · {form.body.replyEntryId}
                      </option>
                    )}
                  {entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.author}: {entry.title.slice(0, 80)}
                    </option>
                  ))}
                </select>
              </Field>
              <p>
                Open this connection's Post log to select collected reply targets. Unsaved composer
                changes remain in this session; saved drafts survive reload.{' '}
                {preview
                  ? 'Preview drafts reset on reload.'
                  : 'Pausing the connection blocks sending.'}
              </p>
              {digestFeed?.digest &&
                digestFeed.digest.configHash === feedFingerprint(digestFeed) && (
                  <Button
                    variant="ghost"
                    disabled={current?.status !== undefined && current.status !== 'draft'}
                    onClick={() =>
                      void act(async () => {
                        const page = preview
                          ? { revision: state.revision, decisions: evaluateFeed(state, digestFeed) }
                          : await query<HistoryPage>(
                              `/history?feedId=${encodeURIComponent(digestFeed.id)}&limit=50`,
                            );
                        const text = reviewedDigestCopy(
                          digestFeed,
                          page.decisions
                            .filter((decision) => decision.included)
                            .map((decision) => decision.entry.id),
                          state.revision,
                          page.revision,
                        );
                        edit('text', text.slice(0, 5000));
                        setMessage(
                          'Digest copied into a draft. Review references and public links before posting.',
                        );
                      })
                    }
                  >
                    Copy selected feed digest into draft
                  </Button>
                )}
              <Button
                type="submit"
                disabled={
                  busy || loading || (current?.status !== undefined && current.status !== 'draft')
                }
              >
                Save local draft
              </Button>
              <Button
                variant="secondary"
                disabled={
                  busy || loading || dirty || !form.id || !ready || current?.status !== 'draft'
                }
                onClick={() =>
                  void act(async () => {
                    if (preview)
                      setReview({
                        token: crypto.randomUUID(),
                        expiresAt: new Date(Date.now() + 300000).toISOString(),
                        draftId: form.id,
                        draftVersion: form.version,
                        sender: 'fictional.writer',
                        destination: 'Fictional server · ' + form.body.visibility,
                        body: form.body,
                        replyId: form.body.replyEntryId,
                        maxCharacters: 500,
                      });
                    else
                      setReview(await query<PostingReview>(`/outbound/drafts/${form.id}/review`));
                  })
                }
              >
                Review send
              </Button>
              {dirty && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    reset(
                      current
                        ? { id: current.id, version: current.version, body: current.body }
                        : empty,
                    );
                    setReview(undefined);
                  }}
                >
                  Discard composer changes
                </Button>
              )}
            </form>
          )}
          {loading && <p role="status">Working…</p>}
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
        </Modal>
      )}
    </section>
  );
}
