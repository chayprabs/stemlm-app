import { describe, expect, it } from 'vitest';
import { compilePhasor } from './leftovers/physics';
import { parseSpec } from './spec';
import { frameSize } from './scene-build';

const ctx = { profile: 'step' as const, family: 'phasor' };

// Live Claude answer, 2026-09-28 (round 2 q04): series RLC near resonance, current as reference. V_C ran
// past the end of the imaginary axis, every vector was named twice ("V_L" and "V_L=251.23∠90"), the
// angle had no degree sign, and the on-axis vectors were overdrawn by their own dashed projections.
const LIVE = ['vec: V_R 119.95∠0', 'vec: V_L 251.23∠90', 'vec: V_C 254.55∠-90', 'vec: V_S 120∠-1.59'].join('\n');

function compiled(raw: string) {
  const result = compilePhasor(parseSpec('phasor', raw), ctx);
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

describe('phasor diagram layout', () => {
  it('keeps every vector inside the frame and inside its axis', () => {
    const scene = compiled(LIVE);
    const { w, h } = frameSize('step');
    const axis = (id: string) => scene.strokes.find((s) => s.id === id)!.points;
    const imag = axis('imag-axis');
    const real = axis('real-axis');
    const [yLo, yHi] = [Math.min(imag[1]!, imag[3]!), Math.max(imag[1]!, imag[3]!)];
    const [xLo, xHi] = [Math.min(real[0]!, real[2]!), Math.max(real[0]!, real[2]!)];
    for (const vector of scene.strokes.filter((s) => /^vector-\d+$/.test(s.id))) {
      const [, , x2, y2] = vector.points as [number, number, number, number];
      expect(x2).toBeGreaterThanOrEqual(0);
      expect(x2).toBeLessThanOrEqual(w);
      expect(y2).toBeGreaterThanOrEqual(0);
      expect(y2).toBeLessThanOrEqual(h);
      expect(y2, vector.id).toBeGreaterThanOrEqual(yLo);
      expect(y2, vector.id).toBeLessThanOrEqual(yHi);
      expect(x2, vector.id).toBeGreaterThanOrEqual(xLo);
      expect(x2, vector.id).toBeLessThanOrEqual(xHi);
    }
  });

  it('names each vector once, with its value in degrees', () => {
    const scene = compiled(LIVE);
    for (const id of ['V_R', 'V_L', 'V_C', 'V_S']) {
      const naming = scene.labels.map((l) => l.text ?? '').filter((text) => text === id || text.startsWith(`${id}=`) || text.startsWith(`${id} =`));
      expect(naming, id).toHaveLength(1);
    }
    const values = scene.labels.map((l) => l.text ?? '').filter((text) => text.includes('∠'));
    expect(values.length).toBeGreaterThan(0);
    for (const text of values) expect(text).toMatch(/∠-?\d+(?:\.\d+)?°$/);
  });

  it('draws no projection guide along an axis-aligned vector', () => {
    const scene = compiled(LIVE);
    const guides = scene.strokes.filter((s) => s.id.startsWith('projection-'));
    for (const guide of guides) {
      const [x1, y1, x2, y2] = guide.points as [number, number, number, number];
      expect(Math.hypot(x2 - x1, y2 - y1), guide.id).toBeGreaterThan(4);
    }
    expect(guides.some((g) => g.id.startsWith('projection-1-') || g.id.startsWith('projection-2-'))).toBe(false);
  });
});
