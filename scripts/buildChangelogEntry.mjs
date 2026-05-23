// Deterministic Keep a Changelog 1.1.0 entry rendering and injection.
// Reuses categorizePr + sanitizeTitle from releaseCategorize so the
// CHANGELOG section structure mirrors the release PR body.

import { categorizePr, sanitizeTitle } from './releaseCategorize.mjs';

const SECTION_ORDER = ['Recipes', 'Features', 'Fixes', 'Platform'];
const UNRELEASED_HEADING = '## [Unreleased]';

export function renderChangelogEntry({ version, date, prs = [] }) {
  const grouped = { Recipes: [], Features: [], Fixes: [], Platform: [] };
  for (const pr of prs) {
    const section = categorizePr({
      title: pr.title ?? '',
      labels: (pr.labels ?? []).map(asLabelName),
    });
    grouped[section].push(pr);
  }

  const isoDate = formatIsoDate(date);
  const lines = [`## [${version}] - ${isoDate}`, ''];

  for (const section of SECTION_ORDER) {
    const items = grouped[section];
    if (items.length === 0) continue;
    lines.push(`### ${section}`, '');
    for (const pr of items) {
      const title = sanitizeTitle(pr.title ?? '');
      const author = pr.author?.login ?? 'unknown';
      lines.push(`- #${pr.number} — ${title} (@${author})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function injectChangelogEntry(existingChangelog, entry) {
  const idx = existingChangelog.indexOf(UNRELEASED_HEADING);
  if (idx === -1) {
    throw new Error('injectChangelogEntry: ## [Unreleased] heading not found');
  }
  // Find end of the [Unreleased] line + the blank line that typically follows
  // (we insert between [Unreleased] and the next heading without touching the
  // [Unreleased] heading itself).
  let cursor = idx + UNRELEASED_HEADING.length;
  // Skip the rest of the [Unreleased] line and one trailing newline.
  const nextNewline = existingChangelog.indexOf('\n', cursor);
  cursor = nextNewline === -1 ? existingChangelog.length : nextNewline + 1;
  // Skip one blank line if present.
  if (existingChangelog[cursor] === '\n') cursor += 1;

  const before = existingChangelog.slice(0, cursor);
  const after = existingChangelog.slice(cursor);
  return before + entry + (entry.endsWith('\n') ? '' : '\n') + after;
}

function asLabelName(label) {
  if (typeof label === 'string') return label;
  if (label && typeof label.name === 'string') return label.name;
  return '';
}

function formatIsoDate(date) {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}
