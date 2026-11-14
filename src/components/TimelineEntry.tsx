import { displayedEntry } from '../../shared/local-copy';
import { useState } from 'react';
import { ArrowUpRight, Bookmark, Check, Info } from 'lucide-react';
import type { Decision, Entry, TextLimit } from '../../shared/model';
import { itemExcerpt } from '../../shared/text';
import { entryType } from '../../shared/presentation';
import { SourceIcon } from './ui';

export function relativeTime(date: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(date)) / 60000));
  return minutes < 1
    ? 'Just now'
    : minutes < 60
      ? `${minutes}m`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h`
        : new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
export function AuthorAvatar({ entry, small = false }: { entry: Entry; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const initials = entry.author
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
  return (
    <span className={`author-avatar ${small ? 'small' : ''}`}>
      {entry.avatar && !failed ? (
        <img
          src={entry.avatar}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        initials || '?'
      )}
    </span>
  );
}
export function EntryMedia({
  entry,
  visible = true,
  size = 'normal',
}: {
  entry: Entry;
  visible?: boolean;
  size?: 'small' | 'normal' | 'large';
}) {
  const items = entry.media?.length
    ? entry.media
    : entry.image
      ? [{ url: entry.image, alt: '' }]
      : [];
  const [show, setShow] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  if (!visible && !show && items.length)
    return (
      <button className="text-button" onClick={() => setShow(true)}>
        Show retained media ({items.length})
      </button>
    );
  return items.length ? (
    <div className={`entry-media count-${items.length} media-${size}`}>
      {items.map((m, i) =>
        failed.includes(m.url) ? (
          <p key={`${m.url}-${i}`} className="notice">
            Image unavailable{m.alt ? `: ${m.alt}` : '.'}
          </p>
        ) : (
          <img
            key={`${m.url}-${i}`}
            src={m.url}
            alt={m.alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed((old) => [...old, m.url])}
          />
        ),
      )}
    </div>
  ) : null;
}
export function TimelineEntry({
  decision,
  textLimit = { mode: 'default' },
  showMedia = true,
  mediaSize = 'normal',
  busy,
  onOpen,
  onEdit,
  onReply,
  mutate,
}: {
  decision: Decision;
  textLimit?: TextLimit;
  showMedia?: boolean;
  mediaSize?: 'small' | 'normal' | 'large';
  busy: boolean;
  onOpen: (decision: Decision) => void;
  onEdit?: (entry: Entry) => void;
  onReply?: (entry: Entry) => void;
  mutate: (path: string, method: string, body: unknown) => Promise<unknown>;
}) {
  const { connection: c, reason } = decision;
  const e = displayedEntry(decision.entry);
  const type = entryType(decision),
    article = type === 'article' || type === 'email';
  const [explained, setExplained] = useState(false),
    [expanded, setExpanded] = useState(false),
    [revealed, setRevealed] = useState(false);
  const hidden = !!e.contentWarning && !revealed;
  const excerpt = itemExcerpt(e.content, textLimit, article ? 'article' : 'post');
  const content = expanded ? e.content : excerpt.text;
  return (
    <article className={`timeline-entry ${type} ${e.read ? 'read' : ''}`}>
      <AuthorAvatar entry={e} />
      <div className="entry-main">
        <div className="entry-author">
          <strong>{e.author}</strong>
          {e.authorHandle && <span>{e.authorHandle}</span>}
          <span className="entry-timestamp">· {relativeTime(e.publishedAt)}</span>
          {c.kind === 'sample' && <span className="sample-label">Sample</span>}
        </div>
        {e.localEdit && (
          <details className="local-copy-original">
            <summary>Edited local copy · Show original</summary>
            <h3>{decision.entry.title}</h3>
            {decision.entry.contentWarning ? (
              <details>
                <summary>Content warning — Reveal original</summary>
                <p>{decision.entry.content}</p>
              </details>
            ) : (
              <p>{decision.entry.content}</p>
            )}
          </details>
        )}
        <div className="entry-origin">
          <SourceIcon kind={c.kind} small />
          <span>{c.name}</span>
          {type === 'email' && <span>· Email</span>}
        </div>
        {e.contentWarning && (
          <button
            className="content-warning"
            aria-expanded={revealed}
            onClick={() => setRevealed(!revealed)}
          >
            {e.contentWarning}
            <span>{revealed ? 'Hide content' : 'Show content'}</span>
          </button>
        )}
        {!hidden && (
          <>
            {article ? (
              <button
                className="article-preview"
                aria-label={e.title}
                onClick={() => onOpen(decision)}
              >
                <span className="article-domain">
                  {type === 'email'
                    ? 'FROM YOUR MAILBOX'
                    : e.url
                      ? new URL(e.url).hostname
                      : 'ARTICLE'}
                </span>
                <h3>{e.title}</h3>
                {e.content && <p>{excerpt.text}</p>}
                <span className="article-open">
                  {type === 'email' ? 'Read message' : 'Read article'}
                  <ArrowUpRight size={14} />
                </span>
              </button>
            ) : (
              <>
                <p className="post-body">{content}</p>
                {excerpt.truncated && (
                  <button
                    className="text-button expand-post"
                    aria-expanded={expanded}
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            )}
            <EntryMedia
              key={`${e.id}-${showMedia}`}
              entry={e}
              visible={showMedia}
              size={mediaSize}
            />
            {e.tags.length > 0 && (
              <div className="entry-tags">
                {e.tags.slice(0, 3).map((tag, i) => (
                  <span key={`${tag}-${i}`}>#{tag.replace(/\s/g, '')}</span>
                ))}
              </div>
            )}
          </>
        )}
        <div className="entry-actions">
          {onReply && c.posting?.enabled && c.enabled && (
            <button
              aria-label={`Reply to: ${e.title}`}
              disabled={busy}
              onClick={() => onReply(decision.entry)}
            >
              Reply
            </button>
          )}
          {onEdit && (
            <button
              aria-label={`Edit local copy: ${e.title}`}
              disabled={busy}
              onClick={() => onEdit(decision.entry)}
            >
              Edit local copy
            </button>
          )}
          <button
            className={e.saved ? 'selected' : ''}
            aria-label={e.saved ? `Unsave ${e.title}` : `Save ${e.title}`}
            disabled={busy}
            onClick={() => {
              void mutate(`/entries/${e.id}`, 'PATCH', { saved: !e.saved }).catch(() => {});
            }}
          >
            <Bookmark size={16} fill={e.saved ? 'currentColor' : 'none'} />
            <span>{e.saved ? 'Saved' : 'Save'}</span>
          </button>
          <button
            disabled={busy}
            aria-label={`${e.read ? 'Mark unread' : 'Mark read'}: ${e.title}`}
            onClick={() => {
              void mutate(`/entries/${e.id}`, 'PATCH', { read: !e.read }).catch(() => {});
            }}
          >
            <Check size={16} />
            <span>{e.read ? 'Read' : 'Mark read'}</span>
          </button>
          {e.url && (
            <a href={e.url} target="_blank" rel="noreferrer">
              <ArrowUpRight size={16} />
              <span>Open source</span>
            </a>
          )}
          <button
            className="entry-info"
            aria-label={`Why is ${e.title} in my feed?`}
            aria-expanded={explained}
            onClick={() => setExplained(!explained)}
          >
            <Info size={15} />
          </button>
        </div>
        {explained && <p className="entry-explanation">{reason}</p>}
      </div>
    </article>
  );
}
