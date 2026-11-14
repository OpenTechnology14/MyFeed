import { useState } from 'react';
import type { Connection, State } from '../../shared/model';
import type { PostReceipt } from '../../shared/posting';
import { Button, Field } from './ui';

export function SendOutcomeCheck({
  receipt,
  connection,
  preview,
  busy,
  mutate,
}: {
  receipt: PostReceipt;
  connection?: Connection;
  preview: boolean;
  busy: boolean;
  mutate: (path: string, method: string, body?: unknown) => Promise<State>;
}) {
  const [providerId, setProviderId] = useState(''),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  if (receipt.status !== 'unknown') return null;
  if (
    preview ||
    !connection?.posting?.hasSecret ||
    !receipt.senderId ||
    receipt.replyId === undefined
  )
    return (
      <p>
        Original writing evidence or connection is unavailable. Inspect the provider manually; this
        outcome stays unknown and cannot be retried.
      </p>
    );
  return (
    <form
      aria-label="Read-only outcome check"
      className="settings-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError('');
        setMessage('');
        try {
          const next = await mutate(`/outbound/receipts/${receipt.id}/check`, 'POST', {
            providerId,
          });
          setMessage(
            next.outbound?.receipts.find((item) => item.id === receipt.id)?.message ||
              'Inspect the receipt.',
          );
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Could not check the send outcome.');
        } finally {
          setPending(false);
        }
      }}
    >
      <p>
        Read-only check. Nothing is resent. A missing or different result keeps the draft locked.
      </p>
      {receipt.kind === 'mastodon' && (
        <Field
          label="Provider post ID to check"
          help="Find the candidate in your own account near this attempt time. The app compares exact source text, account, audience, warning, language and reply; read:statuses may be required."
        >
          <input
            aria-label="Provider post ID to check"
            required
            pattern="[0-9]+"
            maxLength={500}
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
          />
        </Field>
      )}
      <Button type="submit" disabled={busy || pending}>
        {pending ? 'Checking outcome…' : 'Check send outcome'}
      </Button>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
