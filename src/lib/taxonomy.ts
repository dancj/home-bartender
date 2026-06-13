import type { Recipe } from './recipes';
import {
  SPIRIT_LABELS,
  DIFFICULTY_LABELS,
  METHOD_LABELS,
  GLASS_LABELS,
  FAMILY_LABELS,
  FAMILY_NOTES,
  FAMILIES,
  ICE_LABELS,
  CATEGORY_LABELS,
  FORMAT_LABELS,
  FLAVOR_LABELS,
  OCCASION_LABELS,
} from '../taxonomy.generated';

// Re-export the generated label maps so existing callers keep working.
export {
  SPIRIT_LABELS,
  DIFFICULTY_LABELS,
  METHOD_LABELS,
  GLASS_LABELS,
  FAMILY_LABELS,
  FAMILY_NOTES,
  FAMILIES,
  ICE_LABELS,
  CATEGORY_LABELS,
  FORMAT_LABELS,
  FLAVOR_LABELS,
  OCCASION_LABELS,
};

const LABEL_MAPS: Record<string, Record<string, string>> = {
  spirit: SPIRIT_LABELS,
  spirits: SPIRIT_LABELS,
  difficulty: DIFFICULTY_LABELS,
  method: METHOD_LABELS,
  glass: GLASS_LABELS,
  family: FAMILY_LABELS,
  families: FAMILY_LABELS,
  ice: ICE_LABELS,
  category: CATEGORY_LABELS,
  format: FORMAT_LABELS,
  flavor: FLAVOR_LABELS,
  flavors: FLAVOR_LABELS,
  occasion: OCCASION_LABELS,
  occasions: OCCASION_LABELS,
};

export function label(field: string, value: string): string {
  const map = LABEL_MAPS[field];
  if (map && map[value]) return map[value];
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

type TaxField = 'spirits' | 'flavors' | 'tags' | 'occasions' | 'families';

export function groupByTax(recipes: Recipe[], field: TaxField): Map<string, Recipe[]> {
  const map = new Map<string, Recipe[]>();
  for (const r of recipes) {
    const values = (r.data[field] as string[]) ?? [];
    for (const v of values) {
      const existing = map.get(v) ?? [];
      map.set(v, [...existing, r]);
    }
  }
  return new Map([...map].sort(([a], [b]) => a.localeCompare(b)));
}
