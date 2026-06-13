import { describe, it, expect } from 'vitest';
import {
  loadTaxonomy,
  emitZodModule,
  emitValidatorModule,
  emitTemplateTable,
  rewriteMarkerRegion,
} from './codegen-taxonomy.mjs';

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

  it('emits a notes map for fields whose entries carry a note', () => {
    const out = emitZodModule({
      families: [
        { slug: 'daiquiri', label: 'Daiquiri', note: 'Spirit + citrus + sweetener (shaken)' },
        { slug: 'flip', label: 'Flip', note: 'Spirit + sugar + whole egg' },
      ],
    });
    expect(out).toContain('export const FAMILY_NOTES: Record<Family, string> = {');
    expect(out).toContain("'daiquiri': \"Spirit + citrus + sweetener (shaken)\"");
    expect(out).toContain("'flip': \"Spirit + sugar + whole egg\"");
  });

  it('omits the notes map for fields whose entries have no note', () => {
    const out = emitZodModule({
      methods: [{ slug: 'shaken', label: 'Shaken' }],
    });
    expect(out).not.toContain('METHOD_NOTES');
  });
});

describe('emitValidatorModule', () => {
  const fixture = {
    methods: [{ slug: 'shaken', label: 'Shaken' }],
    spirits: [
      { slug: 'tequila', label: 'Tequila' },
      { slug: 'mezcal', label: 'Mezcal' },
    ],
  };

  it('emits an AUTO-GENERATED header', () => {
    const out = emitValidatorModule(fixture);
    expect(out).toMatch(/AUTO-GENERATED/);
    expect(out).toMatch(/data\/taxonomy\.yaml/);
  });

  it('emits plain JS exports (no `as const`, no type aliases)', () => {
    const out = emitValidatorModule(fixture);
    expect(out).toContain("export const METHODS = ['shaken'];");
    expect(out).toContain("export const SPIRITS = ['tequila', 'mezcal'];");
    expect(out).not.toContain('as const');
    expect(out).not.toContain('export type');
  });

  it('handles empty fields', () => {
    const out = emitValidatorModule({ occasions: [] });
    expect(out).toContain("export const OCCASIONS = [];");
  });
});

describe('emitTemplateTable', () => {
  const fixture = {
    methods: [{ slug: 'shaken', label: 'Shaken' }, { slug: 'stirred', label: 'Stirred' }],
    glasses: [{ slug: 'coupe', label: 'Coupe' }, { slug: 'rocks', label: 'Rocks' }],
    spirits: [{ slug: 'tequila', label: 'Tequila' }, { slug: 'mezcal', label: 'Mezcal' }],
    families: [
      { slug: 'old-fashioned', label: 'Old Fashioned', source: 'Cocktail Codex' },
    ],
  };

  it('emits a markdown table with the canonical header', () => {
    const out = emitTemplateTable(fixture);
    expect(out).toMatch(/\| Field +\| Allowed values/);
  });

  it('uses singular frontmatter field names for scalar fields (methods → method)', () => {
    const out = emitTemplateTable(fixture);
    expect(out).toContain('| `method`');
    expect(out).toContain('| `glass`');
    expect(out).toContain('| `family`');
  });

  it('keeps plural frontmatter field names for array fields (spirits stays spirits)', () => {
    const out = emitTemplateTable(fixture);
    expect(out).toContain('| `spirits`');
  });

  it('lists slugs comma-separated and backtick-wrapped', () => {
    const out = emitTemplateTable(fixture);
    expect(out).toContain('`shaken`, `stirred`');
    expect(out).toContain('`tequila`, `mezcal`');
  });
});

describe('rewriteMarkerRegion', () => {
  const markerStart = '<!-- taxonomy:start -->';
  const markerEnd = '<!-- taxonomy:end -->';

  it('replaces content between markers and preserves surrounding text', () => {
    const original = `# Header\n\nBefore prose.\n\n${markerStart}\nOLD CONTENT\n${markerEnd}\n\nAfter prose.\n`;
    const next = rewriteMarkerRegion(original, markerStart, markerEnd, 'NEW CONTENT');
    expect(next).toBe(`# Header\n\nBefore prose.\n\n${markerStart}\nNEW CONTENT\n${markerEnd}\n\nAfter prose.\n`);
  });

  it('throws when start marker is missing', () => {
    const original = `# Header\n\n${markerEnd}\n`;
    expect(() => rewriteMarkerRegion(original, markerStart, markerEnd, 'X')).toThrow(/taxonomy:start/);
  });

  it('throws when end marker is missing', () => {
    const original = `# Header\n\n${markerStart}\n`;
    expect(() => rewriteMarkerRegion(original, markerStart, markerEnd, 'X')).toThrow(/taxonomy:end/);
  });

  it('throws when end marker precedes start marker', () => {
    const original = `# Header\n${markerEnd}\nstuff\n${markerStart}\n`;
    expect(() => rewriteMarkerRegion(original, markerStart, markerEnd, 'X')).toThrow(/order/);
  });
});



