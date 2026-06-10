import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolveIconKey, SECTION_ICONS } from './icons';
import {
  SPIRITS,
  GLASSES,
  FLAVORS,
  FAMILIES,
  METHODS,
  ICES,
  DIFFICULTIES,
  FORMATS,
} from '../taxonomy.generated';

describe('resolveIconKey', () => {
  it('aliases every call-site field name to its icon directory', () => {
    expect(resolveIconKey('glass', 'coupe')).toBe('glassware/coupe');
    expect(resolveIconKey('method', 'shaken')).toBe('methods/shaken');
    expect(resolveIconKey('ice', 'none')).toBe('ice/none');
    expect(resolveIconKey('difficulty', 'easy')).toBe('difficulty/easy');
    expect(resolveIconKey('format', 'batch')).toBe('format/batch');
    expect(resolveIconKey('spirit', 'gin')).toBe('spirits/gin');
    expect(resolveIconKey('spirits', 'gin')).toBe('spirits/gin');
    expect(resolveIconKey('family', 'martini')).toBe('families/martini');
    expect(resolveIconKey('families', 'martini')).toBe('families/martini');
    expect(resolveIconKey('flavor', 'smoky')).toBe('flavors/smoky');
    expect(resolveIconKey('flavors', 'smoky')).toBe('flavors/smoky');
    expect(resolveIconKey('sections', 'house-made')).toBe('sections/house-made');
  });

  it('returns null for fields with no icon group', () => {
    expect(resolveIconKey('category', 'classic')).toBeNull();
    expect(resolveIconKey('occasion', 'brunch')).toBeNull();
    expect(resolveIconKey('occasions', 'brunch')).toBeNull();
    expect(resolveIconKey('tag', 'tiki')).toBeNull();
  });

  it('returns null for an empty slug', () => {
    expect(resolveIconKey('glass', '')).toBeNull();
  });

  it('returns null when an availability set is given and misses the key', () => {
    const available = new Set(['glassware/coupe']);
    expect(resolveIconKey('glass', 'coupe', available)).toBe('glassware/coupe');
    expect(resolveIconKey('glass', 'future-glass', available)).toBeNull();
  });
});

describe('taxonomy ↔ icon parity', () => {
  const iconRoot = join(process.cwd(), 'src/assets/icons');

  function iconSlugs(dir: string): string[] {
    return readdirSync(join(iconRoot, dir))
      .filter((f) => f.endsWith('.svg'))
      .map((f) => f.replace(/\.svg$/, ''));
  }

  // dir → slugs that must each have a matching SVG
  const groups: Record<string, readonly string[]> = {
    spirits: SPIRITS,
    glassware: GLASSES,
    flavors: FLAVORS,
    families: FAMILIES,
    methods: METHODS,
    ice: ICES,
    difficulty: DIFFICULTIES,
    format: FORMATS,
    sections: SECTION_ICONS,
  };

  // Known-missing groups: no grids generated yet. When their icons land,
  // the two-way assertion below fails — remove the group here and wire
  // its surfaces (see plan Scope Boundaries).
  const allowlistedMissing = ['categories', 'occasions'];

  for (const [dir, slugs] of Object.entries(groups)) {
    it(`every ${dir} slug has an icon`, () => {
      const present = new Set(iconSlugs(dir));
      const missing = [...slugs].filter((s) => !present.has(s));
      expect(missing, `missing SVGs in ${dir}/: ${missing.join(', ')}`).toEqual([]);
    });
  }

  it('icon tree contains no unexpected groups', () => {
    const dirs = readdirSync(iconRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    expect(dirs).toEqual(Object.keys(groups).sort());
  });

  for (const dir of allowlistedMissing) {
    it(`allowlisted group "${dir}" still has no icons (remove from allowlist when they land)`, () => {
      let entries: string[] = [];
      try {
        entries = readdirSync(join(iconRoot, dir)).filter((f) => f.endsWith('.svg'));
      } catch {
        // Directory absent — expected while the group is allowlisted.
      }
      expect(entries).toEqual([]);
    });
  }
});
