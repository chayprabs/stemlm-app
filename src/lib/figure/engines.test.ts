import { describe, it, expect } from 'vitest';
import { resolveDiagram } from '@/src/lib/resolve-diagram';
import { evaluatePlotFn } from './engines/plot';
import { svgMarkupHasGraphicShapes } from '@/src/lib/mount-svg';
import { computeDisplaySize } from '@/src/lib/diagram-bounds';
import { layoutScene, labelHitsStrokes } from './slk';
import { buildPlotScene } from './engines/plot';
import { parseSpec } from './spec';
import { LABEL_GAP, FONT_MIN } from './types';
import { boxHitsAny } from './geom';

const PLOT_SPEC = [
  'fn: 1.5*t^2 - 2*t',
  'var: t',
  'domain: 0 10',
  'xlabel: t (s)',
  'ylabel: \\alpha (rad/s^2)',
  'point: 10, 130',
  'point_label: 130',
  'drop: both',
  'eq: \\alpha(t)=1.5t^{2}-2t',
  'eq_slot: NE',
].join('\n');

describe('five engines through resolveDiagram', () => {
  it('plot samples 1.5*t^2-2*t so f(10)=130 and returns graphic SVG + eq overlay', async () => {
    expect(evaluatePlotFn('1.5*t^2 - 2*t', 't', 10)).toBe(130);
    const resolved = await resolveDiagram({ type: 'plot', content: PLOT_SPEC }, 'light', 'step');
    expect(svgMarkupHasGraphicShapes(resolved.svg)).toBe(true);
    expect(resolved.svg).toMatch(/<(polyline|path)\b/i);
    expect(resolved.svg).toContain('t (s)');
    expect(resolved.overlays.some((o) => o.kind === 'katex' && o.source.includes('alpha'))).toBe(true);
    expect(resolved.svg).not.toMatch(/<text[^>]*>[^<]*1\.5t/);
  });

  it('circuit instantiates named devices R1 R2 RL', async () => {
    const content = ['std: ieee', 'V1: n_in 0 DC 12', 'R1: n_in n_a 4k', 'R2: n_a 0 6k', 'RL: n_a 0 2k', 'highlight: R2'].join('\n');
    const resolved = await resolveDiagram({ type: 'circuit', content }, 'light', 'step');
    expect(svgMarkupHasGraphicShapes(resolved.svg)).toBe(true);
    expect(resolved.svg).toContain('R1');
    expect(resolved.svg).toContain('R2');
    expect(resolved.svg).toContain('RL');
  });

  it('table shows ICE species', async () => {
    const content = ['kind: ice', 'species: N2, H2, NH3', 'I: 1, 3, 0', 'C: -x, -3x, +2x', 'E: 1-x, 3-3x, 2x', 'highlight_row: C'].join('\n');
    const resolved = await resolveDiagram({ type: 'table', content }, 'light', 'step');
    expect(svgMarkupHasGraphicShapes(resolved.svg)).toBe(true);
    expect(resolved.svg).toContain('N2');
    expect(resolved.svg).toContain('NH3');
  });

  it('scene FBD has named forces not a legend list', async () => {
    const content = [
      'kind: fbd',
      'body: block',
      'incline_deg: 30',
      'force: mg down weight',
      'force: N normal+',
      'force: f_k up_incline',
      'axes: x along_incline, y normal',
    ].join('\n');
    const resolved = await resolveDiagram({ type: 'scene', content }, 'light', 'step');
    expect(svgMarkupHasGraphicShapes(resolved.svg)).toBe(true);
    expect(resolved.svg).toContain('mg');
    expect(resolved.svg.toLowerCase()).not.toContain('symbols:');
  });

  it('graph has named nodes and edges', async () => {
    const content = [
      'rankdir: LR',
      'node: A macromolecule hexokinase',
      'node: B simplechem glucose',
      'edge: B A consumption',
      'highlight: A',
    ].join('\n');
    const resolved = await resolveDiagram({ type: 'graph', content }, 'light', 'step');
    expect(svgMarkupHasGraphicShapes(resolved.svg)).toBe(true);
    expect(resolved.svg).toContain('hexokinase');
    expect(resolved.svg).toContain('glucose');
  });
});

describe('screenshot regression SLK contract', () => {
  it('places eq overlay with zero label-stroke hits on the sampled polyline', () => {
    const spec = parseSpec('plot', PLOT_SPEC);
    const scene = buildPlotScene(spec, { profile: 'step', family: 'plot' });
    const laid = layoutScene(scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    const eq = laid.placed.find((p) => p.label.id.startsWith('eq'));
    expect(eq).toBeTruthy();
    expect(eq!.overlay).toBe(true);
    expect(boxHitsAny(eq!.box, laid.strokes, LABEL_GAP(FONT_MIN))).toBe(false);
    expect(labelHitsStrokes(laid, eq!.label.id)).toBe(false);
  });

  it('print-profile compile fits ≤ 480×275', async () => {
    const resolved = await resolveDiagram({ type: 'plot', content: PLOT_SPEC }, 'light', 'print');
    expect(svgMarkupHasGraphicShapes(resolved.svg)).toBe(true);
    const vb = /viewBox="([^"]+)"/.exec(resolved.svg)?.[1];
    const size = computeDisplaySize(vb, 'print');
    expect(size.width).toBeLessThanOrEqual(480);
    expect(size.height).toBeLessThanOrEqual(275);
  });

  it('plot ticks stay on the data range and never print padded floats', async () => {
    const resolved = await resolveDiagram({ type: 'plot', content: PLOT_SPEC }, 'light', 'print');
    const tickLabels = [...resolved.svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(
      (m) => m[1] ?? '',
    );
    expect(tickLabels.some((t) => /33333|140\.45/.test(t))).toBe(false);
    expect(tickLabels).toContain('100');
    expect(tickLabels).toContain('130');
    expect(tickLabels).toContain('0');
  });
});

describe('step-sync stability', () => {
  it('two hybrid-π specs that differ only in highlight keep the same relative slots', async () => {
    const base = 'rpi: 1.2k\ngm: 50m\nRE: 270\nRC: 2.2k';
    const a = await resolveDiagram({ type: 'hybridpi', content: `${base}\nhighlight: RC` }, 'light', 'step');
    const b = await resolveDiagram({ type: 'hybridpi', content: `${base}\nhighlight: rpi` }, 'light', 'step');
    expect(svgMarkupHasGraphicShapes(a.svg)).toBe(true);
    expect(svgMarkupHasGraphicShapes(b.svg)).toBe(true);
    const pos = (svg: string, id: string) => {
      const re = new RegExp(`id="${id}"[^>]*(?:x="([^"]+)"[^>]*y="([^"]+)"|x1="([^"]+)"[^>]*y1="([^"]+)")`);
      const m = re.exec(svg);
      return m ? [m[1] ?? m[3], m[2] ?? m[4]] : null;
    };
    expect(pos(a.svg, 'B')).toEqual(pos(b.svg, 'B'));
    expect(pos(a.svg, 'C')).toEqual(pos(b.svg, 'C'));
    expect(pos(a.svg, 'E')).toEqual(pos(b.svg, 'E'));
  });
});

describe('sanitize XSS via label text', () => {
  it('a label containing <script> cannot XSS after compile+sanitize', async () => {
    const content = 'fn: t\nvar: t\ndomain: 0 1\nxlabel: t\nylabel: y\neq: <script>alert(1)</script>';
    const resolved = await resolveDiagram({ type: 'plot', content }, 'light', 'step');
    expect(resolved.svg.toLowerCase()).not.toContain('<script');
    expect(resolved.svg).not.toContain('alert(1)');
    const { renderOverlayHtml } = await import('./overlay');
    const rendered = resolved.overlays.map((o) => renderOverlayHtml(o)).join(' ');
    expect(rendered.toLowerCase()).not.toContain('<script');
  });
});
