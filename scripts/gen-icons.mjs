// Rasterizes scripts/logo.png (exact source asset) into Chrome extension icon sizes.
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const png = resolve(here, 'logo.png');
const svg = resolve(here, 'logo.svg');
const source = existsSync(png) ? png : svg;
const outDir = resolve(here, '../public/icon');

if (!existsSync(source)) {
  console.error('Missing scripts/logo.png or scripts/logo.svg for icon generation.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const sizes = [16, 32, 48, 96, 128];
await Promise.all(
  sizes.map((size) =>
    sharp(source)
      .resize(size, size)
      .png()
      .toFile(resolve(outDir, `${size}.png`)),
  ),
);
console.log(`Generated icons from scripts/${existsSync(png) ? 'logo.png' : 'logo.svg'}:`, sizes.join(', '));
