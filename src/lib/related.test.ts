import { describe, it, expect } from 'vitest';
import { resolveRelated } from './related';
import type { Recipe } from './recipes';

// Minimal fixtures — resolveRelated only reads `id` (for slug derivation) and
// `data.title`. Cast through unknown so we don't have to satisfy the full
// CollectionEntry shape in a unit test.
const recipe = (id: string, title: string): Recipe =>
  ({ id, data: { title } }) as unknown as Recipe;

describe('resolveRelated', () => {
  it('resolves a slug to its real frontmatter title, not the de-slugged string', () => {
    const all = [recipe('classics/old-fashioned', 'Old Fashioned')];
    const out = resolveRelated(all, ['old-fashioned']);
    expect(out).toHaveLength(1);
    expect(out[0].data.title).toBe('Old Fashioned');
  });

  it('returns titles with punctuation verbatim from frontmatter', () => {
    const all = [recipe('originals/naked-and-famous', 'Naked & Famous')];
    expect(resolveRelated(all, ['naked-and-famous'])[0].data.title).toBe('Naked & Famous');
  });

  it('preserves the order of the related[] list, not the collection order', () => {
    const all = [
      recipe('a', 'Alpha'),
      recipe('b', 'Bravo'),
      recipe('c', 'Charlie'),
    ];
    expect(resolveRelated(all, ['c', 'a']).map((r) => r.data.title)).toEqual([
      'Charlie',
      'Alpha',
    ]);
  });

  it('derives the slug from a nested collection id', () => {
    const all = [recipe('seasonal/holiday/spiced-old-fashioned', 'Spiced Old Fashioned')];
    expect(resolveRelated(all, ['spiced-old-fashioned'])[0].data.title).toBe(
      'Spiced Old Fashioned'
    );
  });

  it('omits an unresolved slug without throwing', () => {
    const all = [recipe('classics/old-fashioned', 'Old Fashioned')];
    const out = resolveRelated(all, ['does-not-exist', 'old-fashioned']);
    expect(out).toHaveLength(1);
    expect(out[0].data.title).toBe('Old Fashioned');
  });
});
