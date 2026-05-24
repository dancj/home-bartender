#!/usr/bin/env node
// Reads data/taxonomy.yaml (the canonical source) and (later) emits:
//   - src/taxonomy.generated.ts        (Zod schema source)
//   - scripts/taxonomy.generated.mjs   (validator source)
//   - the marker-bounded "Canonical Taxonomy" region of TEMPLATE.md
//
// Edit data/taxonomy.yaml, then run `npm run codegen` to regenerate the
// artifacts above. CI verifies they stay in sync.

import { readFileSync } from 'node:fs';
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

function main() {
  const taxonomy = loadTaxonomy();
  console.log(emitZodModule(taxonomy));
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
