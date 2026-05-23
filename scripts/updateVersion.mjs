#!/usr/bin/env node
// CalVer (YYYY.M.D.N, no zero-padding) version computation.
//
// Two sources of truth:
//   - computeVersionFromTags(tags, now): CI source of truth — parses
//     existing release-* tags numerically (NOT lexically) and returns
//     the next version for today.
//   - computeVersionFromFile({version}, now): local fallback when git
//     history isn't accessible.
//
// Numeric comparison everywhere. Lexical sort would order
// release-2026.5.23.10 before release-2026.5.23.2 (and 2026.10.x before
// 2026.2.x), which is why parseVersion returns integer fields and all
// comparisons run on the parsed integers.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const ROOT = path.resolve(import.meta.dirname, '..');
const VERSION_FILE = path.join(ROOT, 'VERSION.json');

const VERSION_RE = /^(?:release-)?(?<year>[1-9]\d{3})\.(?<month>[1-9]\d?)\.(?<day>[1-9]\d?)\.(?<counter>[1-9]\d*)$/;

export function parseVersion(s) {
  if (typeof s !== 'string' || s.length === 0) {
    throw new Error(`parseVersion: not a string: ${s}`);
  }
  const m = VERSION_RE.exec(s.trim());
  if (!m) throw new Error(`parseVersion: malformed: "${s}"`);
  return {
    year: parseInt(m.groups.year, 10),
    month: parseInt(m.groups.month, 10),
    day: parseInt(m.groups.day, 10),
    counter: parseInt(m.groups.counter, 10),
  };
}

export function getTodayPrefix(now) {
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth() + 1;
  const d = now.getUTCDate();
  return `${y}.${mo}.${d}`;
}

export function computeVersionFromTags(tags, now) {
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth() + 1;
  const d = now.getUTCDate();

  let maxCounter = 0;
  for (const raw of tags) {
    let parsed;
    try {
      parsed = parseVersion(raw);
    } catch {
      continue;
    }
    if (parsed.year !== y || parsed.month !== mo || parsed.day !== d) continue;
    if (parsed.counter > maxCounter) maxCounter = parsed.counter;
  }
  return `${y}.${mo}.${d}.${maxCounter + 1}`;
}

export function computeVersionFromFile(json, now) {
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth() + 1;
  const d = now.getUTCDate();

  let parsed = null;
  if (json && typeof json.version === 'string') {
    try {
      parsed = parseVersion(json.version);
    } catch {
      parsed = null;
    }
  }
  if (parsed && parsed.year === y && parsed.month === mo && parsed.day === d) {
    return `${y}.${mo}.${d}.${parsed.counter + 1}`;
  }
  return `${y}.${mo}.${d}.1`;
}

async function runCli() {
  const args = process.argv.slice(2);
  const now = new Date();

  let nextVersion;
  if (args.includes('--from-tags')) {
    const { stdout } = await execFile('git', ['tag', '--list', 'release-*']);
    const tags = stdout.split('\n').map(s => s.trim()).filter(Boolean);
    nextVersion = computeVersionFromTags(tags, now);
  } else {
    let json = {};
    try {
      const raw = await readFile(VERSION_FILE, 'utf8');
      json = JSON.parse(raw);
    } catch {
      json = {};
    }
    nextVersion = computeVersionFromFile(json, now);
  }

  await writeFile(VERSION_FILE, JSON.stringify({ version: nextVersion }, null, 2) + '\n');
  process.stdout.write(nextVersion + '\n');
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli().catch(e => {
    process.stderr.write(`updateVersion error: ${e.message ?? e}\n`);
    process.exit(1);
  });
}
