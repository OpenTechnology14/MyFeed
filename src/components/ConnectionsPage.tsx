import { useHistory } from '../history';
import { query } from '../api';
import type { Entry } from '../../shared/model';
import type { HistoryPage } from '../../shared/history';
import { useEffect, useState } from 'react';
import { CirclePlus, RefreshCw, Trash2, Workflow, FileText } from 'lucide-react';
import { connectionFeeds, LIMITS, type State } from '../../shared/model';
import { Button, SourceIcon, Toggle } from './ui';
import { relativeTime } from './TimelineEntry';
import { displayedEntry } from '../../shared/local-copy';
import { LocalItemEditor } from './LocalItemEditor';
import { GenerationReview } from './GenerationReview';
import { PostingPanel } from './PostingPanel';
import { SendOutcomeCheck } from './SendOutcomeCheck';

export function ConnectionsPage({
  state,
  preview = false,
  busy,
  selectedId,
  onSelect,
  onConnect,
  onEdit,
  mutate,
  onDelete,
  onFeed,
  onAi,
  onRead,
  activeFeedId,
}: {
  state: State;
  preview?: boolean;
  busy: boolean;
  selectedId?: string;
  onSelect: (id: string) => void;
  onConnect: () => void;
  onEdit: (id: string) => void;
  mutate: (path: string, method: string, body?: unknown) => Promise<State>;
  onDelete: (path: string, name: string) => void;
  onFeed: (id: string) => void;
  onAi: (id: string) => void;
  onRead: (id: string) => void;
  activeFeedId?: string;
}) {
  const [tab, setTab] = useState<'feeds' | 'activity'>('feeds');
  const [pipelineFeedId, setPipelineFeedId] = useState<string>();
  const [pipelineError, setPipelineError] = useState('');
  const pipelineFeed = state.feeds.find((feed) => feed.id === pipelineFeedId);
  const [savedOnly, setSavedOnly] = useState(false);
  const [logId, setLogId] = useState<string>();
  const [sourceId, itemId, replyEntryId] = (selectedId ?? '').split('~');
  const [editingId, setEditingId] = useState<string>();
  const [setupFeed, setSetupFeed] = useState(
    state.feeds.some((f) => f.id === itemId) ? itemId : activeFeedId || state.feeds[0].id,
  );
  useEffect(() => {
    if (itemId && itemId !== 'reply' && !sourceId.startsWith('capability-')) {
      setLogId(sourceId);
      setEditingId(itemId);
    }
  }, [sourceId, itemId]);

  const connection = state.connections.find((c) => c.id === sourceId) || state.connections[0];
  const logConnection = connection?.id === logId ? connection : undefined;
  function openLog(id: string) {
    onSelect(id);
    setLogId(logId === id ? undefined : id);
    setSavedOnly(false);
  }
  const fallbackEntries = state.entries.filter(
    (e) => e.connectionId === logConnection?.id && (!savedOnly || e.saved),
  );
  const history = useHistory({
    live: !preview && !!logConnection,
    revision: state.revision,
    scope: { connectionId: logConnection?.id, saved: String(savedOnly) },
    fallback: fallbackEntries.map((entry) => ({
      entry,
      connection: logConnection!,
      included: true,
      reason: 'Collected original',
      score: 0,
    })),
  });
  const entries = history.decisions.map((d) => d.entry);
  const [editingEntry, setEditingEntry] = useState<Entry>();
  const [editorError, setEditorError] = useState('');
  useEffect(() => {
    if (!editingId || preview) return;
    let cancelled = false;
    setEditorError('');
    query<HistoryPage>(`/history?entryId=${encodeURIComponent(editingId)}`)
      .then((page) => {
        if (!cancelled) {
          setEditingEntry(page.decisions[0]?.entry);
          if (!page.decisions.length) setEditorError('Item no longer exists.');
        }
      })
      .catch((error) => {
        if (!cancelled) setEditorError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [editingId, preview, state.revision]);
  const editing = editingId
    ? preview
      ? state.entries.find((e) => e.id === editingId)
      : editingEntry?.id === editingId
        ? editingEntry
        : entries.find((e) => e.id === editingId)
    : undefined;
  const runs = state.runs.filter((r) => r.connectionId === connection?.id);
  return (
    <div className="connections-layout">
      {pipelineError && <p role="alert">{pipelineError}</p>}
      {pipelineFeed && (
        <GenerationReview
          state={state}
          preview={preview}
          feed={pipelineFeed}
          onClose={() => setPipelineFeedId(undefined)}
          onGenerate={(options, revision) => {
            void mutate(`/feeds/${pipelineFeed.id}/digest`, 'POST', {
              options,
              revision,
              confirmed: true,
            }).catch((error) => setPipelineError(error.message));
          }}
        />
      )}
      {editorError && <p role="alert">{editorError}</p>}
      {editing && state.connections.some((c) => c.id === editing.connectionId) && (
        <LocalItemEditor
          key={editing.id}
          entry={editing}
          mutate={mutate}
          onClose={() => setEditingId(undefined)}
        />
      )}

      <section className="connection-library">
        <div className="section-title">
          <h2>Connections</h2>
          <Button onClick={() => onConnect()} disabled={busy}>
            <CirclePlus size={15} />
            Add connection
          </Button>
        </div>
        <p className="muted">Collect once. Use the same data in different feeds.</p>
        <section className="settings-info-card" aria-label="Connected feature setup">
          <h3>Connected features</h3>
          <p>
            Configure a capability here, then customize its feed. Local alerts need no external
            account; AI uses your own configured key.
          </p>
          <label className="field">
            <span>Target feed</span>
            <select value={setupFeed} onChange={(event) => setSetupFeed(event.target.value)}>
              {state.feeds.map((feed) => (
                <option key={feed.id} value={feed.id}>
                  {feed.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            Local alerts:{' '}
            {state.feeds.find((f) => f.id === setupFeed)?.alertsEnabled ? 'Enabled' : 'Not enabled'}{' '}
            · AI:{' '}
            {state.ai.hasSecret
              ? `Configured (${state.ai.model}); live check unverified`
              : 'Not configured'}
          </p>
          <Button variant="secondary" onClick={() => onFeed(setupFeed)}>
            Configure local alerts and feed
          </Button>
          <Button variant="secondary" onClick={() => onAi(setupFeed)}>
            Configure AI processing
          </Button>
          <p>
            AI Pipeline · Default reading digest: selected feed → reviewed originals and context →
            generated snapshot in that feed. Configure optional processing instructions in its
            customization.
          </p>
          <Button variant="secondary" onClick={() => onFeed(setupFeed)}>
            Configure pipeline profile
          </Button>
          <Button
            variant="secondary"
            disabled={busy || preview || !state.ai.hasSecret}
            onClick={() => {
              setPipelineError('');
              setPipelineFeedId(setupFeed);
            }}
          >
            Review AI Pipeline
          </Button>
          <Button variant="ghost" onClick={() => onRead(setupFeed)}>
            Return to feed
          </Button>
          <p className="muted">
            Source connections keep their 3-per-feed capacity. These workspace/local capabilities do
            not consume source slots. Saving configuration sends no alerts and makes no paid call.
          </p>
        </section>
        {state.ai.receipts?.length ? (
          <details>
            <summary>AI generation receipts</summary>
            {state.ai.receipts.map((receipt) => (
              <p key={receipt.id}>
                {new Date(receipt.at).toLocaleString()} · {receipt.model} · {receipt.status} ·
                reserved ${receipt.reservedUsd.toFixed(6)} · {receipt.inputTokens ?? '?'} input /{' '}
                {receipt.outputTokens ?? '?'} output tokens. {receipt.message}
              </p>
            ))}
          </details>
        ) : null}
        {!!state.outbound?.receipts.length && (
          <details>
            <summary>All posting receipts · {state.outbound.receipts.length}</summary>
            {state.outbound.receipts.map((receipt) => (
              <article key={receipt.id}>
                <p>
                  {new Date(receipt.at).toLocaleString()} · {receipt.sender} → {receipt.destination}{' '}
                  · {receipt.status}
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
                  connection={state.connections.find(
                    (connection) => connection.id === receipt.connectionId,
                  )}
                  preview={preview}
                  busy={busy}
                  mutate={mutate}
                />
                {!state.connections.some(
                  (connection) => connection.id === receipt.connectionId,
                ) && (
                  <small>Connection removed. Receipt retained; remote message is unchanged.</small>
                )}
              </article>
            ))}
          </details>
        )}
        <div className="source-library-list">
          {state.connections.map((c) => (
            <div className="source-library-card" key={c.id}>
              <button
                aria-pressed={c.id === connection?.id}
                onClick={() => {
                  onSelect(c.id);
                  setLogId(undefined);
                  setSavedOnly(false);
                }}
              >
                <SourceIcon kind={c.kind} />
                <span>
                  <strong>{c.name}</strong>
                  <small>
                    {state.counts?.connections[c.id] ??
                      state.entries.filter((e) => e.connectionId === c.id).length}{' '}
                    items · {connectionFeeds(c).length} feeds
                  </small>
                </span>
                <i className={`status-dot ${c.status}`} />
              </button>
              <button
                className="source-post-log"
                aria-label={`Open post log for ${c.name}`}
                aria-expanded={logConnection?.id === c.id}
                aria-controls={`post-log-${c.id}`}
                onClick={() => openLog(c.id)}
              >
                <FileText size={14} />
                Post log
              </button>
            </div>
          ))}
        </div>
        {!connection && (
          <div className="empty-results">
            <Workflow size={28} />
            <h3>Your data starts here.</h3>
            <p>Add RSS, social, email, or chat connections, then link them to your feeds.</p>
          </div>
        )}
      </section>
      {connection && (
        <section className="connection-detail" key={connection.id}>
          <div className="section-title">
            <div>
              <h2>{connection.name}</h2>
              <p className="muted">
                {connection.kind === 'sample'
                  ? 'Fictional sample connection'
                  : connection.account || connection.endpoint}
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={busy || !connection.enabled}
              onClick={() =>
                void mutate(`/connections/${connection.id}/sync`, 'POST', {}).catch(() => {})
              }
            >
              <RefreshCw size={15} />
              Refresh connection
            </Button>
          </div>
          <div className="section-title">
            <Button variant="secondary" onClick={() => onEdit(connection.id)} disabled={busy}>
              Edit connection
            </Button>
            <Button
              variant="secondary"
              disabled={busy || !connection.enabled}
              onClick={() =>
                void mutate(`/connections/${connection.id}/check`, 'POST', {}).catch(() => {})
              }
            >
              Check connection
            </Button>
          </div>
          {connection.check && (
            <p role="status" className="notice">
              {connection.check.status === 'read-succeeded'
                ? `Read succeeded: ${connection.check.fetched} items available. Check did not collect or change items.`
                : connection.check.message}
            </p>
          )}
          <p className="muted">
            {connection.lastSync
              ? `Last synced ${relativeTime(connection.lastSync)}`
              : 'Ready for its first sync'}{' '}
            · {connection.status}
          </p>
          {(['rocket', 'mastodon'].includes(connection.kind) || preview) && (
            <PostingPanel
              key={connection.id}
              connection={connection}
              state={state}
              entries={entries}
              preview={preview}
              busy={busy}
              mutate={mutate}
              initialReplyEntryId={itemId === 'reply' ? replyEntryId : undefined}
              digestFeed={state.feeds.find((feed) => feed.id === setupFeed)}
            />
          )}
          {connection.syncHealth?.nextRetryAt && (
            <p className="notice">
              Automatic retry after {new Date(connection.syncHealth.nextRetryAt).toLocaleString()}.
              Refresh connection retries now.
            </p>
          )}
          {connection.progress?.partial && (
            <p className="notice">
              Bounded catch-up is incomplete. Refresh again to continue collecting.
            </p>
          )}
          {connection.lastSync &&
            ['rocket', 'mastodon', 'bluesky', 'youtube', 'email'].includes(connection.kind) && (
              <Button
                variant="secondary"
                disabled={busy || !connection.enabled || connection.progress?.historyComplete}
                onClick={() =>
                  void mutate(`/connections/${connection.id}/history`, 'POST', {}).catch(() => {})
                }
              >
                {connection.progress?.historyComplete
                  ? 'Provider history reached; retention applies'
                  : 'Load older source items'}
              </Button>
            )}
          {['rocket', 'mastodon', 'bluesky', 'youtube', 'email'].includes(connection.kind) && (
            <p className="muted">
              Older collection retains the newest {LIMITS.itemsPerConnection} unsaved items plus
              every saved item. Older unsaved items outside that limit will not stay in the post
              log.
            </p>
          )}
          {connection.error && <p className="notice error">{connection.error}</p>}
          <div className="connection-controls">
            <div className="toggle-row">
              <div>
                <strong>Connection enabled</strong>
                <small>Pause collection and hide this source from feed views.</small>
              </div>
              <Toggle
                label="Connection enabled"
                checked={connection.enabled}
                disabled={busy}
                onChange={(enabled) =>
                  void mutate(`/connections/${connection.id}`, 'PATCH', { enabled }).catch(() => {})
                }
              />
            </div>
            <div className="toggle-row">
              <div>
                <strong>Background sync</strong>
                <small>Check every 5 minutes while the local server runs.</small>
              </div>
              <Toggle
                label="Background sync"
                checked={!!connection.background}
                disabled={busy}
                onChange={(background) =>
                  void mutate(`/connections/${connection.id}`, 'PATCH', { background }).catch(
                    () => {},
                  )
                }
              />
            </div>
          </div>
          {logConnection && (
            <section
              className="connection-post-log"
              id={`post-log-${logConnection.id}`}
              aria-label={`${logConnection.name} post log`}
            >
              <div className="section-title">
                <h3>Post log · {logConnection.name}</h3>
                <Button variant="ghost" onClick={() => setLogId(undefined)}>
                  Close post log
                </Button>
              </div>
              <div className="section-title">
                <p className="muted">Collected originals, before any feed filters.</p>
                <button
                  className="filter-button"
                  aria-pressed={savedOnly}
                  onClick={() => setSavedOnly(!savedOnly)}
                >
                  Saved
                </button>
              </div>
              <div className="collected-items">
                {entries.map((e) => (
                  <details key={e.id} className="collected-item">
                    <summary>
                      <div>
                        <strong>{e.author}</strong>
                        <small>{relativeTime(e.publishedAt)}</small>
                      </div>
                      <h3>{displayedEntry(e).title}</h3>
                      {e.localEdit && <small>Edited local copy</small>}
                    </summary>
                    {e.contentWarning && <p className="notice">{e.contentWarning}</p>}
                    <p>{displayedEntry(e).content}</p>
                    {e.localEdit && (
                      <details>
                        <summary>Show original</summary>
                        <h3>{e.title}</h3>
                        <p>{e.content}</p>
                      </details>
                    )}
                    <Button variant="secondary" disabled={busy} onClick={() => setEditingId(e.id)}>
                      Edit local copy
                    </Button>
                    {(['rocket', 'mastodon'].includes(connection.kind) || preview) && (
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => onSelect(`${connection.id}~reply~${e.id}`)}
                      >
                        Reply using this connection
                      </Button>
                    )}
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        void mutate(`/entries/${e.id}`, 'PATCH', { saved: !e.saved }).catch(
                          () => {},
                        )
                      }
                    >
                      {e.saved ? 'Unsave' : 'Save'}
                    </button>
                  </details>
                ))}
              </div>
              {history.loading && <p role="status">Loading post log…</p>}
              {history.error && (
                <p role="alert">
                  {history.error}
                  <Button onClick={history.reload}>Reload post log</Button>
                </p>
              )}
              {history.hasMore && (
                <Button
                  variant="secondary"
                  disabled={history.loading}
                  onClick={() => void history.more()}
                >
                  Load more collected items
                </Button>
              )}
              <p className="quiet-note">
                {entries.length} loaded / {history.total} matching items.
              </p>
              {!entries.length && !history.loading && (
                <p className="table-empty">
                  {savedOnly
                    ? 'No saved items in this connection.'
                    : 'Refresh this connection to collect its first items.'}
                </p>
              )}
            </section>
          )}
          <nav className="background-tabs" aria-label="Connection details">
            {(['feeds', 'activity'] as const).map((id) => (
              <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                {id === 'feeds' ? 'Linked feeds' : 'Activity'}
              </button>
            ))}
          </nav>
          {tab === 'feeds' && (
            <div className="connection-choices">
              <p className="muted">
                Each feed applies its own filters. Unlinking keeps this connection’s data.
              </p>
              {state.feeds.map((f) => {
                const linked = connectionFeeds(connection).includes(f.id);
                const full =
                  state.connections.filter((c) => connectionFeeds(c).includes(f.id)).length >=
                  LIMITS.connectionsPerFeed;
                return (
                  <div className="connection-feed-row" key={f.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={linked}
                        disabled={busy || (!linked && full)}
                        onChange={() =>
                          void mutate(`/connections/${connection.id}`, 'PATCH', {
                            feedIds: linked
                              ? connectionFeeds(connection).filter((id) => id !== f.id)
                              : [...connectionFeeds(connection), f.id],
                          }).catch(() => {})
                        }
                      />
                      <span>
                        {f.name}
                        <small>
                          {full && !linked
                            ? '3 connections already linked'
                            : linked
                              ? 'Linked to this connection'
                              : 'Available to link'}
                        </small>
                      </span>
                    </label>
                    <button className="text-button" onClick={() => onFeed(f.id)}>
                      Customize filters
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {tab === 'activity' && (
            <div className="activity-list">
              {runs.map((r) => (
                <article className="config-card" key={r.id}>
                  <h3>
                    {r.trigger === 'background' ? 'Background sync' : 'Manual sync'} ·{' '}
                    {relativeTime(r.at)}
                  </h3>
                  <p>
                    {r.fetched} fetched · {r.added} new · {r.errors.length} errors
                  </p>
                  {r.errors.map((e, i) => (
                    <p className="error-text" key={i}>
                      {e}
                    </p>
                  ))}
                </article>
              ))}
              {!runs.length && <p className="table-empty">Sync history will appear here.</p>}
            </div>
          )}
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => onDelete(`/connections/${connection.id}`, connection.name)}
          >
            <Trash2 size={14} />
            Remove connection
          </Button>
        </section>
      )}
    </div>
  );
}
