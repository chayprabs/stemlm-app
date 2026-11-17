#!/usr/bin/env node
/**
 * Render a figure gallery to PNG.
 *   node scripts/visual/gallery.mjs specs.json out.png
 * specs.json: [{ "name": "...", "type": "plot", "content": "fn: x^2\ndomain: -2 2" }, ...]
 * Compiles with the shipped figure compiler (no extension build needed) and photographs the result.
 * Prints every figure the compiler hid, with its reason.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BROWSER, chromium } from './browser.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const [specs, out] = process.argv.slice(2);
if (!specs || !out) {
  console.error('usage: node scripts/visual/gallery.mjs specs.json out.png');
  process.exit(2);
}
const html = resolve(out).replace(/\.png$/, '.html');
// A shell, because on Windows npx is a .cmd file and cannot be spawned directly.
execFileSync('npx vitest run --config scripts/visual/gallery.config.ts', {
  shell: true,
  cwd: root,
  stdio: ['ignore', 'pipe', 'inherit'],
  env: { ...process.env, GALLERY_SPECS: resolve(specs), GALLERY_OUT: html },
});

const browser = await chromium.launch(BROWSER);
const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(html).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: resolve(out), fullPage: true });
await browser.close();

const report = JSON.parse(readFileSync(html.replace(/\.html$/, '.json'), 'utf8'));
const hidden = report.filter((r) => !r.ok);
console.log(`[gallery] ${report.length - hidden.length}/${report.length} figures drawn -> ${resolve(out)}`);
for (const r of hidden) console.log(`[gallery] HIDDEN ${r.name} (type=${r.type}): ${r.reason}`);
