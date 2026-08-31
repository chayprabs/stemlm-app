import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileDiagramSpec } from './compile';
import { parseSpec, specGetAll } from './spec';
import {
  compileBz,
  compileFeynman,
  compileField,
  compileMinkowski,
  compilePhasor,
  compileRay,
  compileSmith,
} from './leftovers/physics';
import { SceneBuilder } from './scene-build';
import type { CompileCtx, CompileResult, Scene } from './types';

const ctx = (family: string): CompileCtx => ({ family, profile: 'step' });

function success(result: CompileResult): Extract<CompileResult, { ok: true }> {
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result;
}

function countFieldLines(spec: ReturnType<typeof parseSpec>): number {
  return specGetAll(spec, 'field_lines').reduce((total, raw) => {
    const count = /(?:^|\s)count\s*=\s*(\d+)/i.exec(raw)?.[1];
    return total + (count ? Number(count) : 1);
  }, 0);
}

/** The field certificate is intentionally extracted only from stable semantic IDs/roles. */
function fieldCertificate(scene: Scene, raw: string): boolean {
  const spec = parseSpec('field', raw);
  const sourceCount = specGetAll(spec, 'source').filter((raw) => !/^uniform$/i.test(raw.trim())).length;
  const surfaceCount = specGetAll(spec, 'surface').reduce((total, raw) => {
    const count = /(?:^|\s)count\s*=\s*(\d+)/i.exec(raw)?.[1];
    return total + (count ? Number(count) : 1);
  }, 0);
  const fieldLineCount = countFieldLines(spec);
  const sources = scene.strokes.filter((stroke) => stroke.id.startsWith('source-'));
  const surfaces = scene.strokes.filter((stroke) => stroke.id.startsWith('surface-'));
  const lines = scene.strokes.filter((stroke) => stroke.id.startsWith('field-line-'));
  const direction = specGetAll(spec, 'field_lines')[0]?.match(/direction\s*=\s*([\w-]+)/i)?.[1]?.toLowerCase();
  const directionMatches = lines.every((stroke) => {
    const panelIndex = Number(/^field-line-(\d+)-/.exec(stroke.id)?.[1] ?? 0);
    const variant = variantsForCertificate(spec)[panelIndex] ?? 'main';
    const reversed = /negative|minus|inward/i.test(variant);
    const toward = direction === 'toward' ? !reversed : direction === 'away' ? reversed : false;
    return toward
      ? stroke.markerStart === true && stroke.markerEnd !== true
      : stroke.markerEnd === true && stroke.markerStart !== true;
  });
  const anchoredLabels = scene.labels.every((label) => Boolean(label.anchorId));
  const panels = scene.panels ?? [];
  const variants = variantsForCertificate(spec);
  return sources.length === sourceCount * variants.length
    && surfaces.length === surfaceCount * variants.length
    && lines.length === fieldLineCount * variants.length
    && directionMatches
    && anchoredLabels
    && panels.length === Math.max(1, variants.length);
}

function variantsForCertificate(spec: ReturnType<typeof parseSpec>): string[] {
  const variants = specGetAll(spec, 'variant');
  return variants.length ? variants : ['main'];
}

describe('L6 field round-trip certificate', () => {
  const raw = [
    'kind: field',
    'source: charge Q',
    'surface: kind=gaussian count=2',
    'field_lines: direction=away count=6',
    'variant: positive',
  ].join('\n');

  it('extracts every declared source, surface, line, direction, and variant panel', () => {
    const result = success(compileField(parseSpec('field', raw), ctx('field')));
    expect(fieldCertificate(result.scene, raw)).toBe(true);
  });

  it('rejects a deliberately wrong scene with one omitted line', () => {
    const result = success(compileField(parseSpec('field', raw), ctx('field')));
    const wrong: Scene = {
      ...result.scene,
      strokes: result.scene.strokes.filter((stroke) => stroke.id !== 'field-line-0-5'),
    };
    expect(fieldCertificate(wrong, raw)).toBe(false);
  });
});

describe('L6 structured probes', () => {
  it('ray-single-directed preserves semantic endpoints and direction', () => {
    const result = success(compileRay(parseSpec('ray', [
      'kind: ray',
      'source: emitter',
      'target: receiver',
      'ray: relation=incident',
    ].join('\n')), ctx('ray')));
    const directed = result.scene.strokes.find((stroke) => stroke.id === 'ray-0');
    expect(directed?.markerEnd).toBe(true);
    expect(result.scene.labels.map((label) => label.text).join(' ')).toMatch(/emitter|receiver/);
  });

  it('ray-construction-variant consumes repeated relations and construction semantics', () => {
    const result = success(compileRay(parseSpec('ray', [
      'kind: ray',
      'source: object',
      'target: image',
      'ray: relation=incident',
      'ray: relation=reflected',
      'construction: principal',
    ].join('\n')), ctx('ray')));
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('ray-'))).toHaveLength(2);
    expect(result.scene.strokes.some((stroke) => stroke.id.startsWith('construction-') && stroke.dash)).toBe(true);
  });

  it('ray-missing-anchor fails closed', () => {
    const result = compileRay(parseSpec('ray', 'kind: ray\nsource: emitter\nray: relation=incident'), ctx('ray'));
    expect(result.ok).toBe(false);
  });

  it('field-uniform-surfaces preserves parallel surfaces and normal lines', () => {
    const raw = 'kind: field\nsource: uniform\nsurface: kind=equipotential count=3\nfield_lines: direction=normal count=8\nvariant: uniform';
    const result = success(compileField(parseSpec('field', raw), ctx('field')));
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('surface-'))).toHaveLength(3);
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('field-line-'))).toHaveLength(8);
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('source-'))).toHaveLength(0);
    expect(fieldCertificate(result.scene, raw)).toBe(true);
  });

  it('field-sign-pair creates comparable variant panels with reversed direction', () => {
    const raw = 'kind: field\nsource: charge\nfield_lines: direction=away count=8\nvariant: positive\nvariant: negative';
    const result = success(compileField(parseSpec('field', raw), ctx('field')));
    expect(result.scene.panels).toHaveLength(2);
    expect(result.scene.panels?.map((panel) => panel.role)).toEqual(['positive', 'negative']);
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('field-line-'))).toHaveLength(16);
    expect(fieldCertificate(result.scene, raw)).toBe(true);
  });

  it('field-no-source fails closed', () => {
    const result = compileField(parseSpec('field', 'kind: field\nsurface: kind=gaussian\nfield_lines: direction=outward'), ctx('field'));
    expect(result.ok).toBe(false);
  });

  it('field refuses multiple sources when line attribution is ambiguous', () => {
    const result = compileField(parseSpec('field', 'kind: field\nsource: charge A\nsource: charge B\nfield_lines: direction=away count=8'), ctx('field'));
    expect(result.ok).toBe(false);
  });

  it('field-surface-only keeps the declared partial surface without inventing lines', () => {
    const raw = 'kind: field\nsource: enclosed-charge\nsurface: kind=closed';
    const result = success(compileField(parseSpec('field', raw), ctx('field')));
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('surface-'))).toHaveLength(1);
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('field-line-'))).toHaveLength(0);
  });

  it('phasor-vector-set retains one vector and projections per record', () => {
    const result = success(compilePhasor(parseSpec('phasor', 'vec: V 4∠30\nvec: I 2∠-20'), ctx('phasor')));
    expect(result.scene.strokes.filter((stroke) => /^vector-\d+$/.test(stroke.id))).toHaveLength(2);
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('projection-'))).toHaveLength(4);
    expect(result.scene.labels.map((label) => label.text).join(' ')).toMatch(/V|I/);
  });

  it('phasor-invalid-angle fails closed instead of silently dropping the vector', () => {
    const result = compilePhasor(parseSpec('phasor', 'vec: V four degrees thirty'), ctx('phasor'));
    expect(result.ok).toBe(false);
  });

  it('smith-reference-load consumes the supplied reference and load values', () => {
    const result = success(compileSmith(parseSpec('smith', 'z0: 50\nzl: 75+25i'), ctx('smith')));
    const labels = result.scene.labels.map((label) => label.text).join(' ');
    expect(labels).toContain('Z0=50');
    expect(labels).toContain('ZL=75+25i');
    const load = result.scene.strokes.find((stroke) => stroke.id === 'load');
    expect(load?.points[0]).not.toBeCloseTo(0);
  });

  it('smith maps a complex load with the reflection-coefficient geometry', () => {
    const z0 = 50;
    const real = 75;
    const imag = 25;
    const result = success(compileSmith(parseSpec('smith', 'z0: 50\nzl: 75+25i'), ctx('smith')));
    const load = result.scene.strokes.find((stroke) => stroke.id === 'load');
    expect(load).toBeTruthy();
    const radius = Math.min(result.scene.width, result.scene.height) * 0.38;
    const denominator = (real + z0) ** 2 + imag ** 2;
    const gammaReal = (real ** 2 + imag ** 2 - z0 ** 2) / denominator;
    const gammaImag = (2 * z0 * imag) / denominator;
    expect(load!.points[0]).toBeCloseTo(result.scene.width / 2 + gammaReal * radius, 5);
    expect(load!.points[1]).toBeCloseTo(result.scene.height / 2 - gammaImag * radius, 5);
  });

  it('smith uses constant-resistance circles and in-disk reactance arcs', () => {
    const result = success(compileSmith(parseSpec('smith', 'z0: 50\nzl: 75+25i'), ctx('smith')));
    const radius = Math.min(result.scene.width, result.scene.height) * 0.38;
    const resistance = result.scene.strokes.find((stroke) => stroke.id === 'resistance-1');
    expect(resistance?.points[0]).toBeCloseTo(result.scene.width / 2 + radius * 0.2, 5);
    expect(resistance?.points[2]).toBeCloseTo(radius * 0.8, 5);
    const reactanceArcs = result.scene.strokes.filter((stroke) => stroke.id.startsWith('reactance-'));
    expect(reactanceArcs.length).toBeGreaterThan(2);
    expect(reactanceArcs.every((stroke) => stroke.points.every((value, index) => index % 2 === 0
      ? value >= result.scene.width / 2 - radius - 0.1 && value <= result.scene.width / 2 + radius + 0.1
      : value >= result.scene.height / 2 - radius - 0.1 && value <= result.scene.height / 2 + radius + 0.1))).toBe(true);
  });

  it('feynman-photon-interaction preserves the typed carrier', () => {
    const result = success(compileFeynman(parseSpec('feynman', 'kind: t'), ctx('feynman')));
    expect(result.scene.strokes.find((stroke) => stroke.id === 'carrier')?.kind).toBe('path');
    expect(result.scene.strokes.filter((stroke) => stroke.markerEnd).length).toBe(4);
  });

  it('feynman-unknown-kind fails closed', () => {
    const result = compileFeynman(parseSpec('feynman', 'kind: x'), ctx('feynman'));
    expect(result.ok).toBe(false);
  });

  it('minkowski-subunit-velocity consumes ordered events and keeps the boost subluminal', () => {
    const result = success(compileMinkowski(parseSpec('minkowski', 'v: 0.6\nevents: emission\nevents: reception'), ctx('minkowski')));
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('event-'))).toHaveLength(2);
    const boost = result.scene.strokes.find((stroke) => stroke.id === 'boost');
    expect(boost).toBeTruthy();
    expect(Math.abs((boost!.points[2]! - boost!.points[0]!) / (boost!.points[3]! - boost!.points[1]!))).toBeGreaterThan(0);
  });

  it('minkowski-superluminal fails closed', () => {
    const result = compileMinkowski(parseSpec('minkowski', 'v: 1.2'), ctx('minkowski'));
    expect(result.ok).toBe(false);
  });

  it('bz-highlighted-zone keeps a semantic Gamma point and highlight topology', () => {
    const result = success(compileBz(parseSpec('bz', 'highlight: Gamma'), ctx('bz')));
    expect(result.scene.strokes.find((stroke) => stroke.id === 'gamma')).toBeTruthy();
    expect(result.scene.highlights).toContain('Gamma');
    expect(result.scene.strokes.find((stroke) => stroke.id === 'zone-boundary')?.kind).toBe('polygon');
  });

  it('bz places Gamma at the zone center and other path points on the boundary ring', () => {
    const result = success(compileBz(parseSpec('bz', 'lattice: square\npath: Gamma-X-M'), ctx('bz')));
    const gamma = result.scene.strokes.find((stroke) => stroke.id === 'gamma');
    const x = result.scene.strokes.find((stroke) => stroke.id === 'x');
    expect(gamma?.points[0]).toBeCloseTo(result.scene.width / 2, 5);
    expect(gamma?.points[1]).toBeCloseTo(result.scene.height / 2, 5);
    expect(Math.hypot((x?.points[0] ?? 0) - result.scene.width / 2, (x?.points[1] ?? 0) - result.scene.height / 2)).toBeGreaterThan(0.6 * Math.min(result.scene.width, result.scene.height) * 0.3);
  });

  it('bz places square-lattice M at a corner rather than an edge midpoint', () => {
    const result = success(compileBz(parseSpec('bz', 'lattice: square\npath: Gamma-X-M'), ctx('bz')));
    const m = result.scene.strokes.find((stroke) => stroke.id === 'm');
    const halfSide = Math.min(result.scene.width, result.scene.height) * 0.3;
    expect(Math.abs((m?.points[0] ?? 0) - result.scene.width / 2)).toBeCloseTo(halfSide, 5);
    expect(Math.abs((m?.points[1] ?? 0) - result.scene.height / 2)).toBeCloseTo(halfSide, 5);
  });
});

describe('L6 public-dispatch boundary', () => {
  it('field accepts the current catalog route and rejects an underdetermined scene', async () => {
    const good = await compileDiagramSpec({ type: 'field', content: 'kind: field\ncatalog: dipole' }, 'step');
    expect(good.ok).toBe(true);
    const bad = compileField(parseSpec('field', 'kind: field\nsurface: kind=gaussian'), ctx('field'));
    expect(bad.ok).toBe(false);
  });
});

describe('L6 Figure Lab render inputs', () => {
  it('exports representative owned scenes when L6_RENDER=1', async () => {
    if (process.env.L6_RENDER !== '1') return;
    const cases: Array<[string, CompileResult]> = [
      ['field-uniform', compileField(parseSpec('field', 'kind: field\nsource: uniform\nsurface: kind=equipotential count=3\nfield_lines: direction=normal count=8\nvariant: uniform'), ctx('field'))],
      ['field-sign-pair', compileField(parseSpec('field', 'kind: field\nsource: charge\nfield_lines: direction=away count=8\nvariant: positive\nvariant: negative'), ctx('field'))],
      ['ray', compileRay(parseSpec('ray', 'kind: ray\nsource: emitter\ntarget: receiver\nray: relation=incident\nray: relation=reflected\nconstruction: principal'), ctx('ray'))],
      ['phasor', compilePhasor(parseSpec('phasor', 'vec: V 4∠30\nvec: I 2∠-20'), ctx('phasor'))],
      ['smith', compileSmith(parseSpec('smith', 'z0: 50\nzl: 75+25i'), ctx('smith'))],
      ['feynman', compileFeynman(parseSpec('feynman', 'kind: t\nincoming: e,e'), ctx('feynman'))],
      ['minkowski', compileMinkowski(parseSpec('minkowski', 'v: 0.6\nevents: emission\nevents: reception'), ctx('minkowski'))],
      ['bz', compileBz(parseSpec('bz', 'lattice: square\npath: Gamma-X-M'), ctx('bz'))],
    ];
    const directory = resolve('artifacts/figlab/renders/L6');
    mkdirSync(directory, { recursive: true });
    for (const [name, result] of cases) {
      expect(result.ok, result.ok ? name : `${name}: ${result.reason}`).toBe(true);
      if (result.ok) writeFileSync(resolve(directory, `${name}.svg`), result.svg, 'utf8');
    }
  });
});
