import type { TextLimit } from './model';

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });
const words = new Intl.Segmenter('en', { granularity: 'word' });

/** Presentation only: callers retain and process the collected original. */
export function itemExcerpt(
  text: string,
  limit: TextLimit = { mode: 'default' },
  kind: 'post' | 'article' | 'chat' = 'post',
): { text: string; truncated: boolean } {
  if (limit.mode === 'default') {
    const truncated = kind === 'post' && text.length > 900;
    return { text: truncated ? text.slice(0, 900) + '…' : text, truncated };
  }
  if (limit.mode === 'characters') {
    let count = 0;
    for (const part of graphemes.segment(text)) {
      if (count++ === limit.value)
        return { text: text.slice(0, part.index) + '…', truncated: true };
    }
  } else {
    let count = 0;
    for (const part of words.segment(text)) {
      if (part.isWordLike && count++ === limit.value)
        return { text: text.slice(0, part.index).trimEnd() + '…', truncated: true };
    }
  }
  return { text, truncated: false };
}
