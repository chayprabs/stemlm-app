import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileDiagramSpec } from './compile';
import { parseNetlist } from './engines/circuit';
import { parseSpec } from './spec';
import { resolveDiagram } from '@/src/lib/resolve-diagram';
import { svgMarkupHasGraphicShapes } from '@/src/lib/mount-svg';
import type { Diagram } from '@/src/protocol/types';
import type { Scene, SceneStroke } from './types';

const SCRATCH = 'C:\\Users\\chait\\AppData\\Local\\Temp\\grok-goal-9d9c00d35d2f\\implementer';

function d(type: string, content: string): Diagram {
  return { type, content };
}

function idsOf(scene: Scene): string[] {
  return [
    ...scene.nodes.map((n) => n.id),
    ...scene.strokes.map((s) => s.id),
    ...scene.labels.map((l) => l.id),
  ];
}

function isAxisAligned(s: SceneStroke): boolean {
  if (s.kind !== 'line' || s.points.length < 4) return true;
  return Math.abs(s.points[0]! - s.points[2]!) < 0.51 || Math.abs(s.points[1]! - s.points[3]!) < 0.51;
}

function lineEnds(s: SceneStroke): Array<{ x: number; y: number }> {
  return [
    { x: s.points[0]!, y: s.points[1]! },
    { x: s.points[2]!, y: s.points[3]! },
  ];
}

function closePt(a: { x: number; y: number }, b: { x: number; y: number }, eps = 0.6): boolean {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}

export const SOLENOID_SPEC = [
  'catalog: solenoid',
  'core: mu_r=400',
  'B: 1.0 T',
  'H: ?',
].join('\n');

export const DIVIDER_SPEC = [
  'std: ieee',
  'V1: n_in 0 DC 12',
  'R1: n_in n_a 4k',
  'R2: n_a 0 6k',
  'RL: n_a 0 10k',
  'probe: Va=n_a',
  'highlight: R2',
].join('\n');

const PROSE_SOLENOID = [
  'SPEC: A cross-section of a solenoid coil wrapped around a solid cylindrical core.',
  '- The core is shaded, labeled with relative permeability "mu_r = 400".',
  '- Horizontal, parallel magnetic field lines run through the interior, labeled "B = 1.0 T".',
  '- An arrow indicates the magnetic intensity vector "H = ?" pointing in the same direction as B.',
].join('\n');

const FIELD_CATALOGS: Record<string, string> = {
  dipole: 'catalog: dipole',
  'parallel-plate': 'catalog: parallel-plate',
  wire: 'catalog: wire',
  solenoid: SOLENOID_SPEC,
  TE10: 'catalog: TE10',
};

describe('field catalogs through compileDiagramSpec', () => {
  for (const [name, content] of Object.entries(FIELD_CATALOGS)) {
    it(`compiles type=field catalog ${name} to graphic SVG`, async () => {
      const result = await compileDiagramSpec(d('field', content), 'step');
      expect(result.ok, result.ok ? name : `${name}: ${result.reason}`).toBe(true);
      if (!result.ok) return;
      expect(svgMarkupHasGraphicShapes(result.svg)).toBe(true);
    });
  }

  it('solenoid draws shaded core, coil wraps, interior B, H, and named labels', async () => {
    const result = await compileDiagramSpec(d('field', SOLENOID_SPEC), 'step');
    expect(result.ok, result.ok ? 'ok' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(svgMarkupHasGraphicShapes(result.svg)).toBe(true);
    const ids = idsOf(result.scene).join(' ');
    expect(ids).toMatch(/\bcore\b/);
    expect(ids).toMatch(/\bB\b/);
    expect(ids).toMatch(/\bH\b/);
    expect(ids).toMatch(/mu_r/);
    const core = result.scene.strokes.find((s) => s.id === 'core');
    expect(core, 'core stroke').toBeTruthy();
    expect(core!.kind).toBe('rect');
    expect(core!.fill && core!.fill !== 'none').toBe(true);
    const wraps = result.scene.strokes.filter((s) => /^wrap\d+$/.test(s.id));
    expect(wraps.length).toBeGreaterThan(1);
    const bLines = result.scene.strokes.filter(
      (s) => s.id === 'B' || /^B\d+$/.test(s.id),
    );
    expect(bLines.length).toBeGreaterThan(1);
    const hArrow = result.scene.strokes.find((s) => s.id === 'H');
    expect(hArrow, 'H arrow').toBeTruthy();
    expect(hArrow!.markerEnd).toBe(true);
    const bStroke = result.scene.strokes.find((s) => s.id === 'B');
    expect(bStroke, 'B field line').toBeTruthy();
    expect(bStroke!.kind).toBe('line');
    const bDx = Math.sign((bStroke!.points[2] ?? 0) - (bStroke!.points[0] ?? 0));
    const hDx = Math.sign((hArrow!.points[2] ?? 0) - (hArrow!.points[0] ?? 0));
    expect(hDx).toBe(bDx);
    expect(result.scene.labels.some((l) => l.id === 'mu_r')).toBe(true);
    expect(result.svg).toMatch(/id="core"/);
    expect(result.svg).toMatch(/id="H"/);
    expect(result.svg).toMatch(/id="B"/);
    try {
      mkdirSync(SCRATCH, { recursive: true });
      writeFileSync(resolve(SCRATCH, 'solenoid-field.svg'), result.svg, 'utf8');
    } catch {
      /* scratch may be missing */
    }
  });

  it('dipole is not the solenoid canvas', async () => {
    const dip = await compileDiagramSpec(d('field', 'catalog: dipole'), 'step');
    const sol = await compileDiagramSpec(d('field', SOLENOID_SPEC), 'step');
    expect(dip.ok && sol.ok).toBe(true);
    if (!dip.ok || !sol.ok) return;
    const dipIds = new Set(idsOf(dip.scene));
    const solIds = new Set(idsOf(sol.scene));
    expect(solIds.has('core')).toBe(true);
    expect(dipIds.has('core')).toBe(false);
    expect(dipIds.has('plus')).toBe(true);
    expect(solIds.has('plus')).toBe(false);
    expect(dip.scene.strokes.map((s) => s.id).join(',')).not.toBe(
      sol.scene.strokes.map((s) => s.id).join(','),
    );
  });

  it('prose-only solenoid body with no catalog/kind/core keys fails closed', async () => {
    const result = await compileDiagramSpec(d('field', PROSE_SOLENOID), 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toMatch(/malformed|unknown|refused/);
    const resolved = await resolveDiagram(d('field', PROSE_SOLENOID), 'light', 'step');
    expect(resolved.svg).toBe('');
  });
});

describe('circuit netlist layout through compileDiagramSpec', () => {
  it('series-parallel divider keeps named devices, GND rail, and pin/node connectivity', async () => {
    const result = await compileDiagramSpec(d('circuit', DIVIDER_SPEC), 'step');
    expect(result.ok, result.ok ? 'ok' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(svgMarkupHasGraphicShapes(result.svg)).toBe(true);
    const ids = idsOf(result.scene).join(' ');
    for (const need of ['V1', 'R1', 'R2', 'RL']) {
      expect(ids).toContain(need);
      expect(result.svg).toContain(need);
    }
    expect(result.scene.strokes.some((s) => s.id === 'gndrail')).toBe(true);

    const devices = parseNetlist(parseSpec('circuit', DIVIDER_SPEC));
    expect(devices.map((x) => x.id).sort()).toEqual(['R1', 'R2', 'RL', 'V1']);
    for (const dev of devices) {
      expect(dev.n3, `${dev.id} must not treat the value as a node`).toBeUndefined();
      for (const pin of ['n1', 'n2'] as const) {
        const node = dev[pin];
        const wire = result.scene.strokes.find((s) => s.id === `${dev.id}-${pin}`);
        const junc = result.scene.strokes.find((s) => s.id === `j:${dev.id}:${node}`);
        expect(wire, `${dev.id}-${pin} wire`).toBeTruthy();
        expect(junc, `j:${dev.id}:${node}`).toBeTruthy();
        expect(wire!.kind).toBe('line');
        expect(isAxisAligned(wire!), `${dev.id}-${pin} must be axis-aligned`).toBe(true);
        const jpt = { x: junc!.points[0]!, y: junc!.points[1]! };
        expect(
          lineEnds(wire!).some((p) => closePt(p, jpt)),
          `${dev.id} ${pin} must share an endpoint with node ${node}`,
        ).toBe(true);
      }
    }
    const wires = result.scene.strokes.filter(
      (s) => /-n[123]$/.test(s.id) || s.id.startsWith('rail:') || s.id === 'gndrail',
    );
    for (const w of wires) {
      expect(isAxisAligned(w), w.id).toBe(true);
    }
    try {
      mkdirSync(SCRATCH, { recursive: true });
      writeFileSync(resolve(SCRATCH, 'circuit-divider.svg'), result.svg, 'utf8');
    } catch {
      /* scratch may be missing */
    }
  });

  it('IEEE zigzag resistor is not the IEC rectangle', async () => {
    const ieee = await compileDiagramSpec(d('circuit', DIVIDER_SPEC), 'step');
    const iec = await compileDiagramSpec(
      d('circuit', DIVIDER_SPEC.replace('std: ieee', 'std: iec')),
      'step',
    );
    expect(ieee.ok && iec.ok).toBe(true);
    if (!ieee.ok || !iec.ok) return;
    const rIeee = ieee.scene.strokes.find((s) => s.id === 'R1');
    const rIec = iec.scene.strokes.find((s) => s.id === 'R1');
    expect(rIeee, 'IEEE R1').toBeTruthy();
    expect(rIec, 'IEC R1').toBeTruthy();
    expect(rIeee!.kind === rIec!.kind && JSON.stringify(rIeee!.points) === JSON.stringify(rIec!.points)).toBe(
      false,
    );
    expect(rIeee!.kind).toBe('polyline');
    expect(rIec!.kind).toBe('rect');
  });

  it('highlight restyles only; device slots stay put', async () => {
    const base = [
      'std: ieee',
      'V1: n_in 0 DC 12',
      'R1: n_in n_a 4k',
      'R2: n_a 0 6k',
      'RL: n_a 0 10k',
    ].join('\n');
    const a = await compileDiagramSpec(d('circuit', `${base}\nhighlight: R2`), 'step');
    const b = await compileDiagramSpec(d('circuit', `${base}\nhighlight: V1`), 'step');
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const pos = (scene: Scene, id: string) => scene.strokes.find((s) => s.id === id)?.points.slice(0, 4);
    expect(pos(a.scene, 'R1')).toEqual(pos(b.scene, 'R1'));
    expect(pos(a.scene, 'V1')).toEqual(pos(b.scene, 'V1'));
    expect(pos(a.scene, 'RL')).toEqual(pos(b.scene, 'RL'));
    expect(pos(a.scene, 'R2')).toEqual(pos(b.scene, 'R2'));
  });

  it('empty netlist fails closed', async () => {
    const result = await compileDiagramSpec(d('circuit', 'std: ieee'), 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toMatch(/malformed|refused/);
  });

  it('xfmr leftover is two windings plus a core', async () => {
    const result = await compileDiagramSpec(d('xfmr', 'kind: isolation'), 'step');
    expect(result.ok, result.ok ? 'ok' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(svgMarkupHasGraphicShapes(result.svg)).toBe(true);
    const windings = result.scene.strokes.filter((s) => s.kind === 'path' && (s.id === 'p' || s.id === 's'));
    expect(windings.length).toBe(2);
    const cores = result.scene.strokes.filter((s) => /^core/.test(s.id));
    expect(cores.length).toBeGreaterThanOrEqual(1);
  });
});
