import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

describe('consumed declaration compatibility', () => {
  it('preserves constructed ray specs with a family kind declaration', async () => {
    const result = await compileDiagramSpec({
      type: 'ray',
      content: 'kind: ray\nsource: emitter\ntarget: receiver\nray: relation=incident\nray: relation=reflected\nconstruction: principal',
    });
    expect(result).toMatchObject({ ok: true });
  });

  it('uses an explicit cell endpoint order declaration', async () => {
    const result = await compileDiagramSpec({
      type: 'cell',
      content: 'kind: parallel-source\nnode: A terminal\nnode: C terminal\nedge: A C source-branch epsilon1 r1\nedge: A C source-branch epsilon2 r2\nlabel: I attaches=external-current\norder: A -> C',
    });
    expect(result).toMatchObject({ ok: true });
  });

  it('preserves the declared anatomy organ on a conic spec', async () => {
    const result = await compileDiagramSpec({
      type: 'anatomy',
      content: 'kind: conic\norgan: parabola\nnode: parabola locus\nnode: axis symmetry-line\nnode: directrix line\nnode: vertex point\nnode: focus point\nedge: parabola axis symmetric-about\nedge: vertex axis lies-on\nedge: focus axis lies-on\nlabel: Directrix attaches=directrix\nlabel: Vertex attaches=vertex\nlabel: Focus attaches=focus',
    });
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.scene.labels.some((label) => label.text === 'parabola')).toBe(true);
  });
});
