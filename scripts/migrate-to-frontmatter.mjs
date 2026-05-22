#!/usr/bin/env node
// Idempotent one-off migration: bold-fact recipe headers → YAML frontmatter.
//   node scripts/migrate-to-frontmatter.mjs --dry-run
//   node scripts/migrate-to-frontmatter.mjs --write

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RECIPES_DIR = path.join(ROOT, 'recipes');
const INDEX_FILE = path.join(ROOT, 'INDEX.md');

const METHODS = new Set(['shaken', 'stirred', 'built', 'blended']);
const ICES = new Set(['cubed', 'large-cube', 'crushed', 'none']);
const DIFFICULTIES = new Set(['easy', 'medium', 'advanced']);

const SPIRIT_KEYWORDS = {
  tequila: [/\btequila\b/i],
  mezcal: [/\bmezcal\b/i],
  whiskey: [/\bwhiskey\b/i, /\bwhisky\b/i],
  bourbon: [/\bbourbon\b/i],
  rye: [/\brye\b/i],
  scotch: [/\bscotch\b/i, /\blaphroaig\b/i, /\bislay\b/i, /\bmonkey shoulder\b/i, /\bfamous grouse\b/i],
  gin: [/\bgin\b/i],
  vodka: [/\bvodka\b/i],
  rum: [/\brum\b/i],
  brandy: [/\bbrandy\b/i, /\bcognac\b/i, /\bpisco\b/i],
  aperitif: [/\baperol\b/i, /\bcampari\b/i, /\blillet\b/i, /\bamaro\b/i, /\bsuze\b/i],
  liqueur: [/triple sec/i, /\bcointreau\b/i, /\bcura(?:ç|c)ao\b/i, /st[-.\s]germain/i, /\bmaraschino\b/i, /\blimoncello\b/i, /\bchartreuse\b/i],
  wine: [/\bvermouth\b/i],
  champagne: [/\bchampagne\b/i, /\bprosecco\b/i, /\bcava\b/i],
};

const FLAVOR_NORMALIZE = {
  TART: 'sour',
  REFRESHING: 'refreshing',
};

const CATEGORY_NORMALIZE = {
  classics: 'classic',
  originals: 'original',
  seasonal: 'seasonal',
  inbox: 'inbox',
};

const OCCASION_NORMALIZE = {
  'easy-weeknight': 'weeknight',
  'weeknight': 'weeknight',
  'batch-friendly-party': 'batch-friendly',
  'batch-friendly': 'batch-friendly',
  'showstopper-conversation-piece': 'showstopper',
  'showstopper': 'showstopper',
  'brunch': 'brunch',
  'nightcap': 'nightcap',
  'summer': 'summer',
  'winter': 'winter',
};

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const WRITE = args.includes('--write');
const FORCE = args.includes('--force');
if (!DRY && !WRITE) {
  console.error('Pass --dry-run or --write (add --force to re-process files that already have frontmatter)');
  process.exit(1);
}

const warnings = [];
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function slugify(s) {
  return s.toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseBoldFact(line) {
  const m = line.match(/^\*\*([^:*]+):\*\*\s*(.+)$/);
  if (!m) return null;
  return { key: m[1].trim(), value: m[2].trim() };
}

function normalizeMethod(raw) {
  const lower = raw.toLowerCase();
  for (const canon of METHODS) {
    if (lower.startsWith(canon)) {
      const rest = raw.slice(canon.length).trim().replace(/^[,+\s]+/, '');
      return { canon, note: rest || '' };
    }
  }
  return { canon: lower.split(/[,\s+]/)[0] || 'shaken', note: raw, unknown: true };
}

function normalizeIce(raw) {
  const lower = raw.toLowerCase();
  if (lower.includes('none')) return { canon: 'none', note: raw.replace(/none/i, '').trim().replace(/^[·\s\-,]+|[·\s\-,]+$/g, '') };
  if (lower.includes('crushed')) return { canon: 'crushed', note: '' };
  if (lower.includes('large')) return { canon: 'large-cube', note: '' };
  if (lower.includes('cubed') || lower.startsWith('yes')) {
    const note = lower.startsWith('yes') ? raw.replace(/yes/i, '').trim().replace(/^\(|\)$/g, '').trim() : '';
    return { canon: 'cubed', note };
  }
  return { canon: 'cubed', note: raw, unknown: true };
}

function normalizeDifficulty(raw) {
  const lower = raw.toLowerCase();
  for (const d of DIFFICULTIES) if (lower === d) return d;
  return lower;
}

function parseFlavors(raw) {
  const matches = [...raw.matchAll(/`([^`]+)`/g)].map(m => m[1]);
  return matches.map(f => {
    const upper = f.toUpperCase();
    if (FLAVOR_NORMALIZE[upper]) return FLAVOR_NORMALIZE[upper];
    return f.toLowerCase().replace(/\s+/g, '-');
  });
}

function detectSpirits(ingredientsText) {
  const found = new Set();
  for (const [spirit, patterns] of Object.entries(SPIRIT_KEYWORDS)) {
    for (const p of patterns) {
      if (p.test(ingredientsText)) { found.add(spirit); break; }
    }
  }
  return [...found];
}

async function parseIndex() {
  let raw;
  try {
    raw = await readFile(INDEX_FILE, 'utf8');
  } catch { return new Map(); }
  const bySlug = new Map();
  const lines = raw.split('\n');
  let currentSpirit = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const spiritHeader = line.match(/^###\s+(.+)$/);
    if (spiritHeader) {
      const txt = spiritHeader[1].toLowerCase();
      const spirits = [];
      if (/tequila/.test(txt)) spirits.push('tequila');
      if (/mezcal/.test(txt)) spirits.push('mezcal');
      if (/whiskey|whisky/.test(txt)) spirits.push('whiskey');
      if (/scotch/.test(txt)) spirits.push('scotch');
      if (/gin/.test(txt)) spirits.push('gin');
      if (/rum/.test(txt)) spirits.push('rum');
      if (/vodka/.test(txt)) spirits.push('vodka');
      if (/brandy/.test(txt)) spirits.push('brandy');
      currentSpirit = spirits.length ? spirits : null;
      continue;
    }

    const tableRow = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*\[→\]\(recipes\/[^/]+\/([^)]+)\.md\)\s*\|$/);
    if (tableRow && currentSpirit) {
      const [, name, styleRaw, difficultyRaw, slug] = tableRow;
      const styles = styleRaw.split('/').map(s => s.trim().toLowerCase().replace(/\s+/g, '-'));
      const entry = bySlug.get(slug) ?? { spirits: new Set(), styles: new Set(), occasions: new Set() };
      for (const s of currentSpirit) entry.spirits.add(s);
      for (const s of styles) entry.styles.add(s);
      bySlug.set(slug, entry);
    }
  }

  const occasionsSection = raw.split(/^## By Occasion/m)[1];
  if (occasionsSection) {
    const stopAt = occasionsSection.search(/\n## |\n---/);
    const occBody = stopAt >= 0 ? occasionsSection.slice(0, stopAt) : occasionsSection;
    for (const line of occBody.split('\n')) {
      const row = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
      if (!row) continue;
      const [, occRaw, namesRaw] = row;
      if (occRaw.toLowerCase().includes('occasion') || occRaw.startsWith('-')) continue;
      const rawSlug = occRaw.toLowerCase().replace(/[\/\s]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const occasion = OCCASION_NORMALIZE[rawSlug];
      if (!occasion) continue;
      const names = namesRaw.split(',').map(n => n.trim()).filter(n => n && n !== 'All' && !n.startsWith('see "'));
      for (const name of names) {
        const slug = slugify(name);
        const entry = bySlug.get(slug) ?? { spirits: new Set(), styles: new Set(), occasions: new Set() };
        entry.occasions.add(occasion);
        bySlug.set(slug, entry);
      }
    }
  }

  return bySlug;
}

function gitFirstCommitDate(file) {
  try {
    const out = execSync(`git log --diff-filter=A --follow --format=%aI -- "${file}"`, { cwd: ROOT, encoding: 'utf8' });
    const date = out.trim().split('\n').filter(Boolean).pop();
    return date ? date.slice(0, 10) : '';
  } catch { return ''; }
}

function extractRelated(body) {
  const sectionRe = /\n## If You Like This, Try\n([\s\S]*?)(?=\n## |\n---\n|$)/;
  const m = body.match(sectionRe);
  if (!m) return { related: [], bodyOut: body };
  const section = m[1];
  const related = [];
  for (const line of section.split('\n')) {
    const linked = line.match(/\*\*\[([^\]]+)\]\(([^)]+?)\.md\)\*\*/);
    if (linked) {
      related.push(path.basename(linked[2]));
      continue;
    }
    const named = line.match(/^-\s+\*\*([^*]+?)\*\*/);
    if (named) related.push(slugify(named[1]));
  }
  const bodyOut = body.replace(sectionRe, '\n').replace(/\n\n+---\n/g, '\n\n---\n').trimEnd() + '\n';
  return { related, bodyOut };
}

function buildFrontmatter(data) {
  const lines = ['---'];
  const yamlStr = (v) => {
    if (v === '' || v === null || v === undefined) return '""';
    const s = String(v);
    if (/^[\w\-.]+$/.test(s)) return s;
    return JSON.stringify(s);
  };
  const yamlArr = (a) => a.length === 0 ? '[]' : `[${a.map(yamlStr).join(', ')}]`;

  lines.push(`title: ${yamlStr(data.title)}`);
  lines.push(`blurb: ${yamlStr(data.blurb)}`);
  lines.push('');
  lines.push(`category: ${data.category}`);
  lines.push(`publish: ${data.publish}`);
  lines.push('');
  lines.push(`glass: ${yamlStr(data.glass)}`);
  lines.push(`method: ${data.method}`);
  if (data.method_note) lines.push(`method_note: ${yamlStr(data.method_note)}`);
  lines.push(`ice: ${data.ice}`);
  if (data.ice_note) lines.push(`ice_note: ${yamlStr(data.ice_note)}`);
  lines.push(`difficulty: ${data.difficulty}`);
  lines.push('');
  lines.push(`spirits: ${yamlArr(data.spirits)}`);
  lines.push(`format: ${data.format}`);
  lines.push(`serves: ${data.serves}`);
  lines.push('');
  lines.push(`flavors: ${yamlArr(data.flavors)}`);
  lines.push(`styles: ${yamlArr(data.styles)}`);
  lines.push(`occasions: ${yamlArr(data.occasions)}`);
  lines.push('');
  lines.push('attribution:');
  lines.push(`  creator: ""`);
  lines.push(`  bar: ""`);
  lines.push(`  year: ""`);
  lines.push(`  source_url: ""`);
  lines.push('');
  lines.push(`related: ${yamlArr(data.related)}`);
  lines.push(`aliases: []`);
  lines.push('');
  lines.push(`hero_image: ""`);
  lines.push(`gallery: []`);
  lines.push(`preparations: []`);
  if (data.created) {
    lines.push('');
    lines.push(`created: ${data.created}`);
  }
  if (data.todos.length) {
    lines.push('');
    lines.push(`# TODO: review — ${data.todos.join('; ')}`);
  }
  lines.push('---');
  return lines.join('\n');
}

async function migrate(file, indexBySlug) {
  let raw = await readFile(file, 'utf8');
  if (raw.startsWith('---\n')) {
    if (!FORCE) return { skipped: true };
    const end = raw.indexOf('\n---\n', 4);
    if (end === -1) return { error: true };
    raw = raw.slice(end + 5).replace(/^\n+/, '');
  }

  const rel = path.relative(ROOT, file);
  const todos = [];
  const slug = path.basename(file, '.md');
  const dirName = path.basename(path.dirname(file));
  const category = CATEGORY_NORMALIZE[dirName] || dirName;
  const publish = dirName !== 'inbox';

  const lines = raw.split('\n');
  let i = 0;
  while (i < lines.length && !lines[i].startsWith('# ')) i++;
  if (i === lines.length) { warn(rel, 'no H1 found'); return { error: true }; }
  const title = lines[i].slice(2).trim();
  i++;

  while (i < lines.length && !lines[i].trim()) i++;
  let blurb = '';
  if (lines[i]?.startsWith('>')) {
    blurb = lines[i].replace(/^>\s*\*?(.+?)\*?\s*$/, '$1').trim();
    i++;
  } else {
    warn(rel, 'no blurb line found');
  }

  while (i < lines.length && !lines[i].trim()) i++;

  const facts = {};
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('---')) break;
    if (trimmed.startsWith('## ')) break;
    const parsed = parseBoldFact(trimmed);
    if (parsed) {
      facts[parsed.key.toLowerCase()] = parsed.value;
      i++;
    } else if (!trimmed) {
      i++;
    } else {
      break;
    }
  }

  const glass = facts['glass'] || '';
  let method = 'shaken', method_note = '';
  if (facts['method']) {
    const n = normalizeMethod(facts['method']);
    method = n.canon; method_note = n.note;
    if (n.unknown) todos.push(`method "${facts['method']}" unmapped`);
  } else { todos.push('missing method'); }

  let ice = 'cubed', ice_note = '';
  if (facts['ice']) {
    const n = normalizeIce(facts['ice']);
    ice = n.canon; ice_note = n.note;
    if (n.unknown) todos.push(`ice "${facts['ice']}" unmapped`);
  } else { todos.push('missing ice'); }

  let difficulty = 'medium';
  if (facts['difficulty']) {
    difficulty = normalizeDifficulty(facts['difficulty']);
    if (!DIFFICULTIES.has(difficulty)) { todos.push(`difficulty "${facts['difficulty']}" unmapped`); difficulty = 'medium'; }
  } else { todos.push('missing difficulty'); }

  let flavors = [];
  if (facts['flavors']) flavors = parseFlavors(facts['flavors']);

  const body = lines.slice(i).join('\n');
  const ingredientsMatch = body.match(/##\s+Ingredients\n([\s\S]*?)(?=\n##|\n---)/);
  const ingredientsText = ingredientsMatch ? ingredientsMatch[1] : '';
  let spirits = detectSpirits(ingredientsText);

  const indexEntry = indexBySlug.get(slug);
  let styles = [], occasions = [];
  if (indexEntry) {
    for (const s of indexEntry.spirits) if (!spirits.includes(s)) spirits.push(s);
    styles = [...indexEntry.styles];
    occasions = [...indexEntry.occasions];
  }

  const { related, bodyOut } = extractRelated(body);

  const created = gitFirstCommitDate(file);

  const fm = buildFrontmatter({
    title, blurb, category, publish,
    glass, method, method_note, ice, ice_note, difficulty,
    spirits, format: 'single', serves: 1,
    flavors, styles, occasions,
    related, created, todos,
  });

  const cleanBody = bodyOut.replace(/^\s*---\s*\n+/, '').replace(/^\n+/, '');
  const newContent = `${fm}\n\n${cleanBody}`;

  return { newContent, todos };
}

async function main() {
  const files = await walk(RECIPES_DIR);
  const indexBySlug = await parseIndex();
  console.error(`INDEX entries: ${indexBySlug.size}`);

  let migrated = 0, skipped = 0, errors = 0;

  for (const file of files.sort()) {
    const rel = path.relative(ROOT, file);
    const result = await migrate(file, indexBySlug);
    if (result.skipped) { skipped++; continue; }
    if (result.error) { errors++; continue; }
    migrated++;
    const todoMarker = result.todos.length ? ` [${result.todos.length} TODO]` : '';
    console.error(`✓ ${rel}${todoMarker}`);
    if (DRY) {
      console.log(`\n=== ${rel} ===`);
      console.log(result.newContent);
    } else {
      await writeFile(file, result.newContent, 'utf8');
    }
  }

  console.error(`\nMigrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
  if (warnings.length) {
    console.error(`\nWarnings:`);
    for (const w of warnings) console.error(`  - ${w}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
