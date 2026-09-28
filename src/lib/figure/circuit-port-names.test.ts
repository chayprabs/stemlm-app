import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

const circuit = (...lines: string[]) => ['std: ieee', ...lines].join('\n');

async function texts(content: string): Promise<string[]> {
  const result = await compileDiagramSpec({ type: 'circuit', content });
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) return [];
  return result.scene.labels.map((label) => label.text ?? '');
}

// Live Claude answer, 2026-09-28 (round 1 q21): the output terminal was captioned with the raw net name
// "node_out" although `probe: V_out=node_out` names it, and "V_in" was printed twice (the source's
// designator and a probe restating it on the node the source drives).
const OPAMP = 'std: iec\nV_in: node_in 0 DC 0.5\nR_in: node_in node_inv 10k\nR_f: node_inv node_out 47k\nA1: 0 node_inv node_out\nport: node_in input\nport: node_out output\nprobe: V_in=node_in\nprobe: V_out=node_out\nlabel: R_in=10 kΩ\nlabel: R_f=47 kΩ';

describe('circuit terminal names', () => {
  it.each([
    ['op-amp stage (live)', OPAMP, ['V_out'], ['node_out', 'node_in']],
    ['ladder', circuit('V1: a 0 DC 5', 'R1: a out 1k', 'R2: out 0 1k', 'port: out output', 'probe: V_o=out'), ['V_o'], ['out']],
    ['transistor stage', circuit('VCC: vcc 0 DC 12', 'RC: vcc c 2k', 'RB: vcc b 200k', 'Q1: c b 0 npn', 'port: c output', 'probe: V_C=c'), ['V_C'], ['c']],
  ])('%s: a probed port shows the probe name once, never the net name', async (_, content, shown, hidden) => {
    const all = await texts(content as string);
    for (const name of shown as string[]) expect(all.filter((t) => t === name), name).toHaveLength(1);
    for (const name of hidden as string[]) expect(all, name).not.toContain(name);
  });

  it('does not print a probe that restates the grounded source driving its node', async () => {
    const all = await texts(OPAMP);
    expect(all.filter((t) => t === 'V_in')).toHaveLength(1);
  });

  it('keeps the node name on a port no probe names', async () => {
    const all = await texts(circuit('R1: in out 1k', 'C1: out 0 100nF', 'port: in input', 'port: out output'));
    expect(all).toContain('in');
    expect(all).toContain('out');
  });
});
