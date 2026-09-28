import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

const diagram = (type: string, content: string) => ({ type, content });
const labels = (result: Awaited<ReturnType<typeof compileDiagramSpec>>) => result.ok
  ? result.scene.labels.map((label) => label.text ?? label.katex ?? '').join('|')
  : '';

describe('L8 mechanical semantic consumption', () => {
  it('consumes frame members declarations while preserving panel roles', async () => {
    const result = await compileDiagramSpec(diagram('frame', 'members: none\npanels: a|left, b|right\nscaffold: grid_2x1'), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.panels?.map((panel) => panel.id)).toEqual(['a', 'b']);
  });

  it('models the truss length in the scene; column is refused (D23)', async () => {
    // D24: joints carry coordinates (span 8 = L); the span is a dimension labelled "L = 8".
    const truss = await compileDiagramSpec(diagram('truss', 'L: 8\njoints: A 0 0; B 8 0\nmembers: A-B'), 'step');
    expect(truss.ok, 'truss').toBe(true);
    expect(labels(truss), 'truss').toContain('L = 8');
    expect(await compileDiagramSpec(diagram('column', 'L: 8\njoints: A,B\nmembers: A-B'), 'step')).toMatchObject({ ok: false, code: 'refused' });
  });

  it('refuses a linkage even when its motion is declared (D23)', async () => {
    const result = await compileDiagramSpec(diagram('linkage', 'links: ground,coupler,rocker\njoints: fixed,revolute,revolute\nmotion: one degree of freedom'), 'step');
    expect(result).toMatchObject({ ok: false, code: 'refused', reason: 'unfaithful_family:linkage' });
  });

  it('retains soil basis semantics; open-channel is refused at any depth (D23)', async () => {
    const soil = await compileDiagramSpec(diagram('soil', 'layers: phases\nphases: solid 0.5, liquid 0.25, gas 0.25\nvoids: liquid, gas\nbasis: total'), 'step');
    expect(soil.ok).toBe(true);
    expect(labels(soil)).toContain('basis: total');

    for (const depth of [1, 2]) {
      const channel = await compileDiagramSpec(diagram('openchan', `y1: ${depth}\nchannel: trapezoidal\nsection: uniform\nflow: upstream_to_downstream\nwaterline: free_surface`), 'step');
      expect(channel, `y1=${depth}`).toMatchObject({ ok: false, code: 'refused', reason: 'unfaithful_family:openchan' });
    }
  });

  it('refuses a gear pair whose radii would ignore the tooth ratio (D23)', async () => {
    const result = await compileDiagramSpec(diagram('gear', 'z1: 16\nz2: 32\ngears: input, output\nmesh: external'), 'step');
    expect(result).toMatchObject({ ok: false, code: 'refused', reason: 'unfaithful_family:gear' });
  });
});
