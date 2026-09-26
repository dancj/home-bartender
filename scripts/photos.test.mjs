import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import { parsePhotoName, setPhotoFrontmatter, ingestPhotos } from './photos.mjs';

const RECIPE = [
  '---',
  'title: Last Word',
  'category: classic',
  'publish: true',
  'hero_image: ""',
  'gallery: []',
  'preparations: []',
  '---',
  '',
  '## Notes',
  '',
  'Body text.',
  '',
].join('\n');

describe('parsePhotoName', () => {
  it('parses a hero photo', () => {
    expect(parsePhotoName('last-word.jpg')).toEqual({ slug: 'last-word', role: 'hero' });
  });

  it('parses an ingredients photo with a case-insensitive extension', () => {
    expect(parsePhotoName('last-word-ingredients.JPG')).toEqual({
      slug: 'last-word',
      role: 'ingredients',
    });
  });

  it.each(['a.jpeg', 'a.png', 'a.webp'])('accepts %s', (name) => {
    expect(parsePhotoName(name).slug).toBe('a');
  });

  it('rejects HEIC with an export hint', () => {
    expect(() => parsePhotoName('last-word.heic')).toThrow(/export.*JPEG/i);
  });

  it('rejects unsupported extensions', () => {
    expect(() => parsePhotoName('last-word.gif')).toThrow(/unsupported/i);
  });

  it.each(['../last-word.jpg', 'a/b.jpg', 'Last Word.jpg', '-ingredients.jpg'])(
    'rejects unsafe or non-slug name %s',
    (name) => {
      expect(() => parsePhotoName(name)).toThrow();
    },
  );
});

describe('setPhotoFrontmatter', () => {
  it('sets hero_image and leaves everything else byte-identical', () => {
    const out = setPhotoFrontmatter(RECIPE, { role: 'hero', file: './last-word.jpg' });
    expect(out).toBe(RECIPE.replace('hero_image: ""', 'hero_image: ./last-word.jpg'));
  });

  it('adds the ingredients photo to an empty gallery', () => {
    const out = setPhotoFrontmatter(RECIPE, {
      role: 'ingredients',
      file: './last-word-ingredients.jpg',
    });
    expect(out).toBe(RECIPE.replace('gallery: []', 'gallery: [./last-word-ingredients.jpg]'));
  });

  it('keeps exactly one ingredients entry and preserves other gallery entries', () => {
    const start = RECIPE.replace('gallery: []', 'gallery: [./other.jpg, "./last-word-ingredients.jpg"]');
    const out = setPhotoFrontmatter(start, {
      role: 'ingredients',
      file: './last-word-ingredients.jpg',
    });
    expect(out).toContain('gallery: [./other.jpg, ./last-word-ingredients.jpg]');
  });

  it('inserts missing keys before the closing fence', () => {
    const bare = RECIPE.replace('hero_image: ""\n', '').replace('gallery: []\n', '');
    let out = setPhotoFrontmatter(bare, { role: 'hero', file: './x.jpg' });
    out = setPhotoFrontmatter(out, { role: 'ingredients', file: './x-ingredients.jpg' });
    expect(out).toContain('preparations: []\nhero_image: ./x.jpg\ngallery: [./x-ingredients.jpg]\n---\n');
    expect(out.endsWith('Body text.\n')).toBe(true);
  });

  it('refuses a block-style gallery list', () => {
    const block = RECIPE.replace('gallery: []', 'gallery:\n  - ./a.jpg');
    expect(() => setPhotoFrontmatter(block, { role: 'ingredients', file: './b.jpg' })).toThrow(
      /hand-edit/i,
    );
  });

  it('throws without a frontmatter block', () => {
    expect(() => setPhotoFrontmatter('# no fm\n', { role: 'hero', file: './a.jpg' })).toThrow();
  });
});

function fakeFs(files) {
  const store = new Map(Object.entries(files));
  return {
    store,
    readdir: vi.fn(async (dir) => {
      const prefix = dir.endsWith('/') ? dir : `${dir}/`;
      const names = new Set();
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) names.add(key.slice(prefix.length).split('/')[0]);
      }
      if (names.size === 0) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return [...names];
    }),
    readFile: vi.fn(async (p) => {
      if (!store.has(p)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return store.get(p);
    }),
    writeFile: vi.fn(async (p, c) => void store.set(p, c)),
    unlink: vi.fn(async (p) => void store.delete(p)),
  };
}

const ROOT = '/repo';
const INTAKE = path.join(ROOT, 'intake/photos');
const LW = path.join(ROOT, 'recipes/classics/last-word.md');

describe('ingestPhotos', () => {
  it('moves known photos, wires frontmatter, and leaves unknown slugs in place', async () => {
    const fs = fakeFs({
      [LW]: RECIPE,
      [path.join(ROOT, 'recipes/inbox/other.md')]: RECIPE,
      [`${INTAKE}/last-word.jpg`]: 'img',
      [`${INTAKE}/last-word-ingredients.jpg`]: 'img',
      [`${INTAKE}/lst-word.jpg`]: 'img',
      [`${INTAKE}/.DS_Store`]: 'junk',
    });
    const resize = vi.fn(async (src, dst) => void fs.store.set(dst, 'jpeg'));

    const result = await ingestPhotos({ rootDir: ROOT, ...fs, resize });

    expect(resize).toHaveBeenCalledWith(
      `${INTAKE}/last-word.jpg`,
      path.join(ROOT, 'recipes/classics/last-word.jpg'),
    );
    expect(fs.store.has(path.join(ROOT, 'recipes/classics/last-word-ingredients.jpg'))).toBe(true);
    expect(fs.store.get(LW)).toContain('hero_image: ./last-word.jpg');
    expect(fs.store.get(LW)).toContain('gallery: [./last-word-ingredients.jpg]');
    expect(fs.store.has(`${INTAKE}/last-word.jpg`)).toBe(false);
    expect(fs.store.has(`${INTAKE}/last-word-ingredients.jpg`)).toBe(false);
    expect(fs.store.has(`${INTAKE}/lst-word.jpg`)).toBe(true);
    expect(result.moved).toHaveLength(2);
    expect(result.rejected).toEqual([{ file: 'lst-word.jpg', reason: expect.stringMatching(/no recipe/i) }]);
    expect(result.ok).toBe(false);
  });

  it('re-ingesting replaces the file without duplicating the gallery entry', async () => {
    const fs = fakeFs({
      [LW]: RECIPE.replace('hero_image: ""', 'hero_image: ./last-word.jpg').replace(
        'gallery: []',
        'gallery: [./last-word-ingredients.jpg]',
      ),
      [`${INTAKE}/last-word-ingredients.png`]: 'img',
    });
    const resize = vi.fn(async (src, dst) => void fs.store.set(dst, 'jpeg'));

    const result = await ingestPhotos({ rootDir: ROOT, ...fs, resize });

    expect(fs.store.get(LW)).toContain('gallery: [./last-word-ingredients.jpg]\n');
    expect(result.ok).toBe(true);
  });

  it('keeps the source and recipe untouched when resize fails', async () => {
    const fs = fakeFs({ [LW]: RECIPE, [`${INTAKE}/last-word.jpg`]: 'img' });
    const resize = vi.fn(async () => {
      throw new Error('corrupt image');
    });

    const result = await ingestPhotos({ rootDir: ROOT, ...fs, resize });

    expect(fs.store.get(LW)).toBe(RECIPE);
    expect(fs.store.has(`${INTAKE}/last-word.jpg`)).toBe(true);
    expect(result.rejected[0]).toEqual({ file: 'last-word.jpg', reason: expect.stringMatching(/corrupt/) });
    expect(result.ok).toBe(false);
  });

  it('rejects every file when one slug+role arrives in two formats, deleting nothing', async () => {
    const fs = fakeFs({
      [LW]: RECIPE,
      [`${INTAKE}/last-word.jpg`]: 'img',
      [`${INTAKE}/last-word.png`]: 'img',
    });
    const resize = vi.fn();

    const result = await ingestPhotos({ rootDir: ROOT, ...fs, resize });

    expect(resize).not.toHaveBeenCalled();
    expect(fs.store.has(`${INTAKE}/last-word.jpg`)).toBe(true);
    expect(fs.store.has(`${INTAKE}/last-word.png`)).toBe(true);
    expect(result.rejected.map((r) => r.file).sort()).toEqual(['last-word.jpg', 'last-word.png']);
    expect(result.rejected[0].reason).toMatch(/keep one/i);
  });

  it('rejects photos for inbox drafts until they are promoted', async () => {
    const fs = fakeFs({
      [path.join(ROOT, 'recipes/inbox/draft.md')]: RECIPE,
      [`${INTAKE}/draft.jpg`]: 'img',
    });
    const result = await ingestPhotos({ rootDir: ROOT, ...fs, resize: vi.fn() });
    expect(result.rejected).toEqual([{ file: 'draft.jpg', reason: expect.stringMatching(/promote/i) }]);
    expect(fs.store.has(`${INTAKE}/draft.jpg`)).toBe(true);
  });

  it('rejects an ingredients photo when the recipe has no hero and none is in the batch', async () => {
    const fs = fakeFs({ [LW]: RECIPE, [`${INTAKE}/last-word-ingredients.jpg`]: 'img' });
    const result = await ingestPhotos({ rootDir: ROOT, ...fs, resize: vi.fn() });
    expect(result.rejected[0].reason).toMatch(/hero/i);
    expect(fs.store.get(LW)).toBe(RECIPE);
  });

  it('rejects an ingredients photo when the gallery already shows two other photos', async () => {
    const full = RECIPE.replace('hero_image: ""', 'hero_image: ./last-word.jpg').replace(
      'gallery: []',
      'gallery: [./a.jpg, ./b.jpg]',
    );
    const fs = fakeFs({ [LW]: full, [`${INTAKE}/last-word-ingredients.jpg`]: 'img' });
    const result = await ingestPhotos({ rootDir: ROOT, ...fs, resize: vi.fn() });
    expect(result.rejected[0].reason).toMatch(/gallery.*full|two/i);
    expect(fs.store.get(LW)).toBe(full);
  });

  it('reports an empty or missing intake folder', async () => {
    const fs = fakeFs({ [LW]: RECIPE });
    const result = await ingestPhotos({ rootDir: ROOT, ...fs, resize: vi.fn() });
    expect(result).toEqual({ moved: [], rejected: [], ok: true });
  });
});
