import type { Recipe } from './recipes';

export const SPIRIT_LABELS: Record<string, string> = {
  tequila: 'Tequila',
  mezcal: 'Mezcal',
  whiskey: 'Whiskey',
  bourbon: 'Bourbon',
  rye: 'Rye',
  scotch: 'Scotch',
  gin: 'Gin',
  vodka: 'Vodka',
  rum: 'Rum',
  brandy: 'Brandy',
  aperitif: 'Aperitif',
  liqueur: 'Liqueur',
  wine: 'Wine',
  champagne: 'Champagne',
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  advanced: 'Advanced',
};

export const METHOD_LABELS: Record<string, string> = {
  shaken: 'Shaken',
  stirred: 'Stirred',
  built: 'Built',
  blended: 'Blended',
};

export function label(field: string, value: string): string {
  if (field === 'spirit' || field === 'spirits') return SPIRIT_LABELS[value] ?? value;
  if (field === 'difficulty') return DIFFICULTY_LABELS[value] ?? value;
  if (field === 'method') return METHOD_LABELS[value] ?? value;
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

type TaxField = 'spirits' | 'flavors' | 'styles' | 'occasions';

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
