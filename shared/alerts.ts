import type { Decision, Feed } from './model';

// Match explicit text mentions, never infer identity from author names, profile email,
// or broad keywords. Provider-native notification APIs are a future adapter concern.
export function mentionAlerts(decisions: Decision[], feed: Feed) {
  if (!feed.alertsEnabled || !feed.alertHandles?.length) return [];
  const handles = new Set(feed.alertHandles.map((h) => h.normalize('NFC').toLowerCase()));
  return decisions.filter((d) => {
    if (!d.included) return false;
    const text = `${d.entry.title}\n${d.entry.content}`.normalize('NFC').toLowerCase();
    const mentions = [
      ...text.matchAll(/(?<![\p{L}\p{N}_@./-])@[\p{L}\p{N}_][\p{L}\p{N}_.@-]*/gu),
    ].map((m) => m[0].replace(/[.-]+$/, ''));
    return mentions.some((handle) => handles.has(handle));
  });
}
export function alertExcerpt(text: string, max = 180) {
  const plain = text.replace(/\s+/g, ' ').trim();
  const characters = Array.from(plain);
  return characters.length > max ? characters.slice(0, max).join('') + '…' : plain;
}
