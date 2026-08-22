// Copy optically-correct tile PNGs from temp-icon/ into Chrome extension icon slots.
// Do not resample a single master for the default tiles — each size is a separate rendering.
// Inverse (light) tiles for dark toolbars are rasterized from stemlm-icon-inverse.svg.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../temp-icon');
const outDir = resolve(here, '../public/icon');

/** Shipped chrome sizes → source tile in temp-icon/. No 24px tile is supplied. */
const TILES = [
  [16, 'icon16.png'],
  [32, 'icon32.png'],
  [48, 'icon48.png'],
  [128, 'icon128.png'],
];

if (!existsSync(srcDir)) {
  console.error('Missing temp-icon/ for extension tiles.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const leftover96 = resolve(outDir, '96.png');
if (existsSync(leftover96)) rmSync(leftover96);

for (const [size, name] of TILES) {
  const src = resolve(srcDir, name);
  if (!existsSync(src)) {
    console.error(`Missing ${src}`);
    process.exit(1);
  }
  copyFileSync(src, resolve(outDir, `${size}.png`));
  // WXT Firefox theme_icons: dark = glyph for light toolbars (this ink tile).
  copyFileSync(src, resolve(outDir, `dark-${size}.png`));
}

const inverseSvg = resolve(srcDir, 'stemlm-icon-inverse.svg');
if (!existsSync(inverseSvg)) {
  console.error(`Missing ${inverseSvg}`);
  process.exit(1);
}

const inverseBuf = readFileSync(inverseSvg);
for (const [size] of TILES) {
  await sharp(inverseBuf, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(resolve(outDir, `light-${size}.png`));
}

console.log(
  'Copied tile icons from temp-icon:',
  TILES.map(([size]) => size).join(', '),
  '+ dark-* + light-* (inverse)',
);
