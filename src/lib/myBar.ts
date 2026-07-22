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
 * True iff the user owns at least one spirit that actually has a chip on the
 * page.
 *
 * Ownership is stored against the full taxonomy, but chips render only for
 * spirits that appear in a published recipe — so `owned` can be non-empty while
 * the My Bar reads as visually empty (own `rye`, unpublish every rye recipe).
 * The "mark spirits in My Bar" prompts must key off what the user can *see* and
 * act on, not off the durable set. Visibility is a render-time concern only: it
 * must never reach parseOwnedSpirits, which still validates against the whole
 * taxonomy so unpublishing a recipe cannot erase ownership.
 */
export function hasVisibleOwned(
  owned: readonly string[],
  shownSlugs: Iterable<string>
): boolean {
  const shown = shownSlugs instanceof Set ? shownSlugs : new Set(shownSlugs);
  return owned.some((s) => shown.has(s));
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
/**
 * Parse the shareable `?bar=` query param (issue #151): a comma-separated
 * slug list. Unknown slugs are dropped, duplicates deduped, whitespace
 * tolerated. Returns `null` — not `[]` — when the param is absent, empty, or
 * all-invalid, so callers can distinguish "no shared bar" (leave the stored
 * bar alone) from a genuine empty selection.
 */
export function parseBarParam(
  raw: string | null,
  validSlugs: readonly string[]
): string[] | null {
  if (!raw) return null;
  const valid = new Set(validSlugs);
  const slugs = [...new Set(raw.split(',').map((s) => s.trim()))].filter((s) => valid.has(s));
  return slugs.length ? slugs : null;
}

/**
 * Href with the `bar` param reflecting `owned` (comma-joined; removed when
 * empty). All other params — filters, ?sort= — are preserved, mirroring the
 * index page's merge-safe URL handling.
 */
export function buildBarShareUrl(currentHref: string, owned: readonly string[]): string {
  const url = new URL(currentHref);
  if (owned.length) url.searchParams.set('bar', owned.join(','));
  else url.searchParams.delete('bar');
  return url.toString();
}

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
