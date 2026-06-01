import { describe, it, expect } from 'vitest';
import { groupByTax } from './taxonomy';
import type { Recipe } from './recipes';

// Minimal Recipe-shaped stub — groupByTax only reads `data[field]`.
function recipe(title: string, families: string[]): Recipe {
  return { data: { title, families } } as unknown as Recipe;
}

describe('groupByTax(_, "families")', () => {
  it('buckets a single-family recipe under its one root', () => {
    const grouped = groupByTax([recipe('Gimlet', ['daiquiri'])], 'families');
    expect([...grouped.keys()]).toEqual(['daiquiri']);
    expect(grouped.get('daiquiri')?.map((r) => r.data.title)).toEqual(['Gimlet']);
  });

  it('lists a borderline recipe under BOTH of its roots', () => {
    const grouped = groupByTax(
      [recipe('French 75', ['daiquiri', 'whiskey-highball'])],
      'families',
    );
    expect(grouped.get('daiquiri')?.map((r) => r.data.title)).toEqual(['French 75']);
    expect(grouped.get('whiskey-highball')?.map((r) => r.data.title)).toEqual(['French 75']);
  });

  it('keeps roots sorted and groups members across recipes', () => {
    const grouped = groupByTax(
      [
        recipe('Manhattan', ['martini', 'old-fashioned']),
        recipe('Oaxaca OF', ['old-fashioned']),
      ],
      'families',
    );
    expect([...grouped.keys()]).toEqual(['martini', 'old-fashioned']);
    expect(grouped.get('old-fashioned')?.map((r) => r.data.title)).toEqual([
      'Manhattan',
      'Oaxaca OF',
    ]);
  });
});
