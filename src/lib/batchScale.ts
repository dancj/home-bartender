// Rescale a recipe's batch block to a custom serving count (issue #254).
// Pure and DOM-free: the BatchInstructions script imports it on the client.
// Amounts are parsed from the free-text batch strings, same grammar as abv.mjs.

const FRACTIONS: Record<string, number> = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
const QUARTERS: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
const NUM = String.raw`\d+(?:\.\d+)?(?: ?[¼½¾⅓⅔])?|[¼½¾⅓⅔]`;
const LEAD_RE = new RegExp(String.raw`^(${NUM})(?:(\s*[–-]\s*)(${NUM}))?(\s+)([^\s(]+)`);
const PAREN_RE = new RegExp(String.raw`\((${NUM})(\s*)([a-zA-Z]+)\)`, 'g');
// Units whose count changes shape at 1; anything else passes through untouched.
const PLURALS: Record<string, string> = { cup: 'cups', dash: 'dashes', bottle: 'bottles', serving: 'servings' };
const SINGULARS = Object.fromEntries(Object.entries(PLURALS).map(([s, p]) => [p, s]));
const QUARTER_UNITS = new Set(['oz', 'cup', 'cups']);

function num(s: string): number {
  const frac = FRACTIONS[s.at(-1)!] ?? 0;
  const whole = (frac ? s.slice(0, -1) : s).trim();
  return (whole ? Number(whole) : 0) + frac;
}

function fmt(n: number, unit: string): string {
  if (!QUARTER_UNITS.has(unit.toLowerCase())) return String(Math.max(1, Math.round(n)));
  const q = Math.max(0.25, Math.round(n * 4) / 4);
  const whole = Math.floor(q);
  const frac = QUARTERS[q - whole] ?? '';
  return frac ? `${whole || ''}${frac}` : String(whole);
}

function inflect(unit: string, value: string): string {
  const lower = unit.toLowerCase();
  if (value === '1') return SINGULARS[lower] ?? unit;
  return PLURALS[lower] ?? unit;
}

/** "Makes 8 servings:" → 8; null when the yield states no serving count. */
export function baseServings(yieldText: string): number | null {
  const m = yieldText.match(/(\d+)\s+servings?/i);
  return m ? Number(m[1]) : null;
}

/** Scale a batch ingredient line's leading amount (and unit parentheticals) by factor. */
export function scaleLine(line: string, factor: number): string {
  if (factor === 1) return line;
  const m = line.match(LEAD_RE);
  if (!m) return line;
  const [lead, a, dash, b, space, unit] = m;
  const first = fmt(num(a) * factor, unit);
  const amount = b ? `${first}${dash}${fmt(num(b) * factor, unit)}` : first;
  const last = b ? amount.split(dash).at(-1)! : amount;
  const rest = line.slice(lead.length).replace(PAREN_RE, (_, n, sp, u) => {
    const v = fmt(num(n) * factor, u);
    return `(${v}${sp}${inflect(u, v)})`;
  });
  return `${amount}${space}${inflect(unit, last)}${rest}`;
}

/** "Makes 8 servings:" at 12 → "Makes 12 servings:". */
export function scaleYield(yieldText: string, servings: number): string {
  return yieldText.replace(/(\d+)(\s+)servings?/i, (_, __, sp) =>
    `${servings}${sp}${servings === 1 ? 'serving' : 'servings'}`
  );
}
