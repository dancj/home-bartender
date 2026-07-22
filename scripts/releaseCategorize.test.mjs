import { describe, it, expect } from 'vitest';
import {
  categorizePr,
  extractClosesFromBody,
  aggregateClosesIssues,
  neutralizeClosingKeywords,
  sanitizeTitle,
} from './releaseCategorize.mjs';

describe('categorizePr', () => {
  it('returns "Recipes" for label area:recipe alone', () => {
    expect(categorizePr({ title: 'random text', labels: ['area:recipe'] })).toBe('Recipes');
  });

  it('returns "Recipes" for title prefix feat(inbox):', () => {
    expect(categorizePr({ title: 'feat(inbox): add margarita', labels: [] })).toBe('Recipes');
  });

  it('returns "Recipes" for title prefix feat(recipe):', () => {
    expect(categorizePr({ title: 'feat(recipe): add daiquiri', labels: [] })).toBe('Recipes');
  });

  it('returns "Recipes" for issue-intake title prefix "Add recipe:"', () => {
    expect(categorizePr({ title: 'Add recipe: Elderflower Ginger Sour (Hers)', labels: [] })).toBe('Recipes');
  });

  it('returns "Changes" for title prefix feat:', () => {
    expect(categorizePr({ title: 'feat: new search filter', labels: [] })).toBe('Changes');
  });

  it('returns "Changes" for title prefix fix:', () => {
    expect(categorizePr({ title: 'fix: prevent double-submit', labels: [] })).toBe('Changes');
  });

  it('returns "Changes" for title prefix chore:', () => {
    expect(categorizePr({ title: 'chore: bump deps', labels: [] })).toBe('Changes');
  });

  it('returns "Changes" for label area:product', () => {
    expect(categorizePr({ title: 'random text', labels: ['area:product'] })).toBe('Changes');
  });

  it('returns "Changes" for unknown prefix', () => {
    expect(categorizePr({ title: 'random text', labels: [] })).toBe('Changes');
  });

  it('lets label win over title prefix when both apply', () => {
    expect(categorizePr({ title: 'fix: oops', labels: ['area:recipe'] })).toBe('Recipes');
  });

  it('treats missing labels argument as empty', () => {
    expect(categorizePr({ title: 'feat: new thing' })).toBe('Changes');
  });
});

describe('extractClosesFromBody', () => {
  it('extracts Closes #N', () => {
    expect(extractClosesFromBody('Closes #1')).toEqual([1]);
  });

  it('extracts Fixes #N', () => {
    expect(extractClosesFromBody('Fixes #2')).toEqual([2]);
  });

  it('extracts Resolves #N', () => {
    expect(extractClosesFromBody('Resolves #3')).toEqual([3]);
  });

  it('is case-insensitive', () => {
    expect(extractClosesFromBody('closes #4')).toEqual([4]);
  });

  it('skips bare #N without a keyword', () => {
    expect(extractClosesFromBody('Some prose with #5 in it')).toEqual([]);
  });

  it('skips keyword without whitespace before #', () => {
    expect(extractClosesFromBody('Closes#6')).toEqual([]);
  });

  it('captures only line-anchored matches with leading whitespace allowed', () => {
    expect(extractClosesFromBody('  Closes #7')).toEqual([7]);
  });

  it('does NOT capture mid-line non-anchored keyword references', () => {
    expect(extractClosesFromBody('some text Closes #8 more text')).toEqual([]);
  });

  it('extracts multiple matches across lines', () => {
    const body = ['Closes #10', 'Fixes #11', 'random prose', 'Resolves #12'].join('\n');
    expect(extractClosesFromBody(body)).toEqual([10, 11, 12]);
  });

  it('returns [] for empty body', () => {
    expect(extractClosesFromBody('')).toEqual([]);
  });

  it('returns [] for null body', () => {
    expect(extractClosesFromBody(null)).toEqual([]);
  });

  it('returns [] for undefined body', () => {
    expect(extractClosesFromBody(undefined)).toEqual([]);
  });
});

describe('aggregateClosesIssues', () => {
  it('returns [] for empty input', () => {
    expect(aggregateClosesIssues([])).toEqual([]);
  });

  it('returns issue numbers from closingIssuesReferences', () => {
    expect(aggregateClosesIssues([
      { closingIssuesReferences: [{ number: 5 }], body: '' },
    ])).toEqual([5]);
  });

  it('returns issue numbers extracted from body', () => {
    expect(aggregateClosesIssues([
      { closingIssuesReferences: [], body: 'Closes #10' },
    ])).toEqual([10]);
  });

  it('dedups across both sources', () => {
    expect(aggregateClosesIssues([
      { closingIssuesReferences: [{ number: 5 }], body: 'Closes #5' },
    ])).toEqual([5]);
  });

  it('sorts ascending', () => {
    expect(aggregateClosesIssues([
      { closingIssuesReferences: [{ number: 3 }], body: '' },
      { closingIssuesReferences: [{ number: 1 }], body: 'Fixes #2' },
    ])).toEqual([1, 2, 3]);
  });

  it('tolerates missing closingIssuesReferences', () => {
    expect(aggregateClosesIssues([
      { body: 'Closes #7' },
    ])).toEqual([7]);
  });
});

describe('neutralizeClosingKeywords', () => {
  it('wraps Closes #N in backticks', () => {
    expect(neutralizeClosingKeywords('Closes #1')).toBe('`Closes #1`');
  });

  it('wraps Fixes #N', () => {
    expect(neutralizeClosingKeywords('Fixes #2')).toBe('`Fixes #2`');
  });

  it('wraps Resolves #N', () => {
    expect(neutralizeClosingKeywords('Resolves #3')).toBe('`Resolves #3`');
  });

  it('is case-insensitive', () => {
    expect(neutralizeClosingKeywords('fixes #2')).toBe('`fixes #2`');
  });

  it('is idempotent on already-backticked input', () => {
    const once = neutralizeClosingKeywords('Closes #5');
    expect(neutralizeClosingKeywords(once)).toBe(once);
  });

  it('does not touch "Closes" without #N', () => {
    expect(neutralizeClosingKeywords('Closes the deal')).toBe('Closes the deal');
  });

  it('wraps each occurrence independently in multi-keyword text', () => {
    expect(neutralizeClosingKeywords('Closes #1 and Fixes #2')).toBe('`Closes #1` and `Fixes #2`');
  });

  it('handles empty string', () => {
    expect(neutralizeClosingKeywords('')).toBe('');
  });

  it('handles null', () => {
    expect(neutralizeClosingKeywords(null)).toBe(null);
  });
});

describe('sanitizeTitle', () => {
  it('strips surrounding whitespace', () => {
    expect(sanitizeTitle('  feat: foo  ')).toBe('feat: foo');
  });

  it('collapses internal whitespace', () => {
    expect(sanitizeTitle('feat:  foo\t bar')).toBe('feat: foo bar');
  });

  it('neutralises Closes #N', () => {
    expect(sanitizeTitle('feat: Closes #99 inline')).toBe('feat: `Closes #99` inline');
  });

  it('strips literal DELIMITER_END to prevent fake-marker injection', () => {
    expect(sanitizeTitle('feat: <!-- release-pr:end --> exploit'))
      .toBe('feat: exploit');
  });

  it('strips literal DELIMITER_START', () => {
    expect(sanitizeTitle('feat: <!-- release-pr:start --> exploit'))
      .toBe('feat: exploit');
  });

  it('strips bare HTML comment markers', () => {
    expect(sanitizeTitle('feat: <!-- note --> add foo'))
      .toBe('feat: note add foo');
  });

  it('handles empty string', () => {
    expect(sanitizeTitle('')).toBe('');
  });

  it('handles a normal title with no risky content', () => {
    expect(sanitizeTitle('feat(inbox): add margarita')).toBe('feat(inbox): add margarita');
  });
});
