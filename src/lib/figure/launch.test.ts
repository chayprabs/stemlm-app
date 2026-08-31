import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveDiagram } from '@/src/lib/resolve-diagram';
import { svgMarkupHasGraphicShapes } from '@/src/lib/mount-svg';

const SOLENOID_SPEC = [
  'catalog: solenoid',
  'core: mu_r=400',
  'B: 1.0 T',
  'H: ?',
].join('\n');

const DIVIDER_SPEC = [
  'std: ieee',
  'V1: n_in 0 DC 12',
  'R1: n_in n_a 4k',
  'R2: n_a 0 6k',
  'RL: n_a 0 10k',
  'probe: Va=n_a',
  'highlight: R2',
].join('\n');

const SCRATCH = resolve(process.env.SLM_SCRATCH ?? 'artifacts/test-output');

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

const SOLENOID = { type: 'field', content: SOLENOID_SPEC };
const DIVIDER = { type: 'circuit', content: DIVIDER_SPEC };

async function once() {
  const plot = await resolveDiagram(PLOT, 'light', 'step');
  const hatch = await resolveDiagram(HATCH, 'light', 'step');
  const solenoid = await resolveDiagram(SOLENOID, 'light', 'step');
  const circuit = await resolveDiagram(DIVIDER, 'light', 'step');
  return { plot, hatch, solenoid, circuit };
}

describe('shipped resolve entry launched twice', () => {
  it('solenoid field + divider circuit + plot hatch succeed twice with the same observables', async () => {
    const a = await once();
    const b = await once();
    for (const run of [a, b]) {
      expect(svgMarkupHasGraphicShapes(run.plot.svg)).toBe(true);
      expect(run.plot.overlays.some((o) => o.kind === 'katex')).toBe(true);
      expect(run.plot.svg).toContain('t (s)');
      expect(svgMarkupHasGraphicShapes(run.hatch.svg)).toBe(true);
      expect(run.hatch.svg).toContain('hatch');
      expect(svgMarkupHasGraphicShapes(run.solenoid.svg)).toBe(true);
      expect(run.solenoid.svg).toMatch(/id="[^"]*core"/);
      expect(run.solenoid.svg).toMatch(/id="[^"]*B"/);
      expect(run.solenoid.svg).toMatch(/id="[^"]*H"/);
      expect(svgMarkupHasGraphicShapes(run.circuit.svg)).toBe(true);
      expect(run.circuit.svg).toContain('V1');
      expect(run.circuit.svg).toContain('R1');
      expect(run.circuit.svg).toContain('R2');
      expect(run.circuit.svg).toContain('RL');
    }
    expect(a.plot.overlays.length).toBe(b.plot.overlays.length);
    expect(a.solenoid.svg.includes('μ_r=400')).toBe(true);
    expect(b.solenoid.svg.includes('μ_r=400')).toBe(true);
    expect((a.circuit.svg.match(/V1/g) ?? []).length).toBe((b.circuit.svg.match(/V1/g) ?? []).length);
    try {
      mkdirSync(SCRATCH, { recursive: true });
      writeFileSync(resolve(SCRATCH, 'plot-screenshot-regression.svg'), a.plot.svg, 'utf8');
      writeFileSync(resolve(SCRATCH, 'solenoid-field.svg'), a.solenoid.svg, 'utf8');
      writeFileSync(resolve(SCRATCH, 'circuit-divider.svg'), a.circuit.svg, 'utf8');
    } catch {
      /* scratch may be missing in some runners */
    }
  });
});
