import { describe, it, expect } from 'vitest';
import type { Recipe } from './recipes';
import {
  buildArrowSpecs,
  buildFamilyMap,
  layoutFamilyMap,
  shouldAnimate,
} from './familyMap';

// Minimal Recipe-shaped fixture. The family-map functions only read
// `{ id, data.roots, data.related }`, so the cast stays light.
function makeRecipe(
  id: string,
  roots: string[],
  related: string[] = [],
  title?: string,
  flavors: string[] = [],
): Recipe {
  return {
    id,
    data: {
      title: title ?? id.split('/').pop(),
      roots,
      related,
      flavors,
    },
  } as unknown as Recipe;
}

const BASE = '/home-bartender';

describe('buildFamilyMap', () => {
  it('returns the family members as top-level branches', () => {
    const recipes = [
      makeRecipe('classics/manhattan', ['martini'], [], 'Manhattan'),
      makeRecipe('classics/vesper', ['martini'], [], 'Vesper'),
      makeRecipe('classics/daiquiri', ['daiquiri'], [], 'Daiquiri'),
    ];
    const model = buildFamilyMap(recipes, 'martini', BASE);
    expect(model.root.slug).toBe('martini');
    expect(model.branches.map((b) => b.title)).toEqual(['Manhattan', 'Vesper']);
  });

  it('builds recipe URLs from the bare slug, matching the recipe route', () => {
    const recipes = [makeRecipe('classics/manhattan', ['martini'], [], 'Manhattan')];
    const model = buildFamilyMap(recipes, 'martini', BASE);
    // Not /recipes/classics/manhattan/ — the route is keyed on the bare slug.
    expect(model.branches[0].url).toBe('/home-bartender/recipes/manhattan/');
  });

  it('places a bridge recipe (two families) in each of its families — AE3', () => {
    const recipes = [
      makeRecipe('classics/french-75', ['daiquiri', 'whiskey-highball'], [], 'French 75'),
    ];
    const inDaiquiri = buildFamilyMap(recipes, 'daiquiri', BASE);
    const inHighball = buildFamilyMap(recipes, 'whiskey-highball', BASE);
    expect(inDaiquiri.branches.map((b) => b.title)).toContain('French 75');
    expect(inHighball.branches.map((b) => b.title)).toContain('French 75');
  });

  it('renders a same-family related recipe as a sub-branch, deduped from top level — AE4', () => {
    const recipes = [
      makeRecipe('classics/old-fashioned', ['old-fashioned'], ['sazerac'], 'Old Fashioned'),
      makeRecipe('classics/sazerac', ['old-fashioned'], [], 'Sazerac'),
    ];
    const model = buildFamilyMap(recipes, 'old-fashioned', BASE);
    // Sazerac is a child of Old Fashioned, so it is not also a top-level branch.
    expect(model.branches.map((b) => b.title)).toEqual(['Old Fashioned']);
    expect(model.branches[0].subBranches.map((s) => s.title)).toEqual(['Sazerac']);
  });

  it('ignores a related slug that is not a member of the family in view', () => {
    const recipes = [
      makeRecipe('classics/manhattan', ['martini'], ['paloma'], 'Manhattan'),
      makeRecipe('classics/paloma', ['daiquiri'], [], 'Paloma'),
    ];
    const model = buildFamilyMap(recipes, 'martini', BASE);
    expect(model.branches.map((b) => b.title)).toEqual(['Manhattan']);
    expect(model.branches[0].subBranches).toEqual([]);
  });

  it('never places a member as both a top-level branch and a sub-branch', () => {
    // Manhattan is emitted top-level first; a later branch (Chocolate) lists it
    // in related[] — it must not be re-placed as Chocolate's sub-branch.
    const recipes = [
      makeRecipe('classics/manhattan', ['old-fashioned'], ['maple'], 'Manhattan'),
      makeRecipe('classics/maple', ['old-fashioned'], [], 'Maple'),
      makeRecipe('classics/chocolate', ['old-fashioned'], ['manhattan'], 'Chocolate'),
    ];
    const model = buildFamilyMap(recipes, 'old-fashioned', BASE);
    const titles = model.branches.flatMap((b) => [b.title, ...b.subBranches.map((s) => s.title)]);
    expect(titles.filter((t) => t === 'Manhattan')).toHaveLength(1);
    expect(titles.filter((t) => t === 'Maple')).toHaveLength(1);
  });

  it('returns no branches for an empty family — AE5', () => {
    const recipes = [makeRecipe('classics/daiquiri', ['daiquiri'], [], 'Daiquiri')];
    const model = buildFamilyMap(recipes, 'flip', BASE);
    expect(model.root.slug).toBe('flip');
    expect(model.branches).toEqual([]);
  });

  it('carries each node\'s own flavors onto the model', () => {
    const recipes = [
      makeRecipe('classics/manhattan', ['martini'], [], 'Manhattan', ['spirit-forward', 'rich']),
    ];
    const model = buildFamilyMap(recipes, 'martini', BASE);
    expect(model.branches[0].flavors).toEqual(['spirit-forward', 'rich']);
  });

  it('computes a top-level branch delta against the family archetype recipe', () => {
    // old-fashioned is the archetype (slug === family); Maple adds maple/spice over it.
    const recipes = [
      makeRecipe('classics/old-fashioned', ['old-fashioned'], [], 'Old Fashioned', ['spirit-forward', 'sweet']),
      makeRecipe('classics/maple', ['old-fashioned'], [], 'Maple', ['spirit-forward', 'sweet', 'rich']),
    ];
    const model = buildFamilyMap(recipes, 'old-fashioned', BASE);
    const archetype = model.branches.find((b) => b.title === 'Old Fashioned');
    const maple = model.branches.find((b) => b.title === 'Maple');
    // The archetype adds nothing over itself.
    expect(archetype?.deltaFlavors).toEqual([]);
    // Maple's delta is only the flavor not already on the archetype.
    expect(maple?.deltaFlavors).toEqual(['rich']);
  });

  it('falls back to the full flavor set when the family has no archetype recipe', () => {
    const recipes = [
      makeRecipe('classics/manhattan', ['martini'], [], 'Manhattan', ['spirit-forward', 'rich']),
    ];
    const model = buildFamilyMap(recipes, 'martini', BASE);
    // No member slug === 'martini', so base is empty → delta is the full set.
    expect(model.branches[0].deltaFlavors).toEqual(['spirit-forward', 'rich']);
  });

  it('computes a sub-branch delta against its parent branch, not the root', () => {
    const recipes = [
      makeRecipe('classics/old-fashioned', ['old-fashioned'], ['sazerac'], 'Old Fashioned', ['spirit-forward']),
      makeRecipe('classics/sazerac', ['old-fashioned'], [], 'Sazerac', ['spirit-forward', 'herbal']),
    ];
    const model = buildFamilyMap(recipes, 'old-fashioned', BASE);
    const sazerac = model.branches[0].subBranches[0];
    expect(sazerac.deltaFlavors).toEqual(['herbal']);
  });

  it('preserves node order in a multi-flavor delta', () => {
    const recipes = [
      makeRecipe('classics/old-fashioned', ['old-fashioned'], [], 'Old Fashioned', ['spirit-forward']),
      makeRecipe('classics/loaded', ['old-fashioned'], [], 'Loaded', ['spirit-forward', 'rich', 'bitter']),
    ];
    const model = buildFamilyMap(recipes, 'old-fashioned', BASE);
    const loaded = model.branches.find((b) => b.title === 'Loaded');
    // Node order, not sorted/base order.
    expect(loaded?.deltaFlavors).toEqual(['rich', 'bitter']);
  });

  it('yields an empty delta when a node adds nothing over its base', () => {
    const recipes = [
      makeRecipe('classics/old-fashioned', ['old-fashioned'], [], 'Old Fashioned', ['spirit-forward', 'sweet']),
      makeRecipe('classics/twin', ['old-fashioned'], [], 'Twin', ['sweet']),
    ];
    const model = buildFamilyMap(recipes, 'old-fashioned', BASE);
    const twin = model.branches.find((b) => b.title === 'Twin');
    expect(twin?.deltaFlavors).toEqual([]);
  });
});

describe('layoutFamilyMap', () => {
  const recipes = Array.from({ length: 8 }, (_, i) =>
    makeRecipe(`classics/r${i}`, ['martini'], [], `R${i}`),
  );

  it('assigns each branch a distinct, non-overlapping vertical position within the viewBox', () => {
    const layout = layoutFamilyMap(buildFamilyMap(recipes, 'martini', BASE));
    const [, , vbW, vbH] = layout.viewBox.split(' ').map(Number);

    const ys = layout.branches.map((b) => b.y);
    // distinct
    expect(new Set(ys).size).toBe(ys.length);
    // ordered + non-overlapping (gap >= a node's worth)
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(layout.rowHeight);
    }
    // within viewBox
    for (const b of layout.branches) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(vbW);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(vbH);
    }
  });

  it('emits a connector path from the root to each branch', () => {
    const layout = layoutFamilyMap(buildFamilyMap(recipes, 'martini', BASE));
    for (const b of layout.branches) {
      // cubic elbow: starts at root anchor, ends at the branch anchor
      expect(b.connector).toMatch(/^M[\d.]+ [\d.]+ C/);
      expect(b.connector.trim().endsWith(`${b.x} ${b.y}`)).toBe(true);
    }
  });

  it('produces a root-only layout with no connectors for an empty family', () => {
    const layout = layoutFamilyMap(buildFamilyMap([], 'flip', BASE));
    expect(layout.branches).toEqual([]);
    expect(layout.root).toBeTruthy();
  });

  it('keeps sub-branch nodes inside the viewBox height when a branch has several', () => {
    const withSubs = [
      makeRecipe('c/parent', ['martini'], ['k1', 'k2', 'k3'], 'Parent'),
      makeRecipe('c/k1', ['martini'], [], 'K1'),
      makeRecipe('c/k2', ['martini'], [], 'K2'),
      makeRecipe('c/k3', ['martini'], [], 'K3'),
    ];
    const layout = layoutFamilyMap(buildFamilyMap(withSubs, 'martini', BASE));
    const vbH = Number(layout.viewBox.split(' ')[3]);
    const subYs = layout.branches.flatMap((b) => b.subBranches.map((s) => s.y));
    expect(subYs.length).toBeGreaterThanOrEqual(3);
    for (const y of subYs) expect(y).toBeLessThanOrEqual(vbH);
  });

  it('is deterministic across runs', () => {
    const a = layoutFamilyMap(buildFamilyMap(recipes, 'martini', BASE));
    const b = layoutFamilyMap(buildFamilyMap(recipes, 'martini', BASE));
    expect(a).toEqual(b);
  });
});

describe('buildArrowSpecs', () => {
  it('emits one root→branch spec per branch, in branch order', () => {
    const recipes = [
      makeRecipe('classics/manhattan', ['martini'], [], 'Manhattan'),
      makeRecipe('classics/vesper', ['martini'], [], 'Vesper'),
      makeRecipe('classics/gibson', ['martini'], [], 'Gibson'),
    ];
    const specs = buildArrowSpecs(buildFamilyMap(recipes, 'martini', BASE));
    expect(specs).toHaveLength(3);
    expect(specs.every((s) => s.startId === 'samap-martini-root')).toBe(true);
    expect(specs.map((s) => s.endId)).toEqual([
      'samap-martini-manhattan',
      'samap-martini-vesper',
      'samap-martini-gibson',
    ]);
    expect(specs.every((s) => s.sub === false)).toBe(true);
  });

  it('emits a branch→sub spec after the branch, flagged sub', () => {
    const recipes = [
      makeRecipe('classics/old-fashioned', ['old-fashioned'], ['sazerac', 'improved'], 'Old Fashioned'),
      makeRecipe('classics/sazerac', ['old-fashioned'], [], 'Sazerac'),
      makeRecipe('classics/improved', ['old-fashioned'], [], 'Improved'),
    ];
    const specs = buildArrowSpecs(buildFamilyMap(recipes, 'old-fashioned', BASE));
    // root→OF, OF→sazerac, OF→improved
    expect(specs).toHaveLength(3);
    expect(specs[0]).toMatchObject({
      startId: 'samap-old-fashioned-root',
      endId: 'samap-old-fashioned-old-fashioned',
      sub: false,
    });
    expect(specs[1]).toMatchObject({
      startId: 'samap-old-fashioned-old-fashioned',
      endId: 'samap-old-fashioned-old-fashioned-sazerac',
      sub: true,
    });
    expect(specs[2]).toMatchObject({
      startId: 'samap-old-fashioned-old-fashioned',
      endId: 'samap-old-fashioned-old-fashioned-improved',
      sub: true,
    });
  });

  it('reveals root→branch then that branch\'s subs before the next branch', () => {
    // Branch A (Old Fashioned) has a sub (Sazerac); branch B (Maple) stands alone.
    const recipes = [
      makeRecipe('classics/old-fashioned', ['old-fashioned'], ['sazerac'], 'Old Fashioned'),
      makeRecipe('classics/sazerac', ['old-fashioned'], [], 'Sazerac'),
      makeRecipe('classics/maple', ['old-fashioned'], [], 'Maple'),
    ];
    const specs = buildArrowSpecs(buildFamilyMap(recipes, 'old-fashioned', BASE));
    expect(specs.map((s) => [s.startId, s.endId])).toEqual([
      ['samap-old-fashioned-root', 'samap-old-fashioned-old-fashioned'],
      ['samap-old-fashioned-old-fashioned', 'samap-old-fashioned-old-fashioned-sazerac'],
      ['samap-old-fashioned-root', 'samap-old-fashioned-maple'],
    ]);
  });

  it('fans the root→branch sockets out symmetrically around centre', () => {
    const recipes = Array.from({ length: 4 }, (_, i) =>
      makeRecipe(`classics/b${i}`, ['martini'], [], `B${i}`),
    );
    const specs = buildArrowSpecs(buildFamilyMap(recipes, 'martini', BASE));
    const offsets = specs.map((s) => s.startSocketOffset);
    // distinct
    expect(new Set(offsets).size).toBe(offsets.length);
    // symmetric around 0: first = -last, and they sum to ~0
    expect(offsets[0]).toBeCloseTo(-offsets[offsets.length - 1]);
    expect(offsets.reduce((a, b) => a + b, 0)).toBeCloseTo(0);
    // monotonic increasing across the fan
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]).toBeGreaterThan(offsets[i - 1]);
    }
  });

  it('centres a single branch on the root edge (offset 0)', () => {
    const recipes = [makeRecipe('classics/manhattan', ['martini'], [], 'Manhattan')];
    const specs = buildArrowSpecs(buildFamilyMap(recipes, 'martini', BASE));
    expect(specs).toHaveLength(1);
    expect(specs[0].startSocketOffset).toBe(0);
  });

  it('returns no specs for an empty family', () => {
    const specs = buildArrowSpecs(buildFamilyMap([], 'flip', BASE));
    expect(specs).toEqual([]);
  });
});

describe('shouldAnimate', () => {
  it('is false when the user prefers reduced motion', () => {
    expect(shouldAnimate({ prefersReducedMotion: true, hasIntersectionObserver: true })).toBe(false);
  });

  it('is false when IntersectionObserver is unavailable', () => {
    expect(shouldAnimate({ prefersReducedMotion: false, hasIntersectionObserver: false })).toBe(false);
  });

  it('is true only when motion is allowed and IntersectionObserver exists', () => {
    expect(shouldAnimate({ prefersReducedMotion: false, hasIntersectionObserver: true })).toBe(true);
  });
});
