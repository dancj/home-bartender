#!/usr/bin/env node
// Structural validation for recipe frontmatter that Zod cannot express:
//   - directory ↔ category coherence (recipes/classics/foo.md must have
//     category: classic, etc.)
//   - publish flag ↔ directory coherence (inbox/ vs published dirs)
//   - related[] slug resolution against the rest of the corpus
//   - duplicate slug detection across directories
//   - alias-vs-slug collision warnings
//
// Enum membership for category, method, ice, difficulty, format, glass,
// family, spirits, flavors, occasions is delegated entirely to Zod (see
// src/content.config.ts, populated from data/taxonomy.yaml).
//
//   node scripts/validate.mjs

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const RECIPES_DIR = path.join(ROOT, 'recipes');

export const CATEGORY_BY_DIR = {
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

export function parseFrontmatter(raw) {
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

export function parseScalar(v) {
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
    if (expectedCategory && fm.category !== expectedCategory) {
      errors.push(`${rel}: category="${fm.category}" but dir says "${expectedCategory}"`);
    }

    if (fm.publish !== true && fm.publish !== false) errors.push(`${rel}: publish must be true/false, got ${fm.publish}`);
    if (dirName === 'inbox' && fm.publish !== false) warnings.push(`${rel}: inbox recipe has publish: true`);
    if (dirName !== 'inbox' && fm.publish === false) warnings.push(`${rel}: non-inbox recipe has publish: false`);
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

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(e => { console.error(e); process.exit(1); });
}
