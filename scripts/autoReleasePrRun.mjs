#!/usr/bin/env node
// Orchestrator for auto-release-pr.yml. Composes the U2/U3 helpers
// with `gh` and `git` calls. Every external dependency is injectable
// so unit tests stub gh/exec/now without live GitHub calls.
//
// Subprocess discipline: all `gh` and `git` calls go through execFile
// with explicit argv arrays. Never shell-string. PR titles and bodies
// are attacker-controlled and travel into gh argv positions; argv-array
// invocation guarantees no shell tokenisation.

import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import {
  aggregateClosesIssues,
} from './releaseCategorize.mjs';
import {
  renderReleaseBody,
  injectIntoBody,
} from './buildReleasePrBody.mjs';
import {
  parseVersion,
} from './updateVersion.mjs';

const execFile = promisify(execFileCb);

// Hardcoded SINCE fallback for the no-tags case. Set to the merge date
// of this feature so the first auto-release run only scans PRs from
// this point forward. Adjust before merge if the value drifts.
const FALLBACK_SINCE = '2026-05-23T00:00:00Z';

const PR_LIST_FIELDS = 'number,title,labels,mergedAt,body,closingIssuesReferences,author';

export async function autoReleasePrRun({ gh, exec, now, repo, headSha } = {}) {
  if (!gh || !exec || !now) {
    throw new Error('autoReleasePrRun: gh, exec, now are required');
  }

  // 1. Short-circuit when staging is not ahead of main.
  const ahead = await execAhead(exec);
  if (ahead === 0) {
    return { skipped: true, reason: 'no-op' };
  }

  // 2. Resolve SINCE timestamp from the numerically-newest release-* tag,
  //    or fall back to the hardcoded ISO date when no tags exist.
  const since = await resolveSince(exec);

  // 3. Fetch merged staging PRs and filter to mergedAt >= since.
  const allMerged = await ghPrList(gh, ['--base', 'staging', '--state', 'merged', '--limit', '200', '--json', PR_LIST_FIELDS]);
  const sinceMs = Date.parse(since);
  const prs = allMerged.filter(p => p.mergedAt && Date.parse(p.mergedAt) >= sinceMs);

  // 4. Aggregate Closes refs and render the managed block.
  const closesIssues = aggregateClosesIssues(prs);
  const managedBlock = renderReleaseBody({ prs, closesIssues });

  // 5. Look up the existing release PR (head: staging, base: main).
  const existing = await ghPrList(gh, ['--base', 'main', '--head', 'staging', '--state', 'open', '--json', 'number,body,title']);
  const existingPr = existing[0] ?? null;

  // 6. Upsert.
  if (existingPr) {
    const newBody = injectIntoBody(existingPr.body ?? '', managedBlock);
    await gh('pr', 'edit', String(existingPr.number), '--body', newBody);
    return { skipped: false, action: 'updated', prNumber: existingPr.number };
  }

  const newBody = managedBlock;
  const today = formatIsoDate(now());
  const title = `Release: staging to main (${today})`;
  const out = await gh('pr', 'create', '--base', 'main', '--head', 'staging', '--title', title, '--body', newBody);
  const prNumber = parsePrNumberFromOutput(out);
  return { skipped: false, action: 'created', prNumber };
}

async function execAhead(exec) {
  const { stdout } = await exec('git', ['rev-list', '--count', 'main..staging']);
  return parseInt(stdout.trim(), 10) || 0;
}

async function resolveSince(exec) {
  const { stdout } = await exec('git', ['tag', '--list', 'release-*']);
  const tagLines = stdout.split('\n').map(s => s.trim()).filter(Boolean);

  let newestTag = null;
  let newestParsed = null;
  for (const tag of tagLines) {
    let parsed;
    try {
      parsed = parseVersion(tag);
    } catch {
      continue;
    }
    if (!newestParsed || isNewer(parsed, newestParsed)) {
      newestParsed = parsed;
      newestTag = tag;
    }
  }

  if (!newestTag) return FALLBACK_SINCE;

  const { stdout: dateOut } = await exec('git', ['log', '-1', '--format=%aI', newestTag]);
  return dateOut.trim() || FALLBACK_SINCE;
}

function isNewer(a, b) {
  if (a.year !== b.year) return a.year > b.year;
  if (a.month !== b.month) return a.month > b.month;
  if (a.day !== b.day) return a.day > b.day;
  return a.counter > b.counter;
}

async function ghPrList(gh, extraArgs) {
  const out = await gh('pr', 'list', ...extraArgs);
  const raw = (out?.stdout ?? '').trim();
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function formatIsoDate(d) {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
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
  autoReleasePrRun({
    gh: realGh,
    exec: realExec,
    now: () => new Date(),
    repo: process.env.GITHUB_REPOSITORY ?? '',
    headSha: process.env.GITHUB_SHA ?? '',
  })
    .then(result => {
      process.stdout.write(JSON.stringify(result) + '\n');
    })
    .catch(e => {
      process.stderr.write(`autoReleasePrRun error: ${e.message ?? e}\n`);
      process.exit(1);
    });
}
