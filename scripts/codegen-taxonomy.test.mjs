import { describe, it, expect } from 'vitest';
import { loadTaxonomy, emitZodModule } from './codegen-taxonomy.mjs';

describe('loadTaxonomy', () => {
  it('parses data/taxonomy.yaml into an object keyed by field name', () => {
    const parsed = loadTaxonomy();
    expect(parsed).toBeTypeOf('object');
    expect(parsed).not.toBeNull();
    expect(parsed.methods).toBeInstanceOf(Array);
  });

  it('returns entries as objects with slug and label', () => {
    const parsed = loadTaxonomy();
    const firstMethod = parsed.methods[0];
    expect(firstMethod).toHaveProperty('slug');
    expect(firstMethod).toHaveProperty('label');
  });

  it('accepts an explicit path argument', () => {
    const parsed = loadTaxonomy('data/taxonomy.yaml');
    expect(parsed.methods).toBeInstanceOf(Array);
  });
});

describe('emitZodModule', () => {
  const fixture = {
    methods: [
      { slug: 'shaken', label: 'Shaken' },
      { slug: 'stirred', label: 'Stirred' },
    ],
    glasses: [{ slug: 'coupe', label: 'Coupe' }],
    difficulties: [{ slug: 'easy', label: 'Easy' }],
    families: [{ slug: 'old-fashioned', label: 'Old Fashioned' }],
  };

  it('emits an AUTO-GENERATED header comment', () => {
    const out = emitZodModule(fixture);
    expect(out).toMatch(/AUTO-GENERATED/);
    expect(out).toMatch(/data\/taxonomy\.yaml/);
    expect(out).toMatch(/npm run codegen/);
  });

  it('emits one `as const` export per field, in upper-snake-case keyed by plural', () => {
    const out = emitZodModule(fixture);
    expect(out).toContain("export const METHODS = ['shaken', 'stirred'] as const;");
    expect(out).toContain("export const GLASSES = ['coupe'] as const;");
  });

  it('emits a singular type alias for each const', () => {
    const out = emitZodModule(fixture);
    expect(out).toContain('export type Method = (typeof METHODS)[number];');
    expect(out).toContain('export type Glass = (typeof GLASSES)[number];');
  });

  it('handles -ies pluralisation (difficulties → Difficulty, families → Family)', () => {
    const out = emitZodModule(fixture);
    expect(out).toContain('export type Difficulty = (typeof DIFFICULTIES)[number];');
    expect(out).toContain('export type Family = (typeof FAMILIES)[number];');
  });

  it('handles -ses pluralisation (glasses → Glass)', () => {
    const out = emitZodModule(fixture);
    expect(out).toContain('export type Glass = (typeof GLASSES)[number];');
  });

  it('emits a label map per field for UI use', () => {
    const out = emitZodModule(fixture);
    expect(out).toContain("export const METHOD_LABELS: Record<Method, string> = {");
    expect(out).toContain("'shaken': \"Shaken\"");
    expect(out).toContain("'stirred': \"Stirred\"");
  });

  it('emits an empty array literal when a field has no entries', () => {
    const out = emitZodModule({ occasions: [] });
    expect(out).toContain("export const OCCASIONS = [] as const;");
  });
});

