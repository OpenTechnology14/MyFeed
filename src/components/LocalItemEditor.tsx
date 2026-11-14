import { useState } from 'react';
import { localEditSchema, type Entry } from '../../shared/model';
import { Button, Field, Modal } from './ui';

export function LocalItemEditor({
  entry,
  mutate,
  onClose,
}: {
  entry: Entry;
  mutate: (path: string, method: string, body: unknown) => Promise<unknown>;
  onClose: () => void;
}) {
  const initial = {
    title: entry.localEdit?.title ?? entry.title,
    content: entry.localEdit?.content ?? entry.content,
  };
  const [version] = useState(entry.editVersion ?? 0);
  const [draft, setDraft] = useState(initial),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [reset, setReset] = useState(false);
  const dirty = draft.title !== initial.title || draft.content !== initial.content;
  function close() {
    if (!dirty || window.confirm('Discard these unsaved local edits?')) onClose();
  }
  async function save(value: typeof draft | null) {
    setError('');
    setBusy(true);
    try {
      if (value) localEditSchema.parse(value);
      await mutate(`/entries/${entry.id}`, 'PATCH', {
        localEdit: value,
        editVersion: version,
      });
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save. Your draft remains here.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Edit local copy"
      subtitle="Shared across linked feeds. The collected original stays unchanged."
      onClose={close}
      wide
    >
      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save(draft);
        }}
      >
        <p className="notice">
          Filters, mentions and AI use the collected original. Body can be empty; title must contain
          text. Limits: 500 title characters and 100,000 body characters (JavaScript UTF-16 units).
        </p>
        {entry.contentWarning && <p className="notice">Content warning: {entry.contentWarning}</p>}
        <Field label="Local title">
          <input
            aria-label="Local title"
            value={draft.title}
            maxLength={500}
            required
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </Field>
        <Field label="Local body">
          <textarea
            aria-label="Local body"
            value={draft.content}
            maxLength={100000}
            rows={9}
            onChange={(event) => setDraft({ ...draft, content: event.target.value })}
          />
        </Field>
        <details>
          <summary>Show original</summary>
          <h3>{entry.title}</h3>
          <p className="reading-body">{entry.content}</p>
        </details>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        {reset && (
          <p className="notice">
            Reset replaces this local copy with the latest collected text.{' '}
            <Button variant="danger" disabled={busy} onClick={() => void save(null)}>
              Confirm reset local edits
            </Button>
            <Button variant="ghost" onClick={() => setReset(false)}>
              Keep local edits
            </Button>
          </p>
        )}
        <div className="modal-footer">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          {entry.localEdit && (
            <Button variant="secondary" disabled={busy} onClick={() => setReset(true)}>
              Reset local edits
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            Save local copy
          </Button>
        </div>
      </form>
    </Modal>
  );
}
