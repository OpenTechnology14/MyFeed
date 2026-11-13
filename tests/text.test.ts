import { describe, expect, it } from 'vitest';
import { itemExcerpt } from '../shared/text';
import { createPreviewState, updatePreview } from '../src/preview';
import { evaluateFeed, feedFingerprint } from '../shared/pipeline';

describe('item text presentation', () => {
  it('keeps legacy defaults and exact-boundary content', () => {
    expect(itemExcerpt('a'.repeat(901)).text).toBe('a'.repeat(900) + '…');
    expect(itemExcerpt('a'.repeat(901), { mode: 'default' }, 'article').truncated).toBe(false);
    expect(itemExcerpt('a'.repeat(901), { mode: 'default' }, 'chat').truncated).toBe(false);
    expect(itemExcerpt('One two!', { mode: 'words', value: 2 })).toEqual({
      text: 'One two!',
      truncated: false,
    });
    expect(itemExcerpt('', { mode: 'characters', value: 1 }).text).toBe('');
  });
  it('preserves whole emoji and combining marks without rewriting paragraphs', () => {
    expect(itemExcerpt('👨‍👩‍👧‍👦e\u0301🇨🇦x', { mode: 'characters', value: 3 })).toEqual({
      text: '👨‍👩‍👧‍👦e\u0301🇨🇦…',
      truncated: true,
    });
    expect(itemExcerpt('A\n\nB', { mode: 'characters', value: 3 }).text).toBe('A\n\n…');
  });
  it('counts words with punctuation, paragraphs, and text without spaces', () => {
    expect(itemExcerpt('One,\n\ntwo 👋 three.', { mode: 'words', value: 2 }).text).toBe(
      'One,\n\ntwo 👋…',
    );
    const result = itemExcerpt('猫が好きです。犬も好きです。', { mode: 'words', value: 1 });
    expect(result.truncated).toBe(true);
    expect(result.text).toBe('猫…');
  });
  it('leaves filtering, search inputs, originals, saved/read state and digest fingerprint unchanged', () => {
    const state = createPreviewState(),
      feed = state.feeds[0];
    const before = evaluateFeed(state, feed);
    const next = updatePreview(state, `/feeds/${feed.id}`, 'PATCH', {
      ...feed,
      textLimit: { mode: 'words', value: 1 },
    });
    expect(next.entries).toEqual(state.entries);
    expect(evaluateFeed(next, next.feeds[0])).toEqual(before);
    expect(feedFingerprint(next.feeds[0])).toBe(feedFingerprint(feed));
    expect(state.feeds[0].textLimit).toEqual({ mode: 'default' });
    expect(next.feeds[1].textLimit).toEqual({ mode: 'default' });
  });
});
