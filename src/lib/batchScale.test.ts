import { describe, it, expect } from 'vitest';
import { baseServings, scaleLine, scaleYield } from './batchScale';

describe('baseServings', () => {
  it('reads the serving count from the yield line', () => {
    expect(baseServings('Makes 8 servings:')).toBe(8);
    expect(baseServings('Makes 8 servings (~1 L dispenser).')).toBe(8);
  });

  it('returns null when the yield states no serving count', () => {
    expect(baseServings('My 6x batch from the card:')).toBeNull();
  });
});

describe('scaleLine', () => {
  it('scales the leading oz amount', () => {
    expect(scaleLine('6 oz Aperol', 0.5)).toBe('3 oz Aperol');
    expect(scaleLine('12 oz reposado tequila', 12 / 8)).toBe('18 oz reposado tequila');
  });

  it('rounds oz to the nearest quarter with unicode fractions', () => {
    expect(scaleLine('6 oz Aperol', 3 / 8)).toBe('2¼ oz Aperol');
    expect(scaleLine('1½ oz lime', 1)).toBe('1½ oz lime');
    expect(scaleLine('1 oz lime', 0.5)).toBe('½ oz lime');
  });

  it('rounds non-oz units to whole numbers', () => {
    expect(scaleLine('16 dashes cocoa bitters', 12 / 8)).toBe('24 dashes cocoa bitters');
    expect(scaleLine('16 dashes cocoa bitters', 5 / 8)).toBe('10 dashes cocoa bitters');
  });

  it('scales unit-bearing parentheticals and fixes plurals', () => {
    expect(scaleLine('16 oz (2 cups) gin', 0.5)).toBe('8 oz (1 cup) gin');
    expect(scaleLine('1 bottle (750ml) prosecco', 2)).toBe('2 bottles (1500ml) prosecco');
  });

  it('leaves ratio parentheticals alone', () => {
    expect(scaleLine('6 oz agave nectar (1:1)', 2)).toBe('12 oz agave nectar (1:1)');
  });

  it('leaves lines without a leading amount unchanged', () => {
    const line = 'Basil leaves for each serving (muddle individually)';
    expect(scaleLine(line, 2)).toBe(line);
  });

  it('scales both ends of a range', () => {
    expect(scaleLine('2–3 dashes bitters', 2)).toBe('4–6 dashes bitters');
  });
});

describe('scaleYield', () => {
  it('replaces the serving count', () => {
    expect(scaleYield('Makes 8 servings:', 12)).toBe('Makes 12 servings:');
    expect(scaleYield('Makes 8 servings (~1 L dispenser).', 4)).toBe(
      'Makes 4 servings (~1 L dispenser).'
    );
  });

  it('uses the singular for one serving', () => {
    expect(scaleYield('Makes 8 servings:', 1)).toBe('Makes 1 serving:');
  });
});
