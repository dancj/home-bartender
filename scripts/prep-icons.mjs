#!/usr/bin/env node
// Slices AI-generated icon grid PNGs into individual icons and vectorizes
// them into tintable SVGs at src/assets/icons/<group>/<slug>.svg.
//
// Driven by data/icon-grids.json, which maps each grid file in docs/imgs/
// to its taxonomy group, slice options, and an ordered slug list (row-major;
// null skips a cell — used for duplicate/variant cells in the source grids).
//
// Pipeline per mapped cell: XY-cut slice → optional frame inset → optional
// label strip → trim → square pad → upscale → threshold → potrace → SVG
// post-process (currentColor, no fixed dimensions).
//
// Requires potrace on PATH (`brew install potrace`).
//
// Usage:
//   npm run icons               # process every grid in the config
//   npm run icons -- grid.png   # process a single grid by filename

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'data', 'icon-grids.json');
const GRID_DIR = path.join(ROOT, 'docs', 'imgs');
const OUT_DIR = path.join(ROOT, 'src', 'assets', 'icons');
const WORK_DIR = path.join(ROOT, '.icon-work');

const TRACE_SIZE = 512; // px square fed to potrace
const PAD_FRAC = 0.08; // padding around the trimmed icon inside the square

// --- pure helpers (unit-tested) ---------------------------------------------

// Given a per-index blankness profile, return content spans, merging spans
// separated by blank gaps narrower than minGap (intra-icon whitespace).
export function splitSpans(blank, minGap) {
  const spans = [];
  let start = null;
  for (let i = 0; i <= blank.length; i++) {
    const isBlank = i === blank.length ? true : blank[i];
    if (!isBlank && start === null) start = i;
    if (isBlank && start !== null) {
      spans.push({ start, end: i });
      start = null;
    }
  }
  // merge spans whose separating gap is narrower than minGap
  const merged = [];
  for (const span of spans) {
    const prev = merged[merged.length - 1];
    if (prev && span.start - prev.end < minGap) prev.end = span.end;
    else merged.push({ ...span });
  }
  return merged;
}

function blankProfile({ width, height, data }, box, axis, threshold) {
  const len = axis === 'rows' ? box.height : box.width;
  const cross = axis === 'rows' ? box.width : box.height;
  const blank = new Array(len).fill(true);
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < cross; j++) {
      const x = axis === 'rows' ? box.x + j : box.x + i;
      const y = axis === 'rows' ? box.y + i : box.y + j;
      if (data[y * width + x] < threshold) {
        blank[i] = false;
        break;
      }
    }
  }
  return blank;
}

function cutBox(img, box, axis, opts) {
  const minGap = axis === 'rows' ? opts.minGapY : opts.minGapX;
  return splitSpans(blankProfile(img, box, axis, opts.threshold), minGap).map((s) =>
    axis === 'rows'
      ? { x: box.x, y: box.y + s.start, width: box.width, height: s.end - s.start }
      : { x: box.x + s.start, y: box.y, width: s.end - s.start, height: box.height }
  );
}

// Recursive XY-cut. Returns row-major cell boxes, each tightly trimmed.
export function xyCut(img, { axis = 'rows', depth = 2, minGapX, minGapY, threshold = 128 }) {
  const opts = { minGapX, minGapY, threshold };
  const full = { x: 0, y: 0, width: img.width, height: img.height };
  let bands = cutBox(img, full, axis, opts);
  if (depth > 1) {
    const other = axis === 'rows' ? 'cols' : 'rows';
    bands = bands.flatMap((band) => cutBox(img, band, other, opts));
  }
  // tight-trim each cell on both axes
  return bands.map((cell) => {
    let box = cutBox(img, cell, 'rows', { ...opts, minGapY: cell.height })[0] ?? cell;
    box = cutBox(img, box, 'cols', { ...opts, minGapX: box.width })[0] ?? box;
    return box;
  });
}

// Drop the final horizontal segment (the text label) from a cell box when it
// is short relative to the cell. Drops at most one segment so multi-segment
// icons (e.g. a numbered-list glyph) survive intact.
export function stripLabelSegments(img, box, { maxLabelFrac, minGapY, threshold }) {
  const segs = cutBox(img, box, 'rows', { minGapY, threshold });
  if (segs.length === 0) return box;
  const lastSeg = segs[segs.length - 1];
  const kept = segs.length > 1 && lastSeg.height < box.height * maxLabelFrac ? segs.slice(0, -1) : segs;
  const y = kept[0].y;
  const end = kept[kept.length - 1].y + kept[kept.length - 1].height;
  return { x: box.x, y, width: box.width, height: end - y };
}

// Keep only the topmost horizontal cluster of a cell (e.g. difficulty pips
// drawn above a decorative glass).
export function keepFirstSegment(img, box, { minGapY, threshold }) {
  const segs = cutBox(img, box, 'rows', { minGapY, threshold });
  if (segs.length === 0) return box;
  return { x: box.x, y: segs[0].y, width: box.width, height: segs[0].height };
}

export function applyCellMap(cells, slugs) {
  if (cells.length !== slugs.length) {
    throw new Error(`expected ${slugs.length} cells, sliced ${cells.length} — adjust slice options or the cell map`);
  }
  return cells.map((cell, i) => ({ cell, slug: slugs[i] })).filter((p) => p.slug !== null);
}

export function validateConfig(config) {
  const seen = new Map(); // group → Set<slug>
  for (const [file, entry] of Object.entries(config)) {
    if (!entry.group) throw new Error(`${file}: missing "group"`);
    if (!Array.isArray(entry.cells)) throw new Error(`${file}: missing "cells" array`);
    const slugs = seen.get(entry.group) ?? new Set();
    for (const slug of entry.cells) {
      if (slug === null) continue;
      if (slugs.has(slug)) throw new Error(`${file}: duplicate slug "${slug}" in group "${entry.group}"`);
      slugs.add(slug);
    }
    seen.set(entry.group, slugs);
  }
}

export function postProcessSvg(svg) {
  let out = svg.slice(svg.indexOf('<svg'));
  out = out.replace(/<metadata>[\s\S]*?<\/metadata>\s*/g, '');
  out = out.replace(/\s(?:width|height)="[^"]*"/g, (m, offset) =>
    out.slice(0, offset).includes('<g') ? m : ''
  );
  out = out.replace(/fill="#000000"/g, 'fill="currentColor"');
  out = out.replace('<svg', '<svg aria-hidden="true"');
  return out;
}

// --- raster pipeline ---------------------------------------------------------

async function loadGray(file) {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(file)
    .flatten({ background: '#ffffff' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data };
}

function insetBox(box, frac) {
  const dx = Math.round(box.width * frac);
  const dy = Math.round(box.height * frac);
  return { x: box.x + dx, y: box.y + dy, width: box.width - 2 * dx, height: box.height - 2 * dy };
}

function trimBox(img, box, threshold) {
  const rows = cutBox(img, box, 'rows', { minGapY: box.height, threshold });
  const r = rows[0] ?? box;
  const cols = cutBox(img, r, 'cols', { minGapX: r.width, threshold });
  return cols[0] ?? r;
}

async function extractCell(file, box) {
  const sharp = (await import('sharp')).default;
  // crop EXACTLY the content box, then pad to a centered square with white —
  // widening the source crop instead would drag in neighboring grid content
  // (labels, adjacent icons).
  const side = Math.max(box.width, box.height);
  const pad = Math.round(side * PAD_FRAC);
  const extend = {
    left: pad + Math.floor((side - box.width) / 2),
    right: pad + Math.ceil((side - box.width) / 2),
    top: pad + Math.floor((side - box.height) / 2),
    bottom: pad + Math.ceil((side - box.height) / 2),
    background: '#ffffff',
  };
  // sequential sharp passes: sharp reorders chained ops internally (extend
  // would apply after resize), so each step gets its own pipeline
  const cropped = await sharp(file)
    .flatten({ background: '#ffffff' })
    .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
    .png()
    .toBuffer();
  const padded = await sharp(cropped).extend(extend).png().toBuffer();
  return sharp(padded)
    .resize(TRACE_SIZE, TRACE_SIZE, { fit: 'fill', kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

// Pack a grayscale buffer into a P4 (binary) PBM for potrace.
function toPbm({ data, info }, threshold = 128) {
  const { width, height } = info;
  const rowBytes = Math.ceil(width / 8);
  const bits = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] < threshold) bits[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return Buffer.concat([Buffer.from(`P4\n${width} ${height}\n`), bits]);
}

function trace(pbmPath, svgPath) {
  execFileSync('potrace', [pbmPath, '-b', 'svg', '-o', svgPath, '-t', '8', '-O', '0.4']);
}

async function processGrid(file, entry) {
  const sharp = (await import('sharp')).default;
  const srcPath = path.join(GRID_DIR, file);
  const img = await loadGray(srcPath);
  const slice = entry.slice ?? {};
  const minGapX = slice.minGapX ?? Math.max(24, Math.round(img.width * 0.03));
  const minGapY = slice.minGapY ?? Math.max(24, Math.round(img.height * 0.03));
  const threshold = slice.threshold ?? 128;

  let cells = xyCut(img, {
    axis: slice.axis ?? 'rows',
    depth: slice.depth ?? 2,
    minGapX,
    minGapY,
    threshold,
  });

  // drop specks (stray dust far smaller than a real icon)
  const minSide = Math.min(img.width, img.height) * 0.02;
  cells = cells.filter((c) => c.width > minSide && c.height > minSide);

  const pairs = applyCellMap(cells, entry.cells);
  const groupDir = path.join(OUT_DIR, entry.group);
  mkdirSync(groupDir, { recursive: true });
  const workDir = path.join(WORK_DIR, entry.group);
  mkdirSync(workDir, { recursive: true });

  for (const { cell, slug } of pairs) {
    let box = cell;
    if (entry.inset) box = trimBox(img, insetBox(box, entry.inset), threshold);
    if (entry.keepSegment === 'first') {
      box = keepFirstSegment(img, box, {
        minGapY: entry.keepGapY ?? Math.max(4, Math.round(box.height * 0.06)),
        threshold,
      });
      box = trimBox(img, box, threshold);
    }
    if (entry.stripLabels) {
      box = stripLabelSegments(img, box, {
        maxLabelFrac: entry.maxLabelFrac ?? 0.25,
        minGapY: entry.labelGapY ?? Math.max(4, Math.round(box.height * 0.04)),
        threshold,
      });
      box = trimBox(img, box, threshold);
    }
    const raster = await extractCell(srcPath, box);
    const pngPreview = path.join(workDir, `${slug}.png`);
    await sharp(raster.data, { raw: raster.info }).png().toFile(pngPreview);
    const pbmPath = path.join(workDir, `${slug}.pbm`);
    writeFileSync(pbmPath, toPbm(raster, threshold));
    const svgPath = path.join(groupDir, `${slug}.svg`);
    trace(pbmPath, svgPath);
    writeFileSync(svgPath, postProcessSvg(readFileSync(svgPath, 'utf8')));
    rmSync(pbmPath);
  }
  return pairs.length;
}

async function main() {
  const only = process.argv.slice(2);
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  validateConfig(config);
  const entries = Object.entries(config).filter(([file]) => only.length === 0 || only.includes(file));
  if (entries.length === 0) {
    console.error(only.length ? `No config entry for: ${only.join(', ')}` : 'Empty config.');
    process.exit(1);
  }
  let total = 0;
  for (const [file, entry] of entries) {
    const n = await processGrid(file, entry);
    console.log(`${file} → ${n} icons (${entry.group})`);
    total += n;
  }
  console.log(`Done: ${total} SVGs in src/assets/icons/ (previews in .icon-work/).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
