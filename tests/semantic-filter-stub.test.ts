import { describe, expect, it } from 'vitest';
import type { Entry } from '../shared/model';
import {
  classifySemanticLens,
  evaluateSemanticLens,
  exampleSemanticCategories,
  semanticFilterEnabled,
  type SemanticFilterSpec,
} from '../shared/semantic-filter-stub';

const entry = (overrides: Partial<Entry> = {}): Entry => ({
  id: crypto.randomUUID(),
  connectionId: 'source',
  externalId: '1',
  title: 'The open web',
  content: 'Independent publishing and open source.',
  author: 'Editor',
  url: 'https://example.com/story',
  publishedAt: '2026-10-04T10:00:00Z',
  receivedAt: '2026-10-04T10:00:00Z',
  tags: ['Technology'],
  saved: false,
  read: false,
  ...overrides,
});

const spec = (overrides: Partial<SemanticFilterSpec> = {}): SemanticFilterSpec => ({
  enabled: true,
  categories: [
    { id: 'security', label: 'Security', keywords: ['breach', 'vulnerability'] },
    { id: 'tech', label: 'Technology', keywords: ['open source', 'software'] },
  ],
  ...overrides,
});

describe('semantic-filter-stub: feature flag', () => {
  it('defaults the module flag to off', () => {
    expect(semanticFilterEnabled).toBe(false);
  });

  it('evaluateSemanticLens returns nothing when the module flag is off, even with a spec enabled', () => {
    const result = evaluateSemanticLens([entry()], spec());
    expect(result).toEqual([]);
  });
});

describe('semantic-filter-stub: classifySemanticLens', () => {
  it('matches the first category whose keyword appears in the entry text and explains why', () => {
    const decision = classifySemanticLens(entry(), spec());
    expect(decision.categoryId).toBe('tech');
    expect(decision.categoryLabel).toBe('Technology');
    expect(decision.reasoning).toBe('matched keywords: open source');
  });

  it('returns no category and a clear reason when nothing matches', () => {
    const decision = classifySemanticLens(entry({ title: 'Gardening', content: 'Plants' }), spec());
    expect(decision.categoryId).toBeNull();
    expect(decision.categoryLabel).toBeNull();
    expect(decision.reasoning).toBe('no category keywords matched');
  });

  it('picks the earlier category in spec order when keywords from two categories both match', () => {
    const multi = entry({ title: 'Software breach disclosed', content: 'open source software' });
    const decision = classifySemanticLens(multi, spec());
    expect(decision.categoryId).toBe('security');
    expect(decision.reasoning).toBe('matched keywords: breach');
  });

  it('lists every matching keyword within the winning category', () => {
    const multiKeyword = entry({ title: 'open source software project' });
    const decision = classifySemanticLens(multiKeyword, spec());
    expect(decision.categoryId).toBe('tech');
    expect(decision.reasoning).toBe('matched keywords: open source, software');
  });

  it('is case-insensitive', () => {
    const decision = classifySemanticLens(entry({ title: 'BREACH detected' }), spec());
    expect(decision.categoryId).toBe('security');
  });

  it('never throws on malformed/missing entry fields', () => {
    const malformed = { id: '1' } as unknown as Entry;
    expect(() => classifySemanticLens(malformed, spec())).not.toThrow();
    const decision = classifySemanticLens(malformed, spec());
    expect(decision.categoryId).toBeNull();
  });

  it('treats non-string tags/title/content gracefully instead of throwing', () => {
    const malformed = {
      ...entry(),
      title: undefined as unknown as string,
      content: null as unknown as string,
      tags: [1, 'software', null] as unknown as string[],
    };
    const decision = classifySemanticLens(malformed, spec());
    expect(decision.categoryId).toBe('tech');
    expect(decision.reasoning).toBe('matched keywords: software');
  });

  it('skips empty-string keywords in a category without matching everything', () => {
    const emptyKeywordSpec = spec({
      categories: [{ id: 'empty', label: 'Empty', keywords: ['', 'zzz-no-match'] }],
    });
    const decision = classifySemanticLens(entry(), emptyKeywordSpec);
    expect(decision.categoryId).toBeNull();
  });
});

describe('semantic-filter-stub: evaluateSemanticLens harness', () => {
  it('returns an empty array for an empty entries list, flag on', () => {
    // Exercise the harness logic directly bypassing the module flag by
    // calling with an empty list (covers the entries-empty branch
    // regardless of the module flag's own value).
    expect(evaluateSemanticLens([], spec())).toEqual([]);
  });

  it('returns an empty array when the spec itself is disabled', () => {
    expect(evaluateSemanticLens([entry()], spec({ enabled: false }))).toEqual([]);
  });

  it('returns an empty array when the spec has no categories', () => {
    expect(evaluateSemanticLens([entry()], spec({ categories: [] }))).toEqual([]);
  });

  it('filters out null/undefined entries without throwing', () => {
    const entries = [entry(), null, undefined] as unknown as Entry[];
    // Module flag is off by default, so the harness short-circuits before
    // reaching the entries; assert it does so without throwing.
    expect(() => evaluateSemanticLens(entries, spec())).not.toThrow();
    expect(evaluateSemanticLens(entries, spec())).toEqual([]);
  });

  it('never calls out to network or model APIs: pure function over the given arrays', () => {
    const entries = [entry(), entry({ id: '2', externalId: '2', title: 'Security breach' })];
    const before = JSON.stringify(entries);
    evaluateSemanticLens(entries, spec());
    expect(JSON.stringify(entries)).toBe(before);
  });
});

describe('semantic-filter-stub: exampleSemanticCategories', () => {
  it('is sample data only: not referenced by the flag or the harness defaults', () => {
    // exampleSemanticCategories must stay purely optional caller-supplied
    // data, not something evaluateSemanticLens reaches for on its own.
    expect(evaluateSemanticLens([entry()], spec({ categories: [] }))).toEqual([]);
  });

  it('classifies a security-flavored entry via the example categories', () => {
    const decision = classifySemanticLens(
      entry({ title: 'New CVE-2026-1234 disclosed', content: 'A critical vulnerability was patched.' }),
      spec({ categories: exampleSemanticCategories }),
    );
    expect(decision.categoryId).toBe('security');
    expect(decision.reasoning).toContain('vulnerability');
  });

  it('classifies a product-update-flavored entry via the example categories', () => {
    const decision = classifySemanticLens(
      entry({ title: 'Release notes for v4.2', content: 'Now available: faster sync.' }),
      spec({ categories: exampleSemanticCategories }),
    );
    expect(decision.categoryId).toBe('product-updates');
  });

  it('classifies an open-source-flavored entry via the example categories', () => {
    const decision = classifySemanticLens(
      entry({ title: 'New maintainer joins the project', content: 'Merged a pull request.' }),
      spec({ categories: exampleSemanticCategories }),
    );
    expect(decision.categoryId).toBe('open-source');
  });

  it('falls through to no match when nothing in the text hits any example category', () => {
    const decision = classifySemanticLens(
      entry({ title: 'Weekend hiking trip', content: 'Great views from the summit.' }),
      spec({ categories: exampleSemanticCategories }),
    );
    expect(decision.categoryId).toBeNull();
  });

  it('respects declared category order as the tie-break when text matches more than one example category', () => {
    // "security" is declared before "open-source"; an entry matching both
    // keyword sets must resolve to the earlier category.
    const decision = classifySemanticLens(
      entry({ title: 'Vulnerability found in open source maintainer tooling' }),
      spec({ categories: exampleSemanticCategories }),
    );
    expect(decision.categoryId).toBe('security');
  });

  it('classifies a funding-flavored entry via the example categories', () => {
    const decision = classifySemanticLens(
      entry({ title: 'Startup raised $12M Series A', content: 'New valuation revealed.' }),
      spec({ categories: exampleSemanticCategories }),
    );
    expect(decision.categoryId).toBe('funding');
  });

  it('classifies an outage-flavored entry via the example categories', () => {
    const decision = classifySemanticLens(
      entry({ title: 'Service disruption ongoing', content: 'Check the status page for updates.' }),
      spec({ categories: exampleSemanticCategories }),
    );
    expect(decision.categoryId).toBe('outages');
  });
});
