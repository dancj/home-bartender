import { describe, it, expect } from 'vitest';
import { compareCards, parseSortMode, type SortableCard } from './indexSort';

const card = (
  title: string,
  primarySpirit = '',
  difficulty = ''
): SortableCard => ({ title, primarySpirit, difficulty });

const sort = (cards: SortableCard[], mode: Parameters<typeof compareCards>[2]) =>
  [...cards].sort((a, b) => compareCards(a, b, mode)).map((c) => c.title);

describe('compareCards title mode', () => {
  it('sorts case-insensitively A–Z', () => {
    expect(sort([card('bee'), card('Apple'), card('cat')], 'title')).toEqual([
      'Apple',
      'bee',
      'cat',
    ]);
  });
});

describe('compareCards spirit mode', () => {
  it('groups gin before rum', () => {
    expect(
      sort([card('Daiquiri', 'rum'), card('Gimlet', 'gin')], 'spirit')
    ).toEqual(['Gimlet', 'Daiquiri']);
  });

  it('breaks spirit ties by title', () => {
    expect(
      sort([card('Negroni', 'gin'), card('Gimlet', 'gin')], 'spirit')
    ).toEqual(['Gimlet', 'Negroni']);
  });

  it('sorts a missing primary spirit last', () => {
    expect(
      sort([card('Mystery', ''), card('Gimlet', 'gin')], 'spirit')
    ).toEqual(['Gimlet', 'Mystery']);
  });

  it('breaks a two-spirit-less tie by title', () => {
    // Both spirits empty: the `(as ? -1 : bs ? 1 : 0)` term is 0, so ordering
    // rests entirely on the byTitle fallback. Input is deliberately out of
    // title order so a dropped fallback would leave it unsorted.
    expect(sort([card('Bee', ''), card('Ant', '')], 'spirit')).toEqual([
      'Ant',
      'Bee',
    ]);
  });
});

describe('compareCards difficulty mode', () => {
  it('orders easy < medium < advanced (taxonomy order, not alphabetical)', () => {
    expect(
      sort(
        [
          card('Hard', '', 'advanced'),
          card('Mid', '', 'medium'),
          card('Easy', '', 'easy'),
        ],
        'difficulty'
      )
    ).toEqual(['Easy', 'Mid', 'Hard']);
  });

  it('sorts an unknown difficulty last and breaks ties by title', () => {
    expect(
      sort(
        [card('Weird', '', 'bogus'), card('B', '', 'easy'), card('A', '', 'easy')],
        'difficulty'
      )
    ).toEqual(['A', 'B', 'Weird']);
  });
});

describe('parseSortMode', () => {
  it('accepts known modes', () => {
    expect(parseSortMode('spirit')).toBe('spirit');
    expect(parseSortMode('difficulty')).toBe('difficulty');
    expect(parseSortMode('title')).toBe('title');
  });

  it('falls back to title for null or unknown values', () => {
    expect(parseSortMode(null)).toBe('title');
    expect(parseSortMode('bogus')).toBe('title');
  });
});
