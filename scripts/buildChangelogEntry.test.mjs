import { describe, it, expect } from 'vitest';
import {
  renderChangelogEntry,
  injectChangelogEntry,
} from './buildChangelogEntry.mjs';

function makePr(overrides = {}) {
  return {
    number: 1,
    title: 'feat: foo',
    labels: [],
    author: { login: 'someone' },
    body: '',
    closingIssuesReferences: [],
    ...overrides,
  };
}

describe('renderChangelogEntry', () => {
  it('renders just the version heading when prs is empty', () => {
    const entry = renderChangelogEntry({
      version: '2026.5.23.1',
      date: new Date('2026-05-23T12:00:00Z'),
      prs: [],
    });
    expect(entry).toContain('## [2026.5.23.1] - 2026-05-23');
    expect(entry).not.toContain('### ');
  });

  it('renders a flat bullet list with no category headings', () => {
    const entry = renderChangelogEntry({
      version: '2026.5.23.1',
      date: new Date('2026-05-23T12:00:00Z'),
      prs: [
        makePr({ number: 1, title: 'fix: bug', author: { login: 'a' } }),
        makePr({ number: 2, title: 'docs: tweak', author: { login: 'b' } }),
        makePr({ number: 3, title: 'feat: search', author: { login: 'c' } }),
        makePr({ number: 4, title: 'feat(inbox): gin fizz', author: { login: 'd' } }),
      ],
    });
    expect(entry).not.toContain('### ');
    expect(entry).toContain('- #1 — fix: bug (@a)');
    expect(entry).toContain('- #2 — docs: tweak (@b)');
    expect(entry).toContain('- #3 — feat: search (@c)');
    expect(entry).toContain('- #4 — feat(inbox): gin fizz (@d)');
  });

  it('preserves PR order in the flat list', () => {
    const entry = renderChangelogEntry({
      version: '2026.5.23.1',
      date: new Date('2026-05-23T12:00:00Z'),
      prs: [
        makePr({ number: 3, title: 'feat: search', author: { login: 'c' } }),
        makePr({ number: 1, title: 'fix: bug', author: { login: 'a' } }),
        makePr({ number: 2, title: 'docs: tweak', author: { login: 'b' } }),
      ],
    });
    const i3 = entry.indexOf('- #3 ');
    const i1 = entry.indexOf('- #1 ');
    const i2 = entry.indexOf('- #2 ');
    expect(i3).toBeGreaterThan(-1);
    expect(i1).toBeGreaterThan(i3);
    expect(i2).toBeGreaterThan(i1);
  });

  it('renders bullets as - #N — title (@author)', () => {
    const entry = renderChangelogEntry({
      version: '2026.5.23.1',
      date: new Date('2026-05-23T12:00:00Z'),
      prs: [makePr({ number: 42, title: 'feat: cool thing', author: { login: 'dancj' } })],
    });
    expect(entry).toContain('- #42 — feat: cool thing (@dancj)');
  });

  it('sanitises titles (closing-keyword neutralisation)', () => {
    const entry = renderChangelogEntry({
      version: '2026.5.23.1',
      date: new Date('2026-05-23T12:00:00Z'),
      prs: [makePr({ number: 9, title: 'feat: Closes #99 inline', author: { login: 'x' } })],
    });
    expect(entry).toContain('`Closes #99`');
  });

  it('formats date as YYYY-MM-DD in UTC', () => {
    const entry = renderChangelogEntry({
      version: '2026.1.5.1',
      date: new Date('2026-01-05T23:00:00Z'),
      prs: [],
    });
    expect(entry).toContain('## [2026.1.5.1] - 2026-01-05');
  });
});

describe('injectChangelogEntry', () => {
  const SKELETON = [
    '# Changelog',
    '',
    'Prose intro.',
    '',
    '## [Unreleased]',
    '',
  ].join('\n');

  it('inserts new entry after ## [Unreleased]', () => {
    const entry = renderChangelogEntry({
      version: '2026.5.23.1',
      date: new Date('2026-05-23T12:00:00Z'),
      prs: [makePr({ number: 1, title: 'feat: x', author: { login: 'a' } })],
    });
    const result = injectChangelogEntry(SKELETON, entry);
    const unreleasedIdx = result.indexOf('## [Unreleased]');
    const newEntryIdx = result.indexOf('## [2026.5.23.1]');
    expect(unreleasedIdx).toBeGreaterThan(-1);
    expect(newEntryIdx).toBeGreaterThan(unreleasedIdx);
  });

  it('preserves prior version entries below the new one', () => {
    const existing = [
      '# Changelog',
      '',
      '## [Unreleased]',
      '',
      '## [2026.5.22.1] - 2026-05-22',
      '',
      '- #1 — feat: old (@a)',
      '',
    ].join('\n');

    const entry = renderChangelogEntry({
      version: '2026.5.23.1',
      date: new Date('2026-05-23T12:00:00Z'),
      prs: [makePr({ number: 2, title: 'feat: new', author: { login: 'b' } })],
    });

    const result = injectChangelogEntry(existing, entry);
    const newIdx = result.indexOf('## [2026.5.23.1]');
    const oldIdx = result.indexOf('## [2026.5.22.1]');
    expect(newIdx).toBeGreaterThan(-1);
    expect(oldIdx).toBeGreaterThan(newIdx);
    expect(result).toContain('- #1 — feat: old (@a)');
    expect(result).toContain('- #2 — feat: new (@b)');
  });

  it('throws when ## [Unreleased] is missing', () => {
    const broken = '# Changelog\n\nNo unreleased heading.\n';
    const entry = renderChangelogEntry({
      version: '2026.5.23.1',
      date: new Date('2026-05-23T12:00:00Z'),
      prs: [],
    });
    expect(() => injectChangelogEntry(broken, entry)).toThrow(/Unreleased/);
  });

  it('preserves the ## [Unreleased] heading itself', () => {
    const entry = renderChangelogEntry({
      version: '2026.5.23.1',
      date: new Date('2026-05-23T12:00:00Z'),
      prs: [],
    });
    const result = injectChangelogEntry(SKELETON, entry);
    expect(result).toContain('## [Unreleased]');
  });

  it('preserves prefix content above ## [Unreleased] byte-for-byte', () => {
    const result = injectChangelogEntry(SKELETON, '## [2026.5.23.1] - 2026-05-23\n');
    const prefix = result.split('## [Unreleased]')[0];
    expect(prefix).toBe('# Changelog\n\nProse intro.\n\n');
  });
});
