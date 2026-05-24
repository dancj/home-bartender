import { describe, it, expect } from 'vitest';
import { loadTaxonomy } from './codegen-taxonomy.mjs';

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
