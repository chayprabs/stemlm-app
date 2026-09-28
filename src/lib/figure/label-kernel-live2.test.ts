import { describe, expect, it } from 'vitest';
import { measureText } from './geom';
import { layoutScene } from './slk';
import { SceneBuilder } from './scene-build';
import { FONT_MIN } from './types';

// Live round 2 (2026-09-28): figure equation labels overlapped titles and each other in the real panel.
describe('KaTeX label size estimate', () => {
  // Rendered widths of real figure overlays in the panel (Chromium, bundled KaTeX fonts), in viewBox units at
  // FONT_MIN — lab/browser/s20-katex-measure.cjs. The old estimate was 0.61–1.79 times off.
  for (const [source, rendered] of [
    ['y=x', 30.2],
    ['y=-2x', 46.1],
    ['y=2x+3', 57.9],
    ['y=20+0.839x-0.0371x^2', 148.0],
    ['v_C=9(1-e^{-t/20})', 96.8],
    ['v=\\frac{50[S]}{2.0+[S]}', 54.6],
    ['\\text{competitive inhibitor} ([I]=K_i): v=\\frac{50[S]}{4.0+[S]}', 232.1],
  ] as const) {
    it(`never underestimates and stays within 20% of the rendered width: ${source}`, () => {
      const { w } = measureText(source, FONT_MIN, true);
      expect(w).toBeGreaterThanOrEqual(rendered * 0.99);
      expect(w).toBeLessThanOrEqual(rendered * 1.2);
    });
  }

  it('reserves two rows of height for an inline fraction', () => {
    expect(measureText('v=\\frac{a}{b}', FONT_MIN, true).h).toBeGreaterThanOrEqual(1.9 * FONT_MIN);
    expect(measureText('v=ab', FONT_MIN, true).h).toBeLessThan(1.5 * FONT_MIN);
  });
});

describe('fixed labels are placed before movable ones', () => {
  it('keeps an axis title at its asserted spot even when a movable label was added first', () => {
    const b = new SceneBuilder('plot', 300, 165);
    b.line('xaxis', 40, 120, 290, 120, { protected: true, role: 'axis' });
    // A movable required label whose preferred slot is exactly where the title goes.
    b.circle('p', 165, 130, 3, { role: 'annotation' });
    b.label('pointl0', 'landing (37.1, 0)', 165, 130, { slot: 'S', priority: 'required' });
    b.label('xlabel', 'horizontal distance', 165, 145, { protected: true, priority: 'required' });
    const laid = layoutScene(b.scene());
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    const title = laid.placed.find((placed) => placed.label.id === 'xlabel')!;
    expect(title.x).toBe(165);
    expect(title.y).toBe(145);
  });
});
