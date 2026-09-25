import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

describe('first-pass declaration fidelity', () => {
  const cases = [
    ['plot', 'fn: x\ndomain: 0 3'],
    ['array', 'cells: 2,5,8'],
    ['gel', 'lanes: control,sample'],
    ['tline', 'z0: 50\nload: 75'],
    ['phasor', 'vec: U 8∠30'],
    ['opamp', 'Rf: 10k\nRg: 1k'],
    ['cycle', 'nodes: A,B,C'],
    ['oneline', 'bus: A,B\nconnection: A B'],
  ];
  it.each(cases)('%s rejects an unconsumed semantic declaration', async (type, content) => {
    expect((await compileDiagramSpec({ type: type!, content: content! })).ok).toBe(true);
    expect(await compileDiagramSpec({ type: type!, content: content + '\nunknown_relation: A B' }))
      .toMatchObject({ ok: false, code: 'malformed' });
  });

  it('does not discard repeated scalar declarations', async () => {
    expect(await compileDiagramSpec({ type: 'opamp', content: 'Rf: 10k\nRf: 22k\nRg: 1k' }))
      .toMatchObject({ ok: false, code: 'malformed' });
  });

  it('does not discard an empty declared table row beside valid rows', async () => {
    expect(await compileDiagramSpec({ type: 'table', content: 'kind: matrix\nrow: a,b\nrow:' }))
      .toMatchObject({ ok: false, code: 'malformed' });
  });

  it('preserves every canonical gel band and aligns equal fragment sizes', async () => {
    const result = await compileDiagramSpec({ type: 'gel', content: 'lanes: A,B\nbands: A:900,A:300,B:900,B:150' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bands = result.scene.strokes.filter(s => /^band-\d+$/.test(s.id));
    expect(bands).toHaveLength(4);
    expect(bands[0]!.points[1]).toBe(bands[2]!.points[1]);
    expect(bands[0]!.points[1]).toBeLessThan(bands[1]!.points[1]!);
    expect(bands[1]!.points[1]).toBeLessThan(bands[3]!.points[1]!);
    for (const size of ['900', '300', '150']) expect(result.svg).toContain(size);
  });

  it.each(['bands: A:900,B:bad', 'bands: C:400', 'bands: A:-2', 'bands: A:900,'])
    ('rejects invalid gel declaration %s without a plausible empty gel', async bands => {
      expect(await compileDiagramSpec({ type: 'gel', content: `lanes: A,B\n${bands}` }))
        .toMatchObject({ ok: false, code: 'malformed' });
    });

  it('renders bus objects when node labels and bus declarations coexist', async () => {
    const result = await compileDiagramSpec({ type: 'oneline', content: 'bus: A,B\nnode: A source\nnode: B load\nconnection: A B' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.strokes.filter(s => /^bus-\d+$/.test(s.id))).toHaveLength(2);
    expect(result.scene.strokes.find(s => s.id === 'connection-0')).toBeTruthy();
  });
});
