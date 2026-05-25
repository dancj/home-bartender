#!/usr/bin/env node
// One-shot promotion of an inbox recipe draft to a published category dir.
// Rewrites frontmatter (category → singular, publish → true), git mv's the
// file into the matching category directory, and re-runs `npm run validate`.
// Rolls back atomically on validation failure.
//
// Subprocess discipline: all `git` and `npm` calls go through execFile with
// explicit argv arrays. Never shell-string. Slug and category values are argv
// inputs that travel into subprocess positions; argv-array invocation
// guarantees no shell tokenisation.
//
//   node scripts/promote.mjs <slug> --category=<classic|original|seasonal> [--dry-run]

import { execFile as execFileCb } from 'node:child_process';
import { readFile as fsReadFile, writeFile as fsWriteFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { CATEGORY_BY_DIR, lintBody, parseFrontmatter } from './validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFile = promisify(execFileCb);

async function realExec(cmd, args) {
  return execFile(cmd, args, { env: process.env, maxBuffer: 10 * 1024 * 1024 });
}

const VALID_CATEGORIES = Object.values(CATEGORY_BY_DIR).filter((c) => c !== 'inbox');
const DIR_BY_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_BY_DIR).map(([dir, cat]) => [cat, dir]),
);

export function assertValidCategory(category) {
  if (typeof category !== 'string' || category === '') {
    throw new Error(
      `Invalid --category: expected one of ${VALID_CATEGORIES.join('|')}, got ${JSON.stringify(category)}`,
    );
  }
  if (category === 'inbox') {
    throw new Error(`Cannot promote to category "inbox" — that is the source state.`);
  }
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(
      `Invalid --category: expected one of ${VALID_CATEGORIES.join('|')}, got "${category}"`,
    );
  }
}

export function dirForCategory(category) {
  assertValidCategory(category);
  const dir = DIR_BY_CATEGORY[category];
  if (!dir) {
    throw new Error(`No directory mapping for category "${category}"`);
  }
  return dir;
}

export function rewritePromotionFrontmatter(content, { category }) {
  assertValidCategory(category);

  if (!content.startsWith('---\n')) {
    throw new Error('No frontmatter block found (missing leading `---`).');
  }
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    throw new Error('No frontmatter block found (missing closing `---`).');
  }

  const fmBlock = content.slice(4, end);
  const after = content.slice(end);
  const lines = fmBlock.split('\n');

  let foundCategory = false;
  let foundPublish = false;
  const newLines = lines.map((line) => {
    if (/^category:\s*inbox\s*$/.test(line)) {
      foundCategory = true;
      return `category: ${category}`;
    }
    if (/^publish:\s*false\s*$/.test(line)) {
      foundPublish = true;
      return 'publish: true';
    }
    return line;
  });

  if (!foundCategory) {
    throw new Error(
      'Frontmatter does not contain `category: inbox`. ' +
        'Is this file already promoted, or hand-edited away from the inbox shape?',
    );
  }
  if (!foundPublish) {
    throw new Error(
      'Frontmatter does not contain `publish: false`. ' +
        'Is this file already promoted, or hand-edited away from the inbox shape?',
    );
  }

  return `---\n${newLines.join('\n')}${after}`;
}

function assertValidSlug(slug) {
  if (typeof slug !== 'string' || slug === '') {
    throw new Error(`Invalid slug: expected a non-empty string, got ${JSON.stringify(slug)}`);
  }
  if (slug.includes('/') || slug.includes('\\') || slug.includes('..')) {
    throw new Error(`Invalid slug: must not contain path separators, got "${slug}"`);
  }
}

export async function promote({
  slug,
  category,
  dryRun = false,
  exec,
  readFile,
  writeFile,
  rootDir = ROOT,
} = {}) {
  if (!exec || !readFile || !writeFile) {
    throw new Error('promote: exec, readFile, writeFile are required');
  }

  assertValidSlug(slug);
  assertValidCategory(category);

  const dirName = dirForCategory(category);
  const srcPath = path.join(rootDir, 'recipes', 'inbox', `${slug}.md`);
  const dstPath = path.join(rootDir, 'recipes', dirName, `${slug}.md`);

  let original;
  try {
    original = await readFile(srcPath, 'utf8');
  } catch (e) {
    if (e?.code === 'ENOENT') {
      throw new Error(`Inbox file not found: ${srcPath}`);
    }
    throw e;
  }

  const newContent = rewritePromotionFrontmatter(original, { category });

  let dstExists = true;
  try {
    await readFile(dstPath, 'utf8');
  } catch (e) {
    if (e?.code === 'ENOENT') {
      dstExists = false;
    } else {
      throw e;
    }
  }
  if (dstExists) {
    throw new Error(`Slug collision: ${dstPath} already exists. Cannot promote.`);
  }

  // Pre-flight body lint against the post-promotion frontmatter. Operates on
  // the already-in-memory newContent string — no DI readFile call. Runs after
  // the collision check (cheaper failure mode wins) and before the dryRun
  // early-return so that --dry-run also surfaces body errors.
  const fenceEnd = newContent.indexOf('\n---\n', 4);
  const newBody = fenceEnd === -1 ? '' : newContent.slice(fenceEnd + 5);
  const synthesizedFm = { ...parseFrontmatter(original), category, publish: true };
  const { errors: bodyErrors, warnings: bodyWarnings } = lintBody(newBody, synthesizedFm);
  if (bodyErrors.length > 0) {
    throw new Error(
      `Body validation failed for ${slug}; cannot promote. ${bodyErrors.join('; ')}`,
    );
  }
  for (const w of bodyWarnings) {
    console.warn(`WARN: ${slug}: ${w}`);
  }

  if (dryRun) {
    const relSrc = path.relative(rootDir, srcPath);
    const relDst = path.relative(rootDir, dstPath);
    console.log(`would promote: ${relSrc} → ${relDst}`);
    return { srcPath, dstPath, changed: false, dryRun: true };
  }

  await writeFile(srcPath, newContent);
  await exec('git', ['mv', srcPath, dstPath]);

  try {
    await exec('npm', ['run', 'validate']);
  } catch (validateError) {
    let rollbackError = null;
    try {
      await exec('git', ['mv', dstPath, srcPath]);
      await writeFile(srcPath, original);
    } catch (rbErr) {
      rollbackError = rbErr;
    }

    const validateMsg = validateError?.stderr || validateError?.message || String(validateError);
    if (rollbackError) {
      const rbMsg = rollbackError?.message || String(rollbackError);
      throw new Error(
        `Validation failed AND rollback failed. ` +
          `Validation: ${validateMsg}. Rollback: ${rbMsg}. ` +
          `Working tree may be in a partial state — inspect manually.`,
      );
    }
    throw new Error(`Validation failed; rolled back successfully. Validator output: ${validateMsg}`);
  }

  const relSrc = path.relative(rootDir, srcPath);
  const relDst = path.relative(rootDir, dstPath);
  console.log(`promoted: ${relSrc} → ${relDst}`);
  return { srcPath, dstPath, changed: true };
}

const USAGE =
  'Usage: npm run promote -- <slug> --category=<classic|original|seasonal> [--dry-run]';

export function parseArgs(argv) {
  let slug = null;
  let category = null;
  let dryRun = false;
  let categorySeen = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--category=')) {
      if (categorySeen) {
        throw new Error(`Duplicate --category= flag. ${USAGE}`);
      }
      categorySeen = true;
      category = arg.slice('--category='.length);
      if (category === '') {
        throw new Error(`Empty value for --category=. ${USAGE}`);
      }
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}. ${USAGE}`);
    }
    if (slug !== null) {
      throw new Error(`Expected one positional slug, got multiple. ${USAGE}`);
    }
    slug = arg;
  }

  if (slug === null) {
    throw new Error(`Missing slug. ${USAGE}`);
  }
  if (!categorySeen) {
    throw new Error(`Missing --category=<classic|original|seasonal>. ${USAGE}`);
  }

  return { slug, category, dryRun };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    const args = parseArgs(process.argv.slice(2));
    await promote({
      ...args,
      exec: realExec,
      readFile: fsReadFile,
      writeFile: fsWriteFile,
    });
  })().catch((e) => {
    process.stderr.write(`${e?.message ?? e}\n`);
    process.exit(1);
  });
}
