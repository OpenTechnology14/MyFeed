import { describe, expect, it } from 'vitest';
import { createPreviewState } from '../src/preview';
import { evaluateFeed } from '../shared/pipeline';
import { mentionAlerts, alertExcerpt } from '../shared/alerts';
import { feedConfigSchema } from '../shared/model';

describe('local mention alerts', () => {
  it('matches whole explicit handles including federated and Unicode handles, not author names or email', () => {
    const state = createPreviewState(),
      feed = state.feeds[0];
    feed.alertHandles = ['@alex', '@sara@social.example', '@joão'];
    const d = evaluateFeed(state, feed)[0];
    const match = (text: string) =>
      mentionAlerts(
        [
          {
            ...d,
            included: true,
            entry: { ...d.entry, title: '', content: text, author: '@alex' },
          },
        ],
        feed,
      ).length;
    expect(match('Hello @Alex!')).toBe(1);
    expect(match('Hi @sara@social.example.')).toBe(1);
    expect(match('@joão: hello')).toBe(1);
    for (const text of [
      '@alexander',
      '@alex.bsky.social',
      'person@alex',
      'https://example.com/@alex',
      'Alex says hello',
    ])
      expect(match(text)).toBe(0);
  });
  it('requires opt-in and eligible collected items; muted and paused data cannot become alerts', () => {
    const state = createPreviewState(),
      feed = state.feeds[0];
    expect(mentionAlerts(evaluateFeed(state, feed), feed)).toHaveLength(1);
    feed.alertsEnabled = false;
    expect(mentionAlerts(evaluateFeed(state, feed), feed)).toHaveLength(0);
    feed.alertsEnabled = true;
    feed.exclude = ['@alex'];
    expect(mentionAlerts(evaluateFeed(state, feed), feed)).toHaveLength(0);
    feed.exclude = [];
    state.connections[0].enabled = false;
    expect(mentionAlerts(evaluateFeed(state, feed), feed)).toHaveLength(0);
  });
  it('defaults old feed configs to alerts off and validates handles and bounded excerpts', () => {
    const { alertsEnabled, alertHandles, ...old } = createPreviewState().feeds[0];
    expect(feedConfigSchema.parse(old)).toMatchObject({ alertsEnabled: false, alertHandles: [] });
    expect(feedConfigSchema.safeParse({ ...old, alertHandles: ['Alex Morgan'] }).success).toBe(
      false,
    );
    expect(alertExcerpt('hello\n  world')).toBe('hello world');
    expect(alertExcerpt('😀'.repeat(200))).toBe('😀'.repeat(180) + '…');
  });
});
