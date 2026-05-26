#!/usr/bin/env node
// Generates the site favicon set from src/assets/brand/logo-coupe.png.
// Outputs land in public/ and are committed (see U2 of the logo-and-favicon plan).
// Re-run after replacing the source image:
//
//   npm run generate-favicons

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/assets/brand/logo-coupe.png');
const PUBLIC_DIR = path.join(ROOT, 'public');

// Dark chip color shared with the header chip background (see BaseLayout.astro).
// hsl(240 6% 8%) ≈ #131316
const THEME_COLOR = '#131316';

const PNG_SIZES = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

const ICO_SIZES = [16, 32, 48];

async function resizeToBuffer(size) {
  return sharp(SOURCE)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function main() {
  await readFile(SOURCE).catch((err) => {
    console.error(`Cannot read source: ${SOURCE}`);
    throw err;
  });

  for (const { name, size } of PNG_SIZES) {
    const buf = await resizeToBuffer(size);
    await writeFile(path.join(PUBLIC_DIR, name), buf);
    console.log(`wrote public/${name} (${size}x${size})`);
  }

  const icoBuffers = await Promise.all(ICO_SIZES.map(resizeToBuffer));
  const icoBuf = await pngToIco(icoBuffers);
  await writeFile(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuf);
  console.log(`wrote public/favicon.ico (${ICO_SIZES.join(', ')})`);

  const manifest = {
    name: 'Home Bartender',
    short_name: 'Home Bartender',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: THEME_COLOR,
    background_color: THEME_COLOR,
    display: 'browser',
  };
  await writeFile(
    path.join(PUBLIC_DIR, 'site.webmanifest'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log('wrote public/site.webmanifest');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
