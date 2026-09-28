import { describe, expect, it } from 'vitest';
import { compileScene } from './engines/scene';
import { parseSpec } from './spec';
import { layoutScene } from './slk';

const ctx = { profile: 'step' as const, family: 'scene' };

// Live Claude answer, 2026-09-28 (q01): "force: T 40 N at 30 deg from horizontal on box" was drawn at 30° but
// nothing on the figure said so; a textbook free-body diagram marks the angle against a dashed reference.
const LIVE = 'kind: fbd\nbody: box\nincline_deg: 0\nforce: T 40 N at 30 deg from horizontal on box\nforce: W 49.05 N weight on box\nforce: N up on box\nforce: f_k left on box\naxes: local';

describe('free-body angle marks', () => {
  it('marks a force stated at an angle with a reference line, an arc and the value', () => {
    const result = compileScene(parseSpec('scene', LIVE), ctx);
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const arc = result.scene.strokes.find((s) => s.id === 'angle-t');
    const ref = result.scene.strokes.find((s) => s.id === 'angle-t-ref');
    expect(arc).toBeTruthy();
    expect(ref).toBeTruthy();
    // The reference runs horizontally from where T leaves the box.
    const force = result.scene.strokes.find((s) => s.id === 'force-t')!;
    expect(ref!.points[0]).toBeCloseTo(force.points[0]!, 5);
    expect(ref!.points[1]).toBeCloseTo(force.points[1]!, 5);
    expect(Math.abs(ref!.points[3]! - ref!.points[1]!)).toBeLessThan(0.01);
    const laid = layoutScene(result.scene);
    if (!laid.ok) throw new Error(laid.reason);
    expect(laid.placed.find((p) => p.label.id === 'angle-t-label')?.label.text).toBe('30°');
  });

  it('adds no angle mark to forces along the axes', () => {
    const result = compileScene(parseSpec('scene', LIVE), ctx);
    if (!result.ok) throw new Error(result.reason);
    for (const id of ['force-w', 'force-n', 'force-f-k']) expect(result.scene.strokes.some((s) => s.id === `angle-${id.slice('force-'.length)}`), id).toBe(false);
  });
});
