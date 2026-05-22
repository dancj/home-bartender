#!/usr/bin/env node
// Validate recipe frontmatter — enum values, related[] slug resolution,
// category/dir consistency, duplicate slugs.
//   node scripts/validate.mjs

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RECIPES_DIR = path.join(ROOT, 'recipes');

const METHODS = new Set(['shaken', 'stirred', 'built', 'blended']);
const ICES = new Set(['cubed', 'large-cube', 'crushed', 'none']);
const DIFFICULTIES = new Set(['easy', 'medium', 'advanced']);
const CATEGORIES = new Set(['classic', 'original', 'seasonal', 'inbox']);
const FORMATS = new Set(['single', 'batch', 'punch']);

const SPIRITS = new Set([
  'tequila', 'mezcal', 'whiskey', 'bourbon', 'rye', 'scotch',
  'gin', 'vodka', 'rum', 'brandy', 'aperitif', 'liqueur', 'wine', 'champagne',
]);

const FLAVORS = new Set([
  'citrus', 'nutty', 'smoky', 'sour', 'spice', 'herbal', 'floral', 'botanical',
  'bright', 'chocolate', 'rich', 'sweet', 'spirit-forward', 'bitter', 'fruity',
  'tart', 'bubbly', 'savory', 'refreshing',
]);

const OCCASIONS = new Set([
  'weeknight', 'batch-friendly', 'showstopper', 'brunch', 'nightcap', 'summer', 'winter',
]);

const CATEGORY_BY_DIR = {
  classics: 'classic',
  originals: 'original',
  seasonal: 'seasonal',
  inbox: 'inbox',
};

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return null;
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const block = raw.slice(4, end);

  const fm = {};
  const lines = block.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!m) { i++; continue; }
    const [, key, valRaw] = m;
    const val = valRaw.trim();
    if (val === '') {
      const nested = {};
      i++;
      while (i < lines.length && lines[i].startsWith('  ')) {
        const sub = lines[i].slice(2).match(/^([a-z_]+):\s*(.*)$/);
        if (sub) nested[sub[1]] = parseScalar(sub[2].trim());
        i++;
      }
      fm[key] = nested;
    } else {
      fm[key] = parseScalar(val);
      i++;
    }
  }
  return fm;
}

function parseScalar(v) {
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return v.replace(/^["']|["']$/g, '');
}

async function main() {
  const files = await walk(RECIPES_DIR);
  const slugs = new Map();
  const errors = [];
  const warnings = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const raw = await readFile(file, 'utf8');
    const fm = parseFrontmatter(raw);

    if (!fm) { errors.push(`${rel}: no/invalid frontmatter`); continue; }

    const slug = path.basename(file, '.md');
    const dirName = path.basename(path.dirname(file));
    const expectedCategory = CATEGORY_BY_DIR[dirName];

    if (slugs.has(slug)) errors.push(`${rel}: duplicate slug "${slug}" (also in ${slugs.get(slug)})`);
    slugs.set(slug, rel);

    if (!fm.title) errors.push(`${rel}: missing title`);
    if (fm.category !== expectedCategory) errors.push(`${rel}: category="${fm.category}" but dir says "${expectedCategory}"`);
    if (!CATEGORIES.has(fm.category)) errors.push(`${rel}: category="${fm.category}" not in ${[...CATEGORIES]}`);

    if (fm.method && !METHODS.has(fm.method)) errors.push(`${rel}: method="${fm.method}" not canonical`);
    if (fm.ice && !ICES.has(fm.ice)) errors.push(`${rel}: ice="${fm.ice}" not canonical`);
    if (fm.difficulty && !DIFFICULTIES.has(fm.difficulty)) errors.push(`${rel}: difficulty="${fm.difficulty}" not canonical`);
    if (fm.format && !FORMATS.has(fm.format)) errors.push(`${rel}: format="${fm.format}" not canonical`);

    if (fm.publish !== true && fm.publish !== false) errors.push(`${rel}: publish must be true/false, got ${fm.publish}`);
    if (dirName === 'inbox' && fm.publish !== false) warnings.push(`${rel}: inbox recipe has publish: true`);
    if (dirName !== 'inbox' && fm.publish === false) warnings.push(`${rel}: non-inbox recipe has publish: false`);

    for (const s of fm.spirits ?? []) if (!SPIRITS.has(s)) warnings.push(`${rel}: spirit "${s}" not in canonical set`);
    for (const f of fm.flavors ?? []) if (!FLAVORS.has(f)) warnings.push(`${rel}: flavor "${f}" not in canonical set`);
    for (const o of fm.occasions ?? []) if (!OCCASIONS.has(o)) warnings.push(`${rel}: occasion "${o}" not in canonical set`);
  }

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const raw = await readFile(file, 'utf8');
    const fm = parseFrontmatter(raw);
    if (!fm) continue;
    for (const r of fm.related ?? []) {
      if (!slugs.has(r)) errors.push(`${rel}: related[] "${r}" does not resolve to any recipe`);
    }
    for (const a of fm.aliases ?? []) {
      if (slugs.has(a)) warnings.push(`${rel}: alias "${a}" collides with an existing recipe slug`);
    }
  }

  for (const w of warnings) console.warn(`WARN: ${w}`);
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.log(`\n${files.length} recipes scanned. ${errors.length} errors, ${warnings.length} warnings.`);
  if (errors.length) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
