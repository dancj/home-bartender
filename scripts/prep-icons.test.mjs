import { describe, it, expect } from 'vitest';
import {
  splitSpans,
  xyCut,
  applyCellMap,
  stripLabelSegments,
  keepFirstSegment,
  postProcessSvg,
  validateConfig,
} from './prep-icons.mjs';

// Build a tiny grayscale bitmap from ASCII art: '#' = black (0), '.' = white (255).
function bitmap(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8Array(width * height);
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) data[y * width + x] = row[x] === '#' ? 0 : 255;
  });
  return { width, height, data };
}

describe('splitSpans', () => {
  it('splits content runs separated by blank gaps of at least minGap', () => {
    //                0123456789
    const blank = [...'..##..##..'].map((c) => c === '.');
    expect(splitSpans(blank, 2)).toEqual([
      { start: 2, end: 4 },
      { start: 6, end: 8 },
    ]);
  });

  it('merges content runs separated by gaps narrower than minGap', () => {
    const blank = [...'..##.##...'].map((c) => c === '.');
    expect(splitSpans(blank, 2)).toEqual([{ start: 2, end: 7 }]);
  });

  it('returns empty for an all-blank profile', () => {
    expect(splitSpans([true, true, true], 1)).toEqual([]);
  });

  it('handles content touching both edges', () => {
    const blank = [...'##....##'].map((c) => c === '.');
    expect(splitSpans(blank, 2)).toEqual([
      { start: 0, end: 2 },
      { start: 6, end: 8 },
    ]);
  });
});

describe('xyCut', () => {
  // Two icons side by side in one row, second row with one icon.
  const img = bitmap([
    '................',
    '.##......##.....',
    '.##......##.....',
    '................',
    '................',
    '.....##.........',
    '.....##.........',
    '................',
  ]);

  it('slices rows-first into row-major cells', () => {
    const cells = xyCut(img, { axis: 'rows', depth: 2, minGapX: 3, minGapY: 1, threshold: 128 });
    expect(cells).toEqual([
      { x: 1, y: 1, width: 2, height: 2 },
      { x: 9, y: 1, width: 2, height: 2 },
      { x: 5, y: 5, width: 2, height: 2 },
    ]);
  });

  it('depth 1 keeps whole bands as single cells', () => {
    const cells = xyCut(img, { axis: 'rows', depth: 1, minGapX: 3, minGapY: 1, threshold: 128 });
    expect(cells).toEqual([
      { x: 1, y: 1, width: 10, height: 2 },
      { x: 5, y: 5, width: 2, height: 2 },
    ]);
  });

  it('cols-first with depth 1 keeps vertically stacked clusters together', () => {
    // Pips above a glass: one logical icon per column.
    const stacked = bitmap([
      '.##....##.',
      '..........',
      '.##....##.',
      '.##....##.',
    ]);
    const cells = xyCut(stacked, { axis: 'cols', depth: 1, minGapX: 3, minGapY: 1, threshold: 128 });
    expect(cells).toEqual([
      { x: 1, y: 0, width: 2, height: 4 },
      { x: 7, y: 0, width: 2, height: 4 },
    ]);
  });
});

describe('stripLabelSegments', () => {
  it('drops trailing short segments (text labels) below the icon', () => {
    // Icon occupies rows 1-6, label rows 9-10 (short).
    const cell = bitmap([
      '......',
      '.####.',
      '.####.',
      '.####.',
      '.####.',
      '.####.',
      '.####.',
      '......',
      '......',
      '.####.',
      '......',
    ]);
    const box = stripLabelSegments(cell, { x: 0, y: 0, width: 6, height: 11 }, { maxLabelFrac: 0.3, minGapY: 1, threshold: 128 });
    expect(box).toEqual({ x: 0, y: 1, width: 6, height: 6 });
  });

  it('keeps the cell intact when there is a single segment', () => {
    const cell = bitmap(['......', '.####.', '.####.', '......']);
    const box = stripLabelSegments(cell, { x: 0, y: 0, width: 6, height: 4 }, { maxLabelFrac: 0.3, minGapY: 1, threshold: 128 });
    expect(box).toEqual({ x: 0, y: 1, width: 6, height: 2 });
  });

  it('drops only the final label, preserving multi-segment icons (numbered-list glyphs)', () => {
    // Three short icon segments (list lines) + one short label at the bottom.
    const cell = bitmap([
      '.####.',
      '......',
      '.####.',
      '......',
      '.####.',
      '......',
      '......',
      '..##..',
    ]);
    const box = stripLabelSegments(cell, { x: 0, y: 0, width: 6, height: 8 }, { maxLabelFrac: 0.3, minGapY: 1, threshold: 128 });
    expect(box).toEqual({ x: 0, y: 0, width: 6, height: 5 });
  });
});

describe('keepFirstSegment', () => {
  it('returns the bounding box of only the top cluster (pips above glass)', () => {
    const cell = bitmap([
      '.####.',
      '......',
      '......',
      '..##..',
      '..##..',
      '..##..',
    ]);
    const box = keepFirstSegment(cell, { x: 0, y: 0, width: 6, height: 6 }, { minGapY: 2, threshold: 128 });
    expect(box).toEqual({ x: 0, y: 0, width: 6, height: 1 });
  });
});

describe('applyCellMap', () => {
  it('pairs cells with slugs and drops null entries', () => {
    const cells = ['a', 'b', 'c'];
    expect(applyCellMap(cells, ['one', null, 'two'])).toEqual([
      { cell: 'a', slug: 'one' },
      { cell: 'c', slug: 'two' },
    ]);
  });

  it('throws when cell count and map length differ', () => {
    expect(() => applyCellMap(['a', 'b'], ['one'])).toThrow(/expected 1 cells, sliced 2/i);
  });
});

describe('validateConfig', () => {
  const good = {
    'grid.png': { group: 'format', cells: ['single', 'batch', 'punch'] },
  };

  it('accepts a well-formed config', () => {
    expect(() => validateConfig(good)).not.toThrow();
  });

  it('rejects duplicate slugs within a group across files', () => {
    const dup = {
      'a.png': { group: 'format', cells: ['single', 'batch'] },
      'b.png': { group: 'format', cells: ['batch'] },
    };
    expect(() => validateConfig(dup)).toThrow(/duplicate slug "batch"/i);
  });

  it('rejects entries missing group or cells', () => {
    expect(() => validateConfig({ 'a.png': { cells: ['x'] } })).toThrow(/group/i);
    expect(() => validateConfig({ 'a.png': { group: 'ice' } })).toThrow(/cells/i);
  });
});

describe('postProcessSvg', () => {
  const raw = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="512.000000pt" height="512.000000pt" viewBox="0 0 512.000000 512.000000" preserveAspectRatio="xMidYMid meet">
<metadata>Created by potrace 1.16</metadata>
<g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none">
<path d="M10 10 L20 20 Z"/>
</g>
</svg>`;

  it('swaps fill to currentColor and strips fixed dimensions', () => {
    const out = postProcessSvg(raw);
    expect(out).toContain('fill="currentColor"');
    expect(out).not.toContain('#000000');
    expect(out).not.toMatch(/<svg[^>]*width=/);
    expect(out).not.toMatch(/<svg[^>]*height=/);
    expect(out).toContain('viewBox="0 0 512.000000 512.000000"');
  });

  it('drops the doctype and metadata noise', () => {
    const out = postProcessSvg(raw);
    expect(out).not.toContain('DOCTYPE');
    expect(out).not.toContain('<metadata>');
    expect(out.startsWith('<svg')).toBe(true);
  });

  it('adds aria-hidden for decorative use', () => {
    expect(postProcessSvg(raw)).toMatch(/<svg[^>]*aria-hidden="true"/);
  });
});
