import { describe, it, expect } from 'vitest';
import { isMakeable, parseOwnedSpirits, MY_BAR_STORAGE_KEY } from './myBar';

describe('isMakeable', () => {
  it('is makeable when every recipe spirit is owned', () => {
    expect(isMakeable(['gin'], ['gin', 'rum'])).toBe(true);
  });

  it('is not makeable when any recipe spirit is missing', () => {
    expect(isMakeable(['rum', 'mezcal'], ['rum'])).toBe(false);
  });

  it('treats a zero-spirit recipe as makeable (nothing required)', () => {
    expect(isMakeable([], [])).toBe(true);
    expect(isMakeable([], ['gin'])).toBe(true);
  });

  it('makes only zero-spirit recipes makeable when nothing is owned', () => {
    expect(isMakeable(['gin'], [])).toBe(false);
  });

  it('accepts a Set for the owned collection', () => {
    expect(isMakeable(['gin'], new Set(['gin']))).toBe(true);
  });
});

describe('parseOwnedSpirits', () => {
  const valid = ['gin', 'rum', 'mezcal'];

  it('parses a stored JSON array of known slugs', () => {
    expect(parseOwnedSpirits('["gin","rum"]', valid)).toEqual(['gin', 'rum']);
  });

  it('returns [] for null (nothing stored)', () => {
    expect(parseOwnedSpirits(null, valid)).toEqual([]);
  });

  it('returns [] for malformed JSON', () => {
    expect(parseOwnedSpirits('not json', valid)).toEqual([]);
  });

  it('returns [] for JSON that is not an array', () => {
    expect(parseOwnedSpirits('{"a":1}', valid)).toEqual([]);
  });

  it('drops entries that are not valid slugs (junk pruning)', () => {
    expect(parseOwnedSpirits('["gin","made-up-spirit",42]', valid)).toEqual(['gin']);
  });

  it('retains a taxonomy-valid slug even when it has no published recipe', () => {
    // Ownership is durable user data: validate against the full taxonomy
    // list, not the published-recipe subset, so unpublishing the last mezcal
    // recipe does not erase the user's mezcal ownership on the next
    // read-validate-write cycle.
    const roundTripped = parseOwnedSpirits('["gin","mezcal"]', valid);
    expect(roundTripped).toContain('mezcal');
    expect(parseOwnedSpirits(JSON.stringify(roundTripped), valid)).toContain('mezcal');
  });
});

describe('MY_BAR_STORAGE_KEY', () => {
  it('is namespaced', () => {
    expect(MY_BAR_STORAGE_KEY).toBe('hb:my-bar');
  });
});
