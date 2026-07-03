import type { Recipe } from './recipes';
import type { Flavor } from '../taxonomy.generated';
import { groupByTax, label } from './taxonomy';

/**
 * Pure data + geometry helpers for the per-root branching map on /roots.
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
  /** The recipe's own `flavors[]`. */
  flavors: Flavor[];
  /** Flavors this node adds over its base — see buildFamilyMap. */
  deltaFlavors: Flavor[];
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

/** A node minus its `deltaFlavors`, which only `buildFamilyMap` can fill once the base is known. */
function toNode(recipe: Recipe, base: string): Omit<MapNode, 'deltaFlavors'> {
  const slug = slugOf(recipe.id);
  const flavors = recipe.data.flavors;
  return {
    slug,
    title: recipe.data.title,
    // Matches the recipe route (RecipeCard.astro): keyed on the bare slug, not
    // the full id. The `recipeUrl` helper takes the full id and is wrong here.
    url: `${base.replace(/\/$/, '')}/recipes/${slug}/`,
    flavors,
  };
}

/** Flavors `node` adds over `base` — the set difference, in node order. */
const flavorDelta = (node: Flavor[], base: Flavor[]): Flavor[] =>
  node.filter((f) => !base.includes(f));

export function buildFamilyMap(
  recipes: Recipe[],
  familySlug: string,
  base: string,
): FamilyMapModel {
  const members = groupByTax(recipes, 'roots').get(familySlug) ?? [];
  const memberSlugs = new Set(members.map((m) => slugOf(m.id)));

  // Top-level branches measure their delta against the family archetype — the
  // member whose slug is the family slug (e.g. `old-fashioned`). Absent one,
  // the base is empty and a branch's delta is its full flavor set.
  const archetype = members.find((m) => slugOf(m.id) === familySlug);
  const baseFlavors: Flavor[] = archetype?.data.flavors ?? [];

  // Assign same-family `related[]` recipes as sub-branches, one level deep.
  // Iterate in member order; a recipe already claimed as someone's child is a
  // leaf and is skipped as a parent (keeps it to one level, deterministic).
  const claimed = new Set<string>(); // slugs already placed as someone's sub-branch
  const emitted = new Set<string>(); // slugs already placed as a top-level branch
  const branches: BranchNode[] = [];
  const memberBySlug = new Map(members.map((m) => [slugOf(m.id), m]));

  for (const member of members) {
    const slug = slugOf(member.id);
    if (claimed.has(slug)) continue;
    emitted.add(slug);

    const related = (member.data.related ?? []) as string[];
    // A child must be an unclaimed member that hasn't already been emitted as a
    // top-level branch — otherwise it would appear twice (the screenshot bug).
    const childSlugs = related.filter(
      (rs) => memberSlugs.has(rs) && rs !== slug && !claimed.has(rs) && !emitted.has(rs),
    );
    childSlugs.forEach((rs) => claimed.add(rs));

    const node = toNode(member, base);
    branches.push({
      ...node,
      deltaFlavors: flavorDelta(node.flavors, baseFlavors),
      // Sub-branches measure their delta against their parent branch, not the root.
      subBranches: childSlugs.map((rs) => {
        const sub = toNode(memberBySlug.get(rs) as Recipe, base);
        return { ...sub, deltaFlavors: flavorDelta(sub.flavors, node.flavors) };
      }),
    });
  }

  return {
    family: familySlug,
    root: { slug: familySlug, label: label('roots', familySlug) },
    branches,
  };
}

// --- Arrow specs ----------------------------------------------------------
// Turn the model into the ordered arrow descriptors that drive a
// `scrollArrowGroup` in FamilyMap.astro. Anchors are referenced by the stable
// node ids that component renders (kept in lockstep with this scheme), so the
// arrows attach to live boxes and scroll-arrows owns all geometry — no
// hand-built connector paths. Pure + browser-free, same seam as buildFamilyMap.

/** Fraction of the root edge the branch fan spreads across (±SPREAD/2). */
const SOCKET_SPREAD = 0.8;
/**
 * Fraction of the branch's bottom edge the sub fan spreads across (±SPREAD/2).
 * The fan runs right-to-left: the first (highest) sub leaves nearest its entry
 * side and each lower sub leaves further left, so a lower sub's arrow descends
 * through the sub gutter beside its upper siblings instead of over them.
 * Magnitude (and, if visual tuning demands, direction) is settled in U3.
 */
const SUB_SOCKET_SPREAD = 0.6;

export const rootNodeId = (family: string): string => `samap-${family}-root`;
export const branchNodeId = (family: string, branchSlug: string): string =>
  `samap-${family}-${branchSlug}`;
export const subNodeId = (family: string, branchSlug: string, subSlug: string): string =>
  `samap-${family}-${branchSlug}-${subSlug}`;

export interface ArrowSpec {
  /** Stable id of the node the arrow leaves. */
  startId: string;
  /** Stable id of the node the arrow points at. */
  endId: string;
  /** True for branch→sub-branch arrows (rendered subordinate). */
  sub: boolean;
  /**
   * Slide the start point along the start edge so sibling arrows fan out
   * instead of stacking on one point. Branch arrows fan along the root's left
   * edge; sub arrows fan along their branch's bottom edge. 0 for a lone
   * branch or a lone sub.
   */
  startSocketOffset: number;
  /**
   * Node ids (of pills rendered by FamilyMap.astro) this arrow should bow
   * around instead of crossing — a sub arrow's earlier siblings, which sit
   * between the branch's bottom edge and a lower sub. Root→branch arrows
   * carry none: their chord runs the empty gutter left of every pill, where
   * the single-bend router has nothing useful to detect.
   */
  avoidIds: string[];
}

/**
 * Ordered arrow descriptors for one root map, in reveal order: each branch's
 * root→branch arrow, immediately followed by that branch's branch→sub arrows,
 * then the next branch — so the staggered group draws root-outward (mirrors the
 * old connector flatten order).
 */
export function buildArrowSpecs(model: FamilyMapModel): ArrowSpec[] {
  const { family, branches } = model;
  const n = branches.length;
  const specs: ArrowSpec[] = [];

  branches.forEach((branch, i) => {
    // Spread branch starts symmetrically across the root edge: centre at 0,
    // ends at ±SOCKET_SPREAD/2. A single branch stays centred.
    const startSocketOffset = n > 1 ? (i / (n - 1) - 0.5) * SOCKET_SPREAD : 0;
    specs.push({
      startId: rootNodeId(family),
      endId: branchNodeId(family, branch.slug),
      sub: false,
      startSocketOffset,
      avoidIds: [],
    });
    const k = branch.subBranches.length;
    branch.subBranches.forEach((sub, j) => {
      specs.push({
        startId: branchNodeId(family, branch.slug),
        endId: subNodeId(family, branch.slug, sub.slug),
        sub: true,
        // Fan sibling sub arrows along the branch's bottom edge, right-to-left
        // (see SUB_SOCKET_SPREAD). A lone sub stays centred.
        startSocketOffset: k > 1 ? (0.5 - j / (k - 1)) * SUB_SOCKET_SPREAD : 0,
        // Earlier siblings sit between this arrow's start and its target —
        // the pills it must bow around.
        avoidIds: branch.subBranches
          .slice(0, j)
          .map((prev) => subNodeId(family, branch.slug, prev.slug)),
      });
    });
  });

  return specs;
}

// --- Geometry -------------------------------------------------------------
// Deterministic left-aligned tree: root at the top, branches stacked below it,
// sub-branches indented under their parent. All nodes are LEFT-anchored (the x
// here is the node's left edge, see FamilyMap.astro), so their left edges line
// up into a vertical "gutter" the curved arrows run through — branches enter
// from the left without crossing the pills. Reflows to narrow viewports by
// viewBox scaling alone (no separate mobile coordinate set).

const VB_WIDTH = 600;
const ROW_HEIGHT = 110; // vertical pitch between branch nodes — room for arrows between pills
const TOP_PAD = 84; // root sits here — clears the tall glyph + name + tagline card
const FIRST_BRANCH_Y = 230; // first branch sits below the root card with breathing room
const ROOT_X = 60; // root left edge — the arrow gutter sits just left of this
const BRANCH_X = 96; // branch left edge — indented from the root
const SUB_BRANCH_X = 168; // sub-branch left edge — indented from its branch
const SUB_OFFSET_Y = 64; // vertical drop per sub-branch — keeps the branch→sub arrow clear
const BOTTOM_PAD = 56; // room below the lowest node for its overlay pill + arrowhead

export interface PlacedNode extends MapNode {
  x: number;
  y: number;
}

export interface PlacedBranch extends PlacedNode {
  subBranches: PlacedNode[];
}

export interface FamilyMapLayout {
  viewBox: string;
  rowHeight: number;
  root: { slug: string; label: string; x: number; y: number };
  branches: PlacedBranch[];
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
      subBranches: branch.subBranches.map((sub, i) => {
        const sy = y + SUB_OFFSET_Y * (i + 1);
        return { ...sub, x: SUB_BRANCH_X, y: sy };
      }),
    };
    // advance past this branch and any sub-branches it stacked below
    cursorY = y + ROW_HEIGHT + branch.subBranches.length * SUB_OFFSET_Y;
    return placed;
  });

  // Height must clear the lowest node — which may be a sub-branch hanging below
  // its parent, not the last branch itself.
  const maxNodeY = branches.reduce((max, b) => {
    const subMax = b.subBranches.reduce((m, s) => Math.max(m, s.y), b.y);
    return Math.max(max, subMax);
  }, root.y);
  const height = Math.max(FIRST_BRANCH_Y, maxNodeY + BOTTOM_PAD);

  return {
    viewBox: `0 0 ${VB_WIDTH} ${height}`,
    rowHeight: ROW_HEIGHT,
    root,
    branches,
  };
}
