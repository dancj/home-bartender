import { describe, it, expect } from 'vitest';
import { breadcrumbTrail } from './breadcrumbs';

describe('breadcrumbTrail', () => {
  it('builds a three-segment trail: root, facet, current value', () => {
    expect(breadcrumbTrail('flavor', 'Bubbly')).toEqual([
      { label: 'All recipes', href: '/' },
      { label: 'By flavor', href: null },
      { label: 'Bubbly', href: null },
    ]);
  });

  it('links the root facet segment to the /roots/ index', () => {
    const trail = breadcrumbTrail('root', 'Sour');
    expect(trail[1]).toEqual({ label: 'By root', href: '/roots/' });
  });

  it('leaves the facet segment unlinked for the five facets with no index', () => {
    for (const key of ['spirit', 'difficulty', 'occasion', 'tag', 'flavor'] as const) {
      const trail = breadcrumbTrail(key, 'Whatever');
      expect(trail[1].href).toBeNull();
    }
  });

  it('always sets the root segment to All recipes → /', () => {
    for (const key of ['flavor', 'spirit', 'root', 'difficulty', 'occasion', 'tag'] as const) {
      expect(breadcrumbTrail(key, 'X')[0]).toEqual({ label: 'All recipes', href: '/' });
    }
  });

  it('uses displayName verbatim as the unlinked terminal segment', () => {
    const trail = breadcrumbTrail('occasion', "New Year's Eve");
    expect(trail[trail.length - 1]).toEqual({ label: "New Year's Eve", href: null });
  });

  it('hardcodes the facet eyebrow labels to match the existing page labels', () => {
    expect(breadcrumbTrail('flavor', 'x')[1].label).toBe('By flavor');
    expect(breadcrumbTrail('spirit', 'x')[1].label).toBe('By spirit');
    expect(breadcrumbTrail('root', 'x')[1].label).toBe('By root');
    expect(breadcrumbTrail('difficulty', 'x')[1].label).toBe('By difficulty');
    expect(breadcrumbTrail('occasion', 'x')[1].label).toBe('By occasion');
    expect(breadcrumbTrail('tag', 'x')[1].label).toBe('By tag');
  });

  it('throws on an unknown facet key', () => {
    // 'style' is a legacy redirect, not a live facet — must not silently render.
    expect(() => breadcrumbTrail('style', 'x')).toThrow();
    expect(() => breadcrumbTrail('spirits', 'x')).toThrow(); // plural label() field key, not a breadcrumb key
  });
});
