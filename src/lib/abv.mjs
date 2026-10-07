// Estimated ABV for a recipe (issue #171). Plain JS so both the Astro layout
// and scripts/validate.mjs (plain Node) can import it.
//
// ABV = alcohol volume / post-dilution volume. Amounts are parsed from the
// free-text ingredients[] strings; ABVs come from data/ingredient-abv.yaml.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

// cwd-relative, not import.meta.url: Vite bundles this into dist chunks at build.
// ponytail: assumes commands run from the repo root (npm scripts, vitest, astro).
const TABLE = parseYaml(
  readFileSync(path.resolve(process.cwd(), 'data/ingredient-abv.yaml'), 'utf8')
).flatMap((e) => e.match.map((k) => [k.toLowerCase(), e.abv]));

const ML_PER_OZ = 29.5735;
const DASH_OZ = 0.8 / ML_PER_OZ;
const TSP_OZ = 5 / ML_PER_OZ;
const SPLASH_OZ = 0.5;
const TOP_OZ = 2;

// Percent of pre-dilution volume added as melt.
const DILUTION = { stirred: 22, shaken: 28, blended: 50 };
const BUILT_DILUTION = { none: 0, crushed: 25 };
const BUILT_DEFAULT = 15;

const FRACTIONS = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
const NUM = String.raw`\d+(?:\.\d+)?[¼½¾⅓⅔]?|[¼½¾⅓⅔]`;
const AMOUNT_RE = new RegExp(String.raw`^(${NUM})(?:\s*[–-]\s*(${NUM}))?\s+`);

function num(s) {
  const frac = FRACTIONS[s.at(-1)] ?? 0;
  const whole = frac ? s.slice(0, -1) : s;
  return (whole ? Number(whole) : 0) + frac;
}

/** "1½ oz white rum (note)" → { name: 'white rum', oz: 1.5 }; oz null when unparseable. */
export function parseIngredient(line) {
  let s = line.replace(/\*\(.*?\)\*/g, '').replace(/\(.*?\)/g, '').trim().replace(/\s+/g, ' ');

  let m;
  if ((m = s.match(/^dash of\s+/i))) return { name: s.slice(m[0].length), oz: DASH_OZ };
  if ((m = s.match(/^splash of\s+/i))) return { name: s.slice(m[0].length), oz: SPLASH_OZ };
  if ((m = s.match(/^top(?: up)?(?: with)?\s+/i))) return { name: s.slice(m[0].length), oz: TOP_OZ };

  m = s.match(AMOUNT_RE);
  if (!m) return { name: s, oz: null };
  const qty = m[2] ? (num(m[1]) + num(m[2])) / 2 : num(m[1]);
  s = s.slice(m[0].length);

  const unit = s.match(/^(oz|dash(?:es)?|bar ?spoons?|tsp)\s+/i);
  if (unit) {
    const u = unit[1].toLowerCase();
    const per = u === 'oz' ? 1 : u.startsWith('dash') ? DASH_OZ : TSP_OZ;
    return { name: s.slice(unit[0].length), oz: qty * per };
  }
  // ponytail: unitless counts are no-volume (leaves) except egg white (~1 oz).
  return { name: s, oz: /egg white/i.test(s) ? qty : 0 };
}

/** Percent ABV for an ingredient name, or null if unknown. Longest keyword wins. */
export function lookupAbv(name, overrides = {}) {
  const n = name.toLowerCase();
  let best = null;
  for (const [k, abv] of [...TABLE, ...Object.entries(overrides).map(([k, v]) => [k.toLowerCase(), v])]) {
    if (n.includes(k) && (!best || k.length >= best[0].length)) best = [k, abv];
  }
  return best ? best[1] : null;
}

function dilutionFor(method, ice) {
  if (method === 'built') return BUILT_DILUTION[ice] ?? BUILT_DEFAULT;
  return DILUTION[method] ?? 0;
}

/**
 * @returns {{ abv: number|null, alcoholOz?: number, preOz?: number, dilution?: number, finalOz?: number, blockers: string[] }}
 */
export function estimateAbv({ ingredients = [], float = '', method, ice, abv: override = {} }) {
  const overrides = override?.ingredients ?? {};
  const blockers = [];
  const tally = (lines) => {
    let alcohol = 0;
    let volume = 0;
    for (const line of lines) {
      const { name, oz } = parseIngredient(line);
      const pct = lookupAbv(name, overrides);
      if (pct === null) blockers.push(`unknown ABV: ${line}`);
      else if (oz === null) { if (pct > 0) blockers.push(`no amount: ${line}`); }
      else { alcohol += (oz * pct) / 100; volume += oz; }
    }
    return { alcohol, volume };
  };

  const main = tally(ingredients);
  const top = tally(float ? [float] : []);
  if (blockers.length || main.volume === 0) return { abv: null, blockers };

  const dilution = override?.dilution ?? dilutionFor(method, ice);
  const alcoholOz = main.alcohol + top.alcohol;
  const finalOz = main.volume * (1 + dilution / 100) + top.volume;
  return {
    abv: Math.round((alcoholOz / finalOz) * 100),
    alcoholOz,
    preOz: main.volume + top.volume,
    dilution,
    finalOz,
    blockers,
  };
}
