import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveDiagram } from '@/src/lib/resolve-diagram';
import { svgMarkupHasGraphicShapes } from '@/src/lib/mount-svg';

const SCRATCH = 'C:\\Users\\chait\\AppData\\Local\\Temp\\grok-goal-2c99b7510709\\implementer';

const PLOT = {
  type: 'plot',
  content: [
    'fn: 1.5*t^2 - 2*t',
    'var: t',
    'domain: 0 10',
    'xlabel: t (s)',
    'ylabel: \\alpha (rad/s^2)',
    'point: 10, 130',
    'eq: \\alpha(t)=1.5t^{2}-2t',
    'eq_slot: NE',
  ].join('\n'),
};

const HATCH = {
  type: 'svg' as const,
  content: '<svg viewBox="0 0 40 20"><line x1="1" y1="1" x2="20" y2="10" stroke="#334155"/><text x="2" y="16">hatch</text></svg>',
};

async function once() {
  const plot = await resolveDiagram(PLOT, 'light', 'step');
  const hatch = await resolveDiagram(HATCH, 'light', 'step');
  return { plot, hatch };
}

describe('shipped resolve entry launched twice', () => {
  it('plot + svg hatch succeed twice with the same observables', async () => {
    const a = await once();
    const b = await once();
    for (const run of [a, b]) {
      expect(svgMarkupHasGraphicShapes(run.plot.svg)).toBe(true);
      expect(run.plot.overlays.some((o) => o.kind === 'katex')).toBe(true);
      expect(run.plot.svg).toContain('t (s)');
      expect(svgMarkupHasGraphicShapes(run.hatch.svg)).toBe(true);
      expect(run.hatch.svg).toContain('hatch');
    }
    expect(a.plot.overlays.length).toBe(b.plot.overlays.length);
    try {
      writeFileSync(resolve(SCRATCH, 'plot-screenshot-regression.svg'), a.plot.svg, 'utf8');
    } catch {
      /* scratch may be missing in some runners */
    }
  });
});
