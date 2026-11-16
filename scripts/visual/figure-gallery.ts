/**
 * Figure gallery: compile figure specs with the shipped compiler and write one HTML page that
 * shows each figure the way the study panel draws it (themed SVG plus KaTeX label overlays),
 * in light and dark. Driven by scripts/visual/gallery.mjs.
 *
 * Input:  GALLERY_SPECS = path to a JSON array of { name, type, content, note? }
 * Output: GALLERY_OUT   = path of the HTML file to write (a .json report is written beside it)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { it } from 'vitest';
import { compileDiagram, presentCompiledDiagram } from '@/src/lib/resolve-diagram';
import { overlayMathSize, renderOverlayHtml } from '@/src/lib/figure/overlay';
import { fontFaceCss } from '@/src/lib/fonts';

interface GallerySpec { name: string; type: string; content: string; note?: string }

const root = resolve(__dirname, '../..');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function figureHtml(svg: string, overlays: Parameters<typeof renderOverlayHtml>[0][]): string {
  const viewBox = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number) ?? [0, 0, 300, 165];
  const [vx, vy, vw, vh] = viewBox as [number, number, number, number];
  const labels = overlays.map((o) => {
    const ax = o.anchor === 'start' ? '0%' : o.anchor === 'end' ? '-100%' : '-50%';
    const ay = o.baseline === 'hanging' ? '0%' : o.baseline === 'alphabetic' ? '-100%' : '-50%';
    const size = overlayMathSize(o, vw);
    return `<div class="ov" style="left:${(100 * (o.x - vx)) / vw}%;top:${(100 * (o.y - vy)) / vh}%;transform:translate(${ax},${ay});${size ? `font-size:${size};` : ''}">${renderOverlayHtml(o)}</div>`;
  }).join('');
  return `<div class="frame" style="aspect-ratio:${vw}/${vh}">${svg}${labels}</div>`;
}

it('writes the figure gallery', async () => {
  const specsPath = process.env.GALLERY_SPECS;
  const outPath = process.env.GALLERY_OUT;
  if (!specsPath || !outPath) throw new Error('GALLERY_SPECS and GALLERY_OUT are required');
  const specs = JSON.parse(readFileSync(specsPath, 'utf8')) as GallerySpec[];
  const report: Array<{ name: string; type: string; ok: boolean; reason?: string }> = [];
  const cells: string[] = [];

  for (const spec of specs) {
    const compiled = await compileDiagram({ type: spec.type, content: spec.content }, 'step');
    const themed = (['light', 'dark'] as const).map((theme) => {
      const shown = presentCompiledDiagram(compiled, theme, 'step', 1.46);
      return shown.ok
        ? `<div class="paper ${theme}">${figureHtml(shown.svg, shown.overlays)}</div>`
        : `<div class="paper ${theme} failed">hidden: ${esc(shown.diagnostic.code)}<br>${esc(shown.diagnostic.reason)}</div>`;
    });
    report.push(compiled.ok
      ? { name: spec.name, type: spec.type, ok: true }
      : { name: spec.name, type: spec.type, ok: false, reason: `${compiled.diagnostic.code}: ${compiled.diagnostic.reason}` });
    cells.push(`<section><h2>${esc(spec.name)} <code>type=${esc(spec.type)}</code></h2>${spec.note ? `<p>${esc(spec.note)}</p>` : ''}<div class="pair">${themed.join('')}</div><pre>${esc(spec.content)}</pre></section>`);
  }

  const fonts = fontFaceCss((path) => path.startsWith('/fonts/katex/')
    ? `file://${root}/node_modules/katex/dist/fonts/${path.split('/').pop()}`
    : `file://${root}/assets/fonts/ibm-plex/${path.split('/').pop()}`);
  // KaTeX's stylesheet minus its own @font-face rules: the faces come from fontFaceCss above.
  const katexCss = readFileSync(resolve(root, 'node_modules/katex/dist/katex.min.css'), 'utf8')
    .replace(/@font-face\s*\{[^}]*\}/g, '');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>stemLM figure gallery</title><style>
${fonts}
${katexCss}
body{margin:0;padding:24px;background:#7d7d7d;font:14px/1.45 'IBM Plex Sans',system-ui,sans-serif;color:#111}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
section{background:#e9e9e9;border-radius:10px;padding:14px}
h2{margin:0 0 8px;font-size:15px}h2 code{font:12px 'IBM Plex Mono',monospace;color:#555;margin-left:6px}
p{margin:0 0 8px;color:#444}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.paper{border-radius:8px;padding:14px;display:flex;align-items:center;justify-content:center;min-height:120px}
.paper.light{background:#ffffff;color:#121212}.paper.dark{background:#1c1c1c;color:#ededed}
.paper.failed{color:#c22;font:12px 'IBM Plex Mono',monospace;text-align:center}
.frame{position:relative;width:100%;container-type:inline-size}
.frame svg{display:block;width:100%;height:auto;overflow:visible}
.ov{position:absolute;pointer-events:none;white-space:nowrap;line-height:1}
pre{margin:10px 0 0;font:11px/1.4 'IBM Plex Mono',monospace;color:#333;white-space:pre-wrap;max-height:120px;overflow:hidden}
</style></head><body><main>${cells.join('\n')}</main></body></html>`;
  writeFileSync(outPath, html);
  writeFileSync(outPath.replace(/\.html$/, '.json'), JSON.stringify(report, null, 2));
});
