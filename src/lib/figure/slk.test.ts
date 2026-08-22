import { describe, it, expect } from 'vitest';
import { samplePathD } from './geom';
import { layoutScene } from './slk';
import { SceneBuilder } from './scene-build';
import { FONT_MIN, LABEL_GAP } from './types';
import { boxHitsAny } from './geom';

describe('cubic-aware stroke sampler', () => {
  it('samples C/Q commands into polyline segments (not M/L-only)', () => {
    const segs = samplePathD('M 0 0 C 0 50 50 50 50 0');
    expect(segs.length).toBeGreaterThan(4);
    expect(segs.some((s) => Math.abs(s.y1) > 10 || Math.abs(s.y2) > 10)).toBe(true);
  });
});

describe('SLK fail-closed label placer', () => {
  it('places a katex eq off a dense polyline or fails closed', () => {
    const b = new SceneBuilder('plot', 300, 165);
    const pts: number[] = [];
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      pts.push(40 + t * 240, 140 - t * t * 110);
    }
    b.polyline('fn', pts, { width: 2 });
    b.label('eq', '\\alpha(t)=1.5t^{2}-2t', 280, 30, { katex: true, slot: 'NE' });
    const laid = layoutScene(b.scene());
    if (laid.ok) {
      const eq = laid.placed.find((p) => p.label.id === 'eq')!;
      expect(eq.overlay).toBe(true);
      expect(boxHitsAny(eq.box, laid.strokes, LABEL_GAP(FONT_MIN))).toBe(false);
    } else {
      expect(laid.code).toBe('unsatisfiable');
    }
  });
});
