import { describe, it, expect } from 'vitest';
import {
  DELIMITER_START,
  DELIMITER_END,
  renderReleaseBody,
  injectIntoBody,
} from './buildReleasePrBody.mjs';

const MANAGEMENT_NOTICE = '<!-- managed by .github/workflows/auto-release-pr.yml — do not edit between markers -->';

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

describe('renderReleaseBody', () => {
  it('renders an empty managed block when no PRs and no closesIssues', () => {
    const body = renderReleaseBody({ prs: [], closesIssues: [] });
    expect(body.startsWith(DELIMITER_START)).toBe(true);
    expect(body.trimEnd().endsWith(DELIMITER_END)).toBe(true);
    expect(body).toContain(MANAGEMENT_NOTICE);
    expect(body).not.toContain('## Closes');
    expect(body).not.toContain('## Recipes');
    expect(body).not.toContain('## Changes');
  });

  it('renders a single Recipes PR under a Recipes section only', () => {
    const body = renderReleaseBody({
      prs: [makePr({ number: 5, title: 'feat(inbox): add margarita', author: { login: 'dancj' } })],
      closesIssues: [],
    });
    expect(body).toContain('## Recipes');
    expect(body).toContain('- #5 — feat(inbox): add margarita (@dancj)');
    expect(body).not.toContain('## Changes');
  });

  it('renders categorised PRs in fixed order: Recipes, Changes', () => {
    const body = renderReleaseBody({
      prs: [
        makePr({ number: 1, title: 'fix: bug A', author: { login: 'a' } }),
        makePr({ number: 2, title: 'docs: tweak', author: { login: 'b' } }),
        makePr({ number: 3, title: 'feat: search', author: { login: 'c' } }),
        makePr({ number: 4, title: 'feat(inbox): add gin fizz', author: { login: 'd' } }),
        makePr({ number: 6, title: 'Add recipe: Smoky Ginger Sour (His)', author: { login: 'app/github-actions' } }),
      ],
      closesIssues: [],
    });
    const recipesIdx = body.indexOf('## Recipes');
    const changesIdx = body.indexOf('## Changes');
    expect(recipesIdx).toBeGreaterThan(-1);
    expect(changesIdx).toBeGreaterThan(recipesIdx);
    expect(body).not.toContain('## Features');
    expect(body).not.toContain('## Fixes');
    expect(body).not.toContain('## Platform');
    // Both recipe titles land under Recipes (before the Changes header).
    expect(body.indexOf('#4 —')).toBeLessThan(changesIdx);
    expect(body.indexOf('#6 —')).toBeLessThan(changesIdx);
    // Non-recipe PRs land under Changes.
    expect(body.indexOf('#1 —')).toBeGreaterThan(changesIdx);
    expect(body.indexOf('#2 —')).toBeGreaterThan(changesIdx);
    expect(body.indexOf('#3 —')).toBeGreaterThan(changesIdx);
  });

  it('emits the ## Closes line when closesIssues is non-empty', () => {
    const body = renderReleaseBody({
      prs: [],
      closesIssues: [3, 5, 10],
    });
    expect(body).toContain('## Closes');
    expect(body).toContain('Closes #3, Closes #5, Closes #10');
  });

  it('omits the ## Closes line entirely when closesIssues is empty', () => {
    const body = renderReleaseBody({
      prs: [makePr({ number: 1, title: 'feat: x' })],
      closesIssues: [],
    });
    expect(body).not.toContain('## Closes');
  });

  it('sanitises titles via sanitizeTitle (closing-keyword neutralisation)', () => {
    const body = renderReleaseBody({
      prs: [makePr({ number: 9, title: 'feat: Closes #99 inline', author: { login: 'x' } })],
      closesIssues: [],
    });
    expect(body).toContain('`Closes #99`');
    expect(body).not.toContain('feat: Closes #99 inline (@x)');
  });

  it('strips delimiter-injection attempts in titles', () => {
    const body = renderReleaseBody({
      prs: [makePr({
        number: 9,
        title: `feat: ${DELIMITER_END} exploit`,
        author: { login: 'x' },
      })],
      closesIssues: [],
    });
    // The body must still have exactly one START + one END marker.
    expect(occurrences(body, DELIMITER_START)).toBe(1);
    expect(occurrences(body, DELIMITER_END)).toBe(1);
  });
});

describe('injectIntoBody', () => {
  function freshBlock() {
    return renderReleaseBody({
      prs: [makePr({ number: 1, title: 'feat: x', author: { login: 'a' } })],
      closesIssues: [1],
    });
  }

  it('returns the fresh block when existingBody is empty', () => {
    const block = freshBlock();
    expect(injectIntoBody('', block)).toBe(block);
  });

  it('returns the fresh block when existingBody is null', () => {
    const block = freshBlock();
    expect(injectIntoBody(null, block)).toBe(block);
  });

  it('splices the block in place when delimiters are well-formed', () => {
    const block1 = renderReleaseBody({
      prs: [makePr({ number: 1, title: 'feat: x' })],
      closesIssues: [],
    });
    const existing = `Pre-prose\n\n${block1}\n\nPost-prose`;
    const block2 = renderReleaseBody({
      prs: [makePr({ number: 2, title: 'fix: y' })],
      closesIssues: [],
    });
    const result = injectIntoBody(existing, block2);
    expect(result.startsWith('Pre-prose')).toBe(true);
    expect(result.endsWith('Post-prose')).toBe(true);
    expect(result).toContain('## Changes');
    expect(result).not.toContain('feat: x');
    expect(occurrences(result, DELIMITER_START)).toBe(1);
    expect(occurrences(result, DELIMITER_END)).toBe(1);
  });

  it('appends a fresh block when only START is present (missing END)', () => {
    const block = freshBlock();
    const existing = `${DELIMITER_START}\nold content with Closes #99`;
    const result = injectIntoBody(existing, block);
    expect(occurrences(result, DELIMITER_START)).toBe(1);
    expect(occurrences(result, DELIMITER_END)).toBe(1);
    // surviving prose's Closes #99 is neutralised
    expect(result).toContain('`Closes #99`');
    expect(result).not.toMatch(/[^`]Closes #99[^`]/);
  });

  it('appends a fresh block when only END is present (missing START)', () => {
    const block = freshBlock();
    const existing = `Stale prose Closes #42\n${DELIMITER_END}`;
    const result = injectIntoBody(existing, block);
    expect(occurrences(result, DELIMITER_START)).toBe(1);
    expect(occurrences(result, DELIMITER_END)).toBe(1);
    expect(result).toContain('`Closes #42`');
  });

  it('appends a fresh block when both markers missing but Closes #N survives in body', () => {
    const block = freshBlock();
    const existing = 'Stray prose with Closes #77 in it';
    const result = injectIntoBody(existing, block);
    expect(occurrences(result, DELIMITER_START)).toBe(1);
    expect(occurrences(result, DELIMITER_END)).toBe(1);
    expect(result).toContain('`Closes #77`');
  });

  it('strips all markers and appends fresh when multiple START markers present', () => {
    const block = freshBlock();
    const existing = `${DELIMITER_START}\nA\n${DELIMITER_START}\nB\n${DELIMITER_END}`;
    const result = injectIntoBody(existing, block);
    expect(occurrences(result, DELIMITER_START)).toBe(1);
    expect(occurrences(result, DELIMITER_END)).toBe(1);
  });

  it('strips all markers and appends fresh when END precedes START', () => {
    const block = freshBlock();
    const existing = `${DELIMITER_END}\nbroken\n${DELIMITER_START}`;
    const result = injectIntoBody(existing, block);
    expect(occurrences(result, DELIMITER_START)).toBe(1);
    expect(occurrences(result, DELIMITER_END)).toBe(1);
  });

  it('is idempotent on repeated well-formed inject with identical fresh block', () => {
    const block = freshBlock();
    const once = injectIntoBody('Prefix\n\n' + block + '\n\nSuffix', block);
    const twice = injectIntoBody(once, block);
    expect(twice).toBe(once);
  });
});

function occurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
}
