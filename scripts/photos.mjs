#!/usr/bin/env node
// Batch photo intake. Drop slug-named photos into intake/photos/:
//   <slug>.jpg              → hero_image
//   <slug>-ingredients.jpg  → gallery
// then run `npm run photos`. Each photo is auto-rotated, capped at 1600px on
// the long edge, re-encoded as JPEG (metadata stripped), written next to its
// recipe .md, and wired into frontmatter. Unknown slugs and unsupported files
// stay in intake/ and are reported. Never commits — ship via the normal PR flow.

import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATEGORY_BY_DIR, parseFrontmatter } from './validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACCEPTED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INGREDIENTS_SUFFIX = '-ingredients';
const MAX_EDGE = 1600;

export function parsePhotoName(name) {
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new Error('unsafe filename');
  }
  const dot = name.lastIndexOf('.');
  const ext = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
  if (ext === 'heic' || ext === 'heif') {
    throw new Error('HEIC is not supported — export the photo as JPEG first');
  }
  if (!ACCEPTED_EXTS.has(ext)) {
    throw new Error(`unsupported file type ".${ext}" (use jpg, png, or webp)`);
  }
  let slug = name.slice(0, dot);
  let role = 'hero';
  if (slug.endsWith(INGREDIENTS_SUFFIX)) {
    slug = slug.slice(0, -INGREDIENTS_SUFFIX.length);
    role = 'ingredients';
  }
  if (!SLUG_RE.test(slug)) {
    throw new Error(`"${slug}" is not a recipe slug (lowercase-hyphenated)`);
  }
  return { slug, role };
}

const unquote = (s) => s.trim().replace(/^["']|["']$/g, '');

// Line-based edit (like promote.mjs) so the rest of the frontmatter keeps its
// exact formatting.
export function setPhotoFrontmatter(content, { role, file }) {
  if (!content.startsWith('---\n')) throw new Error('No frontmatter block found.');
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) throw new Error('No frontmatter block found (missing closing `---`).');

  const lines = content.slice(4, end).split('\n');
  const key = role === 'hero' ? 'hero_image' : 'gallery';
  const idx = lines.findIndex((l) => l.startsWith(`${key}:`));

  let value = file;
  if (role === 'ingredients') {
    let items = [];
    if (idx !== -1) {
      const m = lines[idx].match(/^gallery:\s*\[(.*)\]\s*$/);
      if (!m) throw new Error('gallery is not a flow list like `gallery: [...]` — hand-edit it.');
      items = m[1].split(',').map(unquote).filter(Boolean);
    }
    value = `[${[...items.filter((i) => i !== file), file].join(', ')}]`;
  }

  const line = `${key}: ${value}`;
  if (idx === -1) lines.push(line);
  else lines[idx] = line;
  return `---\n${lines.join('\n')}${content.slice(end)}`;
}

async function listDir(readdirFn, dir) {
  try {
    return await readdirFn(dir);
  } catch (e) {
    if (e?.code === 'ENOENT') return [];
    throw e;
  }
}

export async function ingestPhotos({
  rootDir = ROOT,
  readdir: readdirFn,
  readFile: readFileFn,
  writeFile: writeFileFn,
  unlink: unlinkFn,
  resize,
}) {
  const intakeDir = path.join(rootDir, 'intake', 'photos');

  // Published recipes only: `npm run promote` moves just the .md, so photos
  // wired to an inbox draft would be left behind and break the build.
  const recipeBySlug = new Map();
  const inboxSlugs = new Set();
  for (const dir of Object.keys(CATEGORY_BY_DIR)) {
    for (const name of await listDir(readdirFn, path.join(rootDir, 'recipes', dir))) {
      if (!name.endsWith('.md') || name.startsWith('_')) continue;
      const slug = name.slice(0, -3);
      if (dir === 'inbox') inboxSlugs.add(slug);
      else recipeBySlug.set(slug, path.join(rootDir, 'recipes', dir, name));
    }
  }

  // Validate the whole batch before touching anything.
  const moved = [];
  const rejected = [];
  let candidates = [];
  for (const file of (await listDir(readdirFn, intakeDir)).sort()) {
    if (file.startsWith('.')) continue; // .DS_Store etc.
    try {
      const { slug, role } = parsePhotoName(file);
      if (inboxSlugs.has(slug)) throw new Error(`"${slug}" is an inbox draft — promote it first`);
      const recipePath = recipeBySlug.get(slug);
      if (!recipePath) throw new Error(`no recipe with slug "${slug}"`);
      candidates.push({ file, role, slug, recipePath });
    } catch (e) {
      rejected.push({ file, reason: e.message });
    }
  }

  // Two files for the same slug+role (e.g. .jpg and .png) would both write the
  // same output and both be deleted — reject the pair instead of guessing.
  const key = (c) => `${c.slug}:${c.role}`;
  const counts = new Map();
  for (const c of candidates) counts.set(key(c), (counts.get(key(c)) ?? 0) + 1);
  for (const c of candidates.filter((c) => counts.get(key(c)) > 1)) {
    rejected.push({ file: c.file, reason: `multiple files for ${c.slug} ${c.role} — keep one` });
  }
  candidates = candidates.filter((c) => counts.get(key(c)) === 1);

  // The page hides the gallery without a hero and shows at most two gallery
  // photos, so refuse ingredients shots that would never render.
  const heroInBatch = new Set(candidates.filter((c) => c.role === 'hero').map((c) => c.slug));
  const valid = [];
  for (const c of candidates) {
    if (c.role === 'ingredients') {
      const fm = parseFrontmatter(await readFileFn(c.recipePath, 'utf8'));
      const ownFile = `./${c.slug}${INGREDIENTS_SUFFIX}.jpg`;
      const others = (fm.gallery ?? []).filter((g) => g !== ownFile);
      if (!fm.hero_image && !heroInBatch.has(c.slug)) {
        rejected.push({ file: c.file, reason: 'recipe has no hero photo — add <slug>.jpg first' });
        continue;
      }
      if (others.length >= 2) {
        rejected.push({ file: c.file, reason: 'gallery is full (two photos) — hand-edit it' });
        continue;
      }
    }
    valid.push(c);
  }

  for (const { file, role, slug, recipePath } of valid) {
    const outName = `${slug}${role === 'ingredients' ? INGREDIENTS_SUFFIX : ''}.jpg`;
    const src = path.join(intakeDir, file);
    const dst = path.join(path.dirname(recipePath), outName);
    try {
      const updated = setPhotoFrontmatter(await readFileFn(recipePath, 'utf8'), {
        role,
        file: `./${outName}`,
      });
      await resize(src, dst);
      await writeFileFn(recipePath, updated);
      await unlinkFn(src);
      moved.push({ file, to: path.relative(rootDir, dst) });
    } catch (e) {
      rejected.push({ file, reason: e.message });
    }
  }

  return { moved, rejected, ok: rejected.length === 0 };
}

async function sharpResize(src, dst) {
  const sharp = (await import('sharp')).default;
  await sharp(src)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(dst);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = await ingestPhotos({ readdir, readFile, writeFile, unlink, resize: sharpResize });
  for (const { file, to } of result.moved) console.log(`✓ ${file} → ${to}`);
  for (const { file, reason } of result.rejected) console.error(`✗ ${file}: ${reason}`);
  if (result.moved.length === 0 && result.rejected.length === 0) {
    console.log('No photos in intake/photos/.');
  }
  process.exitCode = result.ok ? 0 : 1;
}
