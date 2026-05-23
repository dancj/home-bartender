import { describe, it, expect } from 'vitest';
import { autoReleasePrRun } from './autoReleasePrRun.mjs';
import { DELIMITER_START, DELIMITER_END } from './buildReleasePrBody.mjs';

// Test harness: builds a deps object whose stubs record every call as
// argv arrays so tests can assert on the precise command lines that
// would reach the kernel via execFile (shell-injection safety check).
function makeDeps({ ahead = 1, tags = [], tagCommitDate = '2026-05-22T00:00:00Z', mergedPrs = [], existingReleasePr = null } = {}) {
  const calls = { gh: [], exec: [] };

  const exec = async (cmd, args) => {
    calls.exec.push({ cmd, args });
    if (cmd === 'git' && args[0] === 'rev-list' && args[1] === '--count') {
      return { stdout: `${ahead}\n`, stderr: '' };
    }
    if (cmd === 'git' && args[0] === 'tag' && args[1] === '--list') {
      return { stdout: tags.join('\n') + (tags.length ? '\n' : ''), stderr: '' };
    }
    if (cmd === 'git' && args[0] === 'log') {
      return { stdout: tagCommitDate + '\n', stderr: '' };
    }
    throw new Error(`unexpected exec: ${cmd} ${args.join(' ')}`);
  };

  const gh = async (...args) => {
    calls.gh.push(args);
    if (args[0] === 'pr' && args[1] === 'list' && args.includes('--base') && args[args.indexOf('--base') + 1] === 'staging' && args.includes('--state') && args[args.indexOf('--state') + 1] === 'merged') {
      return { stdout: JSON.stringify(mergedPrs), stderr: '' };
    }
    if (args[0] === 'pr' && args[1] === 'list' && args.includes('--head')) {
      return { stdout: existingReleasePr ? JSON.stringify([existingReleasePr]) : '[]', stderr: '' };
    }
    if (args[0] === 'pr' && args[1] === 'create') {
      return { stdout: 'https://github.com/owner/repo/pull/99\n99\n', stderr: '' };
    }
    if (args[0] === 'pr' && args[1] === 'edit') {
      return { stdout: '', stderr: '' };
    }
    throw new Error(`unexpected gh: ${args.join(' ')}`);
  };

  const now = () => new Date('2026-05-23T12:00:00Z');
  const repo = 'owner/repo';
  const headSha = 'deadbeef';

  return { gh, exec, now, repo, headSha, calls };
}

function pr(overrides = {}) {
  return {
    number: 1,
    title: 'feat: foo',
    labels: [],
    author: { login: 'someone' },
    body: '',
    closingIssuesReferences: [],
    mergedAt: '2026-05-23T08:00:00Z',
    ...overrides,
  };
}

describe('autoReleasePrRun', () => {
  it('no-ops when staging is not ahead of main', async () => {
    const deps = makeDeps({ ahead: 0 });
    const result = await autoReleasePrRun(deps);
    expect(result).toEqual({ skipped: true, reason: 'no-op' });
    // No gh calls at all — short-circuit before any list
    expect(deps.calls.gh).toHaveLength(0);
  });

  it('creates a new release PR when none exists', async () => {
    const deps = makeDeps({
      mergedPrs: [pr({ number: 5, title: 'feat(inbox): margarita', mergedAt: '2026-05-23T08:00:00Z' })],
      existingReleasePr: null,
    });
    const result = await autoReleasePrRun(deps);
    expect(result.skipped).toBe(false);
    expect(result.action).toBe('created');
    const createCall = deps.calls.gh.find(c => c[0] === 'pr' && c[1] === 'create');
    expect(createCall).toBeDefined();
    const titleIdx = createCall.indexOf('--title');
    expect(createCall[titleIdx + 1]).toMatch(/^Release: staging to main \(\d{4}-\d{2}-\d{2}\)$/);
    const bodyIdx = createCall.indexOf('--body');
    expect(createCall[bodyIdx + 1]).toContain(DELIMITER_START);
    expect(createCall[bodyIdx + 1]).toContain(DELIMITER_END);
  });

  it('updates the existing release PR body when one is open', async () => {
    const deps = makeDeps({
      mergedPrs: [pr({ number: 5, title: 'feat: x' })],
      existingReleasePr: {
        number: 42,
        body: `Pre-prose\n\n${DELIMITER_START}\n\n## Features\n\n- #5 — feat: x (@someone)\n\n${DELIMITER_END}\n\nPost-prose`,
        title: 'Release: staging to main (2026-05-22)',
      },
    });
    const result = await autoReleasePrRun(deps);
    expect(result.action).toBe('updated');
    expect(result.prNumber).toBe(42);
    const editCall = deps.calls.gh.find(c => c[0] === 'pr' && c[1] === 'edit');
    expect(editCall).toBeDefined();
  });

  it('aggregates Closes from both closingIssuesReferences and body regex', async () => {
    const deps = makeDeps({
      mergedPrs: [
        pr({ number: 1, title: 'feat: a', closingIssuesReferences: [{ number: 5 }], body: 'Fixes #6' }),
        pr({ number: 2, title: 'fix: b', body: 'Resolves #5' }),
      ],
    });
    await autoReleasePrRun(deps);
    const createCall = deps.calls.gh.find(c => c[0] === 'pr' && c[1] === 'create');
    const body = createCall[createCall.indexOf('--body') + 1];
    expect(body).toContain('Closes #5, Closes #6');
  });

  it('label wins over title prefix in categorisation', async () => {
    const deps = makeDeps({
      mergedPrs: [
        pr({ number: 7, title: 'fix: oops', labels: [{ name: 'area:recipe' }] }),
      ],
    });
    await autoReleasePrRun(deps);
    const createCall = deps.calls.gh.find(c => c[0] === 'pr' && c[1] === 'create');
    const body = createCall[createCall.indexOf('--body') + 1];
    expect(body).toContain('## Recipes');
    expect(body).not.toContain('## Fixes');
  });

  it('selects newest tag numerically (not lexically) for SINCE', async () => {
    const deps = makeDeps({
      tags: ['release-2026.5.23.9', 'release-2026.5.23.10'],
      tagCommitDate: '2026-05-23T08:00:00Z',
      mergedPrs: [],
    });
    await autoReleasePrRun(deps);
    // git log called for the numerically-newest tag
    const logCall = deps.calls.exec.find(c => c.cmd === 'git' && c.args[0] === 'log');
    expect(logCall).toBeDefined();
    expect(logCall.args).toContain('release-2026.5.23.10');
  });

  it('uses hardcoded ISO fallback when no release-* tags exist', async () => {
    const deps = makeDeps({ tags: [], mergedPrs: [] });
    await autoReleasePrRun(deps);
    // No git log call for tag commit date — we used the fallback
    const logCall = deps.calls.exec.find(c => c.cmd === 'git' && c.args[0] === 'log');
    expect(logCall).toBeUndefined();
  });

  it('shell-injection guard: attacker title travels as one execFile argv element', async () => {
    const exploitTitle = 'feat: $(rm -rf /) cool';
    const deps = makeDeps({
      mergedPrs: [pr({ number: 9, title: exploitTitle })],
    });
    await autoReleasePrRun(deps);
    // The gh stub recorded calls as argv arrays — assert the exploit string
    // never split into multiple argv elements and the gh call list never
    // surfaces a separate `rm` / `-rf` element.
    for (const call of deps.calls.gh) {
      for (const arg of call) {
        if (arg === 'rm' || arg === '-rf' || arg === '/') {
          throw new Error(`exploit substring found as separate argv element: ${arg}`);
        }
      }
    }
  });

  it('passes --limit 200 to gh pr list to avoid silent truncation', async () => {
    const deps = makeDeps({ mergedPrs: [] });
    await autoReleasePrRun(deps);
    const listCall = deps.calls.gh.find(c =>
      c[0] === 'pr' && c[1] === 'list' && c.includes('--base') &&
      c[c.indexOf('--base') + 1] === 'staging'
    );
    expect(listCall).toBeDefined();
    const limitIdx = listCall.indexOf('--limit');
    expect(limitIdx).toBeGreaterThan(-1);
    expect(parseInt(listCall[limitIdx + 1], 10)).toBeGreaterThanOrEqual(200);
  });
});
