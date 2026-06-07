// Rasterizes scripts/logo.png (exact source asset) into Chrome extension icon sizes.
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, 'logo.png');
const outDir = resolve(here, '../public/icon');

if (!existsSync(source)) {
  console.error('Missing scripts/logo.png for icon generation.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const sizes = [16, 32, 48, 96, 128];
await Promise.all(
  sizes.map((size) =>
    sharp(source)
      .resize(size, size)
      .png({ compressionLevel: 9, palette: true })
      .toFile(resolve(outDir, `${size}.png`)),
  ),
);
console.log('Generated icons from scripts/logo.png:', sizes.join(', '));
