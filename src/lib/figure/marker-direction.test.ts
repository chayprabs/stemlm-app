import { describe, expect, it } from 'vitest';
import { compileDiagram, presentCompiledDiagram } from '@/src/lib/resolve-diagram';

// An arrowhead at the START of a line points away from the line (a reversible reaction reads ↔,
// a dimension line has both heads outward). SVG's plain orient="auto" turns a start marker to point
// into the line, so the shared marker must use orient="auto-start-reverse" all the way to the panel.

async function startMarkers(type: string, content: string): Promise<Element[]> {
  const compiled = await compileDiagram({ type, content });
  expect(compiled.ok, `${type} compiles`).toBe(true);
  for (const theme of ['light', 'dark'] as const) {
    const root = new DOMParser().parseFromString(presentCompiledDiagram(compiled, theme, 'step').svg, 'image/svg+xml').documentElement;
    const users = [...root.querySelectorAll('[marker-start]')];
    expect(users.length, `${type} has start markers`).toBeGreaterThan(0);
    const markers = users.map((el) => root.querySelector(`[id="${/url\(#([^)]+)\)/.exec(el.getAttribute('marker-start')!)![1]}"]`)!);
    if (theme === 'dark') return markers;
    for (const marker of markers) expect(marker.getAttribute('orient')).toBe('auto-start-reverse');
  }
  return [];
}

describe('start arrowheads point away from their line', () => {
  it.each([
    ['a reversible graph edge', 'graph', 'node: a A + B\nnode: b C\nedge: a b reversible\nrankdir: LR'],
    ['a geometry dimension line', 'scene', 'kind: geom\npoint: A 0 0\npoint: B 4 0\nsegment: AB A B\ndimension: dAB A B 4 cm'],
  ])('%s', async (_name, type, content) => {
    for (const marker of await startMarkers(type, content)) expect(marker.getAttribute('orient')).toBe('auto-start-reverse');
  });
});
