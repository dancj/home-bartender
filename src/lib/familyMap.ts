import type { Recipe } from './recipes';
import { groupByTax, label } from './taxonomy';

/**
 * Pure data + geometry helpers for the per-family branching map on /families.
 *
 * `buildFamilyMap` turns the recipe collection into a root-plus-branches model
 * for one family; `layoutFamilyMap` turns that model into SVG coordinates and
 * connector path strings. Both are deterministic and browser-free so the
 * DOM wiring in FamilyMap.astro stays thin and these stay unit-testable —
 * same seam as `headerProgress`.
 */

export interface MapNode {
  slug: string;
  title: string;
  url: string;
}

export interface BranchNode extends MapNode {
  /** Same-family `related[]` recipes, one level deep. */
  subBranches: MapNode[];
}

export interface FamilyMapModel {
  family: string;
  root: { slug: string; label: string };
  branches: BranchNode[];
}

/** Bare slug = file basename = URL segment. `id` is `category/slug` (no extension). */
const slugOf = (id: string): string => id.split('/').pop() as string;

function toNode(recipe: Recipe, base: string): MapNode {
  const slug = slugOf(recipe.id);
  return {
    slug,
    title: recipe.data.title,
    // Matches the recipe route (RecipeCard.astro): keyed on the bare slug, not
    // the full id. The `recipeUrl` helper takes the full id and is wrong here.
    url: `${base.replace(/\/$/, '')}/recipes/${slug}/`,
  };
}

export function buildFamilyMap(
  recipes: Recipe[],
  familySlug: string,
  base: string,
): FamilyMapModel {
  const members = groupByTax(recipes, 'families').get(familySlug) ?? [];
  const memberSlugs = new Set(members.map((m) => slugOf(m.id)));

  // Assign same-family `related[]` recipes as sub-branches, one level deep.
  // Iterate in member order; a recipe already claimed as someone's child is a
  // leaf and is skipped as a parent (keeps it to one level, deterministic).
  const claimed = new Set<string>();
  const branches: BranchNode[] = [];

  for (const member of members) {
    const slug = slugOf(member.id);
    if (claimed.has(slug)) continue;

    const related = (member.data.related ?? []) as string[];
    const childSlugs = related.filter(
      (rs) => memberSlugs.has(rs) && rs !== slug && !claimed.has(rs),
    );
    childSlugs.forEach((rs) => claimed.add(rs));

    const childBySlug = new Map(members.map((m) => [slugOf(m.id), m]));
    branches.push({
      ...toNode(member, base),
      subBranches: childSlugs.map((rs) => toNode(childBySlug.get(rs) as Recipe, base)),
    });
  }

  return {
    family: familySlug,
    root: { slug: familySlug, label: label('families', familySlug) },
    branches,
  };
}

// --- Geometry -------------------------------------------------------------
// Deterministic vertical fan: root at top-center, branches stacked down the
// right, sub-branches offset further right off their parent. Reflows to narrow
// viewports by viewBox scaling alone (no separate mobile coordinate set).

const VB_WIDTH = 600;
const ROW_HEIGHT = 76; // vertical pitch between branch nodes (> node height → no overlap)
const TOP_PAD = 64; // root sits here
const FIRST_BRANCH_Y = 150;
const ROOT_X = VB_WIDTH / 2;
const BRANCH_X = VB_WIDTH * 0.62;
const SUB_BRANCH_X = VB_WIDTH * 0.82;
const SUB_OFFSET_Y = 34;

export interface PlacedNode extends MapNode {
  x: number;
  y: number;
}

export interface PlacedBranch extends PlacedNode {
  /** Cubic "elbow" path `d` from the root anchor to this branch. */
  connector: string;
  subBranches: Array<PlacedNode & { connector: string }>;
}

export interface FamilyMapLayout {
  viewBox: string;
  rowHeight: number;
  root: { slug: string; label: string; x: number; y: number };
  branches: PlacedBranch[];
}

/** Cubic elbow from (sx,sy) to (ex,ey): drops vertically then levels in. */
function elbow(sx: number, sy: number, ex: number, ey: number): string {
  const my = (sy + ey) / 2;
  return `M${sx} ${sy} C${sx} ${my} ${ex} ${my} ${ex} ${ey}`;
}

export function layoutFamilyMap(model: FamilyMapModel): FamilyMapLayout {
  const root = { ...model.root, x: ROOT_X, y: TOP_PAD };

  let cursorY = FIRST_BRANCH_Y;
  const branches: PlacedBranch[] = model.branches.map((branch) => {
    const y = cursorY;
    const placed: PlacedBranch = {
      ...branch,
      x: BRANCH_X,
      y,
      connector: elbow(root.x, root.y, BRANCH_X, y),
      subBranches: branch.subBranches.map((sub, i) => {
        const sy = y + SUB_OFFSET_Y * (i + 1);
        return {
          ...sub,
          x: SUB_BRANCH_X,
          y: sy,
          connector: elbow(BRANCH_X, y, SUB_BRANCH_X, sy),
        };
      }),
    };
    // advance past this branch and any sub-branches it stacked below
    cursorY = y + ROW_HEIGHT + branch.subBranches.length * SUB_OFFSET_Y;
    return placed;
  });

  const lastY = branches.length ? branches[branches.length - 1].y : root.y;
  const height = Math.max(FIRST_BRANCH_Y, lastY + ROW_HEIGHT);

  return {
    viewBox: `0 0 ${VB_WIDTH} ${height}`,
    rowHeight: ROW_HEIGHT,
    root,
    branches,
  };
}

// --- Animation gate -------------------------------------------------------

/**
 * Whether the draw-on-scroll animation should run. False → the map stays in its
 * fully-drawn default state (also the no-JS fallback). The DOM wiring in
 * FamilyMap.astro reads `window.matchMedia` and `'IntersectionObserver' in window`
 * and passes the booleans here.
 */
export function shouldAnimate(opts: {
  prefersReducedMotion: boolean;
  hasIntersectionObserver: boolean;
}): boolean {
  return !opts.prefersReducedMotion && opts.hasIntersectionObserver;
}
