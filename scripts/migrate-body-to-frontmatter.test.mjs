import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import {
  migrateContent,
  migrate,
  parseArgs,
} from './migrate-body-to-frontmatter.mjs';

// ──────────────────────────────────────────────────────────────────────────────
// Inline string fixtures (matches scripts/validate.test.mjs convention; no
// fixture files on disk). Each test below assembles the smallest legal recipe
// shape that exercises the scenario, then asserts on the structured result.
// ──────────────────────────────────────────────────────────────────────────────

const MINIMAL_FRONTMATTER = [
  '---',
  'title: Test Recipe',
  'blurb: "Test blurb"',
  'category: classic',
  'publish: true',
  'glass: coupe',
  'method: shaken',
  'ice: none',
  'difficulty: easy',
  'spirits: [tequila]',
  '---',
].join('\n');

function buildRecipe(body) {
  return `${MINIMAL_FRONTMATTER}\n\n${body}\n`;
}

// Extract the frontmatter object + the residual body string from a migrated
// recipe. Used in nearly every test.
function splitMigrated(text) {
  expect(text.startsWith('---\n')).toBe(true);
  const end = text.indexOf('\n---\n', 4);
  expect(end).toBeGreaterThan(0);
  const fmBlock = text.slice(4, end);
  const body = text.slice(end + 5);
  return { fm: parseYaml(fmBlock), body };
}

// ──────────────────────────────────────────────────────────────────────────────
// migrateContent — pure-string transformation (the heart of the script).
// ──────────────────────────────────────────────────────────────────────────────

describe('migrateContent — happy paths', () => {
  it('extracts ## Ingredients and ## Steps into frontmatter arrays', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz tequila',
        '- 1 oz lime juice',
        '',
        '## Steps',
        '',
        '1. Shake with ice',
        '2. Strain into a coupe',
        '',
        '## Notes',
        '',
        'Some prose notes.',
      ].join('\n'),
    );

    const { changed, content } = migrateContent(input);
    expect(changed).toBe(true);

    const { fm, body } = splitMigrated(content);
    expect(fm.ingredients).toEqual(['2 oz tequila', '1 oz lime juice']);
    expect(fm.steps).toEqual(['Shake with ice', 'Strain into a coupe']);
    expect(body).toContain('## Notes');
    expect(body).toContain('Some prose notes.');
    // Residual body must NOT contain the migrated H2s.
    expect(body).not.toMatch(/^##\s+Ingredients\b/m);
    expect(body).not.toMatch(/^##\s+Steps\b/m);
  });

  it('extracts ## House-Made <Name> with yield + bulleted ingredients + numbered steps (penicillin shape)', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz blended scotch',
        '- ¾ oz honey-ginger syrup',
        '',
        '## House-Made Honey-Ginger Syrup',
        '',
        '*Makes ~4 oz. Keeps 2–3 weeks refrigerated.*',
        '',
        '- Equal parts honey and boiling water',
        '- Minced fresh ginger',
        '',
        '1. Combine honey and water',
        '2. Add ginger and simmer',
        '',
        '## Steps',
        '',
        '1. Combine in shaker',
        '2. Shake and strain',
      ].join('\n'),
    );

    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.house_made).toEqual({
      name: 'Honey-Ginger Syrup',
      yield: 'Makes ~4 oz. Keeps 2–3 weeks refrigerated.',
      ingredients: ['Equal parts honey and boiling water', 'Minced fresh ginger'],
      steps: ['Combine honey and water', 'Add ginger and simmer'],
    });
    expect(fm.ingredients).toEqual(['2 oz blended scotch', '¾ oz honey-ginger syrup']);
    expect(fm.steps).toEqual(['Combine in shaker', 'Shake and strain']);
  });

  it('extracts ## How to Batch It with yield, ingredients, and prose instructions', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz spirit',
        '',
        '## Steps',
        '',
        '1. Combine',
        '',
        '## How to Batch It',
        '',
        '*Makes 8 servings:*',
        '',
        '- 16 oz spirit',
        '- 6 oz juice',
        '',
        'Combine and refrigerate. Stir each serving individually with ice.',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.batch).toEqual({
      yield: 'Makes 8 servings:',
      ingredients: ['16 oz spirit', '6 oz juice'],
      instructions: 'Combine and refrigerate. Stir each serving individually with ice.',
    });
  });

  it('preserves ## Notes verbatim in the residual body, including markdown formatting', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz spirit',
        '',
        '## Steps',
        '',
        '1. Combine',
        '',
        '## Notes',
        '',
        'Created by *Sam Ross* at **Milk & Honey**. See [reference](https://example.com).',
        '',
        'Second paragraph.',
      ].join('\n'),
    );
    const { body } = splitMigrated(migrateContent(input).content);
    expect(body).toContain('## Notes');
    expect(body).toContain('Created by *Sam Ross* at **Milk & Honey**. See [reference](https://example.com).');
    expect(body).toContain('Second paragraph.');
  });

  it('preserves unrecognized H2 (e.g. ## Variations) in the residual body', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz spirit',
        '',
        '## Steps',
        '',
        '1. Combine',
        '',
        '## Notes',
        '',
        'Notes text.',
        '',
        '## Variations',
        '',
        '1. Sub mezcal for bourbon',
        '2. Add a bar spoon of maple',
      ].join('\n'),
    );
    const { body } = splitMigrated(migrateContent(input).content);
    expect(body).toContain('## Notes');
    expect(body).toContain('## Variations');
    expect(body).toContain('Sub mezcal for bourbon');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Edge cases — house_made and batch shapes
// ──────────────────────────────────────────────────────────────────────────────

describe('migrateContent — house_made edge cases', () => {
  it('pins the bulleted-vs-numbered discriminator: numbered list directly after yield = steps, ingredients undefined', () => {
    // The maple-bacon-old-fashioned shape: yield line, then numbered list
    // immediately. Must NOT treat the numbered list as ingredients.
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz bourbon',
        '',
        '## House-Made Bacon-Washed Bourbon',
        '',
        '*Makes one bottle. Keeps indefinitely refrigerated.*',
        '',
        '1. Bake bacon until crispy',
        '2. Save the rendered grease',
        '3. Add bourbon and steep 4 hours',
        '',
        '## Steps',
        '',
        '1. Combine in mixing glass',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.house_made).toEqual({
      name: 'Bacon-Washed Bourbon',
      yield: 'Makes one bottle. Keeps indefinitely refrigerated.',
      steps: [
        'Bake bacon until crispy',
        'Save the rendered grease',
        'Add bourbon and steep 4 hours',
      ],
    });
    // `ingredients` key must not appear on house_made.
    expect(fm.house_made.ingredients).toBeUndefined();
  });

  it('handles a house_made section with no yield line (spice-trade shape) — opens directly with a list', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz gin',
        '',
        '## House-Made Cinnamon Syrup',
        '',
        '- 1 cup water',
        '- 1 cup sugar',
        '- 3 cinnamon sticks',
        '',
        'Combine in a saucepan, simmer 10 minutes, strain.',
        '',
        '## Steps',
        '',
        '1. Shake',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.house_made.name).toBe('Cinnamon Syrup');
    expect(fm.house_made.yield).toBeUndefined();
    expect(fm.house_made.ingredients).toEqual([
      '1 cup water',
      '1 cup sugar',
      '3 cinnamon sticks',
    ]);
    expect(fm.house_made.steps).toEqual([
      'Combine in a saucepan, simmer 10 minutes, strain.',
    ]);
  });

  it('captures a prose paragraph following the house_made list as steps verbatim (spice-trade shape)', () => {
    // Same as above, but specifically asserts the prose-as-single-step shape.
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz gin',
        '',
        '## House-Made Cinnamon Syrup',
        '',
        '- 1 cup water',
        '- 1 cup sugar',
        '',
        'Combine in a saucepan over medium heat, stirring until sugar dissolves. Simmer 10 minutes. Remove from heat, let steep 30 minutes, then strain. Keeps refrigerated for 2–3 weeks.',
        '',
        '## Steps',
        '',
        '1. Shake',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.house_made.steps).toEqual([
      'Combine in a saucepan over medium heat, stirring until sugar dissolves. Simmer 10 minutes. Remove from heat, let steep 30 minutes, then strain. Keeps refrigerated for 2–3 weeks.',
    ]);
  });
});

describe('migrateContent — batch edge cases', () => {
  it('preserves multi-paragraph batch prose as a single block-scalar instructions string', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz spirit',
        '',
        '## Steps',
        '',
        '1. Combine',
        '',
        '## How to Batch It',
        '',
        '*Makes 8 servings:*',
        '',
        '- 16 oz spirit',
        '',
        'First paragraph of instructions.',
        '',
        'Second paragraph after a blank line.',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.batch.instructions).toBe(
      'First paragraph of instructions.\n\nSecond paragraph after a blank line.',
    );
  });

  it('emits batch.instructions undefined when the section ends after the ingredient list (spice-trade shape)', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz gin',
        '',
        '## Steps',
        '',
        '1. Shake',
        '',
        '## How to Batch It',
        '',
        '*Makes 8 servings:*',
        '',
        '- 16 oz gin',
        '- 6 oz lemon juice',
        '- Basil leaves for each serving (muddle individually)',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.batch.yield).toBe('Makes 8 servings:');
    expect(fm.batch.ingredients).toEqual([
      '16 oz gin',
      '6 oz lemon juice',
      'Basil leaves for each serving (muddle individually)',
    ]);
    expect(fm.batch.instructions).toBeUndefined();
  });

  it('preserves a non-numeric batch yield verbatim (spritz shape)', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz spirit',
        '',
        '## Steps',
        '',
        '1. Combine',
        '',
        '## How to Batch It',
        '',
        '*My 6x batch from the card:*',
        '',
        '- 6 oz limoncello',
        '',
        'Combine and refrigerate.',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.batch.yield).toBe('My 6x batch from the card:');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Garnish / float extraction
// ──────────────────────────────────────────────────────────────────────────────

describe('migrateContent — garnish & float callouts', () => {
  it('extracts a **Garnish:** bold callout outside the list to top-level garnish', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz bourbon',
        '- 1 oz sweet vermouth',
        '',
        '**Garnish:** Luxardo cherry (or quality maraschino)',
        '',
        '## Steps',
        '',
        '1. Stir',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.garnish).toBe('Luxardo cherry (or quality maraschino)');
    expect(fm.ingredients).toEqual(['2 oz bourbon', '1 oz sweet vermouth']);
  });

  it('extracts a **Float:** bold callout to top-level float', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz blended scotch',
        '- ¾ oz fresh lemon juice',
        '',
        '**Float:** ¼ oz Laphroaig (or other Islay single malt)',
        '',
        '## Steps',
        '',
        '1. Shake',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.float).toBe('¼ oz Laphroaig (or other Islay single malt)');
    expect(fm.ingredients).toEqual(['2 oz blended scotch', '¾ oz fresh lemon juice']);
  });

  it('moves inline garnish list items (`- ... for garnish`) to top-level garnish, dropping them from ingredients', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 1½ oz reposado tequila',
        '- ½ oz mezcal',
        '- Flamed orange peel, for garnish',
        '',
        '## Steps',
        '',
        '1. Stir',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.garnish).toBe('Flamed orange peel, for garnish');
    expect(fm.ingredients).toEqual(['1½ oz reposado tequila', '½ oz mezcal']);
  });

  it('moves bare garnish list items (Salt rim, Tajin or salt rim) to top-level garnish', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 1 oz scotch',
        '- 1 oz mezcal',
        '- ¾ oz orgeat',
        '- Tajin or salt rim',
        '',
        '## Steps',
        '',
        '1. Shake',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.garnish).toBe('Tajin or salt rim');
    expect(fm.ingredients).toEqual([
      '1 oz scotch',
      '1 oz mezcal',
      '¾ oz orgeat',
    ]);
  });

  it('joins multiple inline garnish list items into one comma-separated garnish string', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz gin',
        '- Lime wedge',
        '- Mint sprig',
        '',
        '## Steps',
        '',
        '1. Build',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.garnish).toBe('Lime wedge, Mint sprig');
    expect(fm.ingredients).toEqual(['2 oz gin']);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Encoding / verbatim preservation
// ──────────────────────────────────────────────────────────────────────────────

describe('migrateContent — UTF-8 and substitutions preserved verbatim', () => {
  it('preserves vulgar fractions (½, ¾, 1½) and en-dashes (2–3) inside ingredient strings', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 1½ oz blanco tequila',
        '- ¾ oz fresh lime juice',
        '- ½ oz triple sec',
        '- 2–3 fresh basil leaves',
        '',
        '## Steps',
        '',
        '1. Shake',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.ingredients).toEqual([
      '1½ oz blanco tequila',
      '¾ oz fresh lime juice',
      '½ oz triple sec',
      '2–3 fresh basil leaves',
    ]);
  });

  it('preserves parenthetical and italic substitution text verbatim', () => {
    const input = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 1½ oz blanco tequila *(can sub rum)*',
        '- ½ oz Aperol',
        '- ½ oz fresh lemon juice *(¾ oz is standard; I prefer ½ oz)*',
        '',
        '## Steps',
        '',
        '1. Shake',
      ].join('\n'),
    );
    const { fm } = splitMigrated(migrateContent(input).content);
    expect(fm.ingredients).toEqual([
      '1½ oz blanco tequila *(can sub rum)*',
      '½ oz Aperol',
      '½ oz fresh lemon juice *(¾ oz is standard; I prefer ½ oz)*',
    ]);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Idempotency
// ──────────────────────────────────────────────────────────────────────────────

describe('migrateContent — idempotency', () => {
  it('returns changed=false when ingredients[] is already populated in frontmatter', () => {
    const already = [
      '---',
      'title: Test',
      'blurb: t',
      'category: classic',
      'publish: true',
      'glass: coupe',
      'method: shaken',
      'ice: none',
      'difficulty: easy',
      'spirits: [tequila]',
      'ingredients:',
      '  - 2 oz tequila',
      'steps:',
      '  - Shake',
      '---',
      '',
      '## Notes',
      '',
      'Already migrated.',
      '',
    ].join('\n');
    const { changed, content } = migrateContent(already);
    expect(changed).toBe(false);
    expect(content).toBe(already);
  });

  it('returns changed=false on a recipe with house_made already populated', () => {
    const already = [
      '---',
      'title: Test',
      'blurb: t',
      'category: classic',
      'publish: true',
      'glass: coupe',
      'method: shaken',
      'ice: none',
      'difficulty: easy',
      'spirits: [tequila]',
      'house_made:',
      '  name: Test Syrup',
      '  steps:',
      '    - Combine',
      '---',
      '',
      '## Notes',
      '',
    ].join('\n');
    expect(migrateContent(already).changed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// migrate() — orchestrator with DI
// ──────────────────────────────────────────────────────────────────────────────

function makeDeps({
  files = {},
  filePaths = null,
  lintBodyImpl = () => ({ errors: [], warnings: [] }),
  writeFails = false,
  restoreFails = false,
} = {}) {
  const calls = { readFile: [], writeFile: [], glob: [], lintBody: [] };
  const fs = { ...files };

  const readFile = async (p) => {
    calls.readFile.push(p);
    if (!(p in fs)) {
      const err = new Error(`ENOENT: ${p}`);
      err.code = 'ENOENT';
      throw err;
    }
    return fs[p];
  };

  const writeFile = async (p, content) => {
    calls.writeFile.push({ path: p, content });
    // Restore (rollback) writes look like a write back to the original
    // content; detect them by content equality to the seed.
    const isRestore =
      restoreFails &&
      calls.writeFile.filter((w) => w.path === p).length >= 2 &&
      content === files[p];
    if (isRestore) {
      throw new Error('simulated restore write failure');
    }
    if (writeFails) {
      throw new Error('simulated write failure');
    }
    fs[p] = content;
  };

  const glob = async (_pattern) => {
    calls.glob.push(_pattern);
    return filePaths ?? Object.keys(files);
  };

  const lintBody = (body, fm) => {
    calls.lintBody.push({ body, fm });
    return lintBodyImpl(body, fm);
  };

  return { readFile, writeFile, glob, lintBody, calls, fs };
}

describe('migrate — orchestrator (DI mocks)', () => {
  it('per-file: read → write sequence for a happy path', async () => {
    const filePath = '/repo/recipes/classics/test.md';
    const deps = makeDeps({
      files: {
        [filePath]: buildRecipe(
          [
            '## Ingredients',
            '',
            '- 2 oz tequila',
            '',
            '## Steps',
            '',
            '1. Shake',
          ].join('\n'),
        ),
      },
    });

    const result = await migrate({ pattern: '/repo/recipes/**/*.md', deps });

    expect(result.migrated).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(deps.calls.readFile).toEqual([filePath]);
    expect(deps.calls.writeFile).toHaveLength(1);
    expect(deps.calls.writeFile[0].path).toBe(filePath);
    expect(deps.calls.lintBody).toHaveLength(1);

    // Final on-disk content reflects the migration.
    const { fm } = splitMigrated(deps.fs[filePath]);
    expect(fm.ingredients).toEqual(['2 oz tequila']);
    expect(fm.steps).toEqual(['Shake']);
  });

  it('reports an already-migrated file as skipped (idempotency through migrate())', async () => {
    const filePath = '/repo/recipes/classics/already.md';
    const original = [
      '---',
      'title: Already',
      'blurb: t',
      'category: classic',
      'publish: true',
      'glass: coupe',
      'method: shaken',
      'ice: none',
      'difficulty: easy',
      'spirits: [tequila]',
      'ingredients:',
      '  - 2 oz tequila',
      'steps:',
      '  - Shake',
      '---',
      '',
      '## Notes',
      '',
    ].join('\n');
    const deps = makeDeps({ files: { [filePath]: original } });
    const result = await migrate({ pattern: '/repo/**/*.md', deps });
    expect(result.skipped).toHaveLength(1);
    expect(result.migrated).toHaveLength(0);
    expect(deps.calls.writeFile).toHaveLength(0);
    // File untouched.
    expect(deps.fs[filePath]).toBe(original);
  });

  it('--dry-run reads + analyses + reports proposed changes but performs zero writes', async () => {
    const filePath = '/repo/recipes/classics/dry.md';
    const original = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz spirit',
        '',
        '## Steps',
        '',
        '1. Shake',
      ].join('\n'),
    );
    const deps = makeDeps({ files: { [filePath]: original } });
    const result = await migrate({
      pattern: '/repo/**/*.md',
      dryRun: true,
      deps,
    });

    expect(result.migrated).toHaveLength(1);
    expect(deps.calls.writeFile).toHaveLength(0);
    expect(deps.fs[filePath]).toBe(original); // unchanged
    // The dry-run still has a "proposed" record for inspection.
    expect(result.migrated[0].path).toBe(filePath);
    expect(result.migrated[0].dryRun).toBe(true);
  });

  it('handles a malformed frontmatter file as an error, no write', async () => {
    const filePath = '/repo/recipes/classics/broken.md';
    const broken = '---\ntitle: Foo\nspirits: [tequila, mezcal\n---\n\nbody\n';
    const deps = makeDeps({ files: { [filePath]: broken } });
    const result = await migrate({ pattern: '/repo/**/*.md', deps });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].path).toBe(filePath);
    expect(result.errors[0].message).toMatch(/frontmatter|YAML/i);
    expect(deps.calls.writeFile).toHaveLength(0);
    expect(deps.fs[filePath]).toBe(broken);
  });

  it('rolls back atomically when the post-write lintBody reports errors', async () => {
    const filePath = '/repo/recipes/classics/lintfail.md';
    const original = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz spirit',
        '',
        '## Steps',
        '',
        '1. Shake',
      ].join('\n'),
    );
    const deps = makeDeps({
      files: { [filePath]: original },
      lintBodyImpl: () => ({ errors: ['post-migration body lint failed'], warnings: [] }),
    });

    const result = await migrate({ pattern: '/repo/**/*.md', deps });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/lint|validation/i);
    expect(result.errors[0].rolledBack).toBe(true);

    // Two writes: forward + restore.
    expect(deps.calls.writeFile).toHaveLength(2);
    expect(deps.calls.writeFile[1].content).toBe(original);
    // On disk: restored to original.
    expect(deps.fs[filePath]).toBe(original);
  });

  it('surfaces a distinct error when the rollback restore-write itself fails', async () => {
    const filePath = '/repo/recipes/classics/rollbackfail.md';
    const original = buildRecipe(
      [
        '## Ingredients',
        '',
        '- 2 oz spirit',
        '',
        '## Steps',
        '',
        '1. Shake',
      ].join('\n'),
    );
    const deps = makeDeps({
      files: { [filePath]: original },
      lintBodyImpl: () => ({ errors: ['lint failed'], warnings: [] }),
      restoreFails: true,
    });

    const result = await migrate({ pattern: '/repo/**/*.md', deps });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/lint.*rollback failed|rollback failed/i);
    expect(result.errors[0].rolledBack).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// CLI parseArgs
// ──────────────────────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('returns default settings on no args (whole-tree, write mode)', () => {
    expect(parseArgs([])).toEqual({ dryRun: false });
  });

  it('recognises --dry-run', () => {
    expect(parseArgs(['--dry-run'])).toEqual({ dryRun: true });
  });

  it('throws on unknown flags', () => {
    expect(() => parseArgs(['--frobnicate'])).toThrow(/unknown|--frobnicate/i);
  });

  it('throws on unexpected positional arguments', () => {
    expect(() => parseArgs(['some-recipe.md'])).toThrow(/positional|usage/i);
  });
});
