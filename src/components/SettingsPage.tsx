import { Bookmark, HardDrive, Layers3, ShieldCheck, UserRound } from 'lucide-react';
import { LIMITS, type State } from '../../shared/model';
import { SettingsContent } from './SettingsContent';
export function SettingsPage({
  state,
  busy,
  page,
  tab,
  preview,
  mutate,
  onConnections,
  onHelp,
}: {
  onConnections: () => void;
  onHelp: () => void;
  state: State;
  busy: boolean;
  page: 'profile' | 'settings';
  tab?: string;
  preview: boolean;
  mutate: (path: string, method: string, input: unknown) => Promise<State>;
}) {
  return (
    <div className="settings-page-layout">
      <section className="settings-page-card">
        <div className="settings-section-heading">
          {page === 'profile' ? <UserRound size={19} /> : <HardDrive size={19} />}
          <div>
            <h2>{page === 'profile' ? 'Personal details' : 'Your reading environment'}</h2>
            <p>
              {page === 'profile'
                ? 'The name and profile details you see in MyFeed.'
                : 'Workspace details, connections, help, and optional AI processing.'}
            </p>
          </div>
        </div>
        {page === 'settings' && (
          <details className="workspace-settings">
            <summary>My workspace</summary>
            <div>
              <strong>Personal workspace</strong>
              <p>
                {state.feeds.length} of {LIMITS.feeds} feeds · {state.connections.length}{' '}
                connections
              </p>
              <p>This workspace belongs to {state.profile.name}.</p>
              {preview && (
                <a className="text-button" href="/">
                  Open local workspace
                </a>
              )}
            </div>
          </details>
        )}
        <SettingsContent
          key={`${page}-${tab || ''}`}
          state={state}
          busy={busy}
          mode={page === 'profile' ? 'profile' : 'app'}
          initialTab={tab || (page === 'profile' ? 'profile' : 'ai')}
          preview={preview}
          mutate={mutate}
        />
      </section>
      <aside className="settings-page-aside">
        {page === 'settings' && (
          <div className="settings-info-card">
            <h3>Help with MyFeed</h3>
            <p>Learn how feeds, connections, and customization work.</p>
            <button className="button secondary" onClick={onHelp}>
              Help
            </button>
          </div>
        )}
        {page === 'profile' ? (
          <div className="profile-summary-card">
            <span className="avatar large">{state.profile.name.slice(0, 1).toUpperCase()}</span>
            <h3>{state.profile.name}</h3>
            <p>Personal workspace</p>
            <dl>
              <div>
                <dt>
                  <Layers3 size={14} />
                  Feeds
                </dt>
                <dd>
                  {state.feeds.length} / {LIMITS.feeds}
                </dd>
              </div>
              <div>
                <dt>
                  <Bookmark size={14} />
                  Saved updates
                </dt>
                <dd>{state.entries.filter((e) => e.saved).length}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="settings-info-card">
            <ShieldCheck size={22} />
            <h3>Your connections, your choice.</h3>
            <p>
              Background sync is enabled per connection. AI digests run only when you request one.
            </p>
            <button className="button secondary" onClick={onConnections}>
              Connections
            </button>
            <div className="settings-plan">
              <strong>{LIMITS.feeds} feeds</strong>
              <span>Up to {LIMITS.connectionsPerFeed} connections in each feed.</span>
            </div>
          </div>
        )}
        <div className="settings-info-card">
          <HardDrive size={20} />
          <h3>On this computer</h3>
          <p>
            {preview
              ? 'This preview uses fictional details. Changes last until you reload; your workspace stays separate.'
              : 'Your profile and collected items stay in this local workspace. Provider credentials are encrypted.'}
          </p>
        </div>
      </aside>
    </div>
  );
}
