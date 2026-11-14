import { displayedEntry } from '../../shared/local-copy';
import { useState } from 'react';
import { Bookmark, Check, Hash, MessageCircle, ArrowLeft } from 'lucide-react';
import type { TextLimit } from '../../shared/model';
import { itemExcerpt } from '../../shared/text';
import type { Conversation } from '../../shared/presentation';
import { AuthorAvatar, EntryMedia, relativeTime } from './TimelineEntry';
import { Button } from './ui';

export function ConversationPreview({
  conversation: c,
  textLimit = { mode: 'default' },
  previewCount = 3,
  onOpen,
}: {
  conversation: Conversation;
  onOpen: (id: string) => void;
  textLimit?: TextLimit;
  previewCount?: number;
}) {
  const shown = c.messages.slice(-previewCount);
  return (
    <article className="conversation-preview">
      <div className="conversation-preview-heading">
        <span className="channel-icon">
          <Hash size={20} />
        </span>
        <div>
          <strong>#{c.channel}</strong>
          <span>
            {c.source.name} · {c.thread ? 'Thread' : 'Channel'}
            {c.source.kind === 'sample'
              ? ' · Sample conversation'
              : ' · Collected history may be partial'}
          </span>
        </div>
        <time>{relativeTime(c.latestAt)}</time>
      </div>
      <div className="conversation-preview-messages">
        {shown.map(({ entry: e }) => (
          <div key={e.id}>
            <AuthorAvatar entry={e} small />
            <p>
              <strong>{e.author}</strong>
              <span>
                {e.contentWarning
                  ? `Content warning: ${e.contentWarning}`
                  : itemExcerpt(displayedEntry(e).content, textLimit, 'chat').text}
              </span>
            </p>
          </div>
        ))}
      </div>
      <button className="open-conversation" onClick={() => onOpen(c.id)}>
        <MessageCircle size={15} />
        {c.messages.length} collected messages
        {c.messages.length > shown.length ? ` · showing ${shown.length}` : ''}
        <span>Open conversation →</span>
      </button>
    </article>
  );
}
function ChatContent({ entry }: { entry: import('../../shared/model').Entry }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <>
      {entry.contentWarning && (
        <button
          className="content-warning"
          aria-expanded={revealed}
          onClick={() => setRevealed(!revealed)}
        >
          {entry.contentWarning}
          <span>{revealed ? 'Hide content' : 'Show content'}</span>
        </button>
      )}
      {(!entry.contentWarning || revealed) && (
        <>
          <p>{displayedEntry(entry).content}</p>
          {entry.localEdit && (
            <details>
              <summary>Edited local copy · Show original</summary>
              <p>{entry.content}</p>
            </details>
          )}
          <EntryMedia entry={entry} />
        </>
      )}
    </>
  );
}
export function ConversationPanel({
  conversation: c,
  busy,
  onBack,
  onEdit,
  onReply,
  mutate,
}: {
  conversation: Conversation;
  busy: boolean;
  onBack?: () => void;
  onEdit?: (entry: import('../../shared/model').Entry) => void;
  onReply?: (entry: import('../../shared/model').Entry) => void;
  mutate: (path: string, method: string, body: unknown) => Promise<unknown>;
}) {
  return (
    <section className="conversation-panel" aria-label={`Conversation in ${c.channel}`}>
      <header>
        {onBack && (
          <Button
            variant="ghost"
            className="conversation-back icon-button"
            aria-label="Back to conversations"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
          </Button>
        )}
        <span className="channel-icon">
          <Hash size={21} />
        </span>
        <div>
          <h2>#{c.channel}</h2>
          <p>
            {c.thread ? 'Thread' : 'Channel'} · {c.messages.length} collected messages ·{' '}
            {c.source.name}
          </p>
        </div>
        {c.source.kind === 'sample' && <span className="sample-label">Sample</span>}
      </header>
      <div className="conversation-messages">
        {c.messages.map(({ entry: e }) => (
          <article className="chat-message" key={e.id}>
            <AuthorAvatar entry={e} small />
            <div>
              <div className="chat-message-author">
                <strong>{e.author}</strong>
                <time dateTime={e.publishedAt}>
                  {new Date(e.publishedAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </time>
                <button
                  aria-label={`${e.read ? 'Mark unread' : 'Mark read'}: ${e.title}`}
                  className={e.read ? 'selected' : ''}
                  disabled={busy}
                  onClick={() => {
                    void mutate(`/entries/${e.id}`, 'PATCH', { read: !e.read }).catch(() => {});
                  }}
                >
                  <Check size={14} />
                </button>
                <button
                  aria-label={e.saved ? `Unsave ${e.title}` : `Save ${e.title}`}
                  className={e.saved ? 'selected' : ''}
                  disabled={busy}
                  onClick={() => {
                    void mutate(`/entries/${e.id}`, 'PATCH', { saved: !e.saved }).catch(() => {});
                  }}
                >
                  <Bookmark size={14} fill={e.saved ? 'currentColor' : 'none'} />
                </button>
              </div>
              <ChatContent entry={e} />
              {onReply && c.source.posting?.enabled && c.source.enabled && (
                <button
                  className="text-button"
                  aria-label={`Reply to message by ${e.author}`}
                  disabled={busy}
                  onClick={() => onReply(e)}
                >
                  Reply
                </button>
              )}
              {onEdit && (
                <button className="text-button" onClick={() => onEdit(e)}>
                  Edit local copy
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <footer>Messages collected from this source. Your feed filters still apply.</footer>
    </section>
  );
}
export function ChatsView({
  conversations,
  activeId,
  setActiveId,
  busy,
  mutate,
}: {
  conversations: Conversation[];
  activeId?: string;
  setActiveId: (id?: string) => void;
  busy: boolean;
  mutate: (path: string, method: string, body: unknown) => Promise<unknown>;
}) {
  const active =
    conversations.find((c) => c.id === activeId) || (activeId ? conversations[0] : undefined);
  return (
    <div className={`chats-view ${active ? 'has-conversation' : ''}`}>
      <nav className="conversation-list" aria-label="Conversations">
        <div className="conversation-list-label">
          CONVERSATIONS <span>{conversations.length}</span>
        </div>
        {conversations.map((c) => {
          const latest = c.messages.at(-1)!.entry;
          return (
            <button
              key={c.id}
              className={active?.id === c.id ? 'selected' : ''}
              aria-current={active?.id === c.id ? 'true' : undefined}
              onClick={() => setActiveId(c.id)}
            >
              <span className="channel-icon">
                <Hash size={17} />
              </span>
              <div>
                <strong>
                  #{c.channel}
                  <time>{relativeTime(c.latestAt)}</time>
                </strong>
                <p>
                  {latest.author}:{' '}
                  {latest.contentWarning
                    ? `Content warning: ${latest.contentWarning}`
                    : latest.content}
                </p>
                <small>
                  {c.thread ? 'Thread' : 'Channel'} · {c.messages.length} messages
                  {c.source.kind === 'sample' ? ' · Sample' : ''}
                </small>
              </div>
            </button>
          );
        })}
      </nav>
      {active ? (
        <ConversationPanel
          conversation={active}
          busy={busy}
          onBack={() => setActiveId(undefined)}
          mutate={mutate}
        />
      ) : (
        <div className="conversation-empty">
          <MessageCircle size={32} />
          <h3>Stay with the conversation.</h3>
          <p>
            {conversations.length
              ? 'Choose a channel or thread to read its collected messages.'
              : 'Messages from Rocket.Chat will appear here. You can also try the Sample library.'}
          </p>
        </div>
      )}
    </div>
  );
}
