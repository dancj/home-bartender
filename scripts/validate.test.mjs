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
  '## Notes',
  '',
  '*Serve with a salt rim.*',
  '',
].join('\n');

const CANONICAL_FM = {
  publish: true,
  ingredients: ['2 oz tequila reposado', '1 oz fresh grapefruit juice', '½ oz fresh lime juice'],
  steps: ['Combine in a shaker', 'Strain over ice'],
};

describe('lintBody — hard rules (publish: true)', () => {
  it('returns no errors and no warnings on a canonical post-migration body + frontmatter', () => {
    expect(lintBody(CANONICAL_BODY, CANONICAL_FM)).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it('skips publish-only rules when publish is not true (inbox draft) but still flags migration leftovers', () => {
    // Migration-leftover headings are errors on ALL recipes regardless of publish status —
    // an inbox draft with `## Ingredients` in the body is half-migrated and shipping it would
    // silently double-render the ingredients list. Only the empty-ingredients[] check is
    // publish-gated (drafts are allowed to be incomplete).
    const draftBody = '## Notes\n\nshort draft, no migration leftover';
    expect(lintBody(draftBody, { publish: false, ingredients: [] })).toEqual({ errors: [], warnings: [] });
    expect(lintBody(draftBody, { publish: undefined })).toEqual({ errors: [], warnings: [] });
    expect(lintBody(draftBody, {})).toEqual({ errors: [], warnings: [] });

    const leftoverBody = '## Ingredients\n\n- still in body, half-migrated draft';
    expect(lintBody(leftoverBody, { publish: false, ingredients: [] }).errors).toContain(
      'migration leftover: ## Ingredients heading in body — content belongs in frontmatter.ingredients[]',
    );
  });

  it('errors when body still contains ## Ingredients heading (migration leftover)', () => {
    const body = '## Ingredients\n\n- 2 oz spirit\n';
    const result = lintBody(body, CANONICAL_FM);
    expect(result.errors).toContain(
      'migration leftover: ## Ingredients heading in body — content belongs in frontmatter.ingredients[]',
    );
  });

  it('errors when body still contains ## Steps heading (migration leftover)', () => {
    const body = '## Steps\n\n1. Pour\n';
    const result = lintBody(body, CANONICAL_FM);
    expect(result.errors).toContain(
      'migration leftover: ## Steps heading in body — content belongs in frontmatter.steps[]',
    );
  });

  it('errors when body still contains ## House-Made <Name> heading (migration leftover)', () => {
    const body = '## House-Made Honey-Ginger Syrup\n\n- 1 cup honey\n';
    const result = lintBody(body, CANONICAL_FM);
    expect(result.errors).toContain(
      'migration leftover: ## House-Made … heading in body — content belongs in frontmatter.house_made',
    );
  });

  it('errors when body still contains ## How to Batch It heading (migration leftover)', () => {
    const body = '## How to Batch It\n\nMakes 8 servings.\n';
    const result = lintBody(body, CANONICAL_FM);
    expect(result.errors).toContain(
      'migration leftover: ## How to Batch It heading in body — content belongs in frontmatter.batch',
    );
  });

  it('errors when frontmatter.ingredients[] is empty on a published recipe', () => {
    const result = lintBody(CANONICAL_BODY, { publish: true, ingredients: [], steps: ['Pour'] });
    expect(result.errors).toContain(
      'frontmatter.ingredients[] is empty on a published recipe',
    );
  });

  it('does not error when ingredients[] is empty but publish is false (draft)', () => {
    expect(lintBody(CANONICAL_BODY, { publish: false, ingredients: [] })).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it('errors when frontmatter.ingredients is missing entirely (treated as empty)', () => {
    const result = lintBody(CANONICAL_BODY, { publish: true });
    expect(result.errors).toContain(
      'frontmatter.ingredients[] is empty on a published recipe',
    );
  });

  it('accepts a post-migration body containing only narrative prose under ## Notes', () => {
    const body = ['## Notes', '', 'Drink while listening to side B of *Kind of Blue*.', ''].join('\n');
    expect(lintBody(body, CANONICAL_FM)).toEqual({ errors: [], warnings: [] });
  });

  it('accepts a post-migration body with an unrecognized H2 (e.g., ## Variations)', () => {
    const body = ['## Notes', '', 'free-form', '', '## Variations', '', 'swap mezcal for tequila'].join('\n');
    expect(lintBody(body, CANONICAL_FM)).toEqual({ errors: [], warnings: [] });
  });

  it('is case-sensitive on heading matches (## ingredients does not trigger the leftover error)', () => {
    const body = '## ingredients\n\n- 2 oz spirit\n';
    const result = lintBody(body, CANONICAL_FM);
    expect(result.errors).toEqual([]);
  });

  it('ignores deeper headings (### Ingredients) as migration-leftover signals', () => {
    const body = '### Ingredients\n\n- foo\n';
    const result = lintBody(body, CANONICAL_FM);
    expect(result.errors).toEqual([]);
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
  const fmWith = (ingredients, extra = {}) => ({
    publish: true,
    ingredients,
    steps: ['Combine'],
    ...extra,
  });

  it('warns when craft syrup is in ingredients[] but no house_made field present', () => {
    const result = lintBody(
      CANONICAL_BODY,
      fmWith(['2 oz gin', '¾ oz honey-ginger syrup']),
    );
    expect(result.warnings).toContain(
      'ingredient references a House-Made-worthy prep but no house_made field found',
    );
  });

  it('does not warn when house_made field is present', () => {
    const result = lintBody(
      CANONICAL_BODY,
      fmWith(['2 oz gin', '¾ oz honey-ginger syrup'], {
        house_made: { name: 'Honey-Ginger Syrup', steps: ['Combine and simmer'] },
      }),
    );
    expect(result).toEqual({ errors: [], warnings: [] });
  });

  it('does not warn when ingredient is store-bought (simple syrup)', () => {
    const result = lintBody(CANONICAL_BODY, fmWith(['2 oz gin', '½ oz simple syrup']));
    expect(result).toEqual({ errors: [], warnings: [] });
  });

  it('does not warn when ingredient is store-bought (maple syrup)', () => {
    const result = lintBody(
      CANONICAL_BODY,
      fmWith(['2 oz bourbon', '1 bar spoon maple syrup']),
    );
    expect(result).toEqual({ errors: [], warnings: [] });
  });

  it('warns when *-washed ingredient lacks house_made field', () => {
    const result = lintBody(CANONICAL_BODY, fmWith(['2 oz bacon-washed bourbon']));
    expect(result.warnings).toContain(
      'ingredient references a House-Made-worthy prep but no house_made field found',
    );
  });

  it('warns when shrub/cordial/tincture/infusion mentioned without house_made', () => {
    for (const ingredient of [
      '½ oz apple shrub',
      '¼ oz cherry cordial',
      '2 dashes orange tincture',
      '¼ oz lavender infusion',
    ]) {
      const result = lintBody(CANONICAL_BODY, fmWith(['2 oz spirit', ingredient]));
      expect(result.warnings).toContain(
        'ingredient references a House-Made-worthy prep but no house_made field found',
      );
    }
  });

  it('emits only one warning even when multiple craft preps are mentioned', () => {
    const result = lintBody(
      CANONICAL_BODY,
      fmWith(['¾ oz honey-ginger syrup', '¼ oz cherry cordial']),
    );
    expect(result.warnings).toHaveLength(1);
  });

  it('also scans batch.ingredients[] for craft preps', () => {
    const result = lintBody(
      CANONICAL_BODY,
      fmWith(['2 oz gin'], {
        batch: { yield: 'Makes 8', ingredients: ['16 oz gin', '6 oz honey-ginger syrup'] },
      }),
    );
    expect(result.warnings).toContain(
      'ingredient references a House-Made-worthy prep but no house_made field found',
    );
  });

  it('skips the soft rule when publish is not true', () => {
    const result = lintBody(CANONICAL_BODY, {
      publish: false,
      ingredients: ['¾ oz honey-ginger syrup'],
    });
    expect(result).toEqual({ errors: [], warnings: [] });
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
  const fm = (extra = {}) => ({
    publish: true,
    ingredients: ['2 oz spirit'],
    steps: ['Combine'],
    ...extra,
  });

  it('warns when format: batch but no batch field present', () => {
    const result = lintBody(CANONICAL_BODY, fm({ format: 'batch' }));
    expect(result.warnings).toContain(
      'format is batch/punch but no batch field found',
    );
  });

  it('warns when format: punch but no batch field present', () => {
    const result = lintBody(CANONICAL_BODY, fm({ format: 'punch' }));
    expect(result.warnings).toContain(
      'format is batch/punch but no batch field found',
    );
  });

  it('does not warn when format: single (regardless of batch field presence)', () => {
    expect(lintBody(CANONICAL_BODY, fm({ format: 'single' }))).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it('does not warn when format: batch AND batch field is populated', () => {
    expect(
      lintBody(
        CANONICAL_BODY,
        fm({ format: 'batch', batch: { yield: 'Makes 8' } }),
      ),
    ).toEqual({ errors: [], warnings: [] });
  });

  it('does not warn when format frontmatter is missing/undefined', () => {
    expect(lintBody(CANONICAL_BODY, fm())).toEqual({ errors: [], warnings: [] });
  });

  it('skips the soft rule when publish is not true', () => {
    expect(
      lintBody(CANONICAL_BODY, { publish: false, format: 'batch', ingredients: [] }),
    ).toEqual({ errors: [], warnings: [] });
  });
});

