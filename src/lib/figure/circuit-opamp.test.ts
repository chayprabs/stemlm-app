import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import type { Scene } from './types';

// Live Claude answer, 2026-09-28: the inverting amplifier (the canonical op-amp circuit) was hidden,
// "feedback around a three-terminal amplifier needs a feedback-aware layout".
const SPECS: Record<string, string> = {
  'inverting (live)': 'std: iec\nV_in: node_in 0 DC 0.5\nR_in: node_in node_inv 10k\nR_f: node_inv node_out 47k\nA1: 0 node_inv node_out\nport: node_in input\nport: node_out output\nprobe: V_in=node_in\nprobe: V_out=node_out\nlabel: R_in=10 kΩ\nlabel: R_f=47 kΩ\nhighlight: R_f',
  'non-inverting': 'std: ieee\nV1: vin 0 DC 1\nA1: vin inv out\nR1: inv 0 10k\nR2: inv out 90k\nport: out output\nprobe: V_out=out',
  summing: 'std: ieee\nV1: a 0 DC 1\nV2: b 0 DC 2\nR1: a inv 10k\nR2: b inv 20k\nRf: inv out 10k\nA1: 0 inv out\nport: out output',
  integrator: 'std: ieee\nVin: in 0 AC 1\nR1: in inv 10k\nC1: inv out 100n\nA1: 0 inv out\nport: out output',
  follower: 'std: ieee\nVs: in 0 DC 3\nA1: in out out\nRL: out 0 1k\nport: out output',
  difference: 'std: ieee\nV1: a 0 DC 1\nV2: b 0 DC 2\nR1: a inv 10k\nR2: inv out 10k\nR3: b pos 10k\nR4: pos 0 10k\nA1: pos inv out\nport: out output',
};

const center = (scene: Scene, id: string) => {
  const stroke = scene.strokes.find((s) => s.id === id)!;
  const xs = stroke.points.filter((_, i) => i % 2 === 0);
  const ys = stroke.points.filter((_, i) => i % 2 === 1);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, top: Math.min(...ys) };
};

describe('op-amp circuits with feedback', () => {
  for (const [name, content] of Object.entries(SPECS)) {
    it(`draws the ${name} amplifier the textbook way`, async () => {
      const result = await compileDiagramSpec({ type: 'circuit', content });
      expect(result.ok, result.ok ? '' : result.reason).toBe(true);
      if (!result.ok) return;
      const scene = result.scene;
      const amp = center(scene, 'A1');
      const minus = scene.labels.find((l) => l.id === 'A1-minus')!;
      const plus = scene.labels.find((l) => l.id === 'A1-plus')!;
      expect(minus.y).toBeLessThan(plus.y);
      // Feedback elements sit on a track above the amplifier.
      const feedback = [...content.matchAll(/^(\w+): (\S+) (\S+)/gm)].filter((m) => /^[RC]/.test(m[1]!) && [m[2], m[3]].sort().join() === ['inv', 'out'].sort().join()).map((m) => m[1]!)
        .concat(/node_inv node_out/.test(content) ? ['R_f'] : []);
      for (const id of feedback) expect(center(scene, id).y, id).toBeLessThan(amp.top);
      // Every device keeps its designator.
      for (const [, id] of content.matchAll(/^([A-Z]\w*):/gm)) expect(scene.labels.some((l) => l.text === id || l.id === `${id}-name`), id).toBe(true);
    });
  }

  it('shows a device label as that device\'s value line, once', async () => {
    const result = await compileDiagramSpec({ type: 'circuit', content: SPECS['inverting (live)']! });
    if (!result.ok) throw new Error(result.reason);
    const texts = result.scene.labels.map((l) => l.text);
    expect(texts.filter((t) => t === '10 kΩ').length).toBe(1);
    expect(result.scene.labels.find((l) => l.id === 'R_in-val')?.text).toBe('10 kΩ');
  });

  it('still refuses feedback it cannot draw faithfully', async () => {
    // Positive feedback (Schmitt trigger): output to the + input.
    const schmitt = await compileDiagramSpec({ type: 'circuit', content: 'std: ieee\nV1: in 0 DC 1\nR1: in inv 10k\nA1: pos inv out\nR2: out pos 100k\nR3: pos 0 10k\nR4: inv out 10k' });
    expect(schmitt.ok).toBe(false);
    // Two amplifiers in one netlist.
    const two = await compileDiagramSpec({ type: 'circuit', content: 'std: ieee\nV1: in 0 DC 1\nR1: in a 10k\nR2: a b 10k\nA1: 0 a b\nR3: b c 10k\nR4: c d 10k\nA2: 0 c d' });
    expect(two.ok).toBe(false);
  });
});
