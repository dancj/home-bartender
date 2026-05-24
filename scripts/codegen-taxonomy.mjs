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

function main() {
  const taxonomy = loadTaxonomy();
  console.log(JSON.stringify(taxonomy, null, 2));
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
