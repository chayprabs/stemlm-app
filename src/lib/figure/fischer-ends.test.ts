import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';

// Live Claude answer, 2026-09-28 (q08, (R)-2-bromobutane): the end groups "CH3" and "CH2CH3" floated beside the
// middle of the vertical bond instead of sitting at its ends, and their counts were not subscripts.
const LIVE = 'backbone: CH3,C,CH2CH3\nleft: Br\nright: H';

describe('Fischer projection end groups', () => {
  it('writes the top and bottom groups at the ends of the vertical bond', async () => {
    const result = await compileDiagramSpec({ type: 'fischer', content: LIVE }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const laid = layoutScene(result.scene);
    if (!laid.ok) throw new Error(laid.reason);
    const bond = result.scene.strokes.filter((s) => s.id.startsWith('backbone-'));
    const x = bond[0]!.points[0]!;
    const top = Math.min(...bond.flatMap((s) => [s.points[1]!, s.points[3]!]));
    const bottom = Math.max(...bond.flatMap((s) => [s.points[1]!, s.points[3]!]));
    const head = laid.placed.find((p) => p.label.id === 'center-label-0')!;
    const tail = laid.placed.find((p) => p.label.id === 'center-label-2')!;
    expect(Math.abs(head.x - x)).toBeLessThan(1);
    expect(head.box.y2).toBeLessThanOrEqual(top);
    expect(Math.abs(tail.x - x)).toBeLessThan(1);
    expect(tail.box.y1).toBeGreaterThanOrEqual(bottom);
    // The ends are groups, not dots.
    expect(result.scene.strokes.some((s) => s.id === 'center-0' || s.id === 'center-2')).toBe(false);
  });

  it('sets the atom counts in group formulas as subscripts', async () => {
    const result = await compileDiagramSpec({ type: 'fischer', content: LIVE }, 'step');
    if (!result.ok) throw new Error(result.reason);
    expect(result.svg).toMatch(/CH<tspan[^>]*dy="[\d.]+"[^>]*>3<\/tspan>/);
  });
});
