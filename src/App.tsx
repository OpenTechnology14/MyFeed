import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  CirclePlus,
  Menu,
  Search,
  Moon,
  Settings2,
  Sparkles,
  Sun,
  X,
  BookOpen,
  CircleHelp,
  SlidersHorizontal,
  Workflow,
} from 'lucide-react';
import { LIMITS, type State, type Kind, type Connection } from '../shared/model';
import { evaluateFeed } from '../shared/pipeline';
import { hasUnsavedDrafts } from './drafts';
import { request } from './api';
import { Button, Field, Modal } from './components/ui';
import { ConnectionModal } from './components/ConnectionModal';
import { SettingsPage } from './components/SettingsPage';
import { useNavigation, pagePath, type Page } from './navigation';
import { createPreviewState, updatePreview } from './preview';
import { FeedReader } from './components/FeedReader';
import { ConnectionsPage } from './components/ConnectionsPage';
import { BackgroundView } from './components/BackgroundView';

export function App() {
  const { route, navigate } = useNavigation();
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (hasUnsavedDrafts()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const previewRef = useRef(route.preview);
  const loadedPreviewRef = useRef<boolean>();
  previewRef.current = route.preview;
  const view = route.page,
    backgroundTab = route.tab || 'connections';
  const [state, setState] = useState<State>(),
    [activeId, setActiveId] = useState(() => localStorage.getItem('myfeed-active') || '');
  const [modal, setModal] = useState<'connection' | 'create' | 'guide' | null>(null);
  const [busyCount, setBusyCount] = useState(0),
    [syncing, setSyncing] = useState(false),
    [generating, setGenerating] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState('');
  const [newName, setNewName] = useState(''),
    [sidebarOpen, setSidebarOpen] = useState(false),
    [deleteTarget, setDeleteTarget] = useState<{ path: string; name: string }>();
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    if (!sidebarOpen || !window.matchMedia('(max-width: 850px)').matches) return;
    const panel = document.getElementById('feed-navigation-panel');
    const menu = document.querySelector<HTMLButtonElement>('.navigation-toggle');
    const controls = () => [
      ...Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled)',
        ) ?? [],
      ),
      ...(menu ? [menu] : []),
    ];
    controls()[0]?.focus();
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSidebarOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const targets = controls(),
        index = targets.indexOf(document.activeElement as HTMLElement);
      if (
        index < 0 ||
        (e.shiftKey && index === 0) ||
        (!e.shiftKey && index === targets.length - 1)
      ) {
        e.preventDefault();
        targets[e.shiftKey ? targets.length - 1 : 0]?.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('keydown', keyboard);
      menu?.focus();
    };
  }, [sidebarOpen]);
  const [editConnection, setEditConnection] = useState<Connection>();
  const [connectionKind, setConnectionKind] = useState<Kind>('rss');
  function openConnection(kind: Kind = 'rss') {
    setEditConnection(undefined);
    setConnectionKind(route.preview ? 'sample' : kind);
    setModal('connection');
  }
  const busy = busyCount > 0;
  const applyState = useCallback(
    (next: State) => setState((old) => (!old || next.revision >= old.revision ? next : old)),
    [],
  );
  const load = useCallback(async () => {
    try {
      if (route.preview) {
        loadedPreviewRef.current = true;
        setState(createPreviewState());
      } else {
        const next = await request('/state');
        if (!previewRef.current) {
          loadedPreviewRef.current = false;
          applyState(next);
        }
      }
    } catch (e) {
      if (previewRef.current !== route.preview) return;
      setError((e as Error).message || 'Could not reach the local MyFeed server.');
    }
  }, [applyState, route.preview]);
  useEffect(() => {
    setState(undefined);
    void load();
    if (route.preview) return;
    const timer = setInterval(() => {
      void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load, route.preview]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      document.documentElement.classList.toggle(
        'dark',
        state?.profile.theme === 'dark' || (state?.profile.theme === 'system' && media.matches),
      );
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [state?.profile.theme]);
  useEffect(() => {
    setActiveId(route.preview ? '' : localStorage.getItem('myfeed-active') || '');
  }, [route.preview]);
  useEffect(() => {
    if (route.feedId) setActiveId(route.feedId);
  }, [route.feedId, route.preview]);
  const feed = state?.feeds.find((f) => f.id === (route.feedId || activeId)) || state?.feeds[0];
  const pageTitle =
    view === 'feeds'
      ? 'Your feeds'
      : view === 'connections'
        ? 'Connections'
        : view === 'profile'
          ? 'Your profile'
          : view === 'settings'
            ? 'App settings'
            : view === 'background'
              ? 'Feed customization'
              : view === 'saved'
                ? 'Saved for later'
                : feed?.name || 'MyFeed';
  useEffect(() => {
    document.title = `${pageTitle} · MyFeed${route.preview ? ' · Preview' : ''}`;
  }, [pageTitle, route.preview]);
  useEffect(() => {
    if (feed && !route.preview) localStorage.setItem('myfeed-active', feed.id);
  }, [feed?.id, route.preview]);
  async function mutate(path: string, method: string, body?: unknown) {
    setBusyCount((v) => v + 1);
    setError('');
    try {
      const next =
        route.preview && state
          ? updatePreview(state, path, method, body ?? {})
          : await request(path, method, body);
      if (previewRef.current === route.preview) applyState(next);
      return next;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusyCount((v) => v - 1);
    }
  }
  function go(page: Page, tab?: string, id = feed?.id) {
    navigate(pagePath(page, route.preview, id, tab));
    setSidebarOpen(false);
  }
  function select(id: string) {
    setActiveId(id);
    go(
      view === 'background' ? 'background' : 'reader',
      view === 'background' ? 'customize' : undefined,
      id,
    );
  }
  function background(tab = 'connections', id = feed?.id) {
    go('background', tab, id);
  }
  function settings(tab = 'ai') {
    go('settings', tab);
  }
  function create() {
    setNewName('');
    setModal('create');
  }
  async function sync() {
    if (!feed || syncing) return;
    setSyncing(true);
    try {
      const next = await mutate(`/feeds/${feed.id}/sync`, 'POST', {});
      const run = next.runs.find((r) => r.feedId === feed.id);
      setToast(
        run?.errors.length
          ? `Sync finished with ${run.errors.length} source error. See Connections for source details.`
          : `Feed refreshed. ${run?.added ?? 0} new items.`,
      );
    } catch {
      /* The shared error banner explains failures. */
    } finally {
      setSyncing(false);
    }
  }
  if (!state || !feed || loadedPreviewRef.current !== route.preview)
    return (
      <div className="loading-screen">
        <span className="feed-glyph">
          <i />
          <i />
          <i />
          <b />
        </span>
        <h1>MyFeed</h1>
        <p>{error || 'Opening your reading space…'}</p>
        {error && (
          <Button
            onClick={() => {
              setError('');
              void load();
            }}
          >
            Retry connection
          </Button>
        )}
      </div>
    );
  const missingFeed = !!route.feedId && !state.feeds.some((f) => f.id === route.feedId);
  const decisions = evaluateFeed(state, feed);

  return (
    <div className="app-shell">
      <aside className="icon-rail">
        <button
          aria-label="MyFeed home"
          className="brand-icon"
          onClick={() => {
            go('reader');
            setSidebarOpen(false);
          }}
        >
          <span className="feed-glyph small">
            <i />
            <i />
            <i />
            <b />
          </span>
        </button>
        <button
          className={`rail-button navigation-toggle ${sidebarOpen ? 'active' : ''}`}
          aria-expanded={sidebarOpen}
          aria-controls="feed-navigation-panel"
          aria-label="Toggle feed navigation"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={20} />
        </button>
        <button
          className="rail-button"
          aria-label="Search feed"
          aria-expanded={searchOpen}
          onClick={() => {
            go('reader');
            setSearchOpen(true);
          }}
        >
          <Search size={19} />
        </button>
        <div className="rail-bottom">
          <button
            className="rail-button"
            aria-label="Toggle color theme"
            disabled={busy}
            onClick={() => {
              void mutate('/profile', 'PATCH', {
                ...state.profile,
                theme: document.documentElement.classList.contains('dark') ? 'light' : 'dark',
                revision: state.revision,
              }).catch(() => {});
            }}
          >
            {state.profile.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button className="rail-button" aria-label="Open settings" onClick={() => settings()}>
            <Settings2 size={19} />
          </button>
          <button className="avatar" aria-label="Open profile" onClick={() => go('profile')}>
            {state.profile.name.slice(0, 1).toUpperCase()}
          </button>
        </div>
      </aside>
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          className="sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside id="feed-navigation-panel" className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <h1>
            MyFeed<span>®</span>
          </h1>
          <span className="local-label">PERSONAL</span>
        </div>
        <button className="profile-row" onClick={() => go('profile')}>
          <span className="avatar">{state.profile.name.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{state.profile.name}</strong>
            <small>Your profile</small>
          </span>
          <Settings2 size={15} />
        </button>
        <div className="sidebar-section-heading">MY FEEDS</div>
        <div className="feed-navigation">
          {state.feeds.map((f) => (
            <button
              className={`feed-nav-item ${feed.id === f.id ? 'selected' : ''}`}
              key={f.id}
              onClick={() => select(f.id)}
            >
              <span className={`feed-color ${f.color}`} />
              <span>{f.name}</span>
              {feed.id === f.id && <ChevronRight size={13} />}
            </button>
          ))}
        </div>
        <button
          className="create-feed-button"
          disabled={busy || state.feeds.length >= LIMITS.feeds}
          onClick={create}
        >
          <CirclePlus size={15} /> Create a feed
        </button>
        <div className="sidebar-section-heading">FEED MODE</div>
        <div className="sidebar-mode" role="group" aria-label="Feed mode">
          <button aria-pressed={view === 'reader' || view === 'saved'} onClick={() => go('reader')}>
            <BookOpen size={15} />
            Feed view
          </button>
          <button aria-pressed={view === 'background'} onClick={() => background('customize')}>
            <SlidersHorizontal size={15} />
            Customize filters
          </button>
        </div>
        {route.preview && <p className="preview-note">Preview · fictional sample data</p>}
        <div className="sidebar-bottom">
          <nav aria-label="Workspace navigation">
            <button
              className={`nav-item ${view === 'connections' ? 'active' : ''}`}
              onClick={() => go('connections')}
            >
              <Workflow size={16} />
              Connections<span className="count">{state.connections.length}</span>
            </button>
          </nav>

          <button className="nav-item" onClick={() => settings()}>
            <Settings2 size={16} />
            App settings
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setSidebarOpen(false);
              setModal('guide');
            }}
          >
            <CircleHelp size={16} />
            Help
          </button>
          <div className="workspace-usage">
            <span>Room for your interests</span>
            <span>
              {state.feeds.length}
              <i> / {LIMITS.feeds} feeds</i>
            </span>
            <div className="usage-track">
              <span style={{ width: `${(state.feeds.length / LIMITS.feeds) * 100}%` }} />
            </div>
            <small>Up to 3 connections in each feed.</small>
          </div>
        </div>
      </aside>
      <main className="main-workspace">
        <h1 className="sr-only">{pageTitle}</h1>
        {error && (
          <div className="global-error" role="alert">
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={() => setError('')}>
              <X size={15} />
            </button>
          </div>
        )}
        <div className="workspace-content">
          {missingFeed || route.invalid ? (
            <section className="empty-results">
              <h2>{missingFeed ? 'Feed not found' : 'Page not found'}</h2>
              <p>
                {missingFeed
                  ? 'This feed may have been removed. Choose an existing feed to continue.'
                  : 'This address does not match a MyFeed page.'}
              </p>
              <Button onClick={() => go('reader', undefined, state.feeds[0].id)}>
                Open first feed
              </Button>
            </section>
          ) : view === 'connections' ? (
            <ConnectionsPage
              state={state}
              preview={route.preview}
              busy={busy}
              selectedId={route.tab}
              activeFeedId={feed.id}
              onRead={(id) => select(id)}
              onAi={(id) => {
                setActiveId(id);
                settings('ai');
              }}
              onSelect={(id) => go('connections', id)}
              onEdit={(id) => {
                setEditConnection(state.connections.find((c) => c.id === id));
                setModal('connection');
              }}
              onConnect={openConnection}
              mutate={mutate}
              onDelete={(path, name) => setDeleteTarget({ path, name })}
              onFeed={(id) => background('customize', id)}
            />
          ) : view === 'profile' || view === 'settings' ? (
            <SettingsPage
              state={state}
              busy={busy}
              onConnections={() => go('connections', `capability-ai~${feed.id}`)}
              onHelp={() => setModal('guide')}
              page={view}
              tab={route.tab}
              preview={route.preview}
              mutate={mutate}
            />
          ) : view === 'background' ? (
            <BackgroundView
              key={`${feed.id}-${backgroundTab}`}
              state={state}
              preview={route.preview}
              feed={feed}
              decisions={decisions}
              busy={busy}
              onConnect={() => go('connections')}
              mutate={mutate}
              onDelete={(path, name) => setDeleteTarget({ path, name })}
            />
          ) : (
            <FeedReader
              key={`${feed.id}-${view}`}
              state={state}
              feed={feed}
              decisions={decisions}
              syncing={syncing}
              onRefresh={() => void sync()}
              preview={route.preview}
              savedOnly={view === 'saved'}
              searchOpen={searchOpen}
              onCloseSearch={() => setSearchOpen(false)}
              busy={busy}
              onConnect={openConnection}
              onBackground={() => background('customize')}
              onSettings={() => go('connections', `capability-ai~${feed.id}`)}
              onAlertSetup={() => go('connections', `capability-alerts~${feed.id}`)}
              onEdit={(entry) => go('connections', `${entry.connectionId}~${entry.id}`)}
              onReply={(entry) => go('connections', `${entry.connectionId}~reply~${entry.id}`)}
              mutate={mutate}
              onDigest={(options, revision) => {
                setGenerating(true);
                void mutate(`/feeds/${feed.id}/digest`, 'POST', {
                  options,
                  revision,
                  confirmed: true,
                })
                  .then((next) =>
                    setToast(next.ai.receipts?.[0]?.message || 'Your AI digest is ready.'),
                  )
                  .catch(() => {})
                  .finally(() => setGenerating(false));
              }}
            />
          )}
        </div>
        <footer className="workspace-footer">
          <span>Made for your curiosity.</span>
          <span>
            {generating ? (
              <>
                <Sparkles size={12} />
                Generating your digest…
              </>
            ) : (
              <>
                <span className="blue-dot" />
                Your sources. Your rules.
              </>
            )}
          </span>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {modal === 'connection' && (
        <ConnectionModal
          connection={editConnection}
          initialKind={connectionKind}
          sampleOnly={route.preview}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={async (input) => {
            if (editConnection) {
              const { feedId, feedIds, kind, resetItems, ...configuration } = input;
              await mutate(`/connections/${editConnection.id}`, 'PATCH', {
                configuration,
                configVersion: editConnection.configVersion ?? 1,
                resetItems,
              });
              setModal(null);
              return;
            }
            const next = await mutate('/connections', 'POST', input);
            setModal(null);
            const connection = next.connections[next.connections.length - 1];
            go('connections', connection.id);
            await mutate(`/connections/${connection.id}/sync`, 'POST', {});
          }}
        />
      )}
      {modal === 'create' && (
        <Modal
          title="A new space for your interests"
          subtitle={`${state.feeds.length} of ${LIMITS.feeds} feeds created. Each feed can have up to 3 connections.`}
          onClose={() => setModal(null)}
        >
          <form
            className="settings-form"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const next = await mutate('/feeds', 'POST', { name: newName });
                if (next.createdId) select(next.createdId);
                setModal(null);
                setToast('Your new feed is ready. Add its first connection.');
              } catch {
                // mutate() already records the failure via setError and rethrows;
                // this handler just stops it from propagating as an unhandled
                // rejection — the error is already visible in the UI.
              }
            }}
          >
            <Field label="Feed name">
              <input
                autoFocus
                required
                maxLength={60}
                placeholder="Technology, design, weekend reading…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </Field>
            <div className="modal-footer">
              <Button variant="ghost" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !newName.trim()}>
                Create feed
                <ArrowRight size={15} />
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {modal === 'guide' && (
        <Modal
          title="Your feed, your rules"
          subtitle="A quick guide to your personal reading space."
          onClose={() => setModal(null)}
        >
          <div className="guide-content">
            <h3>1. Connect a source</h3>
            <p>
              RSS and public social accounts need no login. Email uses an IMAP app password.
              Rocket.Chat uses a public channel ID and personal token.
            </p>
            <h3>2. Shape your feed</h3>
            <p>
              Use Customize filters in the sidebar. Link collected connections to this feed, then
              Include or mute keywords, add context for ranking, and choose your reading layout.
            </p>
            <h3>3. Let it flow</h3>
            <p>
              Refresh manually, or enable background sync every five minutes while the local server
              runs. Collected data shows the decision for each item.
            </p>
            <h3>4. Read, save, or summarize</h3>
            <p>
              Read posts, open articles, and follow collected chat conversations. Save updates or
              messages for later. Connect your own AI key in Settings to generate a digest on
              demand. Profile and credentials stay on this computer.
            </p>
            <div className="notice quiet">
              This is a single-user local app. Keep the server running to receive background
              updates.
            </div>
          </div>
        </Modal>
      )}
      {deleteTarget && (
        <Modal
          title={`Remove ${deleteTarget.name}?`}
          subtitle={
            deleteTarget.path.startsWith('/feeds/')
              ? 'This removes the feed and its links. Connections and collected items are kept.'
              : 'This removes the connection, collected items, drafts and credentials from all feeds. Posting receipts are kept. Remote posts are not deleted; already submitted sends may still complete.'
          }
          onClose={() => setDeleteTarget(undefined)}
        >
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setDeleteTarget(undefined)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                try {
                  const next = await mutate(deleteTarget.path, 'DELETE');
                  if (deleteTarget.path.startsWith('/feeds/')) select(next.feeds[0].id);
                  setDeleteTarget(undefined);
                  setToast('Removed from your workspace.');
                } catch {
                  // mutate() already records the failure via setError and rethrows;
                  // this handler just stops it from propagating as an unhandled
                  // rejection — the error is already visible in the UI.
                }
              }}
            >
              Remove
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
