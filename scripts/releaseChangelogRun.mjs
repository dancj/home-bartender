#!/usr/bin/env node
// Orchestrator for release-changelog.yml. Composes U2/U4/U5 helpers
// with gh and git into an injectable-deps function the workflow drives.
//
// Step order (tag is the commit point — failures before the tag leave
// no side effects; failures after leave only a recoverable orphan
// branch):
//   1. Ancestry guard (skip if head isn't a merge commit)
//   2. Compute next CalVer
//   3. Idempotent early-exit if release-<version> already exists
//   4. Tag and push the release commit FIRST
//   5. Find previous tag for SINCE
//   6. Fetch merged staging PRs since previous tag
//   7. Inject Keep a Changelog entry into CHANGELOG.md
//   8. Write VERSION.json
//   9. Create docs branch, commit, push
//   10. Open PR back to staging (human merges — never auto-merge)
//
// All subprocess calls use execFile with explicit argv arrays.

import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import {
  readFile as fsReadFile,
  writeFile as fsWriteFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeVersionFromTags, parseVersion } from './updateVersion.mjs';
import { neutralizeClosingKeywords, sanitizeTitle } from './releaseCategorize.mjs';
import { renderChangelogEntry, injectChangelogEntry } from './buildChangelogEntry.mjs';

const execFile = promisify(execFileCb);

const FALLBACK_SINCE = '2026-05-23T00:00:00Z';
const PR_LIST_FIELDS = 'number,title,labels,mergedAt,body,closingIssuesReferences,author';
const ROOT = path.resolve(import.meta.dirname, '..');

export async function releaseChangelogRun({
  gh, exec, now, repo, headSha,
  readFile, writeFile,
  rootDir = ROOT,
} = {}) {
  if (!gh || !exec || !now || !readFile || !writeFile) {
    throw new Error('releaseChangelogRun: gh, exec, now, readFile, writeFile are required');
  }

  // Step 1: ancestry guard — require a merge commit (2+ parents).
  const { stdout: parentsOut } = await exec('git', ['log', '-1', '--format=%P', 'HEAD']);
  const parents = parentsOut.trim().split(/\s+/).filter(Boolean);
  if (parents.length < 2) {
    return { skipped: true, reason: 'not-a-merge-commit' };
  }

  // Step 2: compute next version from existing tags.
  const { stdout: tagOut } = await exec('git', ['tag', '--list', 'release-*']);
  const tags = tagOut.split('\n').map(s => s.trim()).filter(Boolean);
  const version = computeVersionFromTags(tags, now());
  const tag = `release-${version}`;

  // Step 3: idempotent early-exit.
  if (tags.includes(tag)) {
    return { skipped: true, reason: 'tag-exists' };
  }

  // Step 4: tag and push FIRST. After this, the version is committed
  // to history; subsequent failures leave only an orphan branch.
  await exec('git', ['tag', tag, headSha]);
  await exec('git', ['push', 'origin', tag]);

  // Step 5: find previous tag (numerically newest existing) for SINCE.
  const prevTag = findNewestTag(tags);
  let since = FALLBACK_SINCE;
  if (prevTag) {
    const { stdout: dateOut } = await exec('git', ['log', '-1', '--format=%aI', prevTag]);
    since = dateOut.trim() || FALLBACK_SINCE;
  }

  // Step 6: fetch merged staging PRs since the previous tag.
  const allMerged = await ghPrList(gh, ['--base', 'staging', '--state', 'merged', '--limit', '200', '--json', PR_LIST_FIELDS]);
  const sinceMs = Date.parse(since);
  const prs = allMerged.filter(p => p.mergedAt && Date.parse(p.mergedAt) >= sinceMs);

  // Step 7: render + inject CHANGELOG entry.
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const existingChangelog = await readFile(changelogPath, 'utf8');
  const entry = renderChangelogEntry({ version, date: now(), prs });
  const updatedChangelog = injectChangelogEntry(existingChangelog, entry);
  await writeFile(changelogPath, updatedChangelog);

  // Step 8: write VERSION.json.
  const versionPath = path.join(rootDir, 'VERSION.json');
  await writeFile(versionPath, JSON.stringify({ version }, null, 2) + '\n');

  // Step 9: create branch, commit, push.
  const branch = `docs-changelog-${version}`;
  await exec('git', ['checkout', '-b', branch]);
  await exec('git', ['add', changelogPath, versionPath]);
  await exec('git', ['commit', '-m', `docs: update CHANGELOG for release ${version}`]);
  await exec('git', ['push', '-u', 'origin', branch]);

  // Step 10: open docs PR (no auto-merge).
  const prBody = renderDocsPrBody({ version, prs });
  const out = await gh('pr', 'create',
    '--base', 'staging',
    '--head', branch,
    '--title', `docs: update CHANGELOG for release ${version}`,
    '--body', prBody,
  );
  const prNumber = parsePrNumberFromOutput(out);

  return { skipped: false, version, tag, prNumber };
}

function findNewestTag(tags) {
  let newestTag = null;
  let newestParsed = null;
  for (const t of tags) {
    let parsed;
    try { parsed = parseVersion(t); } catch { continue; }
    if (!newestParsed || isNewer(parsed, newestParsed)) {
      newestParsed = parsed;
      newestTag = t;
    }
  }
  return newestTag;
}

function isNewer(a, b) {
  if (a.year !== b.year) return a.year > b.year;
  if (a.month !== b.month) return a.month > b.month;
  if (a.day !== b.day) return a.day > b.day;
  return a.counter > b.counter;
}

function renderDocsPrBody({ version, prs }) {
  // Description-only body. Must NOT contain raw closing keywords —
  // the release PR already auto-closed those issues. Anything we
  // interpolate from PR titles/bodies is neutralised.
  const lines = [
    `CHANGELOG entry for release \`${version}\`.`,
    '',
    'This PR is opened by `release-changelog.yml` and waits for a human to merge.',
    '',
  ];
  if (prs.length > 0) {
    lines.push(`Included PRs (${prs.length}):`, '');
    for (const pr of prs) {
      const title = sanitizeTitle(pr.title ?? '');
      const author = pr.author?.login ?? 'unknown';
      lines.push(`- #${pr.number} — ${title} (@${author})`);
    }
    lines.push('');
  }
  return neutralizeClosingKeywords(lines.join('\n'));
}

async function ghPrList(gh, extraArgs) {
  const out = await gh('pr', 'list', ...extraArgs);
  const raw = (out?.stdout ?? '').trim();
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function parsePrNumberFromOutput(out) {
  if (!out?.stdout) return null;
  const m = out.stdout.match(/\/pull\/(\d+)/);
  if (m) return parseInt(m[1], 10);
  const lastLine = out.stdout.trim().split('\n').pop();
  const n = parseInt(lastLine, 10);
  return Number.isFinite(n) ? n : null;
}

async function realGh(...args) {
  return execFile('gh', args, { env: process.env, maxBuffer: 10 * 1024 * 1024 });
}

async function realExec(cmd, args) {
  return execFile(cmd, args, { env: process.env, maxBuffer: 10 * 1024 * 1024 });
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  releaseChangelogRun({
    gh: realGh,
    exec: realExec,
    readFile: fsReadFile,
    writeFile: fsWriteFile,
    now: () => new Date(),
    repo: process.env.GITHUB_REPOSITORY ?? '',
    headSha: process.env.GITHUB_SHA ?? '',
  })
    .then(result => {
      process.stdout.write(JSON.stringify(result) + '\n');
    })
    .catch(e => {
      process.stderr.write(`releaseChangelogRun error: ${e.message ?? e}\n`);
      process.exit(1);
    });
}
