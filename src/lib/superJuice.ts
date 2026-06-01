// Super Juice math — acid-adjusted citrus stretched with water (Kevin Kos method),
// plus our 1:1 dilution. Pure and DOM-free so it's unit-testable and importable by
// the SuperJuiceCalculator island. Source ratios:
// https://www.kevinkos.com/post/how-to-get-8x-as-much-juice-from-one-citrus

export type Citrus = 'lime' | 'lemon';

export interface Proportions {
  /** grams of citric acid per gram of peel */
  citric: number;
  /** grams of malic acid per gram of peel (0 for lemon) */
  malic: number;
  /** millilitres of water per gram of peel */
  water: number;
}

/** Per-citrus multipliers, applied to the weight of the peels. */
export const PROPORTIONS: Record<Citrus, Proportions> = {
  lime: { citric: 0.66, malic: 0.33, water: 16.66 },
  lemon: { citric: 1.0, malic: 0, water: 16.66 },
};

// Average peel weight per fruit, calibrated to the owner's measured anchor:
// peels from 2 lemons or 3 limes (~28 g) yield ~2 cups of base super juice.
// Labeled an estimate in the UI — real peel weight varies by fruit size.
export const AVG_PEEL_WEIGHT_G: Record<Citrus, number> = {
  lemon: 14,
  lime: 9.5,
};

export interface Build {
  /** peel weight used for the build, in grams */
  peelWeight: number;
  /** citric acid, grams */
  citric: number;
  /** malic acid, grams (0 for lemon) */
  malic: number;
  /** water, millilitres */
  water: number;
  /** expected base yield, millilitres (≈ the water term) */
  baseYield: number;
}

export interface Dilution {
  /** water added for the 1:1 cut, millilitres */
  dilutionWater: number;
  /** finished volume after the cut, millilitres */
  finalVolume: number;
}

const ZERO_BUILD: Build = { peelWeight: 0, citric: 0, malic: 0, water: 0, baseYield: 0 };

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isPositiveFinite(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

/**
 * Compute the base super-juice build from a peel weight. Acids round to 1 decimal
 * gram, water and yield to whole millilitres. Base yield is the water term — the
 * squeezed juice the method adds back is treated as roughly offset by straining
 * loss, which matches the owner's measured ~2-cup yield from ~28 g of peel.
 * Returns a zeroed build for invalid input or an unknown citrus.
 */
export function computeBuild(citrus: Citrus, peelWeightGrams: number): Build {
  const p = PROPORTIONS[citrus];
  if (!p || !isPositiveFinite(peelWeightGrams)) return { ...ZERO_BUILD };
  const water = Math.round(p.water * peelWeightGrams);
  return {
    peelWeight: peelWeightGrams,
    citric: round(p.citric * peelWeightGrams, 1),
    malic: round(p.malic * peelWeightGrams, 1),
    water,
    baseYield: water,
  };
}

/**
 * Estimate peel weight (g) from a fruit count using the calibrated per-fruit
 * average. Returns 0 for invalid or non-positive counts.
 */
export function estimatePeelWeight(citrus: Citrus, fruitCount: number): number {
  const avg = AVG_PEEL_WEIGHT_G[citrus];
  if (!avg || !isPositiveFinite(fruitCount)) return 0;
  return round(avg * fruitCount, 1);
}

/**
 * Apply our 1:1 dilution: add water equal to the base yield, doubling the volume.
 * Returns zeros for non-positive base yield.
 */
export function applyDilution(baseYield: number): Dilution {
  if (!isPositiveFinite(baseYield)) return { dilutionWater: 0, finalVolume: 0 };
  return { dilutionWater: baseYield, finalVolume: baseYield * 2 };
}

/** Format a millilitre volume as an approximate US-cup count (1 cup ≈ 236.588 ml), 1 decimal. */
export function mlToCups(ml: number): string {
  return (ml / 236.588).toFixed(1);
}
