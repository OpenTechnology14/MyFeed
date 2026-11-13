import { describe, expect, it } from 'vitest';
import { createPreviewState, updatePreview } from '../src/preview';
import { evaluateFeed } from '../shared/pipeline';

describe('layout preview isolation', () => {
  it('edits a cloned fixture and resets on a fresh load without changing the original', () => {
    const original = createPreviewState(),
      feed = original.feeds[0];
    const next = updatePreview(original, `/feeds/${feed.id}`, 'PATCH', {
      ...feed,
      exclude: ['small blog'],
    });
    expect(original.feeds[0].exclude).toEqual(['sponsored', 'giveaway']);
    expect(
      evaluateFeed(next, next.feeds[0]).some(
        (d) => d.entry.content.includes('A small blog') && d.included,
      ),
    ).toBe(false);
    expect(createPreviewState().feeds[0].exclude).toEqual(['sponsored', 'giveaway']);
  });
  it('rejects live connection, credential, and AI actions without retaining any supplied secret', () => {
    const state = createPreviewState(),
      before = JSON.stringify(state);
    expect(() =>
      updatePreview(state, '/ai', 'PUT', { secret: 'secret-marker', model: 'paid-model' }),
    ).toThrow(/preview/);
    expect(() =>
      updatePreview(state, '/connections', 'POST', {
        feedId: state.feeds[0].id,
        kind: 'email',
        secret: 'secret-marker',
      }),
    ).toThrow(/sample/);
    expect(() => updatePreview(state, `/feeds/${state.feeds[0].id}/digest`, 'POST', {})).toThrow(
      /preview/,
    );
    expect(JSON.stringify(state)).toBe(before);
    expect(before).not.toContain('secret-marker');
    expect(state.feeds.every((f) => !f.background)).toBe(true);
  });
});
