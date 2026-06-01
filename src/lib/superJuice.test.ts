import { describe, it, expect } from 'vitest';
import {
  computeBuild,
  estimatePeelWeight,
  applyDilution,
  mlToCups,
  PROPORTIONS,
  AVG_PEEL_WEIGHT_G,
} from './superJuice';

describe('PROPORTIONS', () => {
  it('matches the Kevin Kos source ratios (× peel weight)', () => {
    expect(PROPORTIONS.lime).toEqual({ citric: 0.66, malic: 0.33, water: 16.66 });
    expect(PROPORTIONS.lemon).toEqual({ citric: 1.0, malic: 0, water: 16.66 });
  });
});

describe('computeBuild', () => {
  it('computes the lime build at 100 g peel (citric 66, malic 33, water 1666)', () => {
    const b = computeBuild('lime', 100);
    expect(b.citric).toBe(66);
    expect(b.malic).toBe(33);
    expect(b.water).toBe(1666);
  });

  it('computes the lemon build at 100 g peel (citric 100, no malic, water 1666)', () => {
    const b = computeBuild('lemon', 100);
    expect(b.citric).toBe(100);
    expect(b.malic).toBe(0);
    expect(b.water).toBe(1666);
  });

  it('sets baseYield equal to the water term', () => {
    expect(computeBuild('lime', 100).baseYield).toBe(1666);
  });

  it('scales linearly — 50 g peel halves every output of the 100 g case', () => {
    const half = computeBuild('lime', 50);
    expect(half.citric).toBe(33);
    expect(half.malic).toBe(16.5);
    expect(half.water).toBe(833);
    expect(half.baseYield).toBe(833);
  });

  it('rounds acids to 1 decimal and water to whole ml', () => {
    const b = computeBuild('lime', 75);
    expect(b.citric).toBe(49.5); // 0.66 * 75
    expect(b.malic).toBe(24.8); // 0.33 * 75 = 24.75 -> 24.8
    expect(b.water).toBe(1250); // 16.66 * 75 = 1249.5 -> 1250
  });

  it('rounds the echoed peel weight to 1 decimal while computing from the raw value', () => {
    const b = computeBuild('lime', 33.333);
    expect(b.peelWeight).toBe(33.3);
    expect(b.citric).toBe(22); // 0.66 * 33.333 = 21.99978 -> 22.0
  });

  it('stays finite and scaled for very large peel weights', () => {
    const b = computeBuild('lime', 10000);
    expect(Number.isFinite(b.water)).toBe(true);
    expect(b.citric).toBe(6600);
  });

  it('returns a zeroed build for empty, non-numeric, or negative input', () => {
    for (const bad of [0, -5, NaN, Number.POSITIVE_INFINITY]) {
      const b = computeBuild('lime', bad as number);
      expect(b).toMatchObject({ peelWeight: 0, citric: 0, malic: 0, water: 0, baseYield: 0 });
    }
  });

  it('returns a zeroed build for an unknown citrus', () => {
    const b = computeBuild('orange' as 'lime', 100);
    expect(b).toMatchObject({ citric: 0, malic: 0, water: 0, baseYield: 0 });
  });
});

describe('estimatePeelWeight', () => {
  it('uses the calibrated per-fruit averages', () => {
    expect(estimatePeelWeight('lemon', 2)).toBeCloseTo(AVG_PEEL_WEIGHT_G.lemon * 2, 5);
    expect(estimatePeelWeight('lime', 3)).toBeCloseTo(AVG_PEEL_WEIGHT_G.lime * 3, 5);
  });

  it('calibration anchor: 2 lemons ≈ 3 limes ≈ 28 g of peel', () => {
    const lemon2 = estimatePeelWeight('lemon', 2);
    const lime3 = estimatePeelWeight('lime', 3);
    expect(lemon2).toBeGreaterThanOrEqual(27);
    expect(lemon2).toBeLessThanOrEqual(29);
    expect(lime3).toBeGreaterThanOrEqual(27);
    expect(lime3).toBeLessThanOrEqual(30);
    expect(Math.abs(lemon2 - lime3)).toBeLessThanOrEqual(1);
  });

  it('returns 0 for zero or negative fruit counts', () => {
    expect(estimatePeelWeight('lemon', 0)).toBe(0);
    expect(estimatePeelWeight('lime', -2)).toBe(0);
  });
});

describe('mlToCups', () => {
  it('converts millilitres to US cups, one decimal', () => {
    expect(mlToCups(473.176)).toBe('2.0');
    expect(mlToCups(1666)).toBe('7.0');
    expect(mlToCups(0)).toBe('0.0');
  });
});

describe('applyDilution', () => {
  it('doubles the volume: dilution water equals base yield, final is 2×', () => {
    const d = applyDilution(800);
    expect(d.dilutionWater).toBe(800);
    expect(d.finalVolume).toBe(1600);
  });

  it('returns zeros for non-positive base yield', () => {
    expect(applyDilution(0)).toEqual({ dilutionWater: 0, finalVolume: 0 });
    expect(applyDilution(-10)).toEqual({ dilutionWater: 0, finalVolume: 0 });
  });
});

describe('owner calibration anchor (2 lemons/3 limes → ~2 cups → ~4 cups diluted)', () => {
  it('a 2-lemon batch yields roughly 2 cups base and 4 cups diluted', () => {
    const peel = estimatePeelWeight('lemon', 2);
    const base = computeBuild('lemon', peel).baseYield;
    // 2 cups ≈ 473 ml; allow generous tolerance for the peel-weight estimate.
    expect(base).toBeGreaterThanOrEqual(440);
    expect(base).toBeLessThanOrEqual(500);
    const final = applyDilution(base).finalVolume;
    expect(final).toBeGreaterThanOrEqual(880);
    expect(final).toBeLessThanOrEqual(1000);
  });
});
