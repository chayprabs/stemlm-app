import { describe, expect, it } from 'vitest';
import { compileScene } from './engines/scene';
import { parseSpec } from './spec';
import type { Scene } from './types';

const ctx = { profile: 'step' as const, family: 'scene' };
const compile = (content: string) => compileScene(parseSpec('scene', content), ctx);

// Live Claude answer, 2026-09-28: "path: A B isothermal" on a P–V diagram was drawn as a straight
// segment, while the text (correctly) called it a hyperbola with W = area under it.
const ISO_THEN_ISOCHORIC = [
  'kind: thermodynamic-graph',
  'axis: x Volume V (L)',
  'axis: y Pressure P (kPa)',
  'state: A 10 249.4 A (300 K)',
  'state: B 25 99.8 B (300 K)',
  'state: C 25 49.9 C (150 K)',
  'path: A B isothermal',
  'path: B C isochoric',
].join('\n');

/** Screen → data mapping from two numeric tick labels per axis. */
function calibrate(scene: Scene) {
  const ticks = (axis: 'x' | 'y') => scene.labels
    .filter((label) => label.id.startsWith(`axis-${axis}-tick-`) && Number.isFinite(Number(label.text)))
    .map((label) => ({ value: Number(label.text), at: axis === 'x' ? label.x : label.y }));
  const map = (axis: 'x' | 'y') => {
    const [a, b] = [ticks(axis)[0]!, ticks(axis).at(-1)!];
    return (screen: number) => a.value + ((screen - a.at) / (b.at - a.at)) * (b.value - a.value);
  };
  return { x: map('x'), y: map('y') };
}

describe('P–V process curves', () => {
  it('draws an isothermal path as the hyperbola P·V = constant through both states', () => {
    const result = compile(ISO_THEN_ISOCHORIC);
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const curve = result.scene.strokes.find((stroke) => stroke.id === 'path-a-b')!;
    expect(curve.kind).toBe('polyline');
    expect(curve.markerEnd).toBe(true);
    const data = calibrate(result.scene);
    const products: number[] = [];
    for (let i = 0; i + 1 < curve.points.length; i += 2) products.push(data.x(curve.points[i]!) * data.y(curve.points[i + 1]!));
    expect(products.length).toBeGreaterThan(20);
    // P·V ≈ 2494 kPa·L all along the drawn path (tick calibration and trimming tolerance).
    for (const pv of products) expect(Math.abs(pv - 2494) / 2494).toBeLessThan(0.04);
  });

  it('keeps the isochoric process a straight vertical segment', () => {
    const result = compile(ISO_THEN_ISOCHORIC);
    if (!result.ok) throw new Error(result.reason);
    const line = result.scene.strokes.find((stroke) => stroke.id === 'path-b-c')!;
    expect(line.kind).toBe('line');
    expect(Math.abs(line.points[0]! - line.points[2]!)).toBeLessThan(0.5);
  });

  it('draws an adiabat through both states with the exponent they imply', () => {
    const result = compile('kind: thermodynamic\naxis: x V (L)\naxis: y P (kPa)\nstate: 1 1 1000\nstate: 2 2 330\npath: 1 2 adiabatic expansion');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const curve = result.scene.strokes.find((stroke) => stroke.id === 'path-1-2')!;
    expect(curve.kind).toBe('polyline');
    const data = calibrate(result.scene);
    const gamma = Math.log(1000 / 330) / Math.log(2);
    const mid = Math.floor(curve.points.length / 4) * 2;
    const v = data.x(curve.points[mid]!);
    expect(data.y(curve.points[mid + 1]!)).toBeCloseTo(1000 * (1 / v) ** gamma, -1);
  });

  it('refuses an "isothermal" path whose states are not on one isotherm', () => {
    const result = compile('kind: thermodynamic\naxis: x V (L)\naxis: y P (kPa)\nstate: A 10 300\nstate: B 20 100\npath: A B isothermal');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/isotherm/);
  });

  it('keeps straight segments on axes that are not P and V (T–S isotherm is horizontal)', () => {
    const result = compile('kind: thermodynamic\naxis: x S (J/K)\naxis: y T (K)\nstate: 1 2 400\nstate: 2 6 400\npath: 1 2 isothermal');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(result.scene.strokes.find((stroke) => stroke.id === 'path-1-2')!.kind).toBe('line');
  });
});
