// Maps taxonomy call-site field names to icon directories under
// src/assets/icons/. Mirrors LABEL_MAPS in ./taxonomy.ts for taxonomy
// fields, plus the non-taxonomy `sections` group for recipe structural
// headings. Fields with no icon group (category, occasion, free-form
// tags) are deliberately absent — resolveIconKey returns null and the
// UI renders text-only.
const ICON_DIRS: Record<string, string> = {
  spirit: 'spirits',
  spirits: 'spirits',
  difficulty: 'difficulty',
  method: 'methods',
  glass: 'glassware',
  family: 'families',
  families: 'families',
  ice: 'ice',
  format: 'format',
  flavor: 'flavors',
  flavors: 'flavors',
  sections: 'sections',
};

// Recipe structural-heading glyphs. Not in taxonomy.yaml, so the parity
// test sources section slugs from here; keep in sync with call sites.
export const SECTION_ICONS = [
  'batch',
  'float',
  'garnish',
  'house-made',
  'ingredients',
  'notes',
  'related',
  'steps',
  'variations',
] as const;

export function resolveIconKey(
  field: string,
  slug: string,
  available?: ReadonlySet<string>,
): string | null {
  const dir = ICON_DIRS[field];
  if (!dir || !slug) return null;
  const key = `${dir}/${slug}`;
  if (available && !available.has(key)) return null;
  return key;
}
