import { describe, it, expect } from 'vitest';
import {
  isMakeable,
  parseOwnedSpirits,
  hasVisibleOwned,
  parseBarParam,
  buildBarShareUrl,
  MY_BAR_STORAGE_KEY,
} from './myBar';

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

describe('hasVisibleOwned', () => {
  it('is true when an owned spirit has a chip on the page', () => {
    expect(hasVisibleOwned(['gin'], ['gin', 'rum'])).toBe(true);
  });

  it('is false when the only owned spirit has no chip', () => {
    // The #118 state: `rye` is taxonomy-valid and durably owned, but every rye
    // recipe is unpublished, so no rye chip renders. The user sees an empty
    // My Bar and must get the "mark spirits" empty state, not "no recipes match".
    expect(hasVisibleOwned(['rye'], ['gin', 'rum'])).toBe(false);
  });

  it('is false when nothing is owned', () => {
    expect(hasVisibleOwned([], ['gin', 'rum'])).toBe(false);
  });

  it('is true on partial overlap — one owned spirit shown, one not', () => {
    expect(hasVisibleOwned(['gin', 'rye'], ['gin', 'rum'])).toBe(true);
  });

  it('is false when no chips render at all', () => {
    expect(hasVisibleOwned(['gin'], [])).toBe(false);
  });

  it('accepts a Set for the shown collection', () => {
    expect(hasVisibleOwned(['gin'], new Set(['gin']))).toBe(true);
  });
});

describe('parseBarParam', () => {
  const valid = ['gin', 'rum', 'mezcal', 'bourbon'];

  it('parses a CSV of known slugs', () => {
    expect(parseBarParam('mezcal,bourbon,gin', valid)).toEqual(['mezcal', 'bourbon', 'gin']);
  });

  it('drops unknown slugs', () => {
    expect(parseBarParam('mezcal,vodka-of-doom', valid)).toEqual(['mezcal']);
  });

  it('dedupes repeated slugs', () => {
    expect(parseBarParam('gin,gin,rum', valid)).toEqual(['gin', 'rum']);
  });

  it('tolerates whitespace around commas', () => {
    expect(parseBarParam(' gin , rum ', valid)).toEqual(['gin', 'rum']);
  });

  it('returns null for an absent param (caller must not touch the stored bar)', () => {
    expect(parseBarParam(null, valid)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseBarParam('', valid)).toBeNull();
  });

  it('returns null when every entry is invalid', () => {
    expect(parseBarParam('vodka-of-doom, ,', valid)).toBeNull();
  });
});

describe('buildBarShareUrl', () => {
  it('sets the bar param as a comma-joined list', () => {
    expect(buildBarShareUrl('https://x.test/base/', ['mezcal', 'gin'])).toBe(
      'https://x.test/base/?bar=mezcal%2Cgin'
    );
  });

  it('preserves existing params like sort and filters', () => {
    const url = buildBarShareUrl('https://x.test/?sort=spirit&spirit=gin', ['rum']);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('sort')).toBe('spirit');
    expect(parsed.searchParams.get('spirit')).toBe('gin');
    expect(parsed.searchParams.get('bar')).toBe('rum');
  });

  it('replaces a stale bar param rather than appending', () => {
    const url = buildBarShareUrl('https://x.test/?bar=gin', ['rum']);
    expect(new URL(url).searchParams.getAll('bar')).toEqual(['rum']);
  });

  it('removes the bar param when nothing is owned', () => {
    expect(buildBarShareUrl('https://x.test/?bar=gin&sort=spirit', [])).toBe(
      'https://x.test/?sort=spirit'
    );
  });

  it('round-trips through parseBarParam', () => {
    const valid = ['gin', 'rum', 'mezcal'];
    const owned = ['mezcal', 'gin'];
    const url = new URL(buildBarShareUrl('https://x.test/', owned));
    expect(parseBarParam(url.searchParams.get('bar'), valid)).toEqual(owned);
  });
});

describe('MY_BAR_STORAGE_KEY', () => {
  it('is namespaced', () => {
    expect(MY_BAR_STORAGE_KEY).toBe('hb:my-bar');
  });
});
