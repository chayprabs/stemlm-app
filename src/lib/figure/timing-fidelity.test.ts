import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import type { Scene } from './types';

async function render(content: string): Promise<Scene> {
  const result = await compileDiagramSpec({ type: 'timing', content });
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

describe('timing semantic fidelity', () => {
  for (const polarity of ['p', 'n']) {
    it(`${polarity} clocks return to their starting level each period, including repeats`, async () => {
      const scene = await render(`signal: oscillator ${polarity}...`);
      const horizontal = scene.strokes.filter((s) => s.kind === 'line' && s.points[1] === s.points[3]);
      expect(horizontal).toHaveLength(8);
      const levels = horizontal.map((s) => s.points[1]);
      for (let i = 0; i < 8; i += 2) {
        expect(Math.abs(levels[i]! - levels[i + 1]!)).toBe(16);
        expect(polarity === 'p' ? levels[i]! < levels[i + 1]! : levels[i]! > levels[i + 1]!).toBe(true);
      }
      const edges = scene.strokes.filter((s) => s.kind === 'line' && s.points[0] === s.points[2]);
      expect(edges).toHaveLength(8);
    });
  }

  it('aligns unequal signal lengths on one time scale without inventing trailing samples', async () => {
    const scene = await render('signal: short 01\nsignal: long 010101');
    const short = scene.strokes.find((s) => s.id === 'short-0')!;
    const long = scene.strokes.find((s) => s.id === 'long-0')!;
    expect(short.points[2]! - short.points[0]!).toBe(long.points[2]! - long.points[0]!);
    expect(scene.strokes.some((s) => s.id === 'short-2')).toBe(false);
  });

  it('draws unknown as a hatched band and high impedance as a single midline', async () => {
    const unknown = await render('signal: bus x...');
    const impedance = await render('signal: bus z...');
    expect(unknown.strokes.some((s) => s.pattern === 'hatch')).toBe(true);
    expect(impedance.strokes.every((s) => s.kind === 'line' && s.points[1] === s.points[3])).toBe(true);
  });

  it('preserves uppercase active clock edge markers', async () => {
    const marked = await render('signal: clock P.N.');
    expect(marked.strokes.filter((s) => s.markerEnd)).toHaveLength(4);
  });

  for (const content of [
    'signal: data .01',
    'wave: {"signal":[{"name":"data","wave":"01","period":2}]}',
    'wave: {"signal":[{"name":"clock","wave":"p..."}]}\nsignal: omitted 0101',
    'signal: clock p...\nsignal:\n  - omitted 0101',
  ]) {
    it(`refuses ambiguous or unsupported asserted timing: ${content}`, async () => {
      expect((await compileDiagramSpec({ type: 'timing', content })).ok).toBe(false);
    });
  }
});
