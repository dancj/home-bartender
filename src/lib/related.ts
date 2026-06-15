// Pure resolver for a recipe's related[] slugs → full Recipe entries.
// Kept free of any astro:content *value* import (only a type-only import of
// Recipe, which is erased at compile) so it stays unit-testable under vitest's
// node environment — the same convention as breadcrumbs.ts / familyMap.ts.
import type { Recipe } from './recipes';

/** Slug = final path segment of the collection id (mirrors RecipeCard). */
const slugOf = (r: Recipe): string => r.id.split('/').pop() ?? r.id;

/**
 * Resolve related slugs to their Recipe entries, in the order listed.
 * Unresolved slugs are dropped rather than throwing — the validator already
 * guarantees resolution, so this only guards against a mid-edit build.
 */
export function resolveRelated(all: Recipe[], related: string[]): Recipe[] {
  const bySlug = new Map(all.map((r) => [slugOf(r), r]));
  return related
    .map((slug) => bySlug.get(slug))
    .filter((r): r is Recipe => r !== undefined);
}
