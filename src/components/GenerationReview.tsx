import { query } from '../api';
import { useEffect, useState } from 'react';
import {
  generationInput,
  pipelineInstructions,
  generationOptionsSchema,
  type GenerationOptions,
  type GenerationReviewItem,
} from '../../shared/generation';
import type { State, Feed } from '../../shared/model';
import { Button, Field, Modal } from './ui';
export function GenerationReview({
  state,
  preview,
  feed,
  onClose,
  onGenerate,
}: {
  state: State;
  preview: boolean;
  feed: Feed;
  onClose: () => void;
  onGenerate: (options: GenerationOptions, revision: number) => void;
}) {
  const [values, setValues] = useState({
    maxItems: 20,
    charactersPerItem: 2000,
    maxInputTokens: 12000,
    maxOutputTokens: 1500,
    inputRate: 0,
    outputRate: 0,
    maximumUsd: 0,
    pricesVerified: false,
  });
  const [error, setError] = useState('');
  const fallback = generationInput(state, feed, values);
  const [loaded, setLoaded] = useState<{
    revision: number;
    items: GenerationReviewItem[];
    context: string;
    model: string;
    instructions: string;
  }>();
  const [loading, setLoading] = useState(!preview);
  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    setLoading(true);
    setLoaded(undefined);
    if (!Number.isFinite(values.maxItems) || !Number.isFinite(values.charactersPerItem)) return;
    query<{
      revision: number;
      items: GenerationReviewItem[];
      context: string;
      model: string;
      instructions: string;
    }>(
      `/feeds/${feed.id}/digest-plan?maxItems=${values.maxItems}&charactersPerItem=${values.charactersPerItem}`,
    )
      .then((plan) => {
        if (!cancelled) {
          setLoaded(plan);
          setError('');
        }
      })
      .catch((error) => {
        if (!cancelled) setError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preview, feed.id, values.maxItems, values.charactersPerItem, state.revision]);
  const plan = preview
    ? {
        items: fallback.items,
        revision: state.revision,
        context: feed.context,
        model: state.ai.model,
        instructions: pipelineInstructions(feed),
      }
    : (loaded ?? {
        items: [],
        revision: state.revision,
        context: '',
        model: state.ai.model,
        instructions: '',
      });
  return (
    <Modal
      title="Review digest generation"
      subtitle={`Your configured model: ${plan.model}`}
      wide
      onClose={onClose}
    >
      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = generationOptionsSchema.safeParse(values);
          if (!parsed.success) {
            setError('Enter valid limits, positive rates/budget, and confirm current pricing.');
            return;
          }
          onGenerate(parsed.data, plan.revision);
          onClose();
        }}
      >
        <p className="notice">
          This explicit action sends the reviewed originals and context to OpenAI for token
          counting, then generates only within your limits. Reading text limits and local edits do
          not affect inputs. No tools or automatic retry. Cancel closes this review before
          submission.
        </p>
        <p>
          AI Pipeline · Default reading digest · Input: {feed.name} · Output: a generated snapshot
          in this feed. Generated snapshots are not collected source inputs.
        </p>
        <details>
          <summary>Review processing instructions</summary>
          <p className="reading-body">{plan.instructions}</p>
        </details>
        <div className="form-grid">
          {(
            [
              ['maxItems', 'Maximum input items', 1, 20],
              ['charactersPerItem', 'Input characters per item', 100, 2000],
              ['maxInputTokens', 'Maximum input tokens', 100, 20000],
              ['maxOutputTokens', 'Maximum output tokens', 16, 4000],
              ['inputRate', 'Highest input USD per million tokens', 0.000001, 10000],
              ['outputRate', 'Output USD per million tokens', 0.000001, 10000],
              ['maximumUsd', 'Maximum USD for this generation', 0.000001, 100],
            ] as const
          ).map(([key, label, min, max]) => (
            <Field key={key} label={label}>
              <input
                aria-label={label}
                type="number"
                required
                min={min}
                max={max}
                step={key.includes('Rate') || key === 'maximumUsd' ? 'any' : 1}
                value={Number.isFinite(values[key]) ? values[key] : ''}
                onChange={(event) => setValues({ ...values, [key]: event.target.valueAsNumber })}
              />
            </Field>
          ))}
        </div>
        <label>
          <input
            type="checkbox"
            checked={values.pricesVerified}
            onChange={(event) => setValues({ ...values, pricesVerified: event.target.checked })}
          />{' '}
          I checked current default-tier prices for this exact model. My input rate covers ordinary,
          cached, and any separately billed cache writes.
        </label>
        <p>
          <a href="https://developers.openai.com/api/docs/pricing" target="_blank" rel="noreferrer">
            Official pricing
          </a>{' '}
          · Budget covers model tokens at the rates you enter; it does not set an account-wide
          limit. Actual token count is checked before generation. Output cap includes reasoning.
          Unknown charges remain reserved in receipts.
        </p>
        <details>
          <summary>Review {plan.items.length} source inputs and context</summary>
          <h3>Background context</h3>
          <p>{plan.context || 'No background context.'}</p>
          {plan.items.map((entry, index) => (
            <article key={entry.id}>
              <h3>
                [{index + 1}] {entry.title}
              </h3>
              <p>Source: {entry.author}</p>
              <p className="reading-body">
                {entry.contentWarning
                  ? `Content warning: ${entry.contentWarning}`
                  : entry.content.slice(0, values.charactersPerItem)}
              </p>
              {entry.contentWarning && (
                <details>
                  <summary>Reveal reviewed input</summary>
                  <p>{entry.content.slice(0, values.charactersPerItem)}</p>
                </details>
              )}
            </article>
          ))}
        </details>
        {loading && <p role="status">Loading review inputs…</p>}
        {error && <p role="alert">{error}</p>}
        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !plan.items.length}>
            Count tokens and generate
          </Button>
        </div>
      </form>
    </Modal>
  );
}
