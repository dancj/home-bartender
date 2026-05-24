#!/usr/bin/env node
// Reads data/taxonomy.yaml (the canonical source) and (later) emits:
//   - src/taxonomy.generated.ts        (Zod schema source)
//   - scripts/taxonomy.generated.mjs   (validator source)
//   - the marker-bounded "Canonical Taxonomy" region of TEMPLATE.md
//
// Edit data/taxonomy.yaml, then run `npm run codegen` to regenerate the
// artifacts above. CI verifies they stay in sync.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadTaxonomy(relPath = 'data/taxonomy.yaml') {
  const full = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  const raw = readFileSync(full, 'utf8');
  return parse(raw);
}

// Convert a plural field key (`methods`, `glasses`, `difficulties`) to its
// singular form (`method`, `glass`, `difficulty`). Hand-coded for the small
// closed set of field names we care about; intentionally not a general
// pluralisation engine.
function singularize(plural) {
  if (plural.endsWith('ies')) return plural.slice(0, -3) + 'y';
  if (plural.endsWith('ses')) return plural.slice(0, -2);
  if (plural.endsWith('s')) return plural.slice(0, -1);
  return plural;
}

function pascalCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const HEADER = `// AUTO-GENERATED FROM data/taxonomy.yaml — DO NOT EDIT BY HAND.
// Run \`npm run codegen\` to regenerate.
`;

export function emitZodModule(parsed) {
  const sections = [];
  for (const [field, entries] of Object.entries(parsed)) {
    const constName = field.toUpperCase();
    const typeName = pascalCase(singularize(field));
    const labelMapName = `${singularize(field).toUpperCase()}_LABELS`;
    const slugs = entries.map((e) => `'${e.slug}'`).join(', ');
    const constLine = `export const ${constName} = [${slugs}] as const;`;
    const typeLine = `export type ${typeName} = (typeof ${constName})[number];`;
    const mapLines = entries
      .map((e) => `  '${e.slug}': ${JSON.stringify(e.label)},`)
      .join('\n');
    const mapBlock = `export const ${labelMapName}: Record<${typeName}, string> = {\n${mapLines}\n};`;
    sections.push(`${constLine}\n${typeLine}\n\n${mapBlock}`);
  }
  return HEADER + '\n' + sections.join('\n\n') + '\n';
}

export function emitValidatorModule(parsed) {
  const sections = [];
  for (const [field, entries] of Object.entries(parsed)) {
    const constName = field.toUpperCase();
    const slugs = entries.map((e) => `'${e.slug}'`).join(', ');
    sections.push(`export const ${constName} = [${slugs}];`);
  }
  return HEADER + '\n' + sections.join('\n') + '\n';
}

// YAML keys are plural collection names (methods, glasses, ...) but the
// frontmatter field names mix singular (scalar fields: method, glass, ...) and
// plural (array fields: spirits, flavors, occasions). The TEMPLATE.md table's
// `Field` column displays the frontmatter name, so we singularize for scalar
// fields and keep these three plural by exception.
const ARRAY_FRONTMATTER_FIELDS = new Set(['spirits', 'flavors', 'occasions']);

function toFrontmatterField(yamlKey) {
  if (ARRAY_FRONTMATTER_FIELDS.has(yamlKey)) return yamlKey;
  return singularize(yamlKey);
}

export function emitTemplateTable(parsed) {
  const rows = Object.entries(parsed).map(([field, entries]) => {
    const fieldName = toFrontmatterField(field);
    const values = entries.map((e) => `\`${e.slug}\``).join(', ');
    return `| \`${fieldName}\` | ${values} |`;
  });
  return [
    '| Field | Allowed values |',
    '|-------|----------------|',
    ...rows,
  ].join('\n');
}

export function rewriteMarkerRegion(source, startMarker, endMarker, replacement) {
  const startIdx = source.indexOf(startMarker);
  const endIdx = source.indexOf(endMarker);
  if (startIdx === -1) {
    throw new Error(`rewriteMarkerRegion: start marker not found: ${startMarker}`);
  }
  if (endIdx === -1) {
    throw new Error(`rewriteMarkerRegion: end marker not found: ${endMarker}`);
  }
  if (endIdx < startIdx) {
    throw new Error(`rewriteMarkerRegion: markers out of order (${endMarker} appears before ${startMarker})`);
  }
  const before = source.slice(0, startIdx + startMarker.length);
  const after = source.slice(endIdx);
  return `${before}\n${replacement}\n${after}`;
}

export const TAXONOMY_MARKER_START = '<!-- taxonomy:start -->';
export const TAXONOMY_MARKER_END = '<!-- taxonomy:end -->';

export function generate({ rootDir = ROOT } = {}) {
  const taxonomy = loadTaxonomy();

  const zodPath = path.join(rootDir, 'src/taxonomy.generated.ts');
  writeFileSync(zodPath, emitZodModule(taxonomy));

  const validatorPath = path.join(rootDir, 'scripts/taxonomy.generated.mjs');
  writeFileSync(validatorPath, emitValidatorModule(taxonomy));

  const templatePath = path.join(rootDir, 'TEMPLATE.md');
  const template = readFileSync(templatePath, 'utf8');
  const table = emitTemplateTable(taxonomy);
  const next = rewriteMarkerRegion(template, TAXONOMY_MARKER_START, TAXONOMY_MARKER_END, table);
  writeFileSync(templatePath, next);

  return { zodPath, validatorPath, templatePath };
}

function main() {
  const { zodPath, validatorPath, templatePath } = generate();
  const rel = (p) => path.relative(ROOT, p);
  console.log(`Wrote ${rel(zodPath)}`);
  console.log(`Wrote ${rel(validatorPath)}`);
  console.log(`Updated ${rel(templatePath)} between marker comments`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
