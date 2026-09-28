import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';
import { FONT_MIN, type Scene } from './types';
import { orbitalNotation } from './label-format';

// FIG-MO-01: an orbital energy diagram draws one short line per orbital of a degenerate set (p/π*/t2g … from the
// name), fills each set by Hund's rule (one electron in every orbital before any pairs), orders levels by energy on a
// labelled energy axis, and never lets two labels collide.
type Filling = Record<string, string[]>; // `${column}:${level}` → per-orbital electrons, '' | '↑' | '↑↓'

const O2 = [
  'molecule: O2',
  'left: 2s -32 2; 2p -15.8 4',
  'right: 2s -32 2; 2p -15.8 4',
  'center: σ2s -40 2; σ*2s -25 2; σ2p -20 2; π2p -18 4; π*2p -10 2; σ*2p 0 0',
].join('\n');

const CASES: Record<string, { type: string; spec: string; filling: Filling; delta?: string }> = {
  'O2 (paramagnetic π*)': {
    type: 'mo', spec: O2,
    filling: {
      'left:2p': ['↑↓', '↑', '↑'], 'right:2s': ['↑↓'], 'center:π2p': ['↑↓', '↑↓'], 'center:π*2p': ['↑', '↑'],
      'center:σ*2p': [''], 'center:σ2s': ['↑↓'],
    },
  },
  'F2 (full π*, 2p⁵ atoms)': {
    type: 'mo',
    spec: 'molecule: F2\nleft: 2s -40 2; 2p -18.6 5\nright: 2s -40 2; 2p -18.6 5\ncenter: σ2s -45 2; σ*2s -35 2; σ2p -22 2; π2p -20 4; π*2p -15 4; σ*2p -5 0',
    filling: { 'left:2p': ['↑↓', '↑↓', '↑'], 'center:π*2p': ['↑↓', '↑↓'], 'center:σ*2p': [''] },
  },
  'ASCII orbital names': {
    type: 'mo',
    spec: 'molecule: O2\nleft: 2s -32 2; 2p -15.8 4\nright: 2s -32 2; 2p -15.8 4\ncenter: s2s -36 2; s*2s -26 2; p2p -16 4; p*2p -9 2',
    filling: { 'center:p2p': ['↑↓', '↑↓'], 'center:p*2p': ['↑', '↑'] },
  },
  'octahedral high-spin d5': {
    type: 'cft', spec: 'geom: octahedral\nd: 5\nlevels: t2g -0.4 3; eg 0.6 2',
    filling: { 'center:t2g': ['↑', '↑', '↑'], 'center:eg': ['↑', '↑'] }, delta: 'Δ_o',
  },
  'octahedral low-spin d6 from d and spin': {
    type: 'cft', spec: 'geom: octahedral\nd: 6\nspin: low',
    filling: { 'center:t2g': ['↑↓', '↑↓', '↑↓'], 'center:eg': ['', ''] }, delta: 'Δ_o',
  },
  'octahedral high-spin d6 from d and spin': {
    type: 'cft', spec: 'geom: octahedral\nd: 6\nspin: high',
    filling: { 'center:t2g': ['↑↓', '↑', '↑'], 'center:eg': ['↑', '↑'] }, delta: 'Δ_o',
  },
  'octahedral d8 from d alone': {
    type: 'cft', spec: 'geom: Oh\nd: 8',
    filling: { 'center:t2g': ['↑↓', '↑↓', '↑↓'], 'center:eg': ['↑', '↑'] }, delta: 'Δ_o',
  },
  'tetrahedral d7': {
    type: 'cft', spec: 'geom: tetrahedral\nd: 7',
    filling: { 'center:e': ['↑↓', '↑↓'], 'center:t2': ['↑', '↑', '↑'] }, delta: 'Δ_t',
  },
};

function electrons(scene: Scene, orbitalId: string): string {
  const up = scene.strokes.some((s) => s.id === `${orbitalId}-up`);
  const down = scene.strokes.some((s) => s.id === `${orbitalId}-down`);
  return `${up ? '↑' : ''}${down ? '↓' : ''}`;
}

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlap = (p: Box, q: Box) => p.x1 < q.x2 - 0.5 && q.x1 < p.x2 - 0.5 && p.y1 < q.y2 - 0.5 && q.y1 < p.y2 - 0.5;

describe('orbital energy diagrams', () => {
  it.each(Object.entries(CASES))('%s: one line per orbital, Hund filling, energy order, clean labels', async (_name, c) => {
    const result = await compileDiagramSpec({ type: c.type, content: c.spec }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.fontSize).toBe(FONT_MIN);
    const { scene } = result;
    // A level is found through its label (`<column>-<n>-label`, text = the level name); its orbitals share the prefix.
    const prefixOf = (column: string, level: string) => layout.placed
      .find((p) => p.label.id.startsWith(`${column}-`) && p.label.id.endsWith('-label') && p.label.text === level)
      ?.label.id.replace(/-label$/, '');
    for (const [key, expected] of Object.entries(c.filling)) {
      const [column, level] = key.split(':') as [string, string];
      const prefix = prefixOf(column, level);
      expect(prefix, `${key} labelled`).toBeDefined();
      const orbitals = scene.strokes.filter((s) => s.id.startsWith(`${prefix}-orbital-`) && /-orbital-\d+$/.test(s.id));
      expect(orbitals.map((s) => electrons(scene, s.id)), key).toEqual(expected);
    }
    const levelY = new Map<string, number>();
    for (const s of scene.strokes.filter((stroke) => /-orbital-0$/.test(stroke.id))) levelY.set(s.id.replace(/-orbital-0$/, ''), s.points[1]!);
    const energies = [...c.spec.matchAll(/(left|right|center|levels): ([^\n]+)/g)].flatMap((m) => m[2]!.split(';').map((part) => {
      const [id, e] = part.trim().split(/\s+/);
      return { key: prefixOf(m[1] === 'levels' ? 'center' : m[1]!, id!) ?? `missing ${id}`, e: Number(e) };
    }));
    for (const a of energies) {
      for (const b of energies) {
        if (!levelY.has(a.key) || !levelY.has(b.key)) continue;
        if (a.e > b.e) expect(levelY.get(a.key)!, `${a.key} drawn above ${b.key}`).toBeLessThan(levelY.get(b.key)!);
        if (a.e === b.e) expect(levelY.get(a.key)!, `${a.key} level with ${b.key}`).toBeCloseTo(levelY.get(b.key)!, 5);
      }
    }
    const axis = scene.strokes.find((s) => s.id === 'energy-axis');
    expect(axis?.markerEnd, 'energy axis arrow').toBe(true);
    expect(axis!.points[3], 'energy axis points up').toBeLessThan(axis!.points[1]!);
    expect(layout.placed.some((p) => p.label.text === 'E'), 'energy axis named').toBe(true);
    if (c.delta) expect(layout.placed.some((p) => p.label.text === c.delta), `${c.delta} marked`).toBe(true);

    const lines = scene.strokes.filter((s) => /-orbital-\d+(?:-up|-down)?$/.test(s.id));
    for (const p of layout.placed) {
      for (const s of lines) {
        const [x1, y1, x2, y2] = s.points as [number, number, number, number];
        const box = { x1: Math.min(x1, x2) - 0.5, y1: Math.min(y1, y2) - 0.5, x2: Math.max(x1, x2) + 0.5, y2: Math.max(y1, y2) + 0.5 };
        expect(overlap(p.box, box), `${p.label.text} clear of ${s.id}`).toBe(false);
      }
    }
    for (let a = 0; a < layout.placed.length; a++) {
      for (let b = a + 1; b < layout.placed.length; b++) {
        expect(overlap(layout.placed[a]!.box, layout.placed[b]!.box), `${layout.placed[a]!.label.text} × ${layout.placed[b]!.label.text}`).toBe(false);
      }
    }
  });

  it.each([
    ['σ*2p', 'σ*_{2p}'], ['π2p', 'π_{2p}'], ['p*2p', 'π*_{2p}'], ['s2s', 'σ_{2s}'], ['sigma*2s', 'σ*_{2s}'],
    ['t2g', 't_{2g}'], ['eg', 'e_{g}'], ['a1g', 'a_{1g}'], ['t2', 't_{2}'], ['2p', '2p'], ['e', 'e'], ['HOMO', 'HOMO'],
  ])('prints the level name %s as %s', (name, printed) => {
    expect(orbitalNotation(name)).toBe(printed);
  });

  it('typesets orbital names in the emitted figure', async () => {
    const result = await compileDiagramSpec({ type: 'mo', content: O2 }, 'step');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.svg).toMatch(/π\*<tspan[^>]*font-size="75%">2p<\/tspan>/);
  });

  it.each([
    ['a p set over capacity', 'mo', 'left: 2p -15 7'],
    ['a π set over capacity', 'mo', 'center: π*2p -10 5'],
    ['t2g over capacity', 'cft', 'levels: t2g -1 7; eg 1 0'],
    ['an ambiguous octahedral d5 without a spin state', 'cft', 'geom: octahedral\nd: 5'],
    ['an unknown spin state', 'cft', 'geom: octahedral\nd: 5\nspin: medium'],
  ])('refuses %s', async (_name, type, content) => {
    expect((await compileDiagramSpec({ type, content }, 'step')).ok).toBe(false);
  });
});
