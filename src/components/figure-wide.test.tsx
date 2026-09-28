/**
 * FIG-SIZE-02: a figure wider than the step's budget box may use the card width,
 * up to its own native size, while the height budget still binds.
 */
import { describe, it, expect } from 'vitest';
import { compileDiagram, presentCompiledDiagram } from '@/src/lib/resolve-diagram';
import { diagramFrameWidth } from './DiagramRenderer';

/** A common-emitter amplifier: many devices, compiled ~2.2:1. */
const WIDE = {
  type: 'circuit',
  content: 'std: ieee\nVCC: vcc 0 DC 12\nR1: vcc base 47k\nR2: base 0 10k\nRC: vcc col 2.2k\nRE: emit 0 1k\nCE: emit 0 100uF\nQ1: col base emit npn\nCin: in base 10uF\nVs: in 0 AC 10mV\nCout: col out 10uF\nRL: out 0 10k\nprobe: V_out=out',
};
const COMPACT = {
  type: 'graph',
  content: 'rankdir: TB\nnode: a Root\nnode: b Left\nnode: c Right\nedge: a b\nedge: a c',
};
const SCALE = 1.46;

async function frame(diagram: { type: string; content: string }) {
  const compiled = await compileDiagram(diagram, 'step');
  const presented = compiled && presentCompiledDiagram(compiled, 'light', 'step', SCALE);
  if (!presented?.ok) throw new Error('fixture did not render');
  const [, , w, h] = (/viewBox="([^"]+)"/.exec(presented.svg)?.[1] ?? '').split(/[\s,]+/).map(Number);
  const width = diagramFrameWidth(presented.svg, 'step', SCALE) ?? '';
  return {
    aspect: w! / h!,
    presented: Number(/^<svg\b[^>]*\swidth="([\d.]+)"/.exec(presented.svg)?.[1]),
    cap: Number(/min\(100%, ([\d.]+)px/.exec(width)?.[1]),
    width,
  };
}

describe('FIG-SIZE-02 wide figures', () => {
  it('lets a figure wider than 1.8:1 grow past the nominal width budget, bound by the height budget', async () => {
    const { aspect, presented, cap, width } = await frame(WIDE);
    expect(aspect).toBeGreaterThan(1.8);
    expect(cap).toBeGreaterThan(presented);
    expect(width).toContain('var(--slm-content-diagram-height');
  });

  it('keeps the nominal width budget for ordinary figures', async () => {
    const { aspect, presented, cap } = await frame(COMPACT);
    expect(aspect).toBeLessThanOrEqual(1.8);
    expect(cap).toBe(presented);
  });
});
