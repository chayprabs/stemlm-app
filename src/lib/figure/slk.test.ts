import { describe, it, expect } from 'vitest';
import { samplePathD } from './geom';
import { layoutScene } from './slk';
import { SceneBuilder } from './scene-build';
import { FONT_MIN, LABEL_GAP } from './types';
import { boxHitsAny, boxesOverlap } from './geom';

describe('cubic-aware stroke sampler', () => {
  it('samples C/Q commands into polyline segments (not M/L-only)', () => {
    const segs = samplePathD('M 0 0 C 0 50 50 50 50 0');
    expect(segs.length).toBeGreaterThan(4);
    expect(segs.some((s) => Math.abs(s.y1) > 10 || Math.abs(s.y2) > 10)).toBe(true);
  });
});

describe('SLK fail-closed label placer', () => {
  it('separates protected axis furniture labels before declaring layout success', () => {
    const b = new SceneBuilder('plot', 300, 165);
    b.line('xaxis', 128, 120, 289, 120, { protected: true });
    b.line('yaxis', 128, 120, 128, 25, { protected: true });
    b.label('xtickl0', '-0.012', 128, 131, { protected: true, priority: 'required' });
    b.label('xtickl1', '0.012', 289, 131, { protected: true, priority: 'required' });
    b.label('ytickl0', '0.5', 112, 80, { protected: true, priority: 'required', slot: 'W' });
    b.label('xlabel', 'screen position x (m)', 208, 139, { protected: true, priority: 'required' });
    b.label('ylabel', 'relative intensity I/I0', 135, 80, { protected: true, priority: 'required' });

    const laid = layoutScene(b.scene());
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    const protectedLabels = laid.placed.filter((placed) => placed.label.protected);
    for (let i = 0; i < protectedLabels.length; i++) {
      for (let j = i + 1; j < protectedLabels.length; j++) {
        expect(boxesOverlap(protectedLabels[i]!.box, protectedLabels[j]!.box, 0.5)).toBe(false);
      }
    }
  });

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
