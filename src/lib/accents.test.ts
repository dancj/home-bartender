import { describe, it, expect } from 'vitest';
import { spiritAccentVar, flavorAccentVar, ACCENT_FALLBACK } from './accents';
import { SPIRITS, FLAVORS } from '../taxonomy.generated';

describe('spiritAccentVar', () => {
  it('maps a known spirit slug to its accent custom property', () => {
    expect(spiritAccentVar('gin')).toBe('var(--color-spirit-gin)');
    expect(spiritAccentVar('bourbon')).toBe('var(--color-spirit-bourbon)');
  });

  it('falls back to the neutral rule for unknown or empty input', () => {
    expect(spiritAccentVar('unobtanium')).toBe(ACCENT_FALLBACK);
    expect(spiritAccentVar('')).toBe(ACCENT_FALLBACK);
    expect(spiritAccentVar(undefined)).toBe(ACCENT_FALLBACK);
    expect(spiritAccentVar(null)).toBe(ACCENT_FALLBACK);
  });

  it('resolves every taxonomy spirit to a real accent var (not the fallback)', () => {
    for (const slug of SPIRITS) {
      const v = spiritAccentVar(slug);
      expect(v).toBe(`var(--color-spirit-${slug})`);
      expect(v).not.toBe(ACCENT_FALLBACK);
    }
  });
});

describe('flavorAccentVar', () => {
  it('maps a known flavor slug to its accent custom property', () => {
    expect(flavorAccentVar('citrus')).toBe('var(--color-flavor-citrus)');
    expect(flavorAccentVar('spirit-forward')).toBe('var(--color-flavor-spirit-forward)');
  });

  it('falls back to the neutral rule for unknown or empty input', () => {
    expect(flavorAccentVar('unobtanium')).toBe(ACCENT_FALLBACK);
    expect(flavorAccentVar('')).toBe(ACCENT_FALLBACK);
  });

  it('resolves every taxonomy flavor to a real accent var (not the fallback)', () => {
    for (const slug of FLAVORS) {
      const v = flavorAccentVar(slug);
      expect(v).toBe(`var(--color-flavor-${slug})`);
      expect(v).not.toBe(ACCENT_FALLBACK);
    }
  });
});
