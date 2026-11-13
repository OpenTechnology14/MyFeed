import { useHistory } from '../history';
import { useSessionDraft } from '../drafts';
import { useState } from 'react';
import { Check, Filter, SlidersHorizontal, Layers3, Save } from 'lucide-react';
import { LIMITS, connectionFeeds, type State, type Feed, type Decision } from '../../shared/model';
import { Button, Field, SourceIcon, Toggle } from './ui';
import { relativeTime } from './TimelineEntry';
export function BackgroundView({
  state,
  preview = false,
  feed,
  decisions: fallbackDecisions,
  busy,
  onConnect,
  mutate,
  onDelete,
}: {
  state: State;
  preview?: boolean;
  feed: Feed;
  decisions: Decision[];
  busy: boolean;
  onConnect: () => void;
  mutate: (path: string, method: string, input?: unknown) => Promise<State>;
  onDelete: (path: string, name: string) => void;
}) {
  const initial = {
    feed,
    revision: state.revision,
    includeText: feed.include.join(', '),
    excludeText: feed.exclude.join(', '),
    alertText: (feed.alertHandles ?? []).join(', '),
  };
  const [form, setForm, resetForm, dirty] = useSessionDraft(
    `${preview ? 'preview' : 'workspace'}:feed:${feed.id}`,
    initial,
  );
  const draft = form.feed,
    revision = form.revision,
    includeText = form.includeText,
    excludeText = form.excludeText,
    alertText = form.alertText;
  const setDraft = (update: (d: Feed) => Feed) => setForm((f) => ({ ...f, feed: update(f.feed) }));
  const setIncludeText = (includeText: string) => setForm((f) => ({ ...f, includeText }));
  const setExcludeText = (excludeText: string) => setForm((f) => ({ ...f, excludeText }));
  const setAlertText = (alertText: string) => setForm((f) => ({ ...f, alertText }));
  const [error, setError] = useState(''),
    [saved, setSaved] = useState(false),
    [rawFilter, setRawFilter] = useState('all');
  const connections = state.connections.filter((c) => connectionFeeds(c).includes(feed.id));
  const history = useHistory({
    live: !preview,
    revision: state.revision,
    scope: { feedId: feed.id, mode: 'all', decision: rawFilter },
    fallback: fallbackDecisions.filter(
      (d) => rawFilter === 'all' || (rawFilter === 'included' ? d.included : !d.included),
    ),
  });
  const decisions = history.decisions;
  const included = preview
    ? fallbackDecisions.filter((d) => d.included).length
    : (state.counts?.feeds[feed.id]?.included ?? 0);
  const total = preview ? fallbackDecisions.length : (state.counts?.feeds[feed.id]?.total ?? 0);
  function edit<T extends keyof Feed>(key: T, value: Feed[T]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { id, createdAt, digest, ...config } = draft;
      const next = await mutate(`/feeds/${feed.id}`, 'PATCH', {
        ...config,
        include: includeText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        exclude: excludeText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        alertHandles: alertText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        revision,
      });
      const current = next.feeds.find((f) => f.id === feed.id)!;
      resetForm({
        feed: current,
        revision: next.revision,
        includeText: current.include.join(', '),
        excludeText: current.exclude.join(', '),
        alertText: current.alertHandles.join(', '),
      });
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="background-layout">
      {dirty && (
        <div className="notice">
          <span>Unsaved customization is retained while you navigate.</span>
          <button
            className="text-button"
            onClick={() => {
              resetForm(initial);
              setSaved(false);
              setError('');
            }}
          >
            Discard customization draft
          </button>
        </div>
      )}
      <section className="config-card feed-link-card">
        <h2>{feed.name}</h2>
        <p className="muted">Choose connections, then filter their collected data for this feed.</p>
        <div className="flow-caption">
          Connections → Collected data → Feed links → Filters → Feed view
        </div>
        <h3>
          Connections in this feed · {connections.length} / {LIMITS.connectionsPerFeed}
        </h3>
        <div className="connection-choices">
          {state.connections.map((c) => {
            const linked = connectionFeeds(c).includes(feed.id);
            return (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={linked}
                  disabled={busy || (!linked && connections.length >= LIMITS.connectionsPerFeed)}
                  onChange={async () => {
                    try {
                      const next = await mutate(`/connections/${c.id}`, 'PATCH', {
                        feedIds: linked
                          ? connectionFeeds(c).filter((id) => id !== feed.id)
                          : [...connectionFeeds(c), feed.id],
                      });
                      const current = next.feeds.find((f) => f.id === feed.id)!;
                      resetForm({
                        feed: current,
                        revision: next.revision,
                        includeText: current.include.join(', '),
                        excludeText: current.exclude.join(', '),
                        alertText: current.alertHandles.join(', '),
                      });
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                />
                <SourceIcon kind={c.kind} small />
                <span>
                  {c.name}
                  <small>
                    {state.counts?.connections[c.id] ??
                      state.entries.filter((e) => e.connectionId === c.id).length}{' '}
                    collected items · {c.enabled ? 'Available' : 'Paused'}
                  </small>
                </span>
              </label>
            );
          })}
        </div>
        {!state.connections.length && (
          <p className="muted">Add a connection to start collecting data.</p>
        )}
        <Button variant="secondary" onClick={() => onConnect()}>
          Manage connections
        </Button>
      </section>
      <form className="customize-form" onSubmit={save}>
        <div className="background-intro">
          <div>
            <h2>Make this feed yours.</h2>
            <p>A little context helps bring the right stories forward.</p>
          </div>
          <Button type="submit" disabled={busy}>
            <Save size={15} />
            {busy ? 'Saving…' : 'Save customization'}
          </Button>
        </div>
        <section className="config-card">
          <h3>Feed details</h3>
          <div className="form-grid">
            <Field label="Feed name">
              <input
                required
                maxLength={60}
                value={draft.name}
                onChange={(e) => edit('name', e.target.value)}
              />
            </Field>
            <Field label="Description">
              <input
                maxLength={240}
                value={draft.description}
                onChange={(e) => edit('description', e.target.value)}
              />
            </Field>
          </div>
          <Field label="Feed color">
            <div className="color-picker">
              {(['blue', 'violet', 'green', 'orange', 'rose'] as const).map((color) => (
                <button
                  type="button"
                  aria-label={`${color} feed color`}
                  aria-pressed={draft.color === color}
                  className={`color-dot ${color}`}
                  key={color}
                  onClick={() => edit('color', color)}
                >
                  {draft.color === color && <Check size={14} />}
                </button>
              ))}
            </div>
          </Field>
        </section>
        <section className="config-card">
          <div className="config-icon-heading">
            <SlidersHorizontal size={18} />
            <h3>Background context</h3>
          </div>
          <p className="muted">
            What are you interested in? Matching words help rank your feed and guide AI digests.
          </p>
          <Field label="Your interests and perspective">
            <textarea
              rows={4}
              placeholder="I’m interested in the open web, thoughtful design, and independent publishing…"
              maxLength={2000}
              value={draft.context}
              onChange={(e) => edit('context', e.target.value)}
            />
          </Field>
        </section>
        <section className="config-card">
          <h3>AI Pipeline profile</h3>
          <p className="muted">
            Default profile: reading digest. This feed's eligible originals and background context
            are the input; the generated snapshot appears in this feed. Runs are manual and require
            review. Imported external pipeline results use an API source.
          </p>
          <Field
            label="Pipeline processing instructions"
            help="Optional preferences for the source-grounded digest. Saving does not generate or publish anything."
          >
            <textarea
              rows={4}
              maxLength={2000}
              value={draft.aiPipeline?.instructions ?? ''}
              aria-label="Pipeline processing instructions"
              onChange={(e) =>
                edit('aiPipeline', { profile: 'digest', instructions: e.target.value })
              }
            />
          </Field>
        </section>
        <section className="config-card">
          <div className="config-icon-heading">
            <Filter size={18} />
            <h3>Filter the noise</h3>
          </div>
          <div className="form-grid">
            <Field
              label="Include keywords"
              help="Comma-separated. Keep items that match any of these. Leave blank to include everything."
            >
              <input
                placeholder="open source, design, science"
                value={includeText}
                onChange={(e) => {
                  setIncludeText(e.target.value);
                  setSaved(false);
                }}
              />
            </Field>
            <Field
              label="Mute keywords"
              help="Comma-separated. Matching items stay in collected data, outside your feed."
            >
              <input
                placeholder="sponsored, giveaway"
                value={excludeText}
                onChange={(e) => {
                  setExcludeText(e.target.value);
                  setSaved(false);
                }}
              />
            </Field>
          </div>
          <div className="toggle-row">
            <div>
              <strong>Hide duplicate stories</strong>
              <small>Show one copy when your sources share the same link.</small>
            </div>
            <Toggle
              checked={draft.deduplicate}
              onChange={(v) => edit('deduplicate', v)}
              label="Hide duplicate stories"
            />
          </div>
        </section>
        <section className="config-card">
          <h3>Mention alerts</h3>
          <div className="toggle-row">
            <div>
              <strong>Show mention alerts</strong>
              <small>Collect a short summary when your @handles appear in this feed.</small>
            </div>
            <Toggle
              label="Show mention alerts"
              checked={draft.alertsEnabled ?? false}
              onChange={(value) => edit('alertsEnabled', value)}
            />
          </div>
          <Field
            label="Your @handles"
            help="Comma-separated, for example @alex, @alex@social.example. Matches explicit mentions in collected text; feed filters still apply."
          >
            <input
              value={alertText}
              maxLength={4000}
              placeholder="@yourhandle"
              onChange={(e) => {
                setAlertText(e.target.value);
                setSaved(false);
              }}
            />
          </Field>
          <p className="muted">
            Alerts stay inside MyFeed. External delivery through connections is planned.
          </p>
        </section>
        <section className="config-card">
          <h3>Reading layout</h3>
          <Field
            label="Item text limit"
            help="Limits preview text only. Full text remains available when opened or expanded."
          >
            <select
              aria-label="Item text limit"
              value={draft.textLimit?.mode ?? 'default'}
              onChange={(e) => {
                const mode = e.target.value as 'default' | 'words' | 'characters';
                edit(
                  'textLimit',
                  mode === 'default' ? { mode } : { mode, value: mode === 'words' ? 100 : 500 },
                );
              }}
            >
              <option value="default">Current default</option>
              <option value="words">Words</option>
              <option value="characters">Characters</option>
            </select>
          </Field>
          {draft.textLimit && draft.textLimit.mode !== 'default' && (
            <Field
              label={
                draft.textLimit.mode === 'words'
                  ? 'Maximum words per item'
                  : 'Maximum characters per item'
              }
              help={
                draft.textLimit.mode === 'words'
                  ? '1–5,000 words. Emoji and punctuation do not count as words.'
                  : '1–20,000 visible characters. Emoji and combining marks count as one character.'
              }
            >
              <input
                aria-label={
                  draft.textLimit.mode === 'words'
                    ? 'Maximum words per item'
                    : 'Maximum characters per item'
                }
                type="number"
                required
                min={1}
                max={draft.textLimit.mode === 'words' ? 5000 : 20000}
                step={1}
                value={Number.isFinite(draft.textLimit.value) ? draft.textLimit.value : ''}
                onChange={(e) => {
                  if (draft.textLimit.mode !== 'default')
                    edit('textLimit', {
                      mode: draft.textLimit.mode,
                      value: e.target.value === '' ? NaN : Number(e.target.value),
                    });
                }}
              />
            </Field>
          )}
          <details className="workspace-settings">
            <summary>Item-type text overrides</summary>
            {(['post', 'article', 'chat'] as const).map((type) => (
              <div key={type}>
                <Field label={`${type} text limit`}>
                  <select
                    aria-label={`${type} text limit`}
                    value={draft.textOverrides?.[type]?.mode ?? 'inherit'}
                    onChange={(e) => {
                      const mode = e.target.value;
                      const overrides = { ...draft.textOverrides };
                      if (mode === 'inherit') delete overrides[type];
                      else
                        overrides[type] =
                          mode === 'default'
                            ? { mode: 'default' }
                            : {
                                mode: mode as 'words' | 'characters',
                                value: mode === 'words' ? 100 : 500,
                              };
                      edit('textOverrides', overrides);
                    }}
                  >
                    <option value="inherit">Inherit feed limit</option>
                    <option value="default">Current default</option>
                    <option value="words">Words</option>
                    <option value="characters">Characters</option>
                  </select>
                </Field>
                {draft.textOverrides?.[type] && draft.textOverrides[type]!.mode !== 'default' && (
                  <Field label={`${type} maximum`}>
                    <input
                      aria-label={`${type} maximum`}
                      type="number"
                      required
                      min={1}
                      max={draft.textOverrides[type]!.mode === 'words' ? 5000 : 20000}
                      value={
                        'value' in draft.textOverrides[type]!
                          ? Number.isFinite((draft.textOverrides[type] as { value: number }).value)
                            ? (draft.textOverrides[type] as { value: number }).value
                            : ''
                          : ''
                      }
                      onChange={(e) => {
                        const limit = draft.textOverrides[type]!;
                        if (limit.mode !== 'default')
                          edit('textOverrides', {
                            ...draft.textOverrides,
                            [type]: { ...limit, value: e.target.valueAsNumber },
                          });
                      }}
                    />
                  </Field>
                )}
              </div>
            ))}
          </details>
          <div className="toggle-row">
            <span>Show media in previews</span>
            <Toggle
              label="Show media in previews"
              checked={draft.showMedia}
              onChange={(value) => edit('showMedia', value)}
            />
          </div>
          <div className="form-grid">
            <Field label="Media size">
              <select
                aria-label="Media size"
                value={draft.mediaSize}
                onChange={(e) => edit('mediaSize', e.target.value as Feed['mediaSize'])}
              >
                <option value="small">Small</option>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
              </select>
            </Field>
            <Field label="Reading width">
              <select
                aria-label="Reading width"
                value={draft.readingWidth}
                onChange={(e) => edit('readingWidth', e.target.value as Feed['readingWidth'])}
              >
                <option value="full">Full width</option>
                <option value="medium">Medium</option>
                <option value="narrow">Narrow</option>
              </select>
            </Field>
            <Field label="Font size">
              <input
                aria-label="Font size"
                type="number"
                min={14}
                max={24}
                step={1}
                required
                value={Number.isFinite(draft.fontSize) ? draft.fontSize : ''}
                onChange={(e) => edit('fontSize', e.target.valueAsNumber)}
              />
            </Field>
            <Field label="Line spacing">
              <input
                aria-label="Line spacing"
                type="number"
                min={1.2}
                max={2.2}
                step={0.1}
                required
                value={Number.isFinite(draft.lineSpacing) ? draft.lineSpacing : ''}
                onChange={(e) => edit('lineSpacing', e.target.valueAsNumber)}
              />
            </Field>
            <Field label="Conversation preview messages">
              <input
                aria-label="Conversation preview messages"
                type="number"
                min={1}
                max={10}
                step={1}
                required
                value={
                  Number.isFinite(draft.conversationPreviewCount)
                    ? draft.conversationPreviewCount
                    : ''
                }
                onChange={(e) => edit('conversationPreviewCount', e.target.valueAsNumber)}
              />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Sort order">
              <select
                value={draft.sort}
                onChange={(e) => edit('sort', e.target.value as Feed['sort'])}
              >
                <option value="newest">Newest first</option>
                <option value="relevance">Match my context first</option>
              </select>
            </Field>
            <Field label="Reading layout">
              <select
                value={draft.layout}
                onChange={(e) => edit('layout', e.target.value as Feed['layout'])}
              >
                <option value="cards">Comfortable cards</option>
                <option value="compact">Compact list</option>
              </select>
            </Field>
          </div>
        </section>
        {error && (
          <div className="notice error" role="alert">
            {error}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                resetForm(initial);
                setError('');
              }}
            >
              Reload saved customization
            </button>
          </div>
        )}
        {saved && (
          <p role="status" className="success-text">
            <Check size={15} />
            Customization saved. Your feed has been updated.
          </p>
        )}
        <div className="customize-footer">
          {state.feeds.length > 1 && (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => onDelete(`/feeds/${feed.id}`, feed.name)}
            >
              Delete this feed
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            Save customization
          </Button>
        </div>
      </form>

      <details className="filter-decisions">
        <summary>
          Filter results · {included} included / {total} collected
        </summary>{' '}
        <>
          <div className="background-intro">
            <div>
              <h2>Everything, before your filters.</h2>
              <p>See exactly why an item is included or held back.</p>
            </div>
            <select
              aria-label="Collected data inclusion filter"
              value={rawFilter}
              onChange={(e) => setRawFilter(e.target.value)}
            >
              <option value="all">All {total} items</option>
              <option value="included">Included ({included})</option>
              <option value="filtered">Filtered out ({total - included})</option>
            </select>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Story & source</th>
                  <th>Feed decision</th>
                  <th>Collected</th>
                </tr>
              </thead>
              <tbody>
                {decisions
                  .filter(
                    (d) =>
                      rawFilter === 'all' || (rawFilter === 'included' ? d.included : !d.included),
                  )
                  .map((d) => (
                    <tr key={d.entry.id}>
                      <td>
                        <strong>{d.entry.title}</strong>
                        <small>
                          {d.connection.name}
                          {d.connection.kind === 'sample' ? ' · Sample' : ''}
                        </small>
                      </td>
                      <td>
                        <span className={`decision-pill ${d.included ? 'included' : 'filtered'}`}>
                          {d.included ? 'Included' : 'Filtered out'}
                        </span>
                        <small>{d.reason}</small>
                      </td>
                      <td>{relativeTime(d.entry.receivedAt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!decisions.length && !history.loading && (
              <p className="table-empty">Connect a source and sync to see collected data here.</p>
            )}
          </div>
          {history.loading && <p role="status">Loading filter results…</p>}
          {history.error && (
            <p role="alert">
              {history.error}
              <Button onClick={history.reload}>Reload filter results</Button>
            </p>
          )}
          {history.hasMore && (
            <Button
              variant="secondary"
              onClick={() => void history.more()}
              disabled={history.loading}
            >
              Load more filter results
            </Button>
          )}
        </>
      </details>
    </div>
  );
}
