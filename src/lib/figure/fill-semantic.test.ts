import { describe, expect, it } from 'vitest';
import { compileDiagram, presentCompiledDiagram } from '@/src/lib/resolve-diagram';
import type { ResolvedTheme } from '@/src/lib/theme';
import { emitSvg } from './emit';
import { SceneBuilder } from './scene-build';
import { layoutScene } from './slk';

// FIG-FILL-01: a filled shape is either INK (a dot, bar or blob filled with its own outline
// colour, so it reads as solid in both themes) or PAPER (an interior behind text or wires,
// filled with a surface close to the figure background in both themes). The old single
// `solid` fill emitted white, which the light theme turned into ink and the dark theme into
// a near-background fill, so junction dots read as open terminals in dark mode.

// The figure card surfaces (assets/tokens.css --slm-formula-bg).
const CARD: Record<ResolvedTheme, string> = { light: '#efefef', dark: '#1a1a1a' };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

async function present(type: string, content: string, theme: ResolvedTheme): Promise<Element> {
  const compiled = await compileDiagram({ type, content });
  expect(compiled.ok, `${type} compiles`).toBe(true);
  const svg = presentCompiledDiagram(compiled, theme, 'step').svg;
  return new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
}

function filledShapes(root: Element): Element[] {
  return [...root.querySelectorAll('circle, rect, ellipse, polygon, path, polyline')].filter((el) => {
    if (el.closest('marker, pattern')) return false;
    const fill = el.getAttribute('fill');
    return Boolean(fill && fill !== 'none' && !fill.startsWith('url('));
  });
}

const DOTS: Array<[string, string, string]> = [
  ['circuit junctions', 'circuit', 'std: ieee\nV1: n1 0 DC 12\nR1: n1 n2 4k\nR2: n2 0 6k\nR3: n2 0 12k'],
  ['plot data points', 'plot', 'kind: discrete\ndomain: 0 3\ndata: 0,1; 1,2; 2,1.5; 3,3\nxlabel: n\nylabel: x[n]'],
  ['plot point marker', 'plot', 'fn: x^2\ndomain: 0 3\nmarker: point=2,4'],
  ['lens focal points', 'scene', 'kind: ray\nf: 10\ndo: 25\nho: 4'],
];

const PAPER: Array<[string, string, string, (el: Element) => boolean]> = [
  ['free-body block', 'scene', 'kind: fbd\nbody: crate\nforce: W 98 N down on crate\nforce: N 98 N up on crate', (el) => /body-crate$/.test(el.id)],
  ['op-amp resistor boxes', 'opamp', 'rf: 100k\nrg: 10k\nvin: sensor\nvout: filtered\ngnd: 0\nfeedback: inverting', (el) => /R[fg]box$/.test(el.id)],
];

describe('FIG-FILL-01 ink and paper fills', () => {
  it('emits ink in the outline colour and paper as the paper surface', () => {
    const b = new SceneBuilder('probe', 100, 60);
    b.circle('dot', 20, 30, 3, { fill: 'ink' as never });
    b.circle('hot', 50, 30, 3, { color: 'danger', fill: 'ink' as never });
    b.rect('box', 60, 20, 30, 20, { fill: 'paper' as never });
    const scene = b.scene();
    const layout = layoutScene(scene);
    if (!layout.ok) throw new Error(layout.reason);
    const root = new DOMParser().parseFromString(emitSvg(scene, layout), 'image/svg+xml').documentElement;
    const shape = (id: string) => root.querySelector(`[id="${id}"]`)!;
    expect(shape('dot').getAttribute('fill')).toBe(shape('dot').getAttribute('stroke'));
    expect(shape('hot').getAttribute('fill')).toBe(shape('hot').getAttribute('stroke'));
    expect(shape('box').getAttribute('fill')).toBe('#ffffff');
  });

  for (const theme of ['light', 'dark'] as const) {
    it.each(DOTS)(`fills %s with their own outline colour in ${theme} theme`, async (_name, type, content) => {
      const root = await present(type, content, theme);
      const dots = filledShapes(root).filter((el) => el.tagName === 'circle' && Number(el.getAttribute('r')) <= 4);
      expect(dots.length).toBeGreaterThan(0);
      for (const dot of dots) {
        expect(dot.getAttribute('fill'), dot.id).toBe(dot.getAttribute('stroke'));
        expect(contrast(dot.getAttribute('fill')!, CARD[theme]), dot.id).toBeGreaterThan(3);
      }
    });

    it.each(PAPER)(`keeps the %s interior on a paper surface in ${theme} theme`, async (_name, type, content, pick) => {
      const root = await present(type, content, theme);
      const shapes = filledShapes(root).filter(pick);
      expect(shapes.length).toBeGreaterThan(0);
      for (const shape of shapes) {
        expect(contrast(shape.getAttribute('fill')!, CARD[theme]), shape.id).toBeLessThan(1.25);
        expect(contrast(shape.getAttribute('stroke')!, CARD[theme]), shape.id).toBeGreaterThan(3);
      }
    });
  }
});
