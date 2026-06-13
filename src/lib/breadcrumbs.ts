// Pure breadcrumb-trail builder for the by-* taxonomy listing pages.
// No Astro / import.meta dependency so it stays unit-testable; the
// Breadcrumb.astro component applies BASE_URL to the base-relative hrefs
// this returns.

export interface BreadcrumbSegment {
  label: string;
  /** Base-relative path, or null for an unlinked (plain-text) segment. */
  href: string | null;
}

interface FacetMeta {
  /** Eyebrow label, a literal — NOT derived from taxonomy.label(). */
  eyebrow: string;
  /** Base-relative facet-index path, or undefined when no index page exists. */
  index?: string;
}

// Keyed on singular facet keys — distinct from taxonomy.label()'s field keys
// (e.g. by-spirit calls label('spirits', …) but the breadcrumb key is 'spirit').
const FACETS: Record<string, FacetMeta> = {
  flavor: { eyebrow: 'By flavor' },
  spirit: { eyebrow: 'By spirit' },
  family: { eyebrow: 'By family', index: '/families/' },
  difficulty: { eyebrow: 'By difficulty' },
  occasion: { eyebrow: 'By occasion' },
  tag: { eyebrow: 'By tag' },
};

/**
 * Build the breadcrumb trail for a by-* taxonomy value page.
 * @param facetKey one of the singular FACETS keys
 * @param displayName the resolved value label for the current page
 */
export function breadcrumbTrail(facetKey: string, displayName: string): BreadcrumbSegment[] {
  const facet = FACETS[facetKey];
  if (!facet) {
    throw new Error(`breadcrumbTrail: unknown facet key "${facetKey}"`);
  }
  return [
    { label: 'All recipes', href: '/' },
    { label: facet.eyebrow, href: facet.index ?? null },
    { label: displayName, href: null },
  ];
}
