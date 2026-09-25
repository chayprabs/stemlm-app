import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

describe('parallel shunt geometry', () => {
  for (const declarations of [
    'V_source: supply 0 DC 15V\nR_series: supply branch 3k\nR_a: branch 0 6k\nR_b: branch 0 3k',
    'V_source: supply 0 DC 9V\nR_a: supply 0 6k\nR_b: supply 0 3k',
  ]) {
    it(`gives every parallel shunt a distinct glyph and terminals: ${declarations}`, async () => {
      const result = await compileDiagramSpec({ type: 'circuit', content: `std: ieee\n${declarations}` });
      expect(result.ok, result.ok ? '' : result.reason).toBe(true);
      if (!result.ok) return;
      const a = result.scene.strokes.find((s) => s.id === 'R_a')!;
      const b = result.scene.strokes.find((s) => s.id === 'R_b')!;
      const centerX = (points: number[]) => {
        const xs = points.filter((_, i) => i % 2 === 0);
        return (Math.min(...xs) + Math.max(...xs)) / 2;
      };
      expect(Math.abs(centerX(a.points) - centerX(b.points))).toBeGreaterThanOrEqual(26);
      const terminals = result.scene.strokes.filter((s) => s.id === 'R_a-n1' || s.id === 'R_b-n1');
      expect(new Set(terminals.map((s) => s.points[0])).size).toBe(2);
    });
  }
});
