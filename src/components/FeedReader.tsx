import { useHistory } from '../history';
import { GenerationReview } from './GenerationReview';
import type { GenerationOptions } from '../../shared/generation';
import { displayedEntry } from '../../shared/local-copy';
import {
  connectionFeeds,
  type Decision,
  type Feed,
  type State,
  type Kind,
} from '../../shared/model';
import { type CSSProperties, useState } from 'react';
import {
  ArrowUpRight,
  ArrowLeft,
  Bookmark,
  Filter,
  Search,
  Sparkles,
  BookOpen,
  SlidersHorizontal,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { feedFingerprint } from '../../shared/pipeline';
import { mentionAlerts, alertExcerpt } from '../../shared/alerts';
import { groupConversations, timelineItems } from '../../shared/presentation';
import { Button, SourceIcon, Modal, Field } from './ui';
import { StarterFeed } from './StarterFeed';
import { TimelineEntry, EntryMedia, relativeTime } from './TimelineEntry';
import { ConversationPreview, ConversationPanel } from './ConversationView';

export function FeedReader({
  state,
  preview = false,
  feed,
  decisions,
  savedOnly: initialSaved,
  busy,
  searchOpen,
  onCloseSearch,
  onConnect,
  onBackground,
  onSettings,
  onEdit,
  onReply,
  onAlertSetup,
  mutate,
  onDigest,
  syncing,
  onRefresh,
}: {
  state: State;
  preview?: boolean;
  feed: Feed;
  decisions: Decision[];
  savedOnly: boolean;
  busy: boolean;
  searchOpen: boolean;
  onCloseSearch: () => void;
  onConnect: (kind?: Kind) => void;
  onBackground: () => void;
  onSettings: () => void;
  onAlertSetup: () => void;
  onEdit: (entry: import('../../shared/model').Entry) => void;
  onReply: (entry: import('../../shared/model').Entry) => void;
  mutate: (path: string, method: string, body: unknown) => Promise<unknown>;
  onDigest: (options: GenerationOptions, revision: number) => void;
  syncing: boolean;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState(''),
    [unread, setUnread] = useState(false),
    [savedOnly, setSavedOnly] = useState(initialSaved);
  const [reading, setReading] = useState<string>(),
    [activeConversation, setActiveConversation] = useState<string>(),
    [alertsOpen, setAlertsOpen] = useState(false),
    [generationReview, setGenerationReview] = useState(false);
  const sources = state.connections.filter((c) => connectionFeeds(c).includes(feed.id));
  const fallbackEligible = decisions.filter(
    (d) =>
      (savedOnly ? d.entry.saved : d.included) &&
      (!unread || !d.entry.read) &&
      `${d.entry.title} ${d.entry.content} ${d.entry.author} ${d.entry.authorHandle || ''} ${d.entry.chat?.channelName || ''}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const history = useHistory({
    live: !preview,
    revision: state.revision,
    scope: {
      feedId: feed.id,
      saved: String(savedOnly),
      unread: String(unread),
      q: query,
      conversation: activeConversation,
    },
    fallback: fallbackEligible,
  });
  const eligible = history.decisions;
  const alertHistory = useHistory({
    live: !preview && alertsOpen,
    revision: state.revision,
    scope: { feedId: feed.id, alerts: 'true', limit: '50' },
    fallback: mentionAlerts(decisions, feed),
  });
  const conversations = groupConversations(eligible);
  const conversation = conversations.find((c) => c.id === activeConversation);
  const items = timelineItems(eligible);
  const alerts = alertHistory.decisions;
  const included = preview
    ? decisions.filter((d) => d.included).length
    : (state.counts?.feeds[feed.id]?.included ?? history.includedTotal);
  const [readingSnapshot, setReadingSnapshot] = useState<Decision>();
  const readingDecision =
    eligible.find((d) => d.entry.id === reading) ||
    (reading && state.connections.some((c) => c.id === readingSnapshot?.connection.id)
      ? readingSnapshot
      : undefined);
  function openEntry(d: Decision) {
    setReading(d.entry.id);
    setReadingSnapshot(d);
    setAlertsOpen(false);
    if (!d.entry.read)
      void mutate(`/entries/${d.entry.id}`, 'PATCH', { read: true }).catch(() => {});
  }
  return (
    <div
      className={`reading-layout content-first reading-width-${feed.readingWidth} ${conversation ? 'chat-mode' : ''}`}
      style={
        {
          '--reading-font': `${feed.fontSize}px`,
          '--reading-line': feed.lineSpacing,
        } as CSSProperties
      }
    >
      <section className="reading-main">
        <div className="feed-topline">
          <span>The latest from your world</span>
          <div>
            <button
              className={`filter-button ${savedOnly ? 'selected' : ''}`}
              aria-pressed={savedOnly}
              onClick={() => {
                setSavedOnly(!savedOnly);
                setActiveConversation(undefined);
              }}
            >
              <Bookmark size={14} />
              Saved
            </button>
            <button
              className={`filter-button ${unread ? 'selected' : ''}`}
              aria-pressed={unread}
              onClick={() => setUnread(!unread)}
            >
              <Filter size={14} />
              Unread
            </button>
            <button
              className="filter-button"
              aria-label={`Alerts (${preview ? mentionAlerts(decisions, feed).filter((d) => !d.entry.read).length : (state.counts?.feeds[feed.id]?.unreadAlerts ?? 0)} unread)`}
              aria-haspopup="dialog"
              onClick={() => setAlertsOpen(true)}
            >
              <Bell size={14} />
              Alerts
              {alerts.some((d) => !d.entry.read) && (
                <span className="alert-count">
                  {preview
                    ? mentionAlerts(decisions, feed).filter((d) => !d.entry.read).length
                    : (state.counts?.feeds[feed.id]?.unreadAlerts ?? 0)}
                </span>
              )}
            </button>
            <button
              className="filter-button"
              disabled={busy || !sources.length}
              onClick={onRefresh}
            >
              <RefreshCw size={14} className={syncing ? 'spin' : ''} />
              {syncing ? 'Refreshing…' : 'Refresh feed'}
            </button>
          </div>
        </div>
        {query && (
          <div className="search-status">
            <span>
              Search: “{query}” · {eligible.length} items
            </span>
            <button
              className="text-button"
              onClick={() => {
                setQuery('');
                setActiveConversation(undefined);
              }}
            >
              Clear search
            </button>
          </div>
        )}
        {!sources.length && !savedOnly ? (
          <StarterFeed onConnect={onConnect} onBackground={onBackground} />
        ) : conversation ? (
          <>
            <Button variant="ghost" onClick={() => setActiveConversation(undefined)}>
              <ArrowLeft size={15} />
              Back to feed
            </Button>
            <ConversationPanel
              onEdit={onEdit}
              onReply={onReply}
              conversation={conversation}
              busy={busy}
              mutate={mutate}
            />
          </>
        ) : (
          <>
            {feed.digest &&
              !savedOnly &&
              feed.digest.configHash === feedFingerprint(feed) &&
              feed.digest.itemIds.every((id) =>
                decisions.some((d) => d.included && d.entry.id === id),
              ) && (
                <details className="digest-card">
                  <summary>
                    <Sparkles size={15} />
                    Your reading digest<small>{relativeTime(feed.digest.createdAt)}</small>
                  </summary>
                  <p>{feed.digest.text}</p>
                  <div className="digest-references">
                    {feed.digest.itemIds.map((id, index) => {
                      const entry = state.entries.find((e) => e.id === id);
                      return entry?.url ? (
                        <a key={id} href={entry.url} rel="noreferrer" target="_blank">
                          [{index + 1}] {entry.title.slice(0, 65)}
                        </a>
                      ) : (
                        <span key={id}>
                          [{index + 1}] {entry?.title || 'Source removed'}
                        </span>
                      );
                    })}
                  </div>
                  <small>{feed.digest.model} · Snapshot at generation time</small>
                </details>
              )}
            {!eligible.length && !history.loading && (
              <div className="empty-results">
                <BookOpen size={30} />
                <h3>{savedOnly ? 'Good reads, kept close.' : 'Nothing here just yet.'}</h3>
                <p>
                  {savedOnly
                    ? 'Save an update or message to keep it close.'
                    : 'Clear your search, turn off Unread, or adjust your feed filters.'}
                </p>
                <Button variant="secondary" onClick={onBackground}>
                  Manage feed rules
                </Button>
              </div>
            )}
            <div className={`social-timeline ${feed.layout}`}>
              {items.map((item) =>
                item.type === 'entry' ? (
                  <TimelineEntry
                    key={item.decision.entry.id}
                    decision={item.decision}
                    textLimit={
                      feed.textOverrides?.[
                        ['article', 'email'].includes(item.decision.entry.type ?? 'article')
                          ? 'article'
                          : 'post'
                      ] ?? feed.textLimit
                    }
                    showMedia={feed.showMedia}
                    mediaSize={feed.mediaSize}
                    busy={busy}
                    onOpen={openEntry}
                    onEdit={onEdit}
                    onReply={onReply}
                    mutate={mutate}
                  />
                ) : (
                  <ConversationPreview
                    key={item.conversation.id}
                    conversation={item.conversation}
                    textLimit={feed.textOverrides?.chat ?? feed.textLimit}
                    previewCount={feed.conversationPreviewCount}
                    onOpen={setActiveConversation}
                  />
                ),
              )}
            </div>
          </>
        )}
        {history.loading && <p role="status">Loading collected history…</p>}
        {history.error && (
          <p role="alert" className="notice">
            {history.error}{' '}
            <Button variant="secondary" onClick={history.reload}>
              Reload history
            </Button>
          </p>
        )}
        {history.hasMore && (
          <Button
            variant="secondary"
            disabled={history.loading}
            onClick={() => void history.more()}
          >
            Load more matching items
          </Button>
        )}
        <p className="quiet-note">
          {eligible.length} loaded / {history.total} matching items.
        </p>
      </section>
      {!conversation && !!sources.length && (
        <aside className="reader-aside">
          <div className="aside-card content-sources">
            <h3>In this feed</h3>
            {sources.map((c) => (
              <div key={c.id} className="aside-source">
                <SourceIcon kind={c.kind} small />
                <strong>{c.name}</strong>
                <i className={`status-dot ${c.status}`} />
              </div>
            ))}
            <button className="text-button" onClick={onBackground}>
              Edit this feed
              <SlidersHorizontal size={13} />
            </button>
          </div>
          <div className="aside-card ai-card">
            <Sparkles size={20} />
            <h3>Catch up, at your pace.</h3>
            <p>A short digest of the updates that made it into your feed.</p>
            <Button
              variant="secondary"
              disabled={busy || !included}
              onClick={state.ai.hasSecret ? () => setGenerationReview(true) : onSettings}
            >
              {state.ai.hasSecret ? 'Generate digest' : 'Connect your AI provider'}
            </Button>
            {state.ai.hasSecret && <small>Sends up to 20 included items to OpenAI.</small>}
          </div>
        </aside>
      )}
      {generationReview && (
        <GenerationReview
          state={state}
          preview={preview}
          feed={feed}
          onClose={() => setGenerationReview(false)}
          onGenerate={onDigest}
        />
      )}
      {searchOpen && (
        <Modal top title="Search this feed" subtitle={feed.name} onClose={onCloseSearch}>
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              onCloseSearch();
            }}
          >
            <Field label="Search posts, people, and conversations">
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveConversation(undefined);
                }}
                placeholder="Search this feed…"
              />
            </Field>
            <p className="muted">{history.total} matching items in this feed.</p>
            <div className="modal-footer">
              <Button
                variant="ghost"
                onClick={() => {
                  setQuery('');
                  setActiveConversation(undefined);
                }}
              >
                Clear search
              </Button>
              <Button type="submit">
                <Search size={15} />
                Show results
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {alertsOpen && (
        <Modal
          top
          title="Mention alerts"
          subtitle={`Tagged updates in ${feed.name}`}
          onClose={() => setAlertsOpen(false)}
        >
          {!feed.alertsEnabled || !feed.alertHandles?.length ? (
            <div className="empty-results">
              <Bell size={26} />
              <h3>Choose the mentions that matter.</h3>
              <p>Enable alerts and add your @handles in feed customization.</p>
              <Button
                onClick={() => {
                  setAlertsOpen(false);
                  onAlertSetup();
                }}
              >
                Configure alerts
              </Button>
            </div>
          ) : !alerts.length ? (
            <div className="empty-results">
              <Bell size={26} />
              <h3>No mentions in this feed yet.</h3>
              <p>Matching collected posts will appear here after your feed filters.</p>
            </div>
          ) : (
            <div className="mention-alerts">
              {alerts.map((d) => (
                <article key={d.entry.id}>
                  <div>
                    <strong>{d.entry.author}</strong>
                    <small>
                      {d.connection.name} · {relativeTime(d.entry.publishedAt)}
                    </small>
                  </div>
                  <p>
                    {d.entry.contentWarning
                      ? `Content warning: ${d.entry.contentWarning}`
                      : alertExcerpt(d.entry.content || d.entry.title)}
                  </p>
                  <Button variant="secondary" onClick={() => openEntry(d)}>
                    Open tagged post
                  </Button>
                  {!d.entry.read && <span className="sample-label">Unread</span>}
                </article>
              ))}
            </div>
          )}
          {alertHistory.hasMore && (
            <Button disabled={alertHistory.loading} onClick={() => void alertHistory.more()}>
              Load more alerts
            </Button>
          )}
          {alertHistory.error && <p role="alert">{alertHistory.error}</p>}
          <p className="quiet-note">
            Mentions match your configured @handles in collected text. Summaries are excerpts; no AI
            or external delivery runs.
          </p>
        </Modal>
      )}
      {readingDecision && (
        <Modal
          title={displayedEntry(readingDecision.entry).title}
          subtitle={`${readingDecision.entry.author} · ${relativeTime(readingDecision.entry.publishedAt)}`}
          onClose={() => setReading(undefined)}
          wide
        >
          {readingDecision.entry.contentWarning ? (
            <details className="warning-content">
              <summary>{readingDecision.entry.contentWarning} — Show content</summary>
              <div
                className="article-body"
                style={{ fontSize: feed.fontSize, lineHeight: feed.lineSpacing }}
              >
                {displayedEntry(readingDecision.entry).content}
              </div>
              <EntryMedia entry={readingDecision.entry} />
            </details>
          ) : (
            <>
              <div
                className="article-body"
                style={{ fontSize: feed.fontSize, lineHeight: feed.lineSpacing }}
              >
                {displayedEntry(readingDecision.entry).content}
              </div>
              <EntryMedia entry={readingDecision.entry} />
            </>
          )}
          {readingDecision.entry.localEdit && (
            <details>
              <summary>Edited local copy · Show original</summary>
              <h3>{readingDecision.entry.title}</h3>
              {readingDecision.entry.contentWarning ? (
                <details>
                  <summary>Content warning — Reveal original</summary>
                  <p>{readingDecision.entry.content}</p>
                </details>
              ) : (
                <p>{readingDecision.entry.content}</p>
              )}
            </details>
          )}
          <Button variant="secondary" onClick={() => onEdit(readingDecision.entry)}>
            Edit local copy
          </Button>
          <p className="article-reason">{readingDecision.reason}</p>
          <div className="modal-footer">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void mutate(`/entries/${readingDecision.entry.id}`, 'PATCH', {
                  saved: !readingDecision.entry.saved,
                }).catch(() => {})
              }
            >
              <Bookmark size={15} />
              {readingDecision.entry.saved ? 'Saved for later' : 'Save for later'}
            </Button>
            {readingDecision.entry.url && (
              <a
                className="button primary"
                href={readingDecision.entry.url}
                target="_blank"
                rel="noreferrer"
              >
                Read at source
                <ArrowUpRight size={15} />
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
