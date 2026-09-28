import { describe, expect, it } from 'vitest';
import { measureText } from './geom';

// Live Claude answer, 2026-09-28 (round 2 q05): "I=I_0\cos^2\left(\pi y/\beta\right)" was measured with
// \cos as one 0.6em glyph; KaTeX draws three upright letters and a thin space, so the placed box was short.
describe('KaTeX operator names', () => {
  it.each(['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'lim', 'max', 'arctan', 'sinh', 'det'])('\\%s is measured as its upright letters', (name) => {
    const op = measureText(`\\${name} x`, 12, true).w;
    const letters = measureText(`\\text{${name}} x`, 12, true).w;
    expect(op).toBeGreaterThanOrEqual(letters);
  });

  it('keeps an unknown macro at one glyph', () => {
    expect(measureText('\\alpha x', 12, true).w).toBeLessThan(measureText('\\text{alpha} x', 12, true).w);
  });
});
