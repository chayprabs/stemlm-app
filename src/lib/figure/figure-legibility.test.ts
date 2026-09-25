import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { presentSvg } from '../svg-present';

describe('FIG-01 fitted figure legibility', () => {
  for (const profile of ['step', 'print'] as const) {
    it.each([6, 12, 24, 48])(`keeps text readable or refuses %i rows in ${profile}`, async (rows) => {
      const content = ['kind: matrix', 'headers: n, mass (g), signal, label',
        ...Array.from({ length: rows }, (_, i) =>
          `row: ${i + 1}, ${((i + 1) * 1.37).toFixed(2)}, ${(Math.sin(i + 1) * 100).toFixed(3)}, sample-${i + 1}`),
      ].join('\n');
      const result = await compileDiagramSpec({ type: 'table', content }, profile);
      if (!result.ok) {
        expect(result.code).toBe('unsatisfiable');
        return;
      }
      const presented = new DOMParser().parseFromString(presentSvg(result.svg, 'light', profile), 'image/svg+xml').documentElement;
      const viewBox = presented.getAttribute('viewBox')!.split(/\s+/).map(Number);
      const scale = Math.min(Number(presented.getAttribute('width')) / viewBox[2]!, Number(presented.getAttribute('height')) / viewBox[3]!);
      const sizes = [...presented.querySelectorAll('text')].map((text) => Number(text.getAttribute('font-size')));
      expect(sizes.length).toBeGreaterThan(0);
      const rendered = Math.min(...sizes) * scale;
      console.log(`FIG-01 profile=${profile} rows=${rows} minFontPx=${rendered}`);
      expect(rendered).toBeGreaterThanOrEqual(6);
    });
  }
});
