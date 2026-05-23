// Pure helpers for categorising merged PRs into release sections,
// extracting and aggregating Closes-issue references, neutralising
// closing-keyword injection attempts (via backtick-wrap), and
// sanitising titles for safe rendering into managed-block bullets.

import { DELIMITER_START, DELIMITER_END } from './buildReleasePrBody.mjs';

const RECIPE_PREFIXES = ['feat(inbox):', 'feat(recipe):'];
const PLATFORM_PREFIXES = ['chore:', 'docs:', 'script:'];
const CLOSING_KEYWORD_LINE = /^\s*(?:Closes|Fixes|Resolves)\s+#(\d+)/gim;
const CLOSING_KEYWORD_INLINE = /\b(Closes|Fixes|Resolves)\s+#\d+/gi;

export function categorizePr({ title, labels = [] }) {
  if (labels.includes('area:recipe')) return 'Recipes';
  if (labels.includes('area:product')) return 'Features';

  const t = title ?? '';
  if (RECIPE_PREFIXES.some(p => t.startsWith(p))) return 'Recipes';
  if (t.startsWith('feat:')) return 'Features';
  if (t.startsWith('fix:')) return 'Fixes';
  return 'Platform';
}

export function extractClosesFromBody(body) {
  if (!body) return [];
  const matches = [];
  for (const m of body.matchAll(CLOSING_KEYWORD_LINE)) {
    matches.push(parseInt(m[1], 10));
  }
  return matches;
}

export function aggregateClosesIssues(prs) {
  const seen = new Set();
  for (const pr of prs) {
    for (const ref of pr.closingIssuesReferences ?? []) {
      if (typeof ref?.number === 'number') seen.add(ref.number);
    }
    for (const n of extractClosesFromBody(pr.body ?? '')) {
      seen.add(n);
    }
  }
  return [...seen].sort((a, b) => a - b);
}

export function neutralizeClosingKeywords(text) {
  if (text == null) return text;
  return text.replace(CLOSING_KEYWORD_INLINE, (match, _kw, offset, full) => {
    if (full[offset - 1] === '`') return match;
    return '`' + match + '`';
  });
}

export function sanitizeTitle(title) {
  if (!title) return '';
  let out = title;
  out = out.split(DELIMITER_END).join('');
  out = out.split(DELIMITER_START).join('');
  out = out.replace(/<!--/g, '').replace(/-->/g, '');
  out = out.replace(/\s+/g, ' ').trim();
  out = neutralizeClosingKeywords(out);
  return out;
}
