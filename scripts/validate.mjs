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
import { parse as parseYaml } from 'yaml';

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

  try {
    const parsed = parseYaml(block);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// Extract H2 heading titles (text after `## `) from a body string. Returns an
// array of titles in source order; `### H3` and deeper levels are ignored.
export function extractH2Headings(body) {
  const out = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) out.push(m[1]);
  }
  return out;
}

// Trigger predicate for the House-Made soft rule. Returns true when the
// ingredient line names a craft preparation likely to need a `house_made`
// frontmatter field. Bare `simple syrup` and `maple syrup` are intentionally
// excluded — they are store-bought and would generate noise on day one.
export function mentionsHouseMadeWorthyPrep(line) {
  if (/\b(shrub|tincture|cordial|infusion)\b/i.test(line)) return true;
  if (/\b\w+-washed\b/i.test(line)) return true;
  if (/\bsyrup\b/i.test(line)) {
    if (/\b(simple|maple)\s+syrup\b/i.test(line)) return false;
    return true;
  }
  return false;
}

// Body-structure linter for published recipes. Returns { errors, warnings }
// with raw messages (no file path prefix; the caller adds that).
//
// Stage A inverted the contract: structured content (ingredients, steps,
// house_made, batch) lives in frontmatter; the body is for narrative prose
// (## Notes and any unrecognized H2 sections).
//
// Hard rules (errors) for recipes with frontmatter.publish === true:
//   - ## Ingredients / ## Steps / ## House-Made <…> / ## How to Batch It
//     headings in the body are migration leftovers (their content belongs
//     in frontmatter now)
//   - frontmatter.ingredients[] must be non-empty
//
// Soft rules (warnings):
//   - When an ingredients[] (or batch.ingredients[]) string mentions a
//     House-Made-worthy prep (per mentionsHouseMadeWorthyPrep), the
//     frontmatter.house_made field must exist.
//   - When frontmatter.format is `batch` or `punch`, the frontmatter.batch
//     field must exist.
//
// Inbox drafts and any frontmatter where publish !== true are skipped (no
// rules applied).
export function lintBody(body, frontmatter) {
  const errors = [];
  const warnings = [];

  if (frontmatter?.publish !== true) return { errors, warnings };

  const headings = extractH2Headings(body);

  if (headings.includes('Ingredients')) {
    errors.push('migration leftover: ## Ingredients heading in body — content belongs in frontmatter.ingredients[]');
  }
  if (headings.includes('Steps')) {
    errors.push('migration leftover: ## Steps heading in body — content belongs in frontmatter.steps[]');
  }
  if (headings.some((h) => /^House-Made\b/.test(h))) {
    errors.push('migration leftover: ## House-Made … heading in body — content belongs in frontmatter.house_made');
  }
  if (headings.includes('How to Batch It')) {
    errors.push('migration leftover: ## How to Batch It heading in body — content belongs in frontmatter.batch');
  }

  const ingredients = Array.isArray(frontmatter.ingredients) ? frontmatter.ingredients : [];
  if (ingredients.length === 0) {
    errors.push('frontmatter.ingredients[] is empty on a published recipe');
  }

  const batchIngredients = Array.isArray(frontmatter.batch?.ingredients)
    ? frontmatter.batch.ingredients
    : [];
  const triggersHouseMade =
    ingredients.some(mentionsHouseMadeWorthyPrep) ||
    batchIngredients.some(mentionsHouseMadeWorthyPrep);
  if (triggersHouseMade && !frontmatter.house_made) {
    warnings.push(
      'ingredient references a House-Made-worthy prep but no house_made field found',
    );
  }

  if (frontmatter.format === 'batch' || frontmatter.format === 'punch') {
    if (!frontmatter.batch) {
      warnings.push(
        'format is batch/punch but no batch field found',
      );
    }
  }

  return { errors, warnings };
}

const USAGE =
  'Usage: node scripts/validate.mjs [--files <path>...]';

// Parse argv into a settings object. With no args, returns whole-tree mode
// (files=[]). With `--files <path>...`, returns the list of paths supplied
// after the flag. The pre-commit hook (lint-staged) appends staged paths to
// the configured command, so --files is the natural seam.
export function parseArgs(argv) {
  let files = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--files') {
      if (files !== null) {
        throw new Error(`Duplicate --files flag. ${USAGE}`);
      }
      const collected = [];
      i++;
      while (i < argv.length && !argv[i].startsWith('--')) {
        collected.push(argv[i]);
        i++;
      }
      if (collected.length === 0) {
        throw new Error(`--files requires at least one path. ${USAGE}`);
      }
      files = collected;
      i--;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}. ${USAGE}`);
    }
  }

  return { files: files ?? [] };
}

// Narrow a list of absolute recipe paths to the subset named in opts.files.
// Empty opts.files returns the full list (whole-tree mode). Paths outside
// recipesDir are silently skipped — lint-staged will pass any staged .md it
// matched and we don't want pre-commit failing because a sibling change was
// staged alongside a recipe.
export function filterFiles(allFiles, opts) {
  const { files, rootDir, recipesDir } = opts;
  if (!files || files.length === 0) return allFiles;

  const wanted = new Set();
  for (const entry of files) {
    const abs = path.isAbsolute(entry) ? entry : path.resolve(rootDir, entry);
    if (!abs.startsWith(recipesDir + path.sep) && abs !== recipesDir) continue;
    wanted.add(abs);
  }

  return allFiles.filter((f) => wanted.has(f));
}

async function main() {
  const { files: filesArg } = parseArgs(process.argv.slice(2));
  const allFiles = await walk(RECIPES_DIR);
  const files = filterFiles(allFiles, {
    files: filesArg,
    rootDir: ROOT,
    recipesDir: RECIPES_DIR,
  });
  const slugs = new Map();
  const errors = [];
  const warnings = [];

  // Build the slug map from the *full* tree so cross-file checks (related[],
  // duplicate slugs, alias collisions) stay full-fidelity even in --files
  // mode. Only the emit loop is scoped to the staged subset.
  const slugMapAllFiles = await Promise.all(
    allFiles.map(async (file) => {
      const raw = await readFile(file, 'utf8');
      const fm = parseFrontmatter(raw);
      return { file, raw, fm };
    }),
  );
  for (const { file, fm } of slugMapAllFiles) {
    if (!fm) continue;
    const slug = path.basename(file, '.md');
    const rel = path.relative(ROOT, file);
    if (slugs.has(slug)) {
      // Only surface duplicate-slug errors when at least one side is in the
      // emit set. The full-tree CI run will always catch the rest.
      const otherRel = slugs.get(slug);
      const fileIsEmitted = files.includes(file);
      const otherIsEmitted = allFiles.some(
        (f) => path.relative(ROOT, f) === otherRel && files.includes(f),
      );
      if (fileIsEmitted || otherIsEmitted) {
        errors.push(`${rel}: duplicate slug "${slug}" (also in ${otherRel})`);
      }
    } else {
      slugs.set(slug, rel);
    }
  }

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const raw = await readFile(file, 'utf8');
    const fm = parseFrontmatter(raw);

    if (!fm) { errors.push(`${rel}: no/invalid frontmatter`); continue; }

    const dirName = path.basename(path.dirname(file));
    const expectedCategory = CATEGORY_BY_DIR[dirName];

    if (!fm.title) errors.push(`${rel}: missing title`);
    if (expectedCategory && fm.category !== expectedCategory) {
      errors.push(`${rel}: category="${fm.category}" but dir says "${expectedCategory}"`);
    }

    if (fm.publish !== true && fm.publish !== false) errors.push(`${rel}: publish must be true/false, got ${fm.publish}`);
    if (dirName === 'inbox' && fm.publish !== false) warnings.push(`${rel}: inbox recipe has publish: true`);
    if (dirName !== 'inbox' && fm.publish === false) warnings.push(`${rel}: non-inbox recipe has publish: false`);

    if (fm.publish === true) {
      const fenceEnd = raw.indexOf('\n---\n', 4);
      const body = fenceEnd === -1 ? '' : raw.slice(fenceEnd + 5);
      const { errors: be, warnings: bw } = lintBody(body, fm);
      for (const e of be) errors.push(`${rel}: ${e}`);
      for (const w of bw) warnings.push(`${rel}: ${w}`);
    }
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
