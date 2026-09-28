import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

function labels(result: Awaited<ReturnType<typeof compileDiagramSpec>>): string[] {
  if (!result.ok) return [];
  return result.scene.labels.map((label) => label.text ?? '');
}

function forceStroke(result: Awaited<ReturnType<typeof compileDiagramSpec>>, id: string) {
  if (!result.ok) return undefined;
  return result.scene.strokes.find((stroke) => stroke.id === id);
}

function forceLabel(result: Awaited<ReturnType<typeof compileDiagramSpec>>, id: string) {
  if (!result.ok) return undefined;
  return result.scene.labels.find((label) => label.id === `force-label-${id}`);
}

describe('FBD force quantity fidelity', () => {
  it('preserves a declared magnitude and unit in the force label', async () => {
    const result = await compileDiagramSpec({
      type: 'scene',
      content: 'kind: fbd\nbody: cart\nforce: F 20 N right on cart',
    }, 'step');
    expect(result.ok).toBe(true);
    expect(labels(result)).toContain('F 20 N');
    expect(forceLabel(result, 'f')?.priority).toBe('required');
  });

  it('rejects garbage and non-positive declared magnitudes', async () => {
    for (const magnitude of ['nope', '-20', '0']) {
      const result = await compileDiagramSpec({
        type: 'scene',
        content: `kind: fbd\nbody: cart\nforce: F ${magnitude} N right on cart`,
      }, 'step');
      expect(result.ok).toBe(false);
    }
  });

  it('preserves the declared cardinal direction with a quantity', async () => {
    const right = await compileDiagramSpec({ type: 'scene', content: 'kind: fbd\nbody: cart\nforce: F 20 N right on cart' }, 'step');
    const left = await compileDiagramSpec({ type: 'scene', content: 'kind: fbd\nbody: cart\nforce: F 20 N left on cart' }, 'step');
    const up = await compileDiagramSpec({ type: 'scene', content: 'kind: fbd\nbody: cart\nforce: F 20 N up on cart' }, 'step');
    expect(forceStroke(right, 'force-f')?.points[2]).toBeGreaterThan(forceStroke(right, 'force-f')?.points[0] ?? 0);
    expect(forceStroke(left, 'force-f')?.points[2]).toBeLessThan(forceStroke(left, 'force-f')?.points[0] ?? 0);
    expect(forceStroke(up, 'force-f')?.points[3]).toBeLessThan(forceStroke(up, 'force-f')?.points[1] ?? 0);
  });

  it('keeps angle references attached to a quantified force', async () => {
    const result = await compileDiagramSpec({
      type: 'scene',
      content: 'kind: fbd\nbody: cart\nforce: T 10 N at 35deg from vertical on cart',
    }, 'step');
    expect(result.ok).toBe(true);
    expect(labels(result)).toContain('T 10 N');
    const stroke = forceStroke(result, 'force-t');
    expect(stroke).toBeDefined();
    if (stroke) {
      const angle = Math.atan2(stroke.points[3]! - stroke.points[1]!, stroke.points[2]! - stroke.points[0]!);
      expect(angle).toBeCloseTo((-125 * Math.PI) / 180, 5);
    }
  });

  it('scales same-unit forces and marks mixed-unit arrows schematic', async () => {
    const sameUnit = await compileDiagramSpec({
      type: 'scene',
      content: 'kind: fbd\nbody: cart\nforce: F 10 N right\nforce: G 20 N left',
    }, 'step');
    expect(sameUnit.ok).toBe(true);
    const f = forceStroke(sameUnit, 'force-f');
    const g = forceStroke(sameUnit, 'force-g');
    expect(Math.hypot(f!.points[2]! - f!.points[0]!, f!.points[3]! - f!.points[1]!)).toBeCloseTo(21.5, 5);
    expect(Math.hypot(g!.points[2]! - g!.points[0]!, g!.points[3]! - g!.points[1]!)).toBeCloseTo(43, 5);

    const mixedUnit = await compileDiagramSpec({
      type: 'scene',
      content: 'kind: fbd\nbody: cart\nforce: F 10 N right\nforce: G 20 kN left',
    }, 'step');
    expect(mixedUnit.ok).toBe(true);
    // D18 (2026-09-25): clean force labels and one "arrows not to scale" note per figure.
    expect(labels(mixedUnit)).toContain('F 10 N');
    expect(labels(mixedUnit)).toContain('G 20 kN');
    expect(labels(mixedUnit).filter((text) => text === 'arrows not to scale')).toHaveLength(1);
  });

  it('marks a same-unit range over 2:1 schematic instead of clamping its ratio', async () => {
    const result = await compileDiagramSpec({
      type: 'scene',
      content: 'kind: fbd\nbody: cart\nforce: F 2 N right\nforce: G 10 N left',
    }, 'step');
    expect(result.ok).toBe(true);
    // D18 (2026-09-25): clean force labels and one "arrows not to scale" note per figure.
    expect(labels(result)).toContain('F 2 N');
    expect(labels(result)).toContain('G 10 N');
    expect(labels(result).filter((text) => text === 'arrows not to scale')).toHaveLength(1);
    const f = forceStroke(result, 'force-f');
    const g = forceStroke(result, 'force-g');
    expect(Math.hypot(f!.points[2]! - f!.points[0]!, f!.points[3]! - f!.points[1]!)).toBeCloseTo(43, 5);
    expect(Math.hypot(g!.points[2]! - g!.points[0]!, g!.points[3]! - g!.points[1]!)).toBeCloseTo(43, 5);
  });
});
