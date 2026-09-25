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

  it('models truss and column lengths in the scene', async () => {
    for (const family of ['truss', 'column']) {
      const result = await compileDiagramSpec(diagram(family, 'L: 8\njoints: A,B\nmembers: A-B'), 'step');
      expect(result.ok, family).toBe(true);
      expect(labels(result), family).toContain('L=8');
    }
  });

  it('retains linkage motion semantics', async () => {
    const result = await compileDiagramSpec(diagram('linkage', 'links: ground,coupler,rocker\njoints: fixed,revolute,revolute\nmotion: one degree of freedom'), 'step');
    expect(result.ok).toBe(true);
    expect(labels(result)).toContain('one degree of freedom');
  });

  it('retains soil basis semantics and open-channel depth geometry', async () => {
    const soil = await compileDiagramSpec(diagram('soil', 'layers: phases\nphases: solid 0.5, liquid 0.25, gas 0.25\nvoids: liquid, gas\nbasis: total'), 'step');
    expect(soil.ok).toBe(true);
    expect(labels(soil)).toContain('basis: total');

    const shallow = await compileDiagramSpec(diagram('openchan', 'y1: 1\nchannel: trapezoidal\nsection: uniform\nflow: upstream_to_downstream\nwaterline: free_surface'), 'step');
    const deep = await compileDiagramSpec(diagram('openchan', 'y1: 2\nchannel: trapezoidal\nsection: uniform\nflow: upstream_to_downstream\nwaterline: free_surface'), 'step');
    expect(shallow.ok).toBe(true);
    expect(deep.ok).toBe(true);
    if (!shallow.ok || !deep.ok) return;
    expect(shallow.scene.strokes.find((stroke) => stroke.id === 'free-surface')?.points).not.toEqual(deep.scene.strokes.find((stroke) => stroke.id === 'free-surface')?.points);
  });

  it('consumes the gear mesh mode in the rendered scene', async () => {
    const result = await compileDiagramSpec(diagram('gear', 'z1: 16\nz2: 32\ngears: input, output\nmesh: external'), 'step');
    expect(result.ok).toBe(true);
    expect(labels(result)).toContain('mesh: external');
  });
});
