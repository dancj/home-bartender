// Pure logic for the "My Bar" inventory filter. No astro:content imports so
// it stays unit-testable under vitest's node environment (same convention as
// related.ts) — and importable from the index page's client script.

/** localStorage key holding the owned-spirit slugs as a JSON string array. */
export const MY_BAR_STORAGE_KEY = 'hb:my-bar';

/** True iff every spirit the recipe needs is in the owned set. */
export function isMakeable(recipeSpirits: string[], owned: Iterable<string>): boolean {
  const ownedSet = owned instanceof Set ? owned : new Set(owned);
  return recipeSpirits.every((s) => ownedSet.has(s));
}

/**
 * Safe parse of the persisted My Bar payload. Tolerates null, malformed JSON,
 * and non-arrays by returning []. Entries not in validSlugs are dropped.
 *
 * Ownership is durable user data: callers must pass the full taxonomy SPIRITS
 * list (not the published-recipe subset) so a spirit whose recipes unpublish
 * survives the read-validate-write round-trip. Only taxonomy-invalid junk is
 * ever pruned.
 */
export function parseOwnedSpirits(
  raw: string | null,
  validSlugs: readonly string[]
): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const valid = new Set(validSlugs);
  return parsed.filter((s): s is string => typeof s === 'string' && valid.has(s));
}
