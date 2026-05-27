import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  parseFrontmatter,
  lintBody,
  mentionsHouseMadeWorthyPrep,
  parseArgs,
  filterFiles,
} from './validate.mjs';

describe('parseFrontmatter', () => {
  it('parses flat keys into a plain object with typed scalars', () => {
    const raw = [
      '---',
      'title: Tequila Sunrise',
      'category: classic',
      'publish: true',
      '---',
      '',
      'body content',
    ].join('\n');

    expect(parseFrontmatter(raw)).toEqual({
      title: 'Tequila Sunrise',
      category: 'classic',
      publish: true,
    });
  });

  it('parses a nested attribution block into a nested object', () => {
    const raw = [
      '---',
      'title: Margarita',
      'attribution:',
      '  creator: Don Julio',
      '  bar: Some Bar',
      '  year: 1947',
      '---',
      '',
    ].join('\n');

    expect(parseFrontmatter(raw)).toEqual({
      title: 'Margarita',
      attribution: { creator: 'Don Julio', bar: 'Some Bar', year: 1947 },
    });
  });

  it('parses list values into an array of strings', () => {
    const raw = ['---', 'spirits: [tequila, mezcal]', '---', ''].join('\n');

    expect(parseFrontmatter(raw)).toEqual({ spirits: ['tequila', 'mezcal'] });
  });

  it('strips surrounding single and double quotes from quoted list items', () => {
    const raw = ['---', `spirits: ["tequila", 'mezcal']`, '---', ''].join('\n');

    expect(parseFrontmatter(raw)).toEqual({ spirits: ['tequila', 'mezcal'] });
  });

  it('returns null when the input does not start with --- newline', () => {
    expect(parseFrontmatter('title: Foo\n')).toBeNull();
  });

  it('returns null when there is no closing --- delimiter', () => {
    const raw = '---\ntitle: Foo\nbody without closing fence\n';
    expect(parseFrontmatter(raw)).toBeNull();
  });

  it('skips blank lines and comment lines inside the block', () => {
    const raw = [
      '---',
      '# a leading comment',
      '',
      'title: Foo',
      '  # an indented comment-ish line is also skipped',
      '',
      'category: classic',
      '---',
      '',
    ].join('\n');

    expect(parseFrontmatter(raw)).toEqual({ title: 'Foo', category: 'classic' });
  });

  it('parses a flow-style string array (ingredients[])', () => {
    const raw = [
      '---',
      'ingredients:',
      '  - 2 oz blanco tequila',
      '  - 1 oz fresh lime juice',
      '  - ½ oz Cointreau',
      '---',
      '',
    ].join('\n');

    expect(parseFrontmatter(raw)).toEqual({
      ingredients: ['2 oz blanco tequila', '1 oz fresh lime juice', '½ oz Cointreau'],
    });
  });

  it('parses a nested house_made object with mixed required and optional fields', () => {
    const raw = [
      '---',
      'house_made:',
      '  name: Honey-Ginger Syrup',
      '  yield: Makes ~4 oz. Keeps 2–3 weeks refrigerated.',
      '  ingredients:',
      '    - 1 cup honey',
      '    - 1 cup water',
      '  steps:',
      '    - Combine honey and water in a small saucepan.',
      '    - Simmer 10 minutes, strain, and cool.',
      '---',
      '',
    ].join('\n');

    expect(parseFrontmatter(raw)).toEqual({
      house_made: {
        name: 'Honey-Ginger Syrup',
        yield: 'Makes ~4 oz. Keeps 2–3 weeks refrigerated.',
        ingredients: ['1 cup honey', '1 cup water'],
        steps: [
          'Combine honey and water in a small saucepan.',
          'Simmer 10 minutes, strain, and cool.',
        ],
      },
    });
  });

  it('parses a block scalar preserving line breaks (batch.instructions)', () => {
    const raw = [
      '---',
      'batch:',
      '  yield: Makes 8 servings.',
      '  instructions: |',
      '    Combine all in a pitcher. Stir to chill.',
      '    Pour over large cubes; float Laphroaig per glass.',
      '---',
      '',
    ].join('\n');

    expect(parseFrontmatter(raw)).toEqual({
      batch: {
        yield: 'Makes 8 servings.',
        instructions:
          'Combine all in a pitcher. Stir to chill.\nPour over large cubes; float Laphroaig per glass.\n',
      },
    });
  });

  it('returns null when frontmatter contains malformed YAML (unclosed flow sequence)', () => {
    const raw = [
      '---',
      'title: Foo',
      'spirits: [tequila, mezcal',
      '---',
      '',
    ].join('\n');

    expect(parseFrontmatter(raw)).toBeNull();
  });

  it('preserves vulgar fractions and en-dashes in string values', () => {
    const raw = [
      '---',
      'ingredients:',
      '  - ¾ oz fresh lemon juice',
      '  - 2–3 fresh basil leaves',
      '---',
      '',
    ].join('\n');

    expect(parseFrontmatter(raw)).toEqual({
      ingredients: ['¾ oz fresh lemon juice', '2–3 fresh basil leaves'],
    });
  });
});

const CANONICAL_BODY = [
  '',
  '## Ingredients',
  '',
  '- 2 oz tequila reposado',
  '- 1 oz fresh grapefruit juice',
  '- ½ oz fresh lime juice',
  '',
  '---',
  '',
  '## Steps',
  '',
  '1. Combine in a shaker',
  '2. Strain over ice',
  '',
  '## Notes',
  '',
  '*Serve with a salt rim.*',
  '',
].join('\n');

describe('lintBody — hard rules (publish: true)', () => {
  it('returns no errors and no warnings on a canonical published body', () => {
    expect(lintBody(CANONICAL_BODY, { publish: true })).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it('skips all rules when publish is not true (inbox draft)', () => {
    const broken = '## Just one heading\n\nno ingredients, no steps';
    expect(lintBody(broken, { publish: false })).toEqual({ errors: [], warnings: [] });
    expect(lintBody(broken, { publish: undefined })).toEqual({ errors: [], warnings: [] });
    expect(lintBody(broken, {})).toEqual({ errors: [], warnings: [] });
  });

  it('errors when ## Ingredients heading is missing', () => {
    const body = '## Steps\n\n1. Pour\n';
    const result = lintBody(body, { publish: true });
    expect(result.errors).toEqual(['missing required heading: ## Ingredients']);
  });

  it('errors when ## Steps heading is missing', () => {
    const body = '## Ingredients\n\n- 2 oz spirit\n';
    const result = lintBody(body, { publish: true });
    expect(result.errors).toEqual(['missing required heading: ## Steps']);
  });

  it('reports both missing-heading errors when body has neither', () => {
    const result = lintBody('## Notes\n\nfree-form text', { publish: true });
    expect(result.errors).toContain('missing required heading: ## Ingredients');
    expect(result.errors).toContain('missing required heading: ## Steps');
  });

  it('errors when ## Ingredients section has no list items before next H2', () => {
    const body = [
      '## Ingredients',
      '',
      'No list here, just prose.',
      '',
      '## Steps',
      '',
      '1. Pour',
    ].join('\n');
    const result = lintBody(body, { publish: true });
    expect(result.errors).toEqual([
      '## Ingredients section is empty or has no list items',
    ]);
  });

  it('errors when ## Ingredients section is entirely empty', () => {
    const body = ['## Ingredients', '', '', '## Steps', '', '1. Pour'].join('\n');
    const result = lintBody(body, { publish: true });
    expect(result.errors).toEqual([
      '## Ingredients section is empty or has no list items',
    ]);
  });

  it('errors when ## Ingredients has only a bold callout but no list items', () => {
    const body = [
      '## Ingredients',
      '',
      '**Garnish:** lime wheel',
      '',
      '## Steps',
      '',
      '1. Pour',
    ].join('\n');
    const result = lintBody(body, { publish: true });
    expect(result.errors).toEqual([
      '## Ingredients section is empty or has no list items',
    ]);
  });

  it('accepts ## Ingredients with a list followed by a bold callout', () => {
    const body = [
      '## Ingredients',
      '',
      '- 2 oz spirit',
      '- 1 oz juice',
      '',
      '**Garnish:** lime wheel',
      '',
      '## Steps',
      '',
      '1. Pour',
    ].join('\n');
    expect(lintBody(body, { publish: true })).toEqual({ errors: [], warnings: [] });
  });

  it('treats markdown horizontal rules (---) between sections as non-headings', () => {
    expect(lintBody(CANONICAL_BODY, { publish: true })).toEqual({ errors: [], warnings: [] });
  });

  it('is case-sensitive on heading matches (## ingredients does not satisfy ## Ingredients)', () => {
    const body = [
      '## ingredients',
      '',
      '- 2 oz spirit',
      '',
      '## Steps',
      '',
      '1. Pour',
    ].join('\n');
    const result = lintBody(body, { publish: true });
    expect(result.errors).toEqual(['missing required heading: ## Ingredients']);
  });

  it('accepts # only at H2 level, ignores deeper headings as section markers', () => {
    const body = [
      '### Ingredients',
      '- foo',
      '## Steps',
      '1. step',
    ].join('\n');
    const result = lintBody(body, { publish: true });
    expect(result.errors).toContain('missing required heading: ## Ingredients');
  });
});

describe('mentionsHouseMadeWorthyPrep — trigger predicate', () => {
  it.each([
    ['- ¾ oz honey-ginger syrup', true, 'compound syrup name'],
    ['- ½ oz cinnamon syrup', true, 'single-word custom syrup'],
    ['- ¾ oz mango habanero syrup', true, 'multi-word custom syrup'],
    ['- ¾ oz lavender honey syrup', true, 'multi-word custom syrup variant'],
    ['- 2 oz bacon-washed bourbon', true, '*-washed pattern'],
    ['- 2 oz fat-washed rye', true, '*-washed pattern variant'],
    ['- ½ oz apple shrub', true, 'shrub'],
    ['- ½ oz cherry cordial', true, 'cordial'],
    ['- 2 dashes orange tincture', true, 'tincture'],
    ['- ¼ oz lavender infusion', true, 'infusion'],
  ])('triggers on craft-prep ingredient: %s', (line, expected) => {
    expect(mentionsHouseMadeWorthyPrep(line)).toBe(expected);
  });

  it.each([
    ['- ½ oz simple syrup', false, 'bare simple syrup is store-bought'],
    ['- 1 bar spoon maple syrup', false, 'bare maple syrup is store-bought'],
    ['- ¼ oz agave nectar', false, 'agave is not a syrup'],
    ['- 2 oz fresh grapefruit juice', false, 'no prep mention'],
    ['- Lime wedge', false, 'no prep mention'],
  ])('does not trigger on store-bought or plain ingredient: %s', (line, expected) => {
    expect(mentionsHouseMadeWorthyPrep(line)).toBe(expected);
  });
});

describe('lintBody — soft rules (House-Made)', () => {
  const ingredients = (lines) =>
    [
      '## Ingredients',
      '',
      ...lines,
      '',
      '## Steps',
      '',
      '1. Combine',
    ].join('\n');

  it('warns when craft syrup is mentioned but no ## House-Made heading present', () => {
    const body = ingredients(['- 2 oz gin', '- ¾ oz honey-ginger syrup']);
    const result = lintBody(body, { publish: true });
    expect(result.warnings).toContain(
      'ingredient line references a House-Made-worthy prep but no ## House-Made … section found',
    );
  });

  it('does not warn when ## House-Made heading is present', () => {
    const body = [
      '## Ingredients',
      '',
      '- 2 oz gin',
      '- ¾ oz honey-ginger syrup',
      '',
      '## House-Made Honey-Ginger Syrup',
      '',
      '- 1 cup honey',
      '- 2 inches ginger',
      '',
      '## Steps',
      '',
      '1. Combine',
    ].join('\n');
    expect(lintBody(body, { publish: true })).toEqual({ errors: [], warnings: [] });
  });

  it('does not warn when ingredient line is store-bought (simple syrup)', () => {
    const body = ingredients(['- 2 oz gin', '- ½ oz simple syrup']);
    expect(lintBody(body, { publish: true })).toEqual({ errors: [], warnings: [] });
  });

  it('does not warn when ingredient line is store-bought (maple syrup)', () => {
    const body = ingredients(['- 2 oz bourbon', '- 1 bar spoon maple syrup']);
    expect(lintBody(body, { publish: true })).toEqual({ errors: [], warnings: [] });
  });

  it('warns when *-washed ingredient lacks House-Made section', () => {
    const body = ingredients(['- 2 oz bacon-washed bourbon']);
    expect(lintBody(body, { publish: true }).warnings).toContain(
      'ingredient line references a House-Made-worthy prep but no ## House-Made … section found',
    );
  });

  it('warns when shrub/cordial/tincture/infusion mentioned without House-Made', () => {
    for (const ingredient of [
      '- ½ oz apple shrub',
      '- ¼ oz cherry cordial',
      '- 2 dashes orange tincture',
      '- ¼ oz lavender infusion',
    ]) {
      const body = ingredients(['- 2 oz spirit', ingredient]);
      const result = lintBody(body, { publish: true });
      expect(result.warnings).toContain(
        'ingredient line references a House-Made-worthy prep but no ## House-Made … section found',
      );
    }
  });

  it('emits only one warning even when multiple craft preps are mentioned', () => {
    const body = ingredients(['- ¾ oz honey-ginger syrup', '- ¼ oz cherry cordial']);
    const result = lintBody(body, { publish: true });
    expect(result.warnings).toHaveLength(1);
  });

  it('skips the soft rule when publish is not true', () => {
    const body = ingredients(['- ¾ oz honey-ginger syrup']);
    expect(lintBody(body, { publish: false })).toEqual({ errors: [], warnings: [] });
  });
});

describe('parseArgs', () => {
  it('returns an empty files array when given no arguments', () => {
    expect(parseArgs([])).toEqual({ files: [] });
  });

  it('parses --files followed by one path', () => {
    expect(parseArgs(['--files', 'recipes/classics/manhattan.md'])).toEqual({
      files: ['recipes/classics/manhattan.md'],
    });
  });

  it('parses --files followed by multiple paths', () => {
    expect(
      parseArgs(['--files', 'recipes/classics/a.md', 'recipes/originals/b.md']),
    ).toEqual({
      files: ['recipes/classics/a.md', 'recipes/originals/b.md'],
    });
  });

  it('throws on an empty --files (no paths supplied)', () => {
    expect(() => parseArgs(['--files'])).toThrow(/--files/);
  });

  it('throws on a duplicate --files flag', () => {
    expect(() => parseArgs(['--files', 'a.md', '--files', 'b.md'])).toThrow(
      /duplicate/i,
    );
  });

  it('throws on an unknown flag', () => {
    expect(() => parseArgs(['--unknown', 'x'])).toThrow(/unknown/i);
  });
});

describe('filterFiles', () => {
  const rootDir = '/repo';
  const recipesDir = '/repo/recipes';
  const allFiles = [
    '/repo/recipes/classics/manhattan.md',
    '/repo/recipes/classics/old-fashioned.md',
    '/repo/recipes/originals/foo.md',
    '/repo/recipes/inbox/draft.md',
  ];

  it('returns all files unchanged when files arg is empty (whole-tree mode)', () => {
    expect(filterFiles(allFiles, { files: [], rootDir, recipesDir })).toEqual(
      allFiles,
    );
  });

  it('returns only files matching a single repo-root-relative --files entry', () => {
    expect(
      filterFiles(allFiles, {
        files: ['recipes/classics/manhattan.md'],
        rootDir,
        recipesDir,
      }),
    ).toEqual(['/repo/recipes/classics/manhattan.md']);
  });

  it('returns multiple matches when --files lists multiple repo-relative paths', () => {
    expect(
      filterFiles(allFiles, {
        files: ['recipes/classics/manhattan.md', 'recipes/originals/foo.md'],
        rootDir,
        recipesDir,
      }),
    ).toEqual([
      '/repo/recipes/classics/manhattan.md',
      '/repo/recipes/originals/foo.md',
    ]);
  });

  it('de-dupes when a path is supplied as both relative and absolute', () => {
    expect(
      filterFiles(allFiles, {
        files: [
          'recipes/classics/manhattan.md',
          '/repo/recipes/classics/manhattan.md',
        ],
        rootDir,
        recipesDir,
      }),
    ).toEqual(['/repo/recipes/classics/manhattan.md']);
  });

  it('silently skips paths outside recipes/ (e.g., sections/, root-level)', () => {
    expect(
      filterFiles(allFiles, {
        files: [
          'sections/intro.md',
          'README.md',
          'recipes/classics/manhattan.md',
        ],
        rootDir,
        recipesDir,
      }),
    ).toEqual(['/repo/recipes/classics/manhattan.md']);
  });

  it('returns an empty array when no --files entries match any tree file', () => {
    expect(
      filterFiles(allFiles, {
        files: ['recipes/classics/does-not-exist.md'],
        rootDir,
        recipesDir,
      }),
    ).toEqual([]);
  });
});

describe('lintBody — soft rules (batch format)', () => {
  const minimalBody = (extra = []) =>
    [
      '## Ingredients',
      '',
      '- 2 oz spirit',
      '',
      '## Steps',
      '',
      '1. Combine',
      ...extra,
    ].join('\n');

  it('warns when format: batch but no ## How to Batch It section', () => {
    const result = lintBody(minimalBody(), { publish: true, format: 'batch' });
    expect(result.warnings).toContain(
      'format is batch/punch but no ## How to Batch It section found',
    );
  });

  it('warns when format: punch but no ## How to Batch It section', () => {
    const result = lintBody(minimalBody(), { publish: true, format: 'punch' });
    expect(result.warnings).toContain(
      'format is batch/punch but no ## How to Batch It section found',
    );
  });

  it('does not warn when format: single (regardless of batch heading presence)', () => {
    expect(lintBody(minimalBody(), { publish: true, format: 'single' })).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it('does not warn when format: batch AND ## How to Batch It is present', () => {
    const body = minimalBody(['', '## How to Batch It', '', 'Makes 8 servings.']);
    expect(lintBody(body, { publish: true, format: 'batch' })).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it('does not warn when format frontmatter is missing/undefined', () => {
    expect(lintBody(minimalBody(), { publish: true })).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it('skips the soft rule when publish is not true', () => {
    expect(lintBody(minimalBody(), { publish: false, format: 'batch' })).toEqual({
      errors: [],
      warnings: [],
    });
  });
});

