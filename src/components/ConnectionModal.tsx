import { useState } from 'react';
import { ArrowRight, LockKeyhole, ExternalLink } from 'lucide-react';
import {
  PROVIDERS,
  type Kind,
  type ConnectionInput,
  type Connection,
  type YouTubeConfig,
} from '../../shared/model';
import { Button, Field, Modal, SourceIcon } from './ui';
import { DEFAULT_API_SOURCE, type ApiSourceConfig } from '../../shared/api-source';

export function ConnectionModal({
  busy,
  onClose,
  onSave,
  initialKind = 'rss',
  sampleOnly = false,
  connection,
}: {
  busy: boolean;
  onClose: () => void;
  onSave: (input: ConnectionInput & { resetItems?: boolean }) => Promise<void>;
  connection?: Connection;
  initialKind?: Kind;
  sampleOnly?: boolean;
}) {
  const [kind, setKind] = useState<Kind>(connection?.kind ?? (sampleOnly ? 'sample' : initialKind));
  const [name, setName] = useState(connection?.name ?? ''),
    [endpoint, setEndpoint] = useState(connection?.endpoint ?? ''),
    [account, setAccount] = useState(connection?.account ?? '');
  const [secret, setSecret] = useState(''),
    [roomId, setRoomId] = useState(connection?.roomId ?? ''),
    [userId, setUserId] = useState(connection?.userId ?? ''),
    [mailbox, setMailbox] = useState(connection?.mailbox ?? 'INBOX');
  const [error, setError] = useState(''),
    [resetItems, setResetItems] = useState(false);
  const [api, setApi] = useState<ApiSourceConfig>(connection?.api ?? DEFAULT_API_SOURCE);
  const [youtube, setYoutube] = useState<YouTubeConfig>(
    connection?.youtube ?? { source: 'channel' },
  );
  const identityChanged =
    (!!connection &&
      [endpoint, account, roomId, userId, mailbox].some(
        (value, i) =>
          value !==
          [
            connection.endpoint,
            connection.account,
            connection.roomId,
            connection.userId,
            connection.mailbox,
          ][i],
      )) ||
    (!!connection && kind === 'api' && JSON.stringify(api) !== JSON.stringify(connection.api)) ||
    (!!connection &&
      kind === 'youtube' &&
      JSON.stringify(youtube) !== JSON.stringify(connection.youtube));
  function select(next: Kind) {
    setKind(next);
    setName('');
    setEndpoint('');
    setAccount('');
    setSecret('');
    setError('');
    setApi(DEFAULT_API_SOURCE);
    setYoutube({ source: 'channel' });
  }
  function closeEditor() {
    const changed =
      secret ||
      name !== (connection?.name ?? '') ||
      endpoint !== (connection?.endpoint ?? '') ||
      account !== (connection?.account ?? '') ||
      roomId !== (connection?.roomId ?? '') ||
      userId !== (connection?.userId ?? '') ||
      mailbox !== (connection?.mailbox ?? 'INBOX') ||
      (kind === 'api' &&
        JSON.stringify(api) !== JSON.stringify(connection?.api ?? DEFAULT_API_SOURCE)) ||
      (kind === 'youtube' &&
        JSON.stringify(youtube) !== JSON.stringify(connection?.youtube ?? { source: 'channel' }));
    if (changed && !window.confirm('Discard unsaved connection changes?')) return;
    onClose();
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await onSave({
        feedIds: connection?.feedIds ?? [],
        resetItems,
        kind,
        name: name.trim() || PROVIDERS[kind].name,
        endpoint,
        account,
        secret,
        roomId,
        userId,
        mailbox,
        api: kind === 'api' ? api : undefined,
        youtube: kind === 'youtube' ? youtube : undefined,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the connection.');
    }
  }
  return (
    <Modal
      title={connection ? `Edit ${connection.name}` : 'Connect a little more of your world'}
      subtitle="Collect data by connection, then choose the feeds it supplies."
      onClose={closeEditor}
      wide
    >
      {!connection && (
        <div className="provider-picker">
          {Object.entries(PROVIDERS).map(([key, p]) => (
            <button
              key={key}
              disabled={sampleOnly && key !== 'sample'}
              className={`provider-option ${kind === key ? 'selected' : ''}`}
              onClick={() => select(key as Kind)}
            >
              <SourceIcon kind={key as Kind} />
              <span>
                <strong>{p.name}</strong>
                <small>{p.description}</small>
              </span>
              <span className="radio-dot" />
            </button>
          ))}
        </div>
      )}
      {sampleOnly && (
        <p className="notice quiet">
          Layout previews use sample connections. Connect live sources in your workspace.
        </p>
      )}
      <form onSubmit={submit} className="connection-form">
        <Field label="Connection name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={PROVIDERS[kind].name}
            maxLength={80}
          />
        </Field>
        {kind === 'rss' && (
          <>
            <Field label="Feed URL" help="Paste a direct RSS or Atom feed URL.">
              <input
                autoFocus
                type="url"
                required
                placeholder="https://example.com/feed.xml"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </Field>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setEndpoint('https://hnrss.org/frontpage');
                setName('Hacker News');
              }}
            >
              Use Hacker News as a starting point <ArrowRight size={13} />
            </button>
          </>
        )}
        {kind === 'mastodon' && (
          <>
            <Field label="Mastodon server">
              <input
                type="url"
                required
                placeholder="https://mastodon.social"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </Field>
            <Field
              label="Account (optional)"
              help="Leave blank for the server’s public local timeline."
            >
              <input
                placeholder="username or username@server.social"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
            </Field>
            <Field
              label="Access token (optional)"
              help="Some servers require a read-only token for public data."
            >
              <input
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </Field>
          </>
        )}
        {kind === 'bluesky' && (
          <Field
            label="Public account handle"
            help="Reads public author posts. No login is needed."
          >
            <input
              required
              placeholder="username.bsky.social"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </Field>
        )}
        {kind === 'youtube' && (
          <>
            <p className="notice quiet">
              Public metadata only: title, description, channel, date, thumbnail, duration, and a
              canonical link. This never plays, downloads, or transcribes video. A collection makes
              one channel lookup when needed, up to three 50-item playlist reads, and up to three
              video-metadata reads. These list calls are one quota unit each: 3–7 units for channel
              uploads or 2–6 for a playlist. YouTube project quota and provider errors remain
              visible on the connection.
            </p>
            <Field label="Public source">
              <select
                value={youtube.source}
                aria-label="YouTube public source"
                onChange={(e) =>
                  setYoutube({ ...youtube, source: e.target.value as YouTubeConfig['source'] })
                }
              >
                <option value="channel">Channel uploads</option>
                <option value="playlist">Playlist</option>
                <option value="shorts-playlist">Explicit Shorts playlist</option>
              </select>
            </Field>
            <Field
              label={youtube.source === 'channel' ? 'Public channel ID' : 'Public playlist ID'}
              help={
                youtube.source === 'shorts-playlist'
                  ? 'This labels the selected playlist as Shorts. It does not infer Shorts from duration.'
                  : 'Use the stable ID from the public YouTube URL, not a handle or a personalized feed.'
              }
            >
              <input
                required
                value={account}
                placeholder={youtube.source === 'channel' ? 'UC…' : 'PL…'}
                aria-label={
                  youtube.source === 'channel' ? 'Public channel ID' : 'Public playlist ID'
                }
                onChange={(e) => setAccount(e.target.value)}
              />
            </Field>
            <Field
              label="YouTube Data API key"
              help="Use a key from your own enabled Google Cloud project. It is encrypted locally; account/private data needs separate OAuth support."
            >
              <input
                required={!connection?.hasSecret}
                aria-label="YouTube Data API key"
                placeholder={
                  connection?.hasSecret ? 'Leave blank to keep saved API key' : undefined
                }
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </Field>
            <p className="muted">
              Under-four-minute videos are shown only as Shorts candidates, never exact Shorts.
              Personalized recommendations, subscriptions, private videos, and account data are not
              collected.
            </p>
          </>
        )}
        {kind === 'email' && (
          <>
            <div className="form-grid">
              <Field label="IMAP hostname">
                <input
                  required
                  placeholder="imap.example.com"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                />
              </Field>
              <Field label="Mailbox">
                <input required value={mailbox} onChange={(e) => setMailbox(e.target.value)} />
              </Field>
            </div>
            <Field label="Email account">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
            </Field>
            <Field
              label="App password"
              help="Uses encrypted IMAP on port 993. Your messages remain unread in your mailbox."
            >
              <input
                required={!connection?.hasSecret}
                placeholder={
                  connection?.hasSecret ? 'Leave blank to keep saved credential' : undefined
                }
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </Field>
          </>
        )}
        {kind === 'rocket' && (
          <>
            <Field label="Rocket.Chat server">
              <input
                required
                type="url"
                placeholder="https://chat.example.com"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label="Public channel ID">
                <input required value={roomId} onChange={(e) => setRoomId(e.target.value)} />
              </Field>
              <Field label="Your user ID">
                <input required value={userId} onChange={(e) => setUserId(e.target.value)} />
              </Field>
            </div>
            <Field
              label="Personal access token"
              help="Use a token with read access to this channel."
            >
              <input
                required={!connection?.hasSecret}
                placeholder={
                  connection?.hasSecret ? 'Leave blank to keep saved credential' : undefined
                }
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </Field>
            <a
              className="text-button"
              href="https://docs.rocket.chat/docs/manage-personal-access-tokens"
              target="_blank"
              rel="noreferrer"
            >
              Find your access token <ExternalLink size={13} />
            </a>
          </>
        )}
        {kind === 'api' && (
          <>
            <p className="notice quiet">
              Import a read-only JSON feed, including results from an external pipeline. Each page
              must contain at most 100 items; up to three pages per collection. Provider permissions
              still apply.
            </p>
            <Field
              label="API endpoint"
              help="Public HTTPS GET endpoint. Keep credentials out of the URL."
            >
              <input
                required
                type="url"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://example.com/feed.json?limit=100"
                aria-label="API endpoint"
              />
            </Field>
            <Field label="API authentication">
              <select
                value={api.auth}
                aria-label="API authentication"
                onChange={(e) =>
                  setApi({ ...api, auth: e.target.value as ApiSourceConfig['auth'] })
                }
              >
                <option value="none">No authentication</option>
                <option value="bearer">Bearer token</option>
                <option value="header">API-key header</option>
              </select>
            </Field>
            {api.auth === 'header' && (
              <Field
                label="API-key header name"
                help="Use an X- prefixed header, such as X-API-Key."
              >
                <input
                  required
                  value={api.headerName}
                  aria-label="API-key header name"
                  onChange={(e) => setApi({ ...api, headerName: e.target.value })}
                />
              </Field>
            )}
            {api.auth !== 'none' && (
              <Field
                label="API credential"
                help="Encrypted locally. Leave blank during repair to keep the saved credential."
              >
                <input
                  type="password"
                  autoComplete="off"
                  required={!connection?.hasSecret}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  aria-label="API credential"
                />
              </Field>
            )}
            <Field label="API item type">
              <select
                value={api.type}
                aria-label="API item type"
                onChange={(e) =>
                  setApi({ ...api, type: e.target.value as ApiSourceConfig['type'] })
                }
              >
                <option value="post">Post</option>
                <option value="article">Article</option>
                <option value="email">Email</option>
              </select>
            </Field>
            <p className="muted">
              Use dot-separated JSON fields, such as data.items. Leave Items path empty for a root
              array. Missing dates use 1970-01-01 rather than claiming new publication.
            </p>
            <div className="form-grid">
              {(
                [
                  ['itemsPath', 'Items path'],
                  ['idPath', 'Stable ID path'],
                  ['titlePath', 'Title path'],
                  ['contentPath', 'Body path'],
                  ['authorPath', 'Author path'],
                  ['datePath', 'Publication date path'],
                  ['urlPath', 'Link path'],
                  ['imagePath', 'Image path'],
                  ['tagsPath', 'Tags path'],
                  ['nextCursorPath', 'Next cursor path'],
                  ['cursorParameter', 'Cursor query parameter'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    maxLength={240}
                    required={key === 'idPath' || key === 'cursorParameter'}
                    value={api[key]}
                    aria-label={label}
                    onChange={(e) => setApi({ ...api, [key]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
            <Field
              label="Maximum pages per collection"
              help="Leave Next cursor path blank for a single-page source."
            >
              <input
                type="number"
                min={1}
                max={3}
                required
                value={api.maxPages}
                aria-label="Maximum pages per collection"
                onChange={(e) => setApi({ ...api, maxPages: Number(e.target.value) })}
              />
            </Field>
          </>
        )}
        {kind === 'sample' && (
          <div className="notice">
            Fictional posts, conversations, and articles let you try reading, bookmarking, and
            filtering. Sample data is labeled throughout your feed.
          </div>
        )}
        {connection && (
          <p className="muted">
            Blank credentials keep the saved encrypted credential. Saving configuration does not
            refresh or send messages.
          </p>
        )}
        {identityChanged && (
          <label className="notice">
            <input
              type="checkbox"
              required
              checked={resetItems}
              onChange={(e) => setResetItems(e.target.checked)}
            />
            Reset this connection’s collected items because its account, address or API mappings
            changed. Saved items from this connection will also be removed.
          </label>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <span className="quiet-note">
            <LockKeyhole size={13} />{' '}
            {secret ? 'Credentials are encrypted on this computer' : 'Stored on this computer'}
          </span>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : connection ? 'Save connection' : 'Add connection'}
            <ArrowRight size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
