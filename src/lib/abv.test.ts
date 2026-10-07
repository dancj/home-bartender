import { describe, it, expect } from 'vitest';
import { parseIngredient, lookupAbv, estimateAbv } from './abv.mjs';

const DASH_OZ = 0.8 / 29.5735;
const TSP_OZ = 5 / 29.5735;

describe('parseIngredient', () => {
  it.each([
    ['1½ oz white rum', 1.5, 'white rum'],
    ['¾ oz fresh lime juice', 0.75, 'fresh lime juice'],
    ['0.8 oz elderflower liqueur (St-Germain)', 0.8, 'elderflower liqueur'],
    ['2 oz blanco tequila *(can sub rum)*', 2, 'blanco tequila'],
    ['1 egg white', 1, 'egg white'],
    ['8–10 fresh mint leaves', 0, 'fresh mint leaves'],
    ['Splash of club soda or sparkling wine', 0.5, 'club soda or sparkling wine'],
    ['Top with soda water', 2, 'soda water'],
  ])('%s', (line, oz, name) => {
    const p = parseIngredient(line);
    expect(p.oz).toBeCloseTo(oz);
    expect(p.name).toBe(name);
  });

  it('dash ranges take the midpoint', () => {
    expect(parseIngredient('2–3 dashes cocoa bitters').oz).toBeCloseTo(2.5 * DASH_OZ);
  });

  it('"Dash of" is one dash', () => {
    const p = parseIngredient('Dash of hot bitters');
    expect(p.oz).toBeCloseTo(DASH_OZ);
    expect(p.name).toBe('hot bitters');
  });

  it('bar spoon and tsp are 5 ml', () => {
    expect(parseIngredient('1 bar spoon maple syrup').oz).toBeCloseTo(TSP_OZ);
    expect(parseIngredient('½ tsp agave nectar').oz).toBeCloseTo(TSP_OZ / 2);
  });

  it('unparseable amount gives null oz', () => {
    expect(parseIngredient('Some gin, to taste').oz).toBeNull();
  });
});

describe('lookupAbv', () => {
  it('longest keyword wins', () => {
    expect(lookupAbv('sweet vermouth')).toBe(16);
    expect(lookupAbv('dry vermouth')).toBe(17);
  });
  it('matches spirits inside longer names', () => {
    expect(lookupAbv('bacon-washed bourbon')).toBe(40);
    expect(lookupAbv('Cointreau or triple sec')).toBe(40);
  });
  it('non-alcoholic items are 0', () => {
    expect(lookupAbv('fresh lime juice')).toBe(0);
    expect(lookupAbv('demerara simple syrup')).toBe(0);
  });
  it('unknown is null', () => {
    expect(lookupAbv('yuzu kosho')).toBeNull();
  });
  it('overrides win', () => {
    expect(lookupAbv('gin', { gin: 57 })).toBe(57);
  });
});

const r = (ingredients: string[], method: string, ice: string, extra = {}) => ({
  ingredients,
  method,
  ice,
  float: '',
  ...extra,
});

const MARTINI = r(['2 oz gin', '1 oz dry vermouth'], 'stirred', 'none');
const NEGRONI = r(['1 oz gin', '1 oz Campari', '1 oz sweet vermouth'], 'stirred', 'large-cube');
const DAIQUIRI = r(['2 oz white rum', '¾ oz fresh lime juice', '¾ oz simple syrup'], 'shaken', 'none');
const MOJITO = r(
  ['2 oz white rum', '¾ oz fresh lime juice', '¾ oz simple syrup', '8–10 fresh mint leaves', '2 oz club soda'],
  'built',
  'crushed'
);

describe('estimateAbv spot checks (issue #171)', () => {
  it.each([
    ['Martini', MARTINI, 28, 30],
    ['Negroni', NEGRONI, 22, 24],
    ['Daiquiri', DAIQUIRI, 18, 20],
    ['Mojito', MOJITO, 10, 12],
  ])('%s', (_name, recipe, lo, hi) => {
    const e = estimateAbv(recipe);
    expect(e.abv).not.toBeNull();
    expect(e.abv).toBeGreaterThanOrEqual(lo);
    expect(e.abv).toBeLessThanOrEqual(hi);
  });
});

describe('estimateAbv', () => {
  it('reports breakdown', () => {
    const e = estimateAbv(NEGRONI);
    expect(e.alcoholOz).toBeCloseTo(0.87);
    expect(e.preOz).toBeCloseTo(3);
    expect(e.dilution).toBe(22);
    expect(e.finalOz).toBeCloseTo(3.66);
  });

  it('unknown ingredient blocks the estimate and is named', () => {
    const e = estimateAbv(r(['2 oz gin', '1 oz yuzu kosho'], 'stirred', 'none'));
    expect(e.abv).toBeNull();
    expect(e.blockers).toEqual(['unknown ABV: 1 oz yuzu kosho']);
  });

  it('unparseable amount on an alcoholic ingredient blocks', () => {
    const e = estimateAbv(r(['gin, a generous pour', '1 oz lime juice'], 'shaken', 'none'));
    expect(e.abv).toBeNull();
    expect(e.blockers).toEqual(['no amount: gin, a generous pour']);
  });

  it('unparseable amount on a 0% ingredient is ignored', () => {
    const e = estimateAbv(r(['2 oz gin', 'tonic water, to fill'], 'built', 'cubed'));
    expect(e.abv).not.toBeNull();
  });

  it('built with no ice has no dilution', () => {
    expect(estimateAbv(r(['2 oz gin'], 'built', 'none')).dilution).toBe(0);
  });

  it('dilution override', () => {
    const e = estimateAbv({ ...MARTINI, abv: { dilution: 0 } });
    expect(e.dilution).toBe(0);
    expect(e.abv).toBe(37);
  });

  it('ingredient override', () => {
    const base = estimateAbv(MARTINI).abv!;
    expect(estimateAbv({ ...MARTINI, abv: { ingredients: { gin: 57 } } }).abv!).toBeGreaterThan(base);
  });

  it('float is added after dilution', () => {
    const e = estimateAbv({ ...DAIQUIRI, float: '¼ oz Laphroaig scotch' });
    const base = estimateAbv(DAIQUIRI);
    expect(e.finalOz).toBeCloseTo(base.finalOz! + 0.25);
  });
});
