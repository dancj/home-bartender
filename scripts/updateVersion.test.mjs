import { describe, it, expect } from 'vitest';
import {
  parseVersion,
  getTodayPrefix,
  computeVersionFromTags,
  computeVersionFromFile,
} from './updateVersion.mjs';

describe('parseVersion', () => {
  it('parses release-prefixed form', () => {
    expect(parseVersion('release-2026.5.23.1')).toEqual({
      year: 2026, month: 5, day: 23, counter: 1,
    });
  });

  it('parses bare form', () => {
    expect(parseVersion('2026.5.23.1')).toEqual({
      year: 2026, month: 5, day: 23, counter: 1,
    });
  });

  it('handles multi-digit counters', () => {
    expect(parseVersion('release-2026.5.23.10')).toEqual({
      year: 2026, month: 5, day: 23, counter: 10,
    });
  });

  it('handles double-digit month and day', () => {
    expect(parseVersion('release-2026.12.31.4')).toEqual({
      year: 2026, month: 12, day: 31, counter: 4,
    });
  });

  it('throws on zero-padded form (rejected by design)', () => {
    expect(() => parseVersion('release-2026.05.23.1')).toThrow();
  });

  it('throws on missing counter', () => {
    expect(() => parseVersion('release-2026.5.23')).toThrow();
  });

  it('throws on non-version text', () => {
    expect(() => parseVersion('not-a-version')).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => parseVersion('')).toThrow();
  });
});

describe('getTodayPrefix', () => {
  it('returns YYYY.M.D in UTC with no zero-padding', () => {
    expect(getTodayPrefix(new Date('2026-05-23T12:00:00Z'))).toBe('2026.5.23');
  });

  it('drops zero-padding for January', () => {
    expect(getTodayPrefix(new Date('2026-01-05T00:00:00Z'))).toBe('2026.1.5');
  });

  it('uses UTC, not local time', () => {
    // 2026-05-23T23:30:00-08:00 = 2026-05-24T07:30:00Z
    expect(getTodayPrefix(new Date('2026-05-24T07:30:00Z'))).toBe('2026.5.24');
  });
});

describe('computeVersionFromTags', () => {
  it('returns "<today>.1" when tags is empty', () => {
    expect(computeVersionFromTags([], new Date('2026-05-23T12:00:00Z'))).toBe('2026.5.23.1');
  });

  it('returns "<today>.1" when no tags match today\'s prefix', () => {
    const tags = ['release-2026.5.22.1', 'release-2026.5.22.2'];
    expect(computeVersionFromTags(tags, new Date('2026-05-23T12:00:00Z'))).toBe('2026.5.23.1');
  });

  it('increments same-day counter', () => {
    const tags = ['release-2026.5.23.1', 'release-2026.5.23.2'];
    expect(computeVersionFromTags(tags, new Date('2026-05-23T12:00:00Z'))).toBe('2026.5.23.3');
  });

  it('ignores malformed entries silently', () => {
    const tags = ['release-2026.5.23.1', 'garbage-tag', 'release-x.y.z'];
    expect(computeVersionFromTags(tags, new Date('2026-05-23T12:00:00Z'))).toBe('2026.5.23.2');
  });

  it('ignores older-date tags for today\'s counter computation', () => {
    const tags = ['release-2026.5.22.99', 'release-2026.5.23.1'];
    expect(computeVersionFromTags(tags, new Date('2026-05-23T12:00:00Z'))).toBe('2026.5.23.2');
  });

  it('handles numeric counter boundary 9 -> 10 (NOT lexical sort)', () => {
    const tags = ['release-2026.5.23.9', 'release-2026.5.23.10'];
    // Lexical max would be "release-2026.5.23.9" → next 10. Numeric max is 10 → next 11.
    expect(computeVersionFromTags(tags, new Date('2026-05-23T12:00:00Z'))).toBe('2026.5.23.11');
  });

  it('handles multi-digit counters at scale', () => {
    const tags = ['release-2026.5.23.1', 'release-2026.5.23.2', 'release-2026.5.23.50'];
    expect(computeVersionFromTags(tags, new Date('2026-05-23T12:00:00Z'))).toBe('2026.5.23.51');
  });

  it('tolerates plain strings (no release- prefix) mixed in', () => {
    const tags = ['2026.5.23.1', 'release-2026.5.23.2'];
    expect(computeVersionFromTags(tags, new Date('2026-05-23T12:00:00Z'))).toBe('2026.5.23.3');
  });
});

describe('computeVersionFromFile', () => {
  it('increments same-day counter when file matches today', () => {
    expect(
      computeVersionFromFile({ version: '2026.5.23.1' }, new Date('2026-05-23T12:00:00Z'))
    ).toBe('2026.5.23.2');
  });

  it('returns "<today>.1" when file date is older', () => {
    expect(
      computeVersionFromFile({ version: '2026.5.22.1' }, new Date('2026-05-23T12:00:00Z'))
    ).toBe('2026.5.23.1');
  });

  it('returns "<today>.1" when file is missing version field', () => {
    expect(computeVersionFromFile({}, new Date('2026-05-23T12:00:00Z'))).toBe('2026.5.23.1');
  });

  it('returns "<today>.1" when file version is malformed', () => {
    expect(
      computeVersionFromFile({ version: 'garbage' }, new Date('2026-05-23T12:00:00Z'))
    ).toBe('2026.5.23.1');
  });
});
