import { describe, it, expect } from 'vitest';
import { buildTabList, resolveActiveTab, nextTabIndex } from './recipeTabs';

describe('buildTabList', () => {
  it('always leads with recipe and includes every present tab in fixed order', () => {
    expect(buildTabList({ hasBatch: true, hasNotes: true, hasSource: true })).toEqual([
      'recipe',
      'batching',
      'notes',
      'source',
    ]);
  });

  it('returns only recipe when nothing else is present', () => {
    expect(buildTabList({ hasBatch: false, hasNotes: false, hasSource: false })).toEqual([
      'recipe',
    ]);
  });

  it('keeps fixed order with no gaps when a middle tab is absent', () => {
    expect(buildTabList({ hasBatch: false, hasNotes: true, hasSource: false })).toEqual([
      'recipe',
      'notes',
    ]);
    expect(buildTabList({ hasBatch: true, hasNotes: false, hasSource: true })).toEqual([
      'recipe',
      'batching',
      'source',
    ]);
  });
});

describe('resolveActiveTab', () => {
  const tabs = ['recipe', 'batching', 'notes'];

  it('resolves a matching short hash', () => {
    expect(resolveActiveTab('#batching', tabs)).toBe('batching');
  });

  it('tolerates a namespaced panel- hash', () => {
    expect(resolveActiveTab('#panel-batching', tabs)).toBe('batching');
  });

  it('tolerates a hash with no leading #', () => {
    expect(resolveActiveTab('batching', tabs)).toBe('batching');
  });

  it('falls back to the first tab for an empty hash', () => {
    expect(resolveActiveTab('', tabs)).toBe('recipe');
  });

  it('falls back to the first tab for an unknown hash', () => {
    expect(resolveActiveTab('#nonsense', tabs)).toBe('recipe');
  });

  it('falls back to the first tab when the target tab is absent for this recipe', () => {
    expect(resolveActiveTab('#batching', ['recipe'])).toBe('recipe');
    // namespaced form of the same absent-target case
    expect(resolveActiveTab('#panel-batching', ['recipe'])).toBe('recipe');
  });
});

describe('nextTabIndex', () => {
  it('moves right and wraps past the last tab', () => {
    expect(nextTabIndex('ArrowRight', 0, 3)).toBe(1);
    expect(nextTabIndex('ArrowRight', 2, 3)).toBe(0);
  });

  it('moves left and wraps past the first tab', () => {
    expect(nextTabIndex('ArrowLeft', 2, 3)).toBe(1);
    expect(nextTabIndex('ArrowLeft', 0, 3)).toBe(2);
  });

  it('jumps to the ends with Home/End', () => {
    expect(nextTabIndex('Home', 2, 3)).toBe(0);
    expect(nextTabIndex('End', 0, 3)).toBe(2);
  });

  it('returns -1 for an unhandled key', () => {
    expect(nextTabIndex('Enter', 1, 3)).toBe(-1);
    expect(nextTabIndex('Tab', 1, 3)).toBe(-1);
  });
});
