// Rasterizes scripts/logo.svg into the PNG icon sizes WXT/Chrome expect.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const svg = resolve(here, 'logo.svg');
const outDir = resolve(here, '../public/icon');
mkdirSync(outDir, { recursive: true });

const sizes = [16, 32, 48, 96, 128];
await Promise.all(
  sizes.map((size) =>
    sharp(svg)
      .resize(size, size)
      .png()
      .toFile(resolve(outDir, `${size}.png`)),
  ),
);
console.log('Generated icons:', sizes.join(', '));
