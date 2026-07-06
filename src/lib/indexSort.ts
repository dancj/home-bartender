// Pure sort logic for the recipe index toolbar. No astro:content imports so
// it stays unit-testable under vitest's node environment and importable from
// the index page's client script (same convention as myBar.ts).
import { DIFFICULTIES } from '../taxonomy.generated';

export const SORT_MODES = ['title', 'spirit', 'difficulty'] as const;
export type SortMode = (typeof SORT_MODES)[number];

export interface SortableCard {
  title: string;
  primarySpirit: string;
  difficulty: string;
}

/** Unknown or absent ?sort= values fall back to the default title order. */
export function parseSortMode(raw: string | null): SortMode {
  return (SORT_MODES as readonly string[]).includes(raw ?? '') ? (raw as SortMode) : 'title';
}

const byTitle = (a: SortableCard, b: SortableCard) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

/** Missing/unknown values sort last within their mode; ties fall back to title. */
export function compareCards(a: SortableCard, b: SortableCard, mode: SortMode): number {
  if (mode === 'spirit') {
    const as = a.primarySpirit;
    const bs = b.primarySpirit;
    if (!as || !bs) return (as ? -1 : bs ? 1 : 0) || byTitle(a, b);
    return as.localeCompare(bs) || byTitle(a, b);
  }
  if (mode === 'difficulty') {
    const rank = (c: SortableCard) => {
      const i = (DIFFICULTIES as readonly string[]).indexOf(c.difficulty);
      return i === -1 ? DIFFICULTIES.length : i;
    };
    return rank(a) - rank(b) || byTitle(a, b);
  }
  return byTitle(a, b);
}
