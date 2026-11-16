#!/usr/bin/env node
/**
 * Contact sheet: tile screenshots into one image for side-by-side review.
 *   node scripts/visual/sheet.mjs out.png [--cols 2] [--width 900] a.png b.png ...
 */
import sharp from 'sharp';
import { basename } from 'node:path';

const args = process.argv.slice(2);
const out = args.shift();
const take = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const [, value] = args.splice(i, 2);
  return Number(value);
};
const cols = take('cols', 2);
const cellW = take('width', 900);
const gap = 16;
const labelH = 26;

const cells = await Promise.all(args.map(async (file) => {
  const img = sharp(file).resize({ width: cellW });
  const buf = await img.png().toBuffer();
  const meta = await sharp(buf).metadata();
  return { file, buf, h: meta.height };
}));

const rows = [];
for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols));
const rowH = rows.map((row) => Math.max(...row.map((c) => c.h)) + labelH);
const width = cols * cellW + (cols + 1) * gap;
const height = rowH.reduce((a, b) => a + b + gap, gap);

const composite = [];
let y = gap;
rows.forEach((row, r) => {
  row.forEach((cell, c) => {
    const x = gap + c * (cellW + gap);
    const label = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${cellW}" height="${labelH}"><text x="2" y="18" font-family="monospace" font-size="15" fill="#d22">${basename(cell.file, '.png')}</text></svg>`,
    );
    composite.push({ input: label, left: x, top: y });
    composite.push({ input: cell.buf, left: x, top: y + labelH });
  });
  y += rowH[r] + gap;
});

await sharp({ create: { width, height, channels: 3, background: '#8a8a8a' } }).composite(composite).png().toFile(out);
console.log('wrote', out, `${width}x${height}`);
