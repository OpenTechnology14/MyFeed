// PROP-025 slice 1 — offline semantic-lens evaluator stub.
//
// This module is a PLACEHOLDER. It does not call any model, API, or network
// service. "Semantic" here means deterministic keyword-rule matching used to
// stand in for a future real classifier so the rest of the system (category
// shape, reasoning text, flag gating) can be built and tested now.
//
// Real-model integration (an actual ML/LLM classifier, cost/spending limits,
// privacy review) is PROP-025 slice 2, and is intentionally not started here.
// It is blocked on the owner deciding: which model, what data leaves the
// device, and what the spending/rate limits are. See
// docs/readable/PROPOSAL_WORK_QUEUE.md PROP-025 for the queue entry.
//
// The whole feature is gated behind `semanticFilterEnabled`, which defaults
// to false, matching the opt-in pattern used by other local-only switches in
// this codebase (e.g. feed.alertsEnabled in shared/model.ts).
import type { Entry } from './model';

/** Master flag for this feature. Defaults to OFF; nothing in the app flips it
 *  on automatically. A future UI control (if ever built) would need its own
 *  explicit opt-in, per the Connections-first configuration rule. */
export const semanticFilterEnabled = false;

/** One semantic-lens category: a label plus the deterministic keyword rules
 *  that place an entry into it. Keywords are matched case-insensitively
 *  against title/content/tags/author, the same text blob shape used by
 *  shared/pipeline.ts evaluateFeed. */
export interface SemanticCategory {
  /** Stable identifier for the category, e.g. "security". */
  id: string;
  /** Human-readable label shown to the user. */
  label: string;
  /** Keyword rules — a match on any keyword places the entry in this
   *  category. Keywords are plain substrings, not regular expressions. */
  keywords: string[];
}

/** Minimal typed spec for the offline evaluator: a flag plus an ordered list
 *  of categories. Category order is the tie-break order when an entry's
 *  text matches keywords from more than one category — see
 *  classifySemanticLens below. */
export interface SemanticFilterSpec {
  enabled: boolean;
  categories: SemanticCategory[];
}

export interface SemanticDecision {
  entry: Entry;
  /** The matched category id, or null when nothing matched. */
  categoryId: string | null;
  /** The matched category label, or null when nothing matched. */
  categoryLabel: string | null;
  /** Human-readable explanation of why the entry landed where it did. */
  reasoning: string;
}

function entryText(entry: Partial<Entry>): string {
  const title = typeof entry.title === 'string' ? entry.title : '';
  const content = typeof entry.content === 'string' ? entry.content : '';
  const author = typeof entry.author === 'string' ? entry.author : '';
  const tags = Array.isArray(entry.tags) ? entry.tags.filter((t) => typeof t === 'string') : [];
  return `${title} ${content} ${tags.join(' ')} ${author}`.toLowerCase();
}

/**
 * Classify a single entry against the spec's categories using deterministic
 * substring matching. This is the stub "classifier" — it is intentionally
 * not a real model. When multiple categories match, the first matching
 * category in spec.categories order wins (stable, reproducible — no
 * randomness, no ranking heuristics beyond declared order).
 *
 * Never throws: malformed/missing entry fields are treated as empty text.
 */
export function classifySemanticLens(
  entry: Entry,
  spec: SemanticFilterSpec,
): SemanticDecision {
  const text = entryText(entry ?? {});
  for (const category of spec.categories ?? []) {
    const matched = (category.keywords ?? []).filter(
      (keyword) => typeof keyword === 'string' && keyword.length > 0 && text.includes(keyword.toLowerCase()),
    );
    if (matched.length) {
      return {
        entry,
        categoryId: category.id,
        categoryLabel: category.label,
        reasoning: `matched keywords: ${matched.join(', ')}`,
      };
    }
  }
  return {
    entry,
    categoryId: null,
    categoryLabel: null,
    reasoning: 'no category keywords matched',
  };
}

/**
 * Evaluate a batch of entries against a semantic-lens spec. This is the
 * harness other code would call. It stays pure and offline:
 *   - no network calls
 *   - no model invocation
 *   - no mutation of the input entries
 *
 * Returns an empty array when the feature flag (module-level
 * `semanticFilterEnabled` or the spec's own `enabled`) is off, or when the
 * spec has no categories, or when there are no entries. This mirrors the
 * fail-closed, not-wired-in-by-default posture required for PROP-025 slice 1.
 */
export function evaluateSemanticLens(entries: Entry[], spec: SemanticFilterSpec): SemanticDecision[] {
  if (!semanticFilterEnabled) return [];
  if (!spec?.enabled) return [];
  if (!Array.isArray(entries) || entries.length === 0) return [];
  if (!Array.isArray(spec.categories) || spec.categories.length === 0) return [];
  return entries
    .filter((entry): entry is Entry => entry != null)
    .map((entry) => classifySemanticLens(entry, spec));
}

/**
 * Example starter categories for the offline stub classifier.
 *
 * This is sample data, not an enforced taxonomy: SemanticFilterSpec.categories
 * is caller-supplied (see above), so nothing in this module requires a user
 * or owner to adopt these specific categories or keywords. They exist to
 * give callers/tests a realistic, deterministic starting point without
 * inventing a product decision about what categories MyFeed should ship
 * with — that remains open, same as the rest of PROP-025 slice 1.
 *
 * Keywords are intentionally narrow, literal substrings (not regex, not a
 * curated taxonomy) to keep matching predictable and testable. Expanding or
 * replacing this list is a content change, not an interface change.
 */
export const exampleSemanticCategories: SemanticCategory[] = [
  {
    id: 'security',
    label: 'Security',
    keywords: ['breach', 'vulnerability', 'cve-', 'ransomware', 'zero-day'],
  },
  {
    id: 'product-updates',
    label: 'Product updates',
    keywords: ['changelog', 'release notes', 'now available', 'rolling out'],
  },
  {
    id: 'open-source',
    label: 'Open source',
    keywords: ['open source', 'open-source', 'pull request', 'maintainer'],
  },
  {
    id: 'funding',
    label: 'Funding',
    keywords: ['series a', 'series b', 'seed round', 'raised $', 'valuation'],
  },
  {
    id: 'outages',
    label: 'Outages',
    keywords: ['outage', 'service disruption', 'status page', 'degraded performance'],
  },
];
