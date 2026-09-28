/**
 * Bundled type (D4, PERF-02): IBM Plex and KaTeX are woff2 files served from the
 * extension. Nothing asks a font CDN, and the content CSS carries no base64 fonts.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { FONT_MONO_NAME, FONT_SANS_NAME, fontFaceCss, installFontFaces } from './fonts';

const ROOT = process.cwd();

interface Face { family: string; style: string; weight: string; src: string; range?: string }

function faces(css: string): Face[] {
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
    const get = (prop: string) => new RegExp(`${prop}:\\s*([^;]+)`).exec(body as string)?.[1]?.trim();
    return {
      family: (get('font-family') ?? '').replace(/["']/g, ''),
      style: get('font-style') ?? 'normal',
      weight: ({ normal: '400', bold: '700' } as Record<string, string>)[get('font-weight') ?? 'normal'] ?? get('font-weight') ?? '400',
      src: get('src') ?? '',
      range: get('unicode-range'),
    };
  });
}

function shippedSources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) shippedSources(rel, out);
    else if (/\.(ts|tsx|css|html)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(rel);
  }
  return out;
}

describe('bundled fonts', () => {
  const css = fontFaceCss((path) => `chrome-extension://ext${path}`);
  const ours = faces(css);

  it('registers every KaTeX face from the installed katex package, woff2 only', () => {
    const katex = faces(readFileSync(resolve(ROOT, 'node_modules/katex/dist/katex.css'), 'utf8'));
    expect(katex).toHaveLength(20);
    for (const face of katex) {
      const file = /url\(fonts\/([^)]+\.woff2)\)/.exec(face.src)?.[1];
      const match = ours.find((own) => own.family === face.family && own.style === face.style && own.weight === face.weight);
      expect(match, `${face.family} ${face.style} ${face.weight}`).toBeDefined();
      expect(match?.src).toBe(`url("chrome-extension://ext/fonts/katex/${file}") format("woff2")`);
    }
    expect(ours.filter((face) => face.family.startsWith('KaTeX_'))).toHaveLength(20);
  });

  it('registers IBM Plex Sans 400/400i/500/600 and Mono 400/500 (Latin-1) from the extension', () => {
    const plex = ours.filter((face) => !face.family.startsWith('KaTeX_'));
    expect(plex.map((face) => `${face.family} ${face.weight} ${face.style}`).sort()).toEqual([
      `${FONT_MONO_NAME} 400 normal`,
      `${FONT_MONO_NAME} 500 normal`,
      `${FONT_SANS_NAME} 400 italic`,
      `${FONT_SANS_NAME} 400 normal`,
      `${FONT_SANS_NAME} 500 normal`,
      `${FONT_SANS_NAME} 600 normal`,
    ]);
    for (const face of plex) {
      expect(face.src).toMatch(/^url\("chrome-extension:\/\/ext\/fonts\/ibm-plex\/IBMPlex(Sans|Mono)-[A-Za-z]+-Latin1\.woff2"\) format\("woff2"\)$/);
      expect(face.range).toContain('U+0020-007E');
      expect(face.range).toContain('U+00A0-00FF');
    }
  });

  it('ships every referenced file, the OFL licence, and keeps Plex within budget', () => {
    let plexBytes = 0;
    for (const face of ours) {
      const path = /chrome-extension:\/\/ext\/fonts\/(katex|ibm-plex)\/([^"]+)/.exec(face.src);
      expect(path, face.src).not.toBeNull();
      const file = path?.[1] === 'katex'
        ? resolve(ROOT, 'node_modules/katex/dist/fonts', path[2] as string)
        : resolve(ROOT, 'assets/fonts/ibm-plex', path?.[2] as string);
      expect(existsSync(file), file).toBe(true);
      expect(readFileSync(file).subarray(0, 4).toString('latin1')).toBe('wOF2');
      if (path?.[1] === 'ibm-plex') plexBytes += statSync(file).size;
    }
    expect(plexBytes).toBeLessThanOrEqual(150 * 1024);
    expect(readFileSync(resolve(ROOT, 'assets/fonts/ibm-plex/OFL.txt'), 'utf8')).toContain('SIL Open Font License, Version 1.1');
  });

  it('installs one font sheet per document and refreshes its URLs', () => {
    const first = installFontFaces(document, (path) => `chrome-extension://one${path}`);
    const again = installFontFaces(document, (path) => `chrome-extension://two${path}`);
    expect(again).toBe(first);
    expect(document.head.querySelectorAll('style[data-stemlm-fonts]')).toHaveLength(1);
    expect(first.textContent).toContain('chrome-extension://two/fonts/katex/KaTeX_Main-Regular.woff2');
    expect(first.textContent).not.toContain('chrome-extension://one/');
    first.remove();
  });

  it('never asks a font CDN from any shipped surface', () => {
    const offenders = [...shippedSources('entrypoints'), ...shippedSources('src'), ...shippedSources('assets')]
      .filter((file) => /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(readFileSync(join(ROOT, file), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
