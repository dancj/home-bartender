/**
 * Spirit/flavor accent hues — the "splash of color" on the browse and detail
 * screens (chip dots, card spirit badges, no-photo fallback tiles). Never used
 * for body text; the hues sit in the L 40–48% / low-chroma band so none shouts.
 *
 * The hues themselves live as `--color-spirit-<slug>` / `--color-flavor-<slug>`
 * tokens in `@theme` (src/styles/global.css). This module only maps a taxonomy
 * slug to the CSS `var(...)` that names its token, so components set one inline
 * `--accent` custom property and let CSS do the painting. Pure strings, no DOM —
 * runs in the node vitest env like taxonomy.ts.
 *
 * A token must exist in @theme for every SPIRITS/FLAVORS slug (accents.test.ts
 * guards this against a taxonomy addition silently losing its hue). An unknown
 * or empty slug degrades to the neutral rule colour rather than an empty var().
 */
import { SPIRITS, FLAVORS } from '../taxonomy.generated';

/** Neutral dot/badge colour for a slug with no accent hue. */
export const ACCENT_FALLBACK = 'var(--color-rule-strong)';

const SPIRIT_SET: ReadonlySet<string> = new Set(SPIRITS);
const FLAVOR_SET: ReadonlySet<string> = new Set(FLAVORS);

export function spiritAccentVar(slug: string | undefined | null): string {
  return slug && SPIRIT_SET.has(slug) ? `var(--color-spirit-${slug})` : ACCENT_FALLBACK;
}

export function flavorAccentVar(slug: string | undefined | null): string {
  return slug && FLAVOR_SET.has(slug) ? `var(--color-flavor-${slug})` : ACCENT_FALLBACK;
}
