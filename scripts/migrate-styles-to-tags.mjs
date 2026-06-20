#!/usr/bin/env node
// One-shot migration: rename `styles:` frontmatter key to `tags:` across
// every recipe under recipes/**/*.md, dedup'ing values that overlap with
// any canonical hard enum (methods/glasses/families/spirits/flavors/
// occasions/categories/ices/difficulties/formats — sourced from
// data/taxonomy.yaml via scripts/taxonomy.generated.mjs).
//
// Rationale for dedup: after schema hardening, tag values that match a
// canonical slug are redundant — the recipe already records the concept
// in its dedicated field. Tags become genuinely free-form descriptors
// (e.g. `smoky-sour`, `spicy`) that don't fit any canonical surface.
//
// Idempotent: re-running on already-migrated files is a no-op (no
// `styles:` line to find). Kept around per scripts/migrate-to-frontmatter.mjs
// precedent for documenting the conversion shape.
//
//   node scripts/migrate-styles-to-tags.mjs

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORIES, METHODS, ICES, DIFFICULTIES, FORMATS,
  GLASSES, ROOTS, SPIRITS, FLAVORS, OCCASIONS,
} from './taxonomy.generated.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECIPES_DIR = path.join(ROOT, 'recipes');

const CANONICAL = new Set([
  ...CATEGORIES, ...METHODS, ...ICES, ...DIFFICULTIES, ...FORMATS,
  ...GLASSES, ...ROOTS, ...SPIRITS, ...FLAVORS, ...OCCASIONS,
]);

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

export function parseStylesLine(line) {
  // Match: `styles: [a, b, "c", 'd']` or `styles: []`
  const m = line.match(/^styles:\s*\[(.*)\]\s*$/);
  if (!m) return null;
  const inner = m[1].trim();
  if (!inner) return [];
  return inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

export function dedupTags(values, canonical = CANONICAL) {
  return values.filter((v) => !canonical.has(v));
}

export function renderTagsLine(values) {
  return `tags: [${values.join(', ')}]`;
}

export function migrateFileContent(content, canonical = CANONICAL) {
  // Only touch the frontmatter block (between the first `---` pair).
  if (!content.startsWith('---\n')) return { content, changed: false };
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return { content, changed: false };

  const fmBlock = content.slice(4, end);
  const after = content.slice(end);
  const lines = fmBlock.split('\n');
  let changed = false;

  const newLines = lines.map((line) => {
    const values = parseStylesLine(line);
    if (values === null) return line;
    changed = true;
    return renderTagsLine(dedupTags(values, canonical));
  });

  if (!changed) return { content, changed: false };
  return { content: `---\n${newLines.join('\n')}${after}`, changed: true };
}

async function main() {
  const files = await walk(RECIPES_DIR);
  let touched = 0;
  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const { content, changed } = migrateFileContent(raw);
    if (changed) {
      await writeFile(file, content);
      touched += 1;
      console.log(`migrated ${path.relative(ROOT, file)}`);
    }
  }
  console.log(`\n${touched}/${files.length} recipe files migrated.`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
