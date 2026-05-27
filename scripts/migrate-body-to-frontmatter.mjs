#!/usr/bin/env node
// One-time bulk migration of recipe body sections into structured frontmatter.
// Walks recipes/**/*.md, parses the known H2 sections (## Ingredients, ## Steps,
// ## House-Made <Name>, ## How to Batch It), and lifts them into typed YAML
// fields (`ingredients[]`, `steps[]`, `house_made{}`, `batch{}`, plus top-level
// `garnish` and `float` for the existing **Garnish:**/**Float:** bold-callout
// pattern and inline garnish list items). ## Notes and any unrecognized H2
// remain in the body verbatim.
//
// Idempotent: re-runs on already-migrated files are no-ops. --dry-run reports
// the per-file plan without touching disk. Per-file atomic rollback: if the
// post-write `lintBody` reports errors, the original content is restored
// before moving on to the next file.
//
// The `lintBody` dependency is injected (rather than imported directly) so the
// rollback gate exercises whichever validator contract is active at runtime —
// pre-flip in tests, post-flip in production once the U7 linter inversion
// lands. See docs/plans/2026-05-26-002-feat-component-primitives-stage-a-plan.md
// (U5 / U6 / U7).
//
//   node scripts/migrate-body-to-frontmatter.mjs [--dry-run]

import { readFile as fsReadFile, writeFile as fsWriteFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { lintBody as realLintBody } from './validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECIPES_DIR = path.join(ROOT, 'recipes');

// ──────────────────────────────────────────────────────────────────────────────
// Body parsing helpers.
// ──────────────────────────────────────────────────────────────────────────────

// Split a body string into sections keyed by H2 heading text. Lines outside any
// H2 (e.g. preamble before the first heading, or content between the
// frontmatter and the first heading) attach to the special key `__preamble__`.
// Heading line itself is consumed; section value is the lines beneath it up to
// the next H2 or EOF (with `---` horizontal-rule lines and surrounding blank
// lines included verbatim).
export function splitBodyByH2(body) {
  const lines = body.split('\n');
  const sections = [];
  let preamble = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[1], lines: [] };
      continue;
    }
    if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) sections.push(current);
  return { preamble, sections };
}

// True when a line is a markdown horizontal rule (e.g. `---`). Recipe bodies
// sprinkle these between sections; we drop them when emitting section content.
function isHorizontalRule(line) {
  return /^\s*-{3,}\s*$/.test(line);
}

// True when a string is empty or only whitespace.
function isBlank(line) {
  return /^\s*$/.test(line);
}

// Strip trailing blank/HR lines from a section's lines array.
function trimSection(lines) {
  const out = [...lines];
  while (out.length && (isBlank(out[out.length - 1]) || isHorizontalRule(out[out.length - 1]))) {
    out.pop();
  }
  while (out.length && (isBlank(out[0]) || isHorizontalRule(out[0]))) {
    out.shift();
  }
  return out;
}

// True when a list item line is a bulleted list item (`- ...`).
function isBulletItem(line) {
  return /^\s*-\s+\S/.test(line) && !isHorizontalRule(line);
}

// True when a list item line is a numbered list item (`1. ...`).
function isNumberedItem(line) {
  return /^\s*\d+\.\s+\S/.test(line);
}

// Extract the visible content of a bullet item (text after `- `).
function bulletText(line) {
  return line.replace(/^\s*-\s+/, '').replace(/\s+$/, '');
}

// Extract the visible content of a numbered item (text after `<n>. `).
function numberedText(line) {
  return line.replace(/^\s*\d+\.\s+/, '').replace(/\s+$/, '');
}

// Detect an italic single-line yield paragraph (e.g. `*Makes 8 servings:*`).
// Returns the inner text (without leading/trailing `*`) when matched, else null.
export function parseYieldLine(line) {
  const m = line.match(/^\*(.+)\*\s*$/);
  if (!m) return null;
  return m[1].trim();
}

// Detect a `**Garnish:** X` or `**Float:** X` bold callout. Returns
// `{ kind: 'garnish'|'float', value: string }` or null.
export function parseCallout(line) {
  const m = line.match(/^\*\*(Garnish|Float):\*\*\s*(.+?)\s*$/);
  if (!m) return null;
  return { kind: m[1].toLowerCase(), value: m[2] };
}

// Classify a bullet item under `## Ingredients` as either a measured
// ingredient or a garnish-style line. Heuristic (order matters):
//   1. Explicit `, for garnish` / `(for garnish)` suffix → garnish.
//   2. Line lacks a leading numeric quantity AND contains a garnish-y noun
//      (rim, peel, wedge, twist, wheel, sprig) → garnish. This handles
//      `Salt rim`, `Lime wedge`, `Mint sprig`, `Tajin or salt rim`.
//   3. Everything else (including `1 egg white`, `6 fresh mint leaves`,
//      `Pinch of salt`, `3 cinnamon sticks`) is a regular ingredient.
//
// The "leading numeric quantity" gate uses a permissive regex that catches
// digits, vulgar fractions (½, ⅓, ¾, ⅔, …), and the unit-less but counted
// shapes like `Pinch of salt` (handled by the third rule — Pinch is neither
// numeric-led nor a garnish noun).
export function classifyIngredientLine(text) {
  if (/,\s*for\s+garnish\b/i.test(text)) return 'garnish';
  if (/\(\s*for\s+garnish\s*\)/i.test(text)) return 'garnish';

  const garnishNounRe = /\b(rim|peel|wedge|twist|wheel|sprig)\b/i;
  if (!garnishNounRe.test(text)) return 'ingredient';

  // Line has a garnish noun; treat as garnish unless it leads with a numeric
  // quantity (digits or vulgar fraction).
  const numericLeadRe = /^[\d¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/;
  if (numericLeadRe.test(text.trim())) return 'ingredient';

  return 'garnish';
}

// Parse the lines under `## Ingredients`. Returns
// `{ ingredients[], garnish?, float? }`. Garnish/float are extracted from
// **Garnish:**/**Float:** callouts AND from inline garnish list items; the
// final `garnish` is a comma-separated join when there are multiple sources.
export function parseIngredientsSection(rawLines) {
  const lines = trimSection(rawLines);
  const ingredients = [];
  const garnishParts = [];
  let float;

  for (const line of lines) {
    if (isBlank(line) || isHorizontalRule(line)) continue;
    const callout = parseCallout(line);
    if (callout) {
      if (callout.kind === 'garnish') garnishParts.push(callout.value);
      else float = callout.value;
      continue;
    }
    if (isBulletItem(line)) {
      const text = bulletText(line);
      if (classifyIngredientLine(text) === 'garnish') {
        garnishParts.push(text);
      } else {
        ingredients.push(text);
      }
      continue;
    }
    // Non-list, non-callout prose under ## Ingredients is rare; ignore it
    // rather than guessing.
  }

  const result = { ingredients };
  if (garnishParts.length) result.garnish = garnishParts.join(', ');
  if (float) result.float = float;
  return result;
}

// Parse the lines under `## Steps`. Returns the numbered-list items as a
// string array, preserving each item's text verbatim.
export function parseStepsSection(rawLines) {
  const lines = trimSection(rawLines);
  const steps = [];
  for (const line of lines) {
    if (isNumberedItem(line)) {
      steps.push(numberedText(line));
    }
  }
  return steps;
}

// Parse the lines under `## House-Made <Name>`. The discriminator rule
// (per plan U5 step 6) is: if the first list under the section is bulleted,
// it is `ingredients`; if it is numbered, it is `steps` (and `ingredients`
// stays undefined). When no list at all follows, the trailing prose paragraph
// becomes a single-element `steps` array.
export function parseHouseMadeSection(name, rawLines) {
  const lines = trimSection(rawLines);
  const result = { name };

  let i = 0;
  // Skip leading blanks / HRs.
  while (i < lines.length && (isBlank(lines[i]) || isHorizontalRule(lines[i]))) i++;

  // Optional italic yield paragraph as the first non-blank line.
  if (i < lines.length) {
    const yieldText = parseYieldLine(lines[i].trim());
    if (yieldText !== null) {
      result.yield = yieldText;
      i++;
    }
  }

  // Walk forward, collecting list items per the discriminator rule.
  let firstListKind = null; // 'bullet' | 'numbered' | null
  const bullets = [];
  const numbers = [];
  const trailingProse = [];

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line) || isHorizontalRule(line)) {
      i++;
      continue;
    }
    if (isBulletItem(line)) {
      if (firstListKind === null) firstListKind = 'bullet';
      if (firstListKind === 'bullet') {
        bullets.push(bulletText(line));
      } else {
        // A bullet after numbered list opened — unusual; tack onto trailing prose.
        trailingProse.push(line);
      }
      i++;
      continue;
    }
    if (isNumberedItem(line)) {
      // The first numbered list belongs to `steps`. If `firstListKind` is
      // still null, set it to 'numbered' (ingredients undefined). If
      // `firstListKind` is 'bullet', this is the standard penicillin pattern
      // (bulleted ingredients followed by numbered steps).
      if (firstListKind === null) firstListKind = 'numbered';
      numbers.push(numberedText(line));
      i++;
      continue;
    }
    // Non-list line (prose paragraph). Collect for the
    // prose-paragraph-as-steps fallback (spice-trade shape) and as overflow
    // when both lists have been seen.
    trailingProse.push(line);
    i++;
  }

  if (firstListKind === 'bullet') {
    result.ingredients = bullets;
  }

  if (numbers.length > 0) {
    result.steps = numbers;
  } else if (trailingProse.length > 0) {
    // Group prose into single paragraph(s); the convention is a single
    // procedural paragraph. Preserve line content verbatim but trim blank
    // lines and bookend whitespace per paragraph.
    const paragraphs = groupProseParagraphs(trailingProse);
    if (paragraphs.length > 0) {
      result.steps = paragraphs;
    } else {
      result.steps = [];
    }
  } else {
    result.steps = [];
  }

  return result;
}

// Parse the lines under `## How to Batch It`. Returns
// `{ yield?, ingredients?, instructions? }`. The yield line is the italic
// first paragraph; the optional bulleted list (if any) is `ingredients`;
// remaining prose paragraphs are concatenated (blank-line separated) into the
// `instructions` string. When no prose follows the ingredient list,
// `instructions` is undefined (NOT empty string).
export function parseBatchSection(rawLines) {
  const lines = trimSection(rawLines);
  const result = {};

  let i = 0;
  while (i < lines.length && (isBlank(lines[i]) || isHorizontalRule(lines[i]))) i++;

  if (i < lines.length) {
    const yieldText = parseYieldLine(lines[i].trim());
    if (yieldText !== null) {
      result.yield = yieldText;
      i++;
    }
  }

  const bullets = [];
  // Collect a contiguous bulleted ingredient list (the first list after
  // the yield line), separated only by blank lines.
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line) || isHorizontalRule(line)) {
      i++;
      continue;
    }
    if (isBulletItem(line)) {
      bullets.push(bulletText(line));
      i++;
      continue;
    }
    break;
  }
  if (bullets.length > 0) result.ingredients = bullets;

  // Remaining lines from i onward become the instructions block. Trim
  // surrounding blank/HR lines but preserve internal blank-line paragraph
  // separation verbatim.
  const tail = trimSection(lines.slice(i));
  if (tail.length > 0) {
    const paragraphs = groupProseParagraphs(tail);
    if (paragraphs.length > 0) {
      result.instructions = paragraphs.join('\n\n');
    }
  }

  return result;
}

// Group a list of body lines into paragraphs, splitting on blank lines.
// Drops HR-only lines and lines that are entirely whitespace.
function groupProseParagraphs(lines) {
  const paragraphs = [];
  let current = [];
  for (const line of lines) {
    if (isBlank(line)) {
      if (current.length) {
        paragraphs.push(current.join('\n').trim());
        current = [];
      }
      continue;
    }
    if (isHorizontalRule(line)) continue;
    current.push(line);
  }
  if (current.length) paragraphs.push(current.join('\n').trim());
  return paragraphs.filter((p) => p.length > 0);
}

// ──────────────────────────────────────────────────────────────────────────────
// migrateContent — the pure-string transformation.
// ──────────────────────────────────────────────────────────────────────────────

// Pure transformation: takes a recipe file's full text, returns
// `{ changed, content, parsed }`. `changed === false` when the file is already
// migrated (idempotency short-circuit) or when there is no structured H2 to
// extract. Throws on malformed frontmatter.
export function migrateContent(raw) {
  if (!raw.startsWith('---\n')) {
    throw new Error('No frontmatter block found (missing leading `---`).');
  }
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) {
    throw new Error('No frontmatter block found (missing closing `---`).');
  }
  const fmBlock = raw.slice(4, end);
  const body = raw.slice(end + 5);

  let fm;
  try {
    const parsed = parseYaml(fmBlock);
    if (parsed === null || typeof parsed !== 'object') {
      throw new Error('Empty frontmatter');
    }
    fm = parsed;
  } catch (e) {
    throw new Error(`Malformed YAML frontmatter: ${e?.message ?? e}`);
  }

  // Idempotency check: if any structured body field is already populated with
  // content, treat the file as already migrated.
  if (isAlreadyMigrated(fm)) {
    return { changed: false, content: raw, parsed: fm };
  }

  const { preamble, sections } = splitBodyByH2(body);

  let ingredientsParsed = null;
  let stepsParsed = null;
  let houseMadeParsed = null;
  let batchParsed = null;
  const residualSections = [];

  for (const section of sections) {
    const { heading, lines } = section;
    if (heading === 'Ingredients') {
      ingredientsParsed = parseIngredientsSection(lines);
      continue;
    }
    if (heading === 'Steps') {
      stepsParsed = parseStepsSection(lines);
      continue;
    }
    const hmMatch = heading.match(/^House-Made\s+(.+?)\s*$/);
    if (hmMatch) {
      houseMadeParsed = parseHouseMadeSection(hmMatch[1], lines);
      continue;
    }
    if (heading === 'How to Batch It') {
      batchParsed = parseBatchSection(lines);
      continue;
    }
    // Unrecognized H2 — keep in residual body verbatim.
    residualSections.push(section);
  }

  // No structured H2 found at all → nothing to migrate.
  if (
    ingredientsParsed === null &&
    stepsParsed === null &&
    houseMadeParsed === null &&
    batchParsed === null
  ) {
    return { changed: false, content: raw, parsed: fm };
  }

  // Compose the new frontmatter object. Preserve existing keys; merge in
  // the new structured fields.
  const newFm = { ...fm };
  if (ingredientsParsed) {
    if (ingredientsParsed.ingredients.length > 0) {
      newFm.ingredients = ingredientsParsed.ingredients;
    }
    if (ingredientsParsed.garnish !== undefined) {
      newFm.garnish = ingredientsParsed.garnish;
    }
    if (ingredientsParsed.float !== undefined) {
      newFm.float = ingredientsParsed.float;
    }
  }
  if (stepsParsed && stepsParsed.length > 0) {
    newFm.steps = stepsParsed;
  }
  if (houseMadeParsed) {
    newFm.house_made = houseMadeParsed;
  }
  if (batchParsed && (batchParsed.yield !== undefined || batchParsed.ingredients || batchParsed.instructions !== undefined)) {
    newFm.batch = batchParsed;
  }

  const residualBody = composeResidualBody(preamble, residualSections);

  // Emit frontmatter via yaml.stringify, then the body.
  const fmStr = stringifyYaml(newFm, {
    // Use literal block scalars for multi-line strings (preserves the
    // batch.instructions paragraph breaks). yaml@2 picks an appropriate
    // scalar style by default; the option here keeps multi-line preservation
    // honest across versions.
    blockQuote: 'literal',
    lineWidth: 0, // do not auto-fold long lines
  });
  const newContent = `---\n${fmStr}---\n${residualBody}`;

  return { changed: true, content: newContent, parsed: newFm };
}

function isAlreadyMigrated(fm) {
  if (Array.isArray(fm.ingredients) && fm.ingredients.length > 0) return true;
  if (Array.isArray(fm.steps) && fm.steps.length > 0) return true;
  if (fm.house_made && typeof fm.house_made === 'object') return true;
  if (fm.batch && typeof fm.batch === 'object') return true;
  return false;
}

// Stitch the preamble (anything between the closing `---\n` and the first
// recognised H2 or the start of any unmigrated content) back together with
// the residual sections (## Notes, ## Variations, …) for the final body.
function composeResidualBody(preamble, residualSections) {
  const parts = [];
  const trimmedPreamble = trimTrailing(preamble);
  if (trimmedPreamble.length > 0) {
    parts.push(trimmedPreamble.join('\n'));
  }
  for (const section of residualSections) {
    const trimmed = trimSection(section.lines);
    const sectionText = [`## ${section.heading}`, '', ...trimmed].join('\n');
    parts.push(sectionText);
  }
  if (parts.length === 0) return '';
  return `\n${parts.join('\n\n')}\n`;
}

function trimTrailing(lines) {
  const out = [...lines];
  while (out.length && isBlank(out[out.length - 1])) out.pop();
  while (out.length && isBlank(out[0])) out.shift();
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// migrate — top-level orchestrator with DI.
// ──────────────────────────────────────────────────────────────────────────────

// Default file walker — used when no `glob` is injected. Walks the recipes
// directory and returns every `.md` path (recursive). Excludes `_`-prefixed
// drafts to match the content-collection glob.
async function defaultGlob() {
  return walk(RECIPES_DIR);
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (e.name.startsWith('_')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

export async function migrate({ pattern = null, dryRun = false, deps } = {}) {
  if (!deps || !deps.readFile || !deps.writeFile || !deps.glob || !deps.lintBody) {
    throw new Error(
      'migrate: deps with { readFile, writeFile, glob, lintBody } is required',
    );
  }

  const { readFile, writeFile, glob, lintBody } = deps;

  const files = await glob(pattern);

  const result = { migrated: [], skipped: [], errors: [] };

  for (const filePath of files) {
    let original;
    try {
      original = await readFile(filePath, 'utf8');
    } catch (e) {
      result.errors.push({
        path: filePath,
        message: `Failed to read: ${e?.message ?? e}`,
        rolledBack: false,
      });
      continue;
    }

    let outcome;
    try {
      outcome = migrateContent(original);
    } catch (e) {
      result.errors.push({
        path: filePath,
        message: `Malformed frontmatter: ${e?.message ?? e}`,
        rolledBack: false,
      });
      continue;
    }

    if (!outcome.changed) {
      result.skipped.push({ path: filePath, reason: 'already-migrated' });
      continue;
    }

    if (dryRun) {
      result.migrated.push({
        path: filePath,
        dryRun: true,
        plan: summarisePlan(outcome.parsed),
      });
      continue;
    }

    try {
      await writeFile(filePath, outcome.content);
    } catch (e) {
      result.errors.push({
        path: filePath,
        message: `Write failed: ${e?.message ?? e}`,
        rolledBack: false,
      });
      continue;
    }

    // Post-write lint gate. Extract the new body for the linter.
    const newEnd = outcome.content.indexOf('\n---\n', 4);
    const newBody = newEnd === -1 ? '' : outcome.content.slice(newEnd + 5);
    const { errors: lintErrors, warnings: _w } = lintBody(newBody, outcome.parsed);
    if (lintErrors.length > 0) {
      // Roll back.
      let rolledBack = true;
      let restoreErr = null;
      try {
        await writeFile(filePath, original);
      } catch (e) {
        rolledBack = false;
        restoreErr = e;
      }
      if (!rolledBack) {
        result.errors.push({
          path: filePath,
          message: `Lint failed AND rollback failed. Lint: ${lintErrors.join('; ')}. Rollback: ${restoreErr?.message ?? restoreErr}`,
          rolledBack: false,
        });
      } else {
        result.errors.push({
          path: filePath,
          message: `Post-write lint validation failed; rolled back. Lint: ${lintErrors.join('; ')}`,
          rolledBack: true,
        });
      }
      continue;
    }

    result.migrated.push({ path: filePath, dryRun: false });
  }

  return result;
}

function summarisePlan(fm) {
  return {
    ingredients: Array.isArray(fm.ingredients) ? fm.ingredients.length : 0,
    steps: Array.isArray(fm.steps) ? fm.steps.length : 0,
    house_made: Boolean(fm.house_made),
    batch: Boolean(fm.batch),
    garnish: Boolean(fm.garnish),
    float: Boolean(fm.float),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// CLI.
// ──────────────────────────────────────────────────────────────────────────────

const USAGE = 'Usage: node scripts/migrate-body-to-frontmatter.mjs [--dry-run]';

export function parseArgs(argv) {
  let dryRun = false;
  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}. ${USAGE}`);
    }
    throw new Error(`Unexpected positional argument: ${arg}. ${USAGE}`);
  }
  return { dryRun };
}

function formatTable(result) {
  const rows = [];
  for (const m of result.migrated) {
    const rel = path.relative(ROOT, m.path);
    if (m.dryRun) {
      const p = m.plan;
      rows.push(
        `  [dry-run] ${rel}: ingredients=${p.ingredients} steps=${p.steps} ` +
          `house_made=${p.house_made} batch=${p.batch} garnish=${p.garnish} float=${p.float}`,
      );
    } else {
      rows.push(`  [migrated] ${rel}`);
    }
  }
  for (const s of result.skipped) {
    rows.push(`  [skipped] ${path.relative(ROOT, s.path)} (${s.reason})`);
  }
  for (const e of result.errors) {
    rows.push(`  [error] ${path.relative(ROOT, e.path)}: ${e.message}`);
  }
  return rows.join('\n');
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    const { dryRun } = parseArgs(process.argv.slice(2));
    const result = await migrate({
      dryRun,
      deps: {
        readFile: fsReadFile,
        writeFile: fsWriteFile,
        glob: defaultGlob,
        lintBody: realLintBody,
      },
    });
    process.stdout.write(`${formatTable(result)}\n\n`);
    process.stdout.write(
      `Summary: ${result.migrated.length} migrated, ${result.skipped.length} skipped, ${result.errors.length} errors.\n`,
    );
    if (result.errors.length > 0) process.exit(1);
  })().catch((e) => {
    process.stderr.write(`${e?.message ?? e}\n`);
    process.exit(1);
  });
}
