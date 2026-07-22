import { describe, it, expect } from 'vitest';
import { recipeToJson, type RecipeJsonInput } from './recipesJson';

const naked: RecipeJsonInput = {
  slug: 'naked-and-famous',
  title: 'Naked & Famous',
  blurb: 'An equal-parts mezcal sour.',
  spirits: ['mezcal'],
  method: 'shaken',
  difficulty: 'easy',
  flavors: ['smoky', 'bitter', 'citrus'],
};

describe('recipeToJson', () => {
  it('maps a recipe to the documented key set with an absolute URL', () => {
    expect(recipeToJson(naked, 'https://dancj.github.io/home-bartender')).toEqual({
      title: 'Naked & Famous',
      slug: 'naked-and-famous',
      spirits: ['mezcal'],
      method: 'shaken',
      difficulty: 'easy',
      flavors: ['smoky', 'bitter', 'citrus'],
      description: 'An equal-parts mezcal sour.',
      url: 'https://dancj.github.io/home-bartender/recipes/naked-and-famous/',
    });
  });

  it('passes empty spirits/flavors through as [], not dropped', () => {
    const out = recipeToJson({ ...naked, spirits: [], flavors: [] }, 'https://x.test');
    expect(out.spirits).toEqual([]);
    expect(out.flavors).toEqual([]);
  });

  it('produces a single-slash URL whether the prefix has a trailing slash or not', () => {
    const withSlash = recipeToJson(naked, 'https://x.test/base/');
    const without = recipeToJson(naked, 'https://x.test/base');
    expect(withSlash.url).toBe('https://x.test/base/recipes/naked-and-famous/');
    expect(without.url).toBe(withSlash.url);
  });

  it('falls back to a base-relative URL when no site prefix is known (local dev)', () => {
    expect(recipeToJson(naked, '').url).toBe('/recipes/naked-and-famous/');
  });
});
