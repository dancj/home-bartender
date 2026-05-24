import { describe, it, expect } from 'vitest';
import {
  parseStylesLine,
  dedupTags,
  renderTagsLine,
  migrateFileContent,
} from './migrate-styles-to-tags.mjs';

describe('parseStylesLine', () => {
  it('returns null for non-styles lines', () => {
    expect(parseStylesLine('method: shaken')).toBeNull();
    expect(parseStylesLine('# comment about styles')).toBeNull();
  });
  it('returns [] for an empty array', () => {
    expect(parseStylesLine('styles: []')).toEqual([]);
  });
  it('parses a flat list', () => {
    expect(parseStylesLine('styles: [shaken, floral]')).toEqual(['shaken', 'floral']);
  });
  it('strips surrounding quotes', () => {
    expect(parseStylesLine(`styles: ["shaken", 'floral']`)).toEqual(['shaken', 'floral']);
  });
});

describe('dedupTags', () => {
  const canonical = new Set(['shaken', 'stirred', 'highball', 'sour', 'fruity']);

  it('drops values present in the canonical set', () => {
    expect(dedupTags(['shaken', 'smoky-sour'], canonical)).toEqual(['smoky-sour']);
    expect(dedupTags(['highball', 'refreshing'], canonical)).toEqual(['refreshing']);
  });
  it('keeps values not in the canonical set', () => {
    expect(dedupTags(['spicy', 'smoky-sour'], canonical)).toEqual(['spicy', 'smoky-sour']);
  });
  it('returns an empty array when all values are canonical', () => {
    expect(dedupTags(['shaken', 'stirred', 'sour'], canonical)).toEqual([]);
  });
});

describe('renderTagsLine', () => {
  it('emits an empty tags array literal', () => {
    expect(renderTagsLine([])).toBe('tags: []');
  });
  it('emits a flat tags list', () => {
    expect(renderTagsLine(['smoky-sour'])).toBe('tags: [smoky-sour]');
    expect(renderTagsLine(['a', 'b', 'c'])).toBe('tags: [a, b, c]');
  });
});

describe('migrateFileContent', () => {
  const canonical = new Set(['shaken', 'stirred', 'highball', 'sour', 'fruity']);

  it('renames styles: to tags: and dedups against the canonical set', () => {
    const raw = '---\ntitle: Foo\nstyles: [shaken, smoky-sour]\nflavors: [smoky]\n---\n\nbody\n';
    const { content, changed } = migrateFileContent(raw, canonical);
    expect(changed).toBe(true);
    expect(content).toContain('tags: [smoky-sour]');
    expect(content).not.toContain('styles:');
  });

  it('emits tags: [] when all styles values dedup out', () => {
    const raw = '---\ntitle: Foo\nstyles: [shaken, stirred]\n---\n\nbody\n';
    const { content, changed } = migrateFileContent(raw, canonical);
    expect(changed).toBe(true);
    expect(content).toContain('tags: []');
  });

  it('is a no-op when no styles: key is present (idempotent re-run)', () => {
    const raw = '---\ntitle: Foo\ntags: [spicy]\n---\n\nbody\n';
    const { content, changed } = migrateFileContent(raw, canonical);
    expect(changed).toBe(false);
    expect(content).toBe(raw);
  });

  it('only touches the frontmatter block — body mentions of "styles:" are unchanged', () => {
    const raw = '---\ntitle: Foo\nstyles: [shaken]\n---\n\nThe styles: of garnish vary.\n';
    const { content } = migrateFileContent(raw, canonical);
    expect(content).toContain('tags: []');
    expect(content).toContain('The styles: of garnish vary.');
  });

  it('returns the input unchanged when there is no frontmatter at all', () => {
    const raw = 'just body text, no frontmatter\n';
    const { content, changed } = migrateFileContent(raw, canonical);
    expect(changed).toBe(false);
    expect(content).toBe(raw);
  });
});
