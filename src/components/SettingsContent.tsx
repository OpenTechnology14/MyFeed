import { useSessionDraft } from '../drafts';
import { useState } from 'react';
import { UserRound, Sparkles, Check, HardDrive, ExternalLink } from 'lucide-react';
import type { State } from '../../shared/model';
import { Button, Field } from './ui';

export function SettingsContent({
  state,
  busy,
  mutate,
  initialTab = 'profile',
  mode = 'all',
  preview = false,
}: {
  state: State;
  busy: boolean;
  mutate: (path: string, method: string, input: unknown) => Promise<State>;
  initialTab?: string;
  mode?: 'all' | 'profile' | 'app';
  preview?: boolean;
}) {
  const [tab, setTab] = useState(
      mode === 'profile'
        ? 'profile'
        : mode === 'app'
          ? 'ai'
          : initialTab === 'profile'
            ? 'profile'
            : 'ai',
    ),
    [revision, setRevision] = useState(state.revision);
  const [profileDraft, setProfileDraft, resetProfile, dirty] = useSessionDraft(
    `${preview ? 'preview' : 'workspace'}:profile`,
    { profile: state.profile, revision: state.revision },
  );
  const profile = profileDraft.profile;
  const setProfile = (profile: typeof state.profile) => setProfileDraft((d) => ({ ...d, profile }));
  const [secret, setSecret] = useState(''),
    [model, setModel] = useState(state.ai.model),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const next =
        tab === 'ai'
          ? await mutate('/ai', 'PUT', { model, secret })
          : await mutate('/profile', 'PATCH', { ...profile, revision: profileDraft.revision });
      setRevision(next.revision);
      if (tab === 'profile') resetProfile({ profile: next.profile, revision: next.revision });
      setSecret('');
      setMessage('Changes saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes.');
    }
  }
  return (
    <>
      {mode !== 'profile' && (
        <div className="settings-tabs">
          {[
            { id: 'profile', label: 'Profile', icon: UserRound },
            { id: 'ai', label: 'AI provider', icon: Sparkles },
          ]
            .filter((t) => mode !== 'app' || t.id !== 'profile')
            .map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? 'active' : ''}
                onClick={() => {
                  setTab(t.id);
                  setMessage('');
                  setError('');
                }}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
        </div>
      )}
      <form onSubmit={save} className="settings-form">
        {tab === 'profile' && dirty && (
          <p className="notice">
            Your unsaved profile is retained while you navigate.{' '}
            <button
              type="button"
              className="text-button"
              onClick={() => resetProfile({ profile: state.profile, revision: state.revision })}
            >
              Discard profile draft
            </button>
          </p>
        )}
        {tab === 'profile' && (
          <>
            <div className="profile-preview">
              <span className="avatar large">{profile.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{profile.name}</strong>
                <small>Personal workspace · Local profile</small>
              </div>
            </div>
            <Field label="Display name">
              <input
                required
                maxLength={80}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </Field>
            <Field
              label="Email (optional)"
              help="A profile detail. Connect an email source separately to read messages."
            >
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </Field>
          </>
        )}
        {tab === 'ai' && (
          <>
            <div className="notice">
              <Sparkles size={18} />
              <div>
                <strong>Your own AI connection</strong>
                <p>
                  Generate a digest when you choose. Up to 20 filtered items and your background
                  context are sent to OpenAI. Provider usage is billed to your account.
                </p>
              </div>
            </div>
            <Field
              label="OpenAI API key"
              help={
                preview
                  ? 'Provider configuration is available in your local workspace.'
                  : state.ai.hasSecret
                    ? 'A key is saved. Leave blank to keep it.'
                    : 'Your key is encrypted locally and never returned to the browser.'
              }
            >
              <input
                disabled={preview}
                type="password"
                autoComplete="off"
                placeholder={state.ai.hasSecret ? '••••••••••••••••' : 'Enter your API key'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </Field>
            <Field
              label="Model ID"
              help="Use an exact model snapshot ID available to your account. Returned model identity must match; moving aliases may be rejected."
            >
              <input
                disabled={preview}
                required
                placeholder="Enter model ID"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </Field>
            <a
              className="text-button"
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
            >
              Manage API keys <ExternalLink size={13} />
            </a>
            {state.ai.hasSecret && (
              <Button
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  try {
                    const next = await mutate('/ai', 'PUT', { disconnect: true });
                    setModel('');
                    setRevision(next.revision);
                    setMessage('AI disconnected.');
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Disconnect AI
              </Button>
            )}
          </>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}{' '}
            <button
              className="text-button"
              type="button"
              onClick={() => {
                resetProfile({ profile: state.profile, revision: state.revision });
                setRevision(state.revision);
                setError('');
              }}
            >
              Reload current settings
            </button>
          </p>
        )}
        {message && (
          <p className="success-text" role="status">
            <Check size={14} />
            {message}
          </p>
        )}
        <div className="modal-footer">
          <span className="quiet-note">
            <HardDrive size={13} /> Local workspace
          </span>
          <Button type="submit" disabled={busy || (preview && tab === 'ai')}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </>
  );
}
