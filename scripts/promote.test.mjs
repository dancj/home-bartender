import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import {
  assertValidCategory,
  dirForCategory,
  rewritePromotionFrontmatter,
  promote,
  parseArgs,
} from './promote.mjs';

const CANONICAL_INBOX = [
  '---',
  'title: Test Recipe',
  'category: inbox',
  'publish: false',
  'glass: coupe',
  'method: shaken',
  'attribution:',
  '  creator: Test Author',
  '  bar: Test Bar',
  '---',
  '',
  '# Test Recipe',
  '',
  '> *A short blurb*',
  '',
  '## Ingredients',
  '- 2 oz spirit',
  '- 1 oz juice',
  '',
  '## Steps',
  '1. Shake.',
  '2. Strain.',
  '',
].join('\n');

describe('assertValidCategory', () => {
  it('returns without throwing for valid singulars', () => {
    expect(() => assertValidCategory('classic')).not.toThrow();
    expect(() => assertValidCategory('original')).not.toThrow();
    expect(() => assertValidCategory('seasonal')).not.toThrow();
  });

  it('throws on the common pluralization mistake "classics"', () => {
    expect(() => assertValidCategory('classics')).toThrow(/category/i);
  });

  it('throws on "inbox" — cannot promote to inbox', () => {
    expect(() => assertValidCategory('inbox')).toThrow(/inbox/i);
  });

  it('throws on undefined', () => {
    expect(() => assertValidCategory(undefined)).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => assertValidCategory('')).toThrow();
  });

  it('throws on null', () => {
    expect(() => assertValidCategory(null)).toThrow();
  });
});

describe('dirForCategory', () => {
  it('maps classic to classics', () => {
    expect(dirForCategory('classic')).toBe('classics');
  });

  it('maps original to originals', () => {
    expect(dirForCategory('original')).toBe('originals');
  });

  it('maps seasonal to seasonal (self)', () => {
    expect(dirForCategory('seasonal')).toBe('seasonal');
  });

  it('throws on unknown categories', () => {
    expect(() => dirForCategory('unknown')).toThrow();
  });

  it('throws on "inbox" — cannot promote to inbox', () => {
    expect(() => dirForCategory('inbox')).toThrow();
  });
});

describe('rewritePromotionFrontmatter', () => {
  it('flips category and publish lines, preserves every other byte', () => {
    const out = rewritePromotionFrontmatter(CANONICAL_INBOX, { category: 'classic' });
    const expected = CANONICAL_INBOX
      .replace('category: inbox', 'category: classic')
      .replace('publish: false', 'publish: true');
    expect(out).toBe(expected);
  });

  it('preserves blank lines, indentation, and body content', () => {
    const out = rewritePromotionFrontmatter(CANONICAL_INBOX, { category: 'original' });
    expect(out).toContain('  creator: Test Author');
    expect(out).toContain('\n\n# Test Recipe\n');
    expect(out).toContain('## Steps');
    expect(out).toContain('1. Shake.');
  });

  it('does not touch frontmatter keys other than category and publish', () => {
    const out = rewritePromotionFrontmatter(CANONICAL_INBOX, { category: 'classic' });
    expect(out).toContain('title: Test Recipe');
    expect(out).toContain('glass: coupe');
    expect(out).toContain('method: shaken');
  });

  it('throws when the `category: inbox` line is absent', () => {
    const already = CANONICAL_INBOX.replace('category: inbox', 'category: classic');
    expect(() => rewritePromotionFrontmatter(already, { category: 'classic' })).toThrow(/inbox/i);
  });

  it('throws when the `publish: false` line is absent', () => {
    const already = CANONICAL_INBOX.replace('publish: false', 'publish: true');
    expect(() => rewritePromotionFrontmatter(already, { category: 'classic' })).toThrow(/publish/i);
  });

  it('throws when the frontmatter block is missing entirely', () => {
    expect(() => rewritePromotionFrontmatter('# just a body, no frontmatter\n', { category: 'classic' }))
      .toThrow(/frontmatter/i);
  });

  it('throws when the frontmatter has no closing delimiter', () => {
    const raw = '---\ntitle: Foo\ncategory: inbox\npublish: false\nbody without closing fence\n';
    expect(() => rewritePromotionFrontmatter(raw, { category: 'classic' })).toThrow(/frontmatter/i);
  });

  it('propagates assertValidCategory errors when the target is invalid', () => {
    expect(() => rewritePromotionFrontmatter(CANONICAL_INBOX, { category: 'classics' })).toThrow();
    expect(() => rewritePromotionFrontmatter(CANONICAL_INBOX, { category: 'inbox' })).toThrow();
  });
});

function makeDeps({
  slug = 'test-recipe',
  inboxContent = CANONICAL_INBOX,
  inboxMissing = false,
  dstExists = false,
  dstExistingContent = '---\ntitle: pre-existing\n---\n',
  validateFails = false,
  rollbackMvFails = false,
} = {}) {
  const rootDir = '/repo';
  const inboxPath = path.join(rootDir, 'recipes', 'inbox', `${slug}.md`);
  const calls = { exec: [], readFile: [], writeFile: [] };

  const readFile = async (p, _enc) => {
    calls.readFile.push(p);
    if (p === inboxPath) {
      if (inboxMissing) {
        const err = new Error(`ENOENT: ${p}`);
        err.code = 'ENOENT';
        throw err;
      }
      return inboxContent;
    }
    // Target-dir paths
    if (dstExists && p.endsWith(`${slug}.md`) && !p.includes('/inbox/')) {
      return dstExistingContent;
    }
    const err = new Error(`ENOENT: ${p}`);
    err.code = 'ENOENT';
    throw err;
  };

  const writeFile = async (p, content) => {
    calls.writeFile.push({ path: p, content });
  };

  let mvCallCount = 0;
  const exec = async (cmd, args) => {
    calls.exec.push({ cmd, args });
    if (cmd === 'git' && args[0] === 'mv') {
      mvCallCount += 1;
      // First mv is forward; second (rollback) is reverse.
      if (mvCallCount === 2 && rollbackMvFails) {
        throw new Error('simulated git mv failure during rollback');
      }
      return { stdout: '', stderr: '' };
    }
    if (cmd === 'npm' && args[0] === 'run' && args[1] === 'validate') {
      if (validateFails) {
        const err = new Error('npm run validate exited 1');
        err.stderr = 'ERROR: duplicate slug "test-recipe"';
        throw err;
      }
      return { stdout: '', stderr: '' };
    }
    throw new Error(`unexpected exec: ${cmd} ${args.join(' ')}`);
  };

  return { exec, readFile, writeFile, rootDir, calls };
}

describe('promote — happy path', () => {
  it('reads inbox file, writes new content, git mv to category dir, runs validate', async () => {
    const deps = makeDeps();
    const result = await promote({
      slug: 'test-recipe',
      category: 'classic',
      ...deps,
    });

    expect(result.changed).toBe(true);
    expect(result.srcPath).toBe('/repo/recipes/inbox/test-recipe.md');
    expect(result.dstPath).toBe('/repo/recipes/classics/test-recipe.md');

    // Read both source (to load original) and destination (to check collision).
    expect(deps.calls.readFile).toContain('/repo/recipes/inbox/test-recipe.md');
    expect(deps.calls.readFile).toContain('/repo/recipes/classics/test-recipe.md');

    // Wrote rewritten content to the inbox path before the mv.
    expect(deps.calls.writeFile).toHaveLength(1);
    expect(deps.calls.writeFile[0].path).toBe('/repo/recipes/inbox/test-recipe.md');
    expect(deps.calls.writeFile[0].content).toContain('category: classic');
    expect(deps.calls.writeFile[0].content).toContain('publish: true');

    // Two execs: git mv, npm run validate (in that order).
    expect(deps.calls.exec).toHaveLength(2);
    expect(deps.calls.exec[0]).toEqual({
      cmd: 'git',
      args: ['mv', '/repo/recipes/inbox/test-recipe.md', '/repo/recipes/classics/test-recipe.md'],
    });
    expect(deps.calls.exec[1]).toEqual({
      cmd: 'npm',
      args: ['run', 'validate'],
    });
  });

  it('maps each category to its directory correctly', async () => {
    for (const [category, dir] of [
      ['classic', 'classics'],
      ['original', 'originals'],
      ['seasonal', 'seasonal'],
    ]) {
      const deps = makeDeps({ slug: 'r' });
      const result = await promote({ slug: 'r', category, ...deps });
      expect(result.dstPath).toBe(`/repo/recipes/${dir}/r.md`);
    }
  });
});

describe('promote — dry run', () => {
  it('reads inbox file and target, but performs no writes or execs', async () => {
    const deps = makeDeps();
    const result = await promote({
      slug: 'test-recipe',
      category: 'classic',
      dryRun: true,
      ...deps,
    });

    expect(result).toEqual({
      srcPath: '/repo/recipes/inbox/test-recipe.md',
      dstPath: '/repo/recipes/classics/test-recipe.md',
      changed: false,
      dryRun: true,
    });

    expect(deps.calls.writeFile).toHaveLength(0);
    expect(deps.calls.exec).toHaveLength(0);
  });

  it('still throws when the inbox file is missing in dry-run', async () => {
    const deps = makeDeps({ inboxMissing: true });
    await expect(
      promote({ slug: 'test-recipe', category: 'classic', dryRun: true, ...deps }),
    ).rejects.toThrow(/not found|Inbox/i);
  });

  it('still throws when the file is already promoted in dry-run', async () => {
    const already = CANONICAL_INBOX.replace('category: inbox', 'category: classic');
    const deps = makeDeps({ inboxContent: already });
    await expect(
      promote({ slug: 'test-recipe', category: 'classic', dryRun: true, ...deps }),
    ).rejects.toThrow();
  });
});

describe('promote — error paths', () => {
  it('throws clearly when the inbox file is missing', async () => {
    const deps = makeDeps({ inboxMissing: true });
    await expect(
      promote({ slug: 'missing', category: 'classic', ...deps }),
    ).rejects.toThrow(/not found|Inbox/i);
    expect(deps.calls.writeFile).toHaveLength(0);
    expect(deps.calls.exec).toHaveLength(0);
  });

  it('throws on slug collision (target file already exists)', async () => {
    const deps = makeDeps({ dstExists: true });
    await expect(
      promote({ slug: 'test-recipe', category: 'classic', ...deps }),
    ).rejects.toThrow(/collision|already exists/i);
    expect(deps.calls.writeFile).toHaveLength(0);
    expect(deps.calls.exec).toHaveLength(0);
  });

  it('throws when the file is already promoted', async () => {
    const already = CANONICAL_INBOX.replace('category: inbox', 'category: classic');
    const deps = makeDeps({ inboxContent: already });
    await expect(
      promote({ slug: 'test-recipe', category: 'classic', ...deps }),
    ).rejects.toThrow(/inbox/i);
    expect(deps.calls.writeFile).toHaveLength(0);
    expect(deps.calls.exec).toHaveLength(0);
  });

  it('throws on invalid category before any I/O', async () => {
    const deps = makeDeps();
    await expect(
      promote({ slug: 'test-recipe', category: 'classics', ...deps }),
    ).rejects.toThrow(/category/i);
    expect(deps.calls.readFile).toHaveLength(0);
    expect(deps.calls.writeFile).toHaveLength(0);
    expect(deps.calls.exec).toHaveLength(0);
  });

  it('throws on invalid slug (empty, slashes) before any I/O', async () => {
    const deps1 = makeDeps();
    await expect(
      promote({ slug: '', category: 'classic', ...deps1 }),
    ).rejects.toThrow(/slug/i);
    expect(deps1.calls.readFile).toHaveLength(0);

    const deps2 = makeDeps();
    await expect(
      promote({ slug: '../etc/passwd', category: 'classic', ...deps2 }),
    ).rejects.toThrow(/slug/i);
    expect(deps2.calls.readFile).toHaveLength(0);
  });
});

describe('promote — rollback', () => {
  it('reverses git mv and restores original content when validate fails', async () => {
    const deps = makeDeps({ validateFails: true });
    await expect(
      promote({ slug: 'test-recipe', category: 'classic', ...deps }),
    ).rejects.toThrow(/validation failed.*rolled back/i);

    // Expected exec sequence: forward mv, validate (fails), reverse mv.
    expect(deps.calls.exec).toHaveLength(3);
    expect(deps.calls.exec[0]).toEqual({
      cmd: 'git',
      args: ['mv', '/repo/recipes/inbox/test-recipe.md', '/repo/recipes/classics/test-recipe.md'],
    });
    expect(deps.calls.exec[1]).toEqual({
      cmd: 'npm',
      args: ['run', 'validate'],
    });
    expect(deps.calls.exec[2]).toEqual({
      cmd: 'git',
      args: ['mv', '/repo/recipes/classics/test-recipe.md', '/repo/recipes/inbox/test-recipe.md'],
    });

    // writeFile called twice: once with new content (apply), once with original (restore).
    expect(deps.calls.writeFile).toHaveLength(2);
    expect(deps.calls.writeFile[0].content).toContain('category: classic');
    expect(deps.calls.writeFile[0].content).toContain('publish: true');
    expect(deps.calls.writeFile[1].content).toBe(CANONICAL_INBOX);
  });

  it('surfaces both errors when the rollback itself fails', async () => {
    const deps = makeDeps({ validateFails: true, rollbackMvFails: true });
    await expect(
      promote({ slug: 'test-recipe', category: 'classic', ...deps }),
    ).rejects.toThrow(/validation failed.*rollback failed/i);
  });
});

describe('promote — subprocess discipline', () => {
  it('uses execFile-style argv arrays, never shell strings', async () => {
    const deps = makeDeps();
    await promote({ slug: 'test-recipe', category: 'classic', ...deps });
    for (const call of deps.calls.exec) {
      expect(Array.isArray(call.args)).toBe(true);
      // No shell metacharacters in any single arg.
      for (const arg of call.args) {
        expect(arg).not.toMatch(/[;&|`$()<>]/);
      }
    }
  });
});

describe('promote — pre-flight body lint (U4)', () => {
  // Body-invalid inbox: ## Steps removed. The publish:true flip during promote
  // activates the body rule, which would otherwise only surface after the
  // git mv + npm run validate. Pre-flight must surface this BEFORE any
  // side effects (no writeFile, no exec).
  const INBOX_MISSING_STEPS = [
    '---',
    'title: Body Broken',
    'category: inbox',
    'publish: false',
    'glass: coupe',
    'method: shaken',
    '---',
    '',
    '## Ingredients',
    '- 2 oz spirit',
    '',
  ].join('\n');

  // Body-valid but soft-rule trigger (format: batch, no ## How to Batch It).
  // Should produce a warning but NOT block promotion.
  const INBOX_BATCH_NO_BATCH_HEADING = [
    '---',
    'title: Batched Drink',
    'category: inbox',
    'publish: false',
    'glass: coupe',
    'method: shaken',
    'format: batch',
    '---',
    '',
    '## Ingredients',
    '- 2 oz spirit',
    '',
    '## Steps',
    '1. Combine.',
    '',
  ].join('\n');

  it('rejects body-invalid inbox before any side effects (no writeFile, no exec)', async () => {
    const deps = makeDeps({ inboxContent: INBOX_MISSING_STEPS });
    await expect(
      promote({ slug: 'test-recipe', category: 'classic', ...deps }),
    ).rejects.toThrow(/Body validation failed|## Steps/i);
    expect(deps.calls.writeFile).toHaveLength(0);
    expect(deps.calls.exec).toHaveLength(0);
  });

  it('rejects body-invalid inbox even in --dry-run mode (pre-flight runs before dryRun guard)', async () => {
    const deps = makeDeps({ inboxContent: INBOX_MISSING_STEPS });
    await expect(
      promote({ slug: 'test-recipe', category: 'classic', dryRun: true, ...deps }),
    ).rejects.toThrow(/Body validation failed|## Steps/i);
    expect(deps.calls.writeFile).toHaveLength(0);
    expect(deps.calls.exec).toHaveLength(0);
  });

  it('does not block promotion on body warnings; proceeds and emits stderr WARN', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const deps = makeDeps({ inboxContent: INBOX_BATCH_NO_BATCH_HEADING });
    const result = await promote({
      slug: 'test-recipe',
      category: 'classic',
      ...deps,
    });
    expect(result.changed).toBe(true);
    expect(deps.calls.exec).toHaveLength(2); // git mv + npm run validate
    expect(deps.calls.writeFile).toHaveLength(1);
    const warningOutput = warnSpy.mock.calls.flat().join('\n');
    expect(warningOutput).toMatch(/How to Batch It/i);
    warnSpy.mockRestore();
  });

  it('happy path unchanged: pre-flight passes on canonical body without new DI calls', async () => {
    // SG-001 fix: pre-flight operates on in-memory newContent; no extra readFile.
    // Expected readFile calls remain exactly: inbox src + dst collision check = 2.
    const deps = makeDeps();
    await promote({ slug: 'test-recipe', category: 'classic', ...deps });
    expect(deps.calls.readFile).toHaveLength(2);
    expect(deps.calls.readFile[0]).toBe('/repo/recipes/inbox/test-recipe.md');
    expect(deps.calls.readFile[1]).toBe('/repo/recipes/classics/test-recipe.md');
  });

  it('pre-flight runs after collision check (collision wins when both fire)', async () => {
    // SG-003 ordering: collision is the cheaper, more specific failure mode.
    const deps = makeDeps({
      inboxContent: INBOX_MISSING_STEPS,
      dstExists: true,
    });
    await expect(
      promote({ slug: 'test-recipe', category: 'classic', ...deps }),
    ).rejects.toThrow(/collision|already exists/i);
    expect(deps.calls.writeFile).toHaveLength(0);
    expect(deps.calls.exec).toHaveLength(0);
  });
});

describe('parseArgs', () => {
  it('parses positional slug + --category= into a result object', () => {
    expect(parseArgs(['my-recipe', '--category=classic'])).toEqual({
      slug: 'my-recipe',
      category: 'classic',
      dryRun: false,
    });
  });

  it('recognises --dry-run', () => {
    expect(parseArgs(['my-recipe', '--category=classic', '--dry-run'])).toEqual({
      slug: 'my-recipe',
      category: 'classic',
      dryRun: true,
    });
  });

  it('does not depend on flag vs positional order', () => {
    expect(parseArgs(['--category=classic', 'my-recipe'])).toEqual({
      slug: 'my-recipe',
      category: 'classic',
      dryRun: false,
    });
    expect(parseArgs(['--dry-run', '--category=original', 'my-recipe'])).toEqual({
      slug: 'my-recipe',
      category: 'original',
      dryRun: true,
    });
  });

  it('throws a usage error on no args', () => {
    expect(() => parseArgs([])).toThrow(/usage|slug/i);
  });

  it('throws a usage error when --category= is missing', () => {
    expect(() => parseArgs(['my-recipe'])).toThrow(/--category=/);
  });

  it('throws a usage error when --category= is empty', () => {
    expect(() => parseArgs(['my-recipe', '--category='])).toThrow(/--category=/);
  });

  it('throws when the slug positional is missing', () => {
    expect(() => parseArgs(['--category=classic'])).toThrow(/slug/i);
  });

  it('throws on unknown flags', () => {
    expect(() => parseArgs(['my-recipe', '--category=classic', '--frobnicate'])).toThrow(/--frobnicate|unknown/i);
  });

  it('rejects duplicate --category= flags', () => {
    expect(() =>
      parseArgs(['my-recipe', '--category=classic', '--category=original']),
    ).toThrow(/duplicate|--category=/i);
  });

  it('rejects multiple positional arguments', () => {
    expect(() => parseArgs(['a', 'b', '--category=classic'])).toThrow(/slug/i);
  });
});
