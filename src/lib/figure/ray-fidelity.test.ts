import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { compileScene } from './engines/scene';
import { parseSpec } from './spec';
import type { Scene } from './types';

async function render(f: number, distance: number, height: number): Promise<Scene> {
  const result = compileScene(parseSpec('scene', `kind: ray\nf: ${f}\ndo: ${distance}\nho: ${height}`), { family: 'scene', profile: 'step' });
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

describe('thin lens geometric fidelity', () => {
  it('keeps virtual object and focal labels at their optical anchors', async () => {
    const result = await compileDiagramSpec({ type: 'scene', content: 'kind: ray\nf: 30\ndo: 15\nho: 10' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const svg = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
    const objectX = result.scene.strokes.find((s) => s.id === 'object')!.points[0]!;
    expect(Math.abs(Number(svg.querySelector('[id="object-label"]')?.getAttribute('x')) - objectX)).toBeLessThan(12);
    const focus = result.scene.strokes.find((s) => s.id === 'focus-right');
    expect(focus).toBeDefined();
    expect(Number(svg.querySelector('[id="F-right"]')?.getAttribute('x'))).toBeCloseTo(focus!.points[0]!, 5);
  });
  it('admits the scene.ray vocabulary taught in the attached protocol', async () => {
    expect((await compileDiagramSpec({ type: 'scene', content: 'kind: ray\nf: 12\ndo: 18\nho: 3' })).ok).toBe(true);
  });
  it('uses one scale for focal, object, image distances and heights across units', async () => {
    for (const multiplier of [0.1, 1, 10]) {
      const scene = await render(12 * multiplier, 18 * multiplier, 3 * multiplier);
      const lens = scene.strokes.find((s) => s.id === 'lens')!;
      const object = scene.strokes.find((s) => s.id === 'object')!;
      const image = scene.strokes.find((s) => s.id === 'image')!;
      const scale = (lens.points[0]! - object.points[0]!) / (18 * multiplier);
      expect((image.points[0]! - lens.points[0]!) / scale).toBeCloseTo(36 * multiplier, 6);
      expect((object.points[1]! - object.points[3]!) / scale).toBeCloseTo(3 * multiplier, 6);
      expect((image.points[1]! - image.points[3]!) / scale).toBeCloseTo(-6 * multiplier, 6);
      expect(Math.abs(object.points[1]! - object.points[3]!)).toBeGreaterThan(8);
    }
  });

  it('shows a virtual image as dashed backward extension with a forward transmitted ray', async () => {
    const scene = await render(30, 15, 10);
    const lensX = scene.strokes.find((s) => s.id === 'lens')!.points[0]!;
    const transmitted = scene.strokes.find((s) => s.id === 'ray-through-focus')!;
    expect(transmitted.points[0]).toBe(lensX);
    expect(transmitted.points[2]).toBeGreaterThan(lensX);
    const extension = scene.strokes.find((s) => s.id === 'ray-virtual-extension');
    expect(extension?.dash).toBe(true);
    expect(extension?.points[2]).toBeLessThan(lensX);
  });

  it('shows parallel emerging rays when the object is at the focal point', async () => {
    const scene = await render(20, 20, 8);
    expect(scene.strokes.some((s) => s.id === 'image')).toBe(false);
    const refracted = scene.strokes.find((s) => s.id === 'ray-through-focus');
    const central = scene.strokes.find((s) => s.id === 'ray-center-out');
    expect(refracted).toBeDefined();
    expect(central).toBeDefined();
    const slope = (points: number[]) => (points[3]! - points[1]!) / (points[2]! - points[0]!);
    expect(slope(refracted!.points)).toBeCloseTo(slope(central!.points), 6);
  });
});
