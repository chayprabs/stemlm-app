import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { parseNetlist } from './engines/circuit';
import { parseSpec } from './spec';
import type { Scene } from './types';

function deviceNode(scene: Scene, id: string, node: string): boolean {
  return scene.nodes.some((entry) => entry.id === `n:${id}:${node}`);
}

function touchesNode(scene: Scene, strokeId: string, nodeId: string): boolean {
  const wire = scene.strokes.find((stroke) => stroke.id === strokeId);
  const junction = scene.strokes.find((stroke) => stroke.id === nodeId);
  if (!wire || !junction || wire.points.length < 4 || junction.points.length < 2) return false;
  const wx = [wire.points[0]!, wire.points[2]!];
  const wy = [wire.points[1]!, wire.points[3]!];
  return wx.some((x, i) => Math.abs(x - junction.points[0]!) < 0.6 && Math.abs(wy[i]! - junction.points[1]!) < 0.6);
}

function svgTextPosition(svg: string, id: string): { x: number; y: number } | null {
  const match = new RegExp(`<text id="${id}" x="([-0-9.]+)" y="([-0-9.]+)"`).exec(svg);
  return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
}

export function circuitCertificate(scene: Scene, content: string): boolean {
  const devices = parseNetlist(parseSpec('circuit', content));
  return devices.every((device) => {
    const terminals = [device.n1, device.n2, ...(device.n3 ? [device.n3] : [])];
    return terminals.every((node, index) => {
      const suffix = `n${index + 1}`;
      return (
        deviceNode(scene, device.id, node) &&
        touchesNode(scene, `${device.id}-${suffix}`, `j:${device.id}:${node}`)
      );
    });
  });
}

const SOURCE_LOAD = [
  'std: ieee',
  'V1: source return AC 120V 60Hz',
  'R1: source return 60ohm',
].join('\n');

describe('L5 circuit fidelity', () => {
  it('round-trips a general netlist and rejects a deliberately wrong Scene', async () => {
    const result = await compileDiagramSpec(
      { type: 'circuit', content: 'std: ieee\nV1: in 0 DC 5\nR1: in out 1k\nR2: out 0 2k' },
      'step',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(circuitCertificate(result.scene, 'std: ieee\nV1: in 0 DC 5\nR1: in out 1k\nR2: out 0 2k')).toBe(true);

    const wrong = {
      ...result.scene,
      nodes: result.scene.nodes.map((node) =>
        node.id === 'n:R1:out' ? { ...node, id: 'n:R1:wrong' } : node,
      ),
    };
    expect(circuitCertificate(wrong, 'std: ieee\nV1: in 0 DC 5\nR1: in out 1k\nR2: out 0 2k')).toBe(false);
  });

  it('keeps a device designator and value as a grouped IEEE pair', async () => {
    const result = await compileDiagramSpec({ type: 'circuit', content: SOURCE_LOAD }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const designator = result.scene.labels.find((label) => label.id === 'R1');
    const value = result.scene.labels.find((label) => label.id === 'R1-val');
    expect(designator?.groupId).toBe('pair:R1');
    expect(value?.groupId).toBe('pair:R1');
    expect(designator?.y).toBeLessThan(value?.y ?? Infinity);
  });

  it('keeps a declared port visibly connected to its named circuit node', async () => {
    const content = [
      'std: ieee',
      'V1: in 0 DC 5',
      'R1: in out 1k',
      'R2: out 0 2k',
      'port: in input',
      'port: out output',
      'port: 0 return',
    ].join('\n');
    const result = await compileDiagramSpec({ type: 'circuit', content }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const node of ['in', 'out', '0']) {
      const port = result.scene.nodes.find((entry) => entry.id === `port:${node}`);
      expect(port, `missing port ${node}`).toBeDefined();
      const px = (port?.bbox.x ?? 0) + (port?.bbox.w ?? 0) / 2;
      const py = (port?.bbox.y ?? 0) + (port?.bbox.h ?? 0) / 2;
      const nodeJunctions = result.scene.nodes.filter((entry) => entry.id.endsWith(`:${node}`));
      expect(nodeJunctions.length, `missing named node ${node}`).toBeGreaterThan(0);
      const connection = result.scene.strokes.find((stroke) => stroke.id === `port:${node}:connection`);
      expect(connection, `missing connection for port ${node}`).toBeDefined();
      expect(connection?.role).toBe('connector');
      expect(connection?.kind).toBe('polyline');
      const points = connection?.points ?? [];
      expect(points.length).toBeGreaterThanOrEqual(4);
      expect(Math.hypot(points[0]! - px, points[1]! - py)).toBeLessThan(0.1);
      expect(nodeJunctions.some((junction) => {
        const jx = junction.bbox.x + junction.bbox.w / 2;
        const jy = junction.bbox.y + junction.bbox.h / 2;
        return Math.hypot(points[points.length - 2]! - jx, points[points.length - 1]! - jy) < 0.1;
      })).toBe(true);
    }
  });

  it('keeps both members of every designator/value pair in readable grouped slots', async () => {
    const content = [
      'std: ieee',
      'V1: in 0 DC 12',
      'R1: in out 4.7k',
      'R2: out 0 10k',
      'port: in input',
      'port: out output',
    ].join('\n');
    const result = await compileDiagramSpec({ type: 'circuit', content }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const id of ['V1', 'R1', 'R2']) {
      const designator = result.scene.labels.find((label) => label.id === id);
      const value = result.scene.labels.find((label) => label.id === `${id}-val`);
      expect(designator?.groupId).toBe(`pair:${id}`);
      expect(value?.groupId).toBe(`pair:${id}`);
      const placedDesignator = svgTextPosition(result.svg, id);
      const placedValue = svgTextPosition(result.svg, `${id}-val`);
      expect(placedDesignator, `${id} designator was dropped`).not.toBeNull();
      expect(placedValue, `${id} value was dropped`).not.toBeNull();
      expect(placedDesignator?.x).toBe(placedValue?.x);
      expect(placedDesignator?.y).toBeLessThan(placedValue?.y ?? Infinity);
    }
  });

  it('fails closed for a port whose named node has no drawable circuit connection', async () => {
    const result = await compileDiagramSpec(
      { type: 'circuit', content: 'std: ieee\nR1: a b 1k\nport: floating output' },
      'step',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/port|node|connect/i);
  });

  it('preserves branches, explicit wires, named ports, labels, and directed current', async () => {
    const content = [
      'std: ieee',
      'V1: A n1 DC eps1',
      'R1: n1 B r1',
      'V2: A n2 DC eps2',
      'R2: n2 B r2',
      'I1: B C 2mA',
      'S1: C 0 closed',
      'wire: A tap',
      'port: tap input',
      'label: I1=current',
    ].join('\n');
    const result = await compileDiagramSpec({ type: 'circuit', content }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(circuitCertificate(result.scene, content)).toBe(true);
    expect(result.scene.strokes.some((stroke) => stroke.id.startsWith('wire:'))).toBe(true);
    expect(result.scene.nodes.some((node) => node.id === 'port:tap')).toBe(true);
    expect(result.scene.labels.some((label) => label.id === 'label:I1')).toBe(true);
    expect(result.scene.strokes.some((stroke) => stroke.id === 'I1' && stroke.markerEnd)).toBe(true);
    expect(result.scene.strokes.some((stroke) => stroke.id === 'S1' && stroke.kind === 'line')).toBe(true);
  });

  it('renders a real three-terminal glyph and rejects missing terminals', async () => {
    const valid = await compileDiagramSpec(
      { type: 'circuit', content: 'std: ieee\nV1: in 0 DC 5\nA1: in out 0 amp' },
      'step',
    );
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.scene.strokes.some((stroke) => stroke.id === 'A1' && stroke.kind === 'polygon')).toBe(true);
      expect(circuitCertificate(valid.scene, 'std: ieee\nV1: in 0 DC 5\nA1: in out 0 amp')).toBe(true);
    }

    const invalid = await compileDiagramSpec({ type: 'circuit', content: 'std: ieee\nQ1: c b' }, 'step');
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.reason).toMatch(/Q1|third|terminal/i);
  });

  it('does not invent a ground rail when the netlist has no ground node', async () => {
    const result = await compileDiagramSpec({ type: 'circuit', content: SOURCE_LOAD }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.strokes.some((stroke) => stroke.id === 'gndrail')).toBe(false);
    expect(result.scene.labels.some((label) => label.id === 'gndl')).toBe(false);
  });

  it('uses an AC source glyph for an AC-valued voltage source', async () => {
    const result = await compileDiagramSpec({ type: 'circuit', content: SOURCE_LOAD }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.strokes.some((stroke) => stroke.id === 'V1-ac')).toBe(true);
    expect(result.scene.labels.some((label) => label.id === 'V1-polarity')).toBe(false);
  });

  it('routes an amplifier output terminal to the triangle tip', async () => {
    const result = await compileDiagramSpec(
      { type: 'circuit', content: 'std: ieee\nA1: in_plus in_minus out amp' },
      'step',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const glyph = result.scene.strokes.find((stroke) => stroke.id === 'A1');
    const output = result.scene.strokes.find((stroke) => stroke.id === 'A1-n3');
    expect(glyph?.kind).toBe('polygon');
    expect(output?.points.slice(-2)).toEqual(glyph?.points.slice(4, 6));
  });

  it('fails closed for a transistor until a transistor glyph is implemented', async () => {
    const result = await compileDiagramSpec(
      { type: 'circuit', content: 'std: ieee\nQ1: collector base emitter 2mA' },
      'step',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/unsupported.*Q1|transistor/i);
  });

  it('fails closed when amplifier feedback would cross the compact layout', async () => {
    const result = await compileDiagramSpec(
      { type: 'circuit', content: 'std: ieee\nA1: sum 0 out\nR1: out sum feedback' },
      'step',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/feedback-aware|feedback/i);
  });

  it('keeps highlight-only recompiles at identical label positions', async () => {
    const base = `${SOURCE_LOAD}\nC1: source return 10uF`;
    const a = await compileDiagramSpec({ type: 'circuit', content: `${base}\nhighlight: R1` }, 'step');
    const b = await compileDiagramSpec({ type: 'circuit', content: `${base}\nhighlight: V1` }, 'step');
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const positions = (scene: Scene) =>
      scene.labels.filter((label) => label.id === 'V1' || label.id === 'R1' || label.id === 'C1').map((label) => [label.id, label.x, label.y]);
    expect(positions(a.scene)).toEqual(positions(b.scene));
  });

  it('fails closed for non-circuit assertions and empty device content', async () => {
    const map = await compileDiagramSpec({ type: 'circuit', content: 'std: ieee\nmap: world colors unknown' }, 'step');
    expect(map.ok).toBe(false);
    const empty = await compileDiagramSpec({ type: 'circuit', content: 'std: ieee\ncaption: circuit' }, 'step');
    expect(empty.ok).toBe(false);
  });

  it('fails closed for a cyclic ranking graph instead of looping forever', async () => {
    const result = await compileDiagramSpec(
      { type: 'circuit', content: 'std: ieee\nC1: n_d n_a 4uF\nR1: n_c n_d 10ohm\nV1: n_b n_c DC 2.5V\nR2: n_a n_b 2ohm' },
      'step',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/cyclic|cycle|rank/i);
  });

});
