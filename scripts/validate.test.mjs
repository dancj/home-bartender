import { describe, it, expect } from 'vitest';
import { parseFrontmatter, parseScalar } from './validate.mjs';

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
});

describe('parseScalar', () => {
  it('returns boolean true for the literal "true"', () => {
    expect(parseScalar('true')).toBe(true);
  });

  it('returns boolean false for the literal "false"', () => {
    expect(parseScalar('false')).toBe(false);
  });

  it('returns an integer for an all-digit string', () => {
    expect(parseScalar('42')).toBe(42);
  });

  it('returns an empty array for the literal "[]"', () => {
    expect(parseScalar('[]')).toEqual([]);
  });

  it('returns a string array for a list literal with mixed quoting', () => {
    expect(parseScalar(`["a", b, 'c']`)).toEqual(['a', 'b', 'c']);
  });

  it('strips surrounding double quotes from a bare string', () => {
    expect(parseScalar('"hello"')).toBe('hello');
  });

  it('strips surrounding single quotes from a bare string', () => {
    expect(parseScalar("'hello'")).toBe('hello');
  });

  it('returns the raw string unchanged when no special pattern matches', () => {
    expect(parseScalar('weeknight')).toBe('weeknight');
  });
});
