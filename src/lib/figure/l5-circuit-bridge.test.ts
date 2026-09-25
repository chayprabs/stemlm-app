import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileDiagramSpec } from './compile';
import type { Scene } from './types';

const BRIDGE = [
  'std: ieee',
  'V1: left bottom 75V',
  'R100: left right 100 Ω',
  'R25a: left center 25 Ω',
  'R10: center right 10 Ω',
  'R50: center bottom 50 Ω',
  'R25b: right bottom 25 Ω',
].join('\n');

function pin(scene: Scene, id: string, terminal: 'n1' | 'n2'): { x: number; y: number } {
  const stroke = scene.strokes.find((entry) => entry.id === `${id}-${terminal}`);
  if (!stroke || stroke.points.length < 4) throw new Error(`missing pin stroke ${id}-${terminal}`);
  return { x: stroke.points[0]!, y: stroke.points[1]! };
}

function orientation(scene: Scene, id: string): 'horizontal' | 'vertical' {
  const a = pin(scene, id, 'n1');
  const b = pin(scene, id, 'n2');
  return Math.abs(a.y - b.y) <= Math.abs(a.x - b.x) ? 'horizontal' : 'vertical';
}

function bridgeCertificate(scene: Scene): boolean {
  const expected: Record<string, [string, string]> = {
    V1: ['left', 'bottom'],
    R100: ['left', 'right'],
    R25a: ['left', 'center'],
    R10: ['center', 'right'],
    R50: ['center', 'bottom'],
    R25b: ['right', 'bottom'],
  };
  for (const [id, terminals] of Object.entries(expected)) {
    for (const [index, node] of terminals.entries()) {
      const marker = scene.nodes.find((entry) => entry.id === `n:${id}:${node}`);
      const pinStroke = scene.strokes.find((entry) => entry.id === `${id}-n${index + 1}`);
      if (!marker || !pinStroke || pinStroke.points.length < 2) return false;
      const px = pinStroke.points[0]!;
      const py = pinStroke.points[1]!;
      if (Math.abs(px - (marker.bbox.x + marker.bbox.w / 2)) > 0.1 || Math.abs(py - (marker.bbox.y + marker.bbox.h / 2)) > 0.1) {
        return false;
      }
    }
  }
  return true;
}

function svgTextPosition(svg: string, id: string): { x: number; y: number } | null {
  const match = new RegExp(`<text id="${id}" x="([-0-9.]+)" y="([-0-9.]+)"`).exec(svg);
  return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
}

function textBox(svg: string, id: string): { x1: number; y1: number; x2: number; y2: number } | null {
  const match = new RegExp(`<text id="${id}" x="([-0-9.]+)" y="([-0-9.]+)"[^>]*>([^<]*)</text>`).exec(svg);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  const width = (match[3] ?? '').length * 6.96;
  return { x1: x - width / 2, y1: y - 6, x2: x + width / 2, y2: y + 6 };
}

function boxesOverlap(a: NonNullable<ReturnType<typeof textBox>>, b: NonNullable<ReturnType<typeof textBox>>): boolean {
  const gap = 2;
  return a.x1 < b.x2 + gap && b.x1 < a.x2 + gap && a.y1 < b.y2 + gap && b.y1 < a.y2 + gap;
}

function boxHitsScene(box: NonNullable<ReturnType<typeof textBox>>, scene: Scene): boolean {
  const pad = 2;
  for (const stroke of scene.strokes) {
    for (let i = 0; i + 3 < stroke.points.length; i += 2) {
      const x1 = stroke.points[i]!;
      const y1 = stroke.points[i + 1]!;
      const x2 = stroke.points[i + 2]!;
      const y2 = stroke.points[i + 3]!;
      const xMin = Math.min(x1, x2) - pad;
      const xMax = Math.max(x1, x2) + pad;
      const yMin = Math.min(y1, y2) - pad;
      const yMax = Math.max(y1, y2) + pad;
      if (box.x1 < xMax && xMin < box.x2 && box.y1 < yMax && yMin < box.y2) return true;
    }
  }
  return false;
}

describe('L5 circuit bridge topology', () => {
  it('embeds a three-mesh bridge with rails and conventional device orientation', async () => {
    const result = await compileDiagramSpec({ type: 'circuit', content: BRIDGE }, 'step');
    expect(result.ok, result.ok ? 'ok' : result.reason).toBe(true);
    if (!result.ok) return;

    for (const id of ['V1', 'R100', 'R25a', 'R10', 'R50', 'R25b']) {
      expect(result.scene.strokes.some((stroke) => stroke.id === id), `missing glyph ${id}`).toBe(true);
      expect(result.scene.nodes.some((node) => node.id.startsWith(`n:${id}:`)), `missing terminals ${id}`).toBe(true);
    }
    expect(orientation(result.scene, 'V1')).toBe('vertical');
    expect(orientation(result.scene, 'R100')).toBe('horizontal');
    expect(orientation(result.scene, 'R25a')).toBe('horizontal');
    expect(orientation(result.scene, 'R10')).toBe('horizontal');
    expect(orientation(result.scene, 'R50')).toBe('vertical');
    expect(orientation(result.scene, 'R25b')).toBe('vertical');

    const left = pin(result.scene, 'R25a', 'n1');
    const center = pin(result.scene, 'R25a', 'n2');
    const right = pin(result.scene, 'R10', 'n2');
    expect(Math.abs(left.x - pin(result.scene, 'R100', 'n1').x)).toBeLessThan(1);
    expect(Math.abs(left.x - pin(result.scene, 'V1', 'n1').x)).toBeLessThan(1);
    expect(Math.abs(center.x - pin(result.scene, 'R10', 'n1').x)).toBeLessThan(1);
    expect(Math.abs(center.x - pin(result.scene, 'R50', 'n1').x)).toBeLessThan(1);
    expect(Math.abs(right.x - pin(result.scene, 'R100', 'n2').x)).toBeLessThan(1);
    expect(Math.abs(right.x - pin(result.scene, 'R25b', 'n1').x)).toBeLessThan(1);
    expect(result.scene.strokes.some((stroke) => stroke.id === 'referenceRail')).toBe(true);
    expect(result.scene.strokes.some((stroke) => stroke.id === 'gndrail')).toBe(false);
    expect(result.scene.labels.some((label) => label.id === 'gndl')).toBe(false);
    const referenceRail = result.scene.strokes.find((stroke) => stroke.id === 'referenceRail');
    expect(referenceRail?.points.slice(0, 4)).toEqual([40, 143, 260, 143]);
    expect(bridgeCertificate(result.scene)).toBe(true);
    mkdirSync(resolve('artifacts/figlab/renders/l5'), { recursive: true });
    writeFileSync(resolve('artifacts/figlab/renders/l5/bridge.svg'), result.svg, 'utf8');
    const wrong = {
      ...result.scene,
      nodes: result.scene.nodes.map((node) => node.id === 'n:R50:center' ? { ...node, id: 'n:R50:wrong' } : node),
    };
    expect(bridgeCertificate(wrong)).toBe(false);
    const labels = ['V1', 'R100', 'R25a', 'R10', 'R50', 'R25b']
      .flatMap((id) => [`${id}`, `${id}-val`])
      .map((id) => ({ id, box: textBox(result.svg, id) }))
      .filter((entry): entry is { id: string; box: NonNullable<ReturnType<typeof textBox>> } => Boolean(entry.box));
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        expect(boxesOverlap(labels[i]!.box, labels[j]!.box), `${labels[i]!.id} overlaps ${labels[j]!.id}`).toBe(false);
      }
    }
    for (const label of labels) {
      expect(label.box.x1, `${label.id} left overflow`).toBeGreaterThanOrEqual(4);
      expect(label.box.x2, `${label.id} right overflow`).toBeLessThanOrEqual(296);
      expect(label.box.y1, `${label.id} top overflow`).toBeGreaterThanOrEqual(4);
      expect(label.box.y2, `${label.id} bottom overflow`).toBeLessThanOrEqual(161);
      expect(boxHitsScene(label.box, result.scene), `${label.id} touches a circuit stroke`).toBe(false);
    }
    for (const value of ['100 Ω', '25 Ω', '10 Ω', '50 Ω']) expect(result.svg).toContain(`>${value}<`);
  });

  it('keeps every designator/value pair aligned and inside the card', async () => {
    const content = [
      'std: ieee',
      'Vs: source 0 DC 9',
      'Rtop: source load 100',
      'Rleft: source mid 20',
      'Rmid: mid load 10',
      'Rshunt: mid 0 30',
      'Rload: load 0 40',
    ].join('\n');
    const result = await compileDiagramSpec({ type: 'circuit', content }, 'step');
    expect(result.ok, result.ok ? 'ok' : result.reason).toBe(true);
    if (!result.ok) return;
    writeFileSync(resolve('artifacts/figlab/renders/l5/label-case.svg'), result.svg, 'utf8');
    for (const id of ['Vs', 'Rtop', 'Rleft', 'Rmid', 'Rshunt', 'Rload']) {
      const designator = svgTextPosition(result.svg, id);
      const value = svgTextPosition(result.svg, `${id}-val`);
      expect(designator, `${id} designator missing`).not.toBeNull();
      expect(value, `${id} value missing`).not.toBeNull();
      if (!designator || !value) continue;
      expect(Math.abs(designator.x - value.x), `${id} pair split`).toBeLessThanOrEqual(0.1);
      expect(designator.y, `${id} order`).toBeLessThan(value.y);
      expect(value.y - designator.y, `${id} pair gap`).toBeCloseTo(16, 1);
    }
    const boxes = ['Vs', 'Rtop', 'Rleft', 'Rmid', 'Rshunt', 'Rload']
      .flatMap((id) => [`${id}`, `${id}-val`])
      .map((id) => ({ id, box: textBox(result.svg, id) }))
      .filter((entry): entry is { id: string; box: NonNullable<ReturnType<typeof textBox>> } => Boolean(entry.box));
    for (let i = 0; i < boxes.length; i++) {
      expect(boxes[i]!.box.x1, `${boxes[i]!.id} left overflow`).toBeGreaterThanOrEqual(4);
      expect(boxes[i]!.box.x2, `${boxes[i]!.id} right overflow`).toBeLessThanOrEqual(296);
      expect(boxes[i]!.box.y1, `${boxes[i]!.id} top overflow`).toBeGreaterThanOrEqual(4);
      expect(boxes[i]!.box.y2, `${boxes[i]!.id} bottom overflow`).toBeLessThanOrEqual(161);
      expect(boxHitsScene(boxes[i]!.box, result.scene), `${boxes[i]!.id} touches a circuit stroke`).toBe(false);
      for (let j = i + 1; j < boxes.length; j++) {
        expect(boxesOverlap(boxes[i]!.box, boxes[j]!.box), `${boxes[i]!.id} overlaps ${boxes[j]!.id}`).toBe(false);
      }
    }
  });

  it('renders a named bottom conductor without inventing a ground symbol', async () => {
    const content = [
      'std: ieee',
      'Vsource: left bottom DC 75',
      'Rtop: left right 100',
      'Rleft: left mid 25',
      'Rmid: mid right 10',
      'Rcenter: mid bottom 50',
      'Rright: right bottom 25',
    ].join('\n');
    const result = await compileDiagramSpec({ type: 'circuit', content }, 'step');
    expect(result.ok, result.ok ? 'ok' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(result.scene.strokes.some((stroke) => stroke.id === 'referenceRail')).toBe(true);
    expect(result.scene.strokes.some((stroke) => stroke.id === 'gndrail')).toBe(false);
    expect(result.scene.labels.some((label) => label.id === 'gndl')).toBe(false);
    expect(orientation(result.scene, 'Vsource')).toBe('vertical');
    expect(orientation(result.scene, 'Rtop')).toBe('horizontal');
    expect(orientation(result.scene, 'Rcenter')).toBe('vertical');
    expect(orientation(result.scene, 'Rright')).toBe('vertical');
  });

  it('does not depend on passive terminal order for left-to-right placement', async () => {
    const content = [
      'std: ieee',
      'Vsource: left bottom DC 75',
      'Rtop: right left 100',
      'Rleft: mid left 25',
      'Rmid: right mid 10',
      'Rcenter: bottom mid 50',
      'Rright: bottom right 25',
    ].join('\n');
    const result = await compileDiagramSpec({ type: 'circuit', content }, 'step');
    expect(result.ok, result.ok ? 'ok' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(orientation(result.scene, 'Rtop')).toBe('horizontal');
    expect(orientation(result.scene, 'Rleft')).toBe('horizontal');
    expect(orientation(result.scene, 'Rmid')).toBe('horizontal');
    expect(orientation(result.scene, 'Rcenter')).toBe('vertical');
    expect(orientation(result.scene, 'Rright')).toBe('vertical');
  });

  it('preserves authored resistor units and does not invent absent units', async () => {
    const withUnit = await compileDiagramSpec({ type: 'circuit', content: 'std: ieee\nR1: left right 4.7kΩ' }, 'step');
    expect(withUnit.ok, withUnit.ok ? 'ok' : withUnit.reason).toBe(true);
    if (withUnit.ok) expect(withUnit.svg).toContain('4.7k Ω');
    const withoutUnit = await compileDiagramSpec({ type: 'circuit', content: 'std: ieee\nR1: left right 4.7' }, 'step');
    expect(withoutUnit.ok, withoutUnit.ok ? 'ok' : withoutUnit.reason).toBe(true);
    if (withoutUnit.ok) expect(withoutUnit.svg).not.toContain('4.7 Ω');
  });

  it('fails closed when dense authored label pairs have no bounded collision-free placement', async () => {
    const content = [
      'std: ieee',
      'Vsource: left bottom 75V',
      'Rtop: left right 100 Ω with an intentionally very long authored value label',
      'Rmid: left right 200 Ω with another intentionally very long authored value label',
      'Rcenter: center bottom 300 Ω with a long value label',
      'Rright: right bottom 400 Ω with a long value label',
    ].join('\n');
    const result = await compileDiagramSpec({ type: 'circuit', content }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('unsatisfiable');
  });

  it('routes lifted long-span pins into every shared named-node rail', async () => {
    const content = [
      'std: ieee',
      'V: a 0 1',
      'Rlong: a b 2',
      'Rsh: a 0 3',
      'Rb: b 0 4',
    ].join('\n');
    const result = await compileDiagramSpec({ type: 'circuit', content }, 'step');
    expect(result.ok, result.ok ? 'ok' : result.reason).toBe(true);
    if (!result.ok) return;
    const lifted = result.scene.strokes.find((stroke) => stroke.id === 'Rlong-n1');
    expect(lifted?.points.length).toBeGreaterThanOrEqual(4);
    if (!lifted || lifted.points.length < 4) return;
    const sharedX = lifted.points[0]!;
    const sharedY = result.scene.strokes.find((stroke) => stroke.id === 'Rsh-n1')?.points[0 + 1];
    expect(sharedY).toBeDefined();
    const pinToRail = result.scene.strokes.find((stroke) => stroke.id.startsWith('rail:a:pin:') &&
      stroke.points[0] === sharedX && stroke.points[1] === lifted.points[1] && stroke.points[2] === sharedX && stroke.points[3] === sharedY);
    expect(pinToRail, 'lifted a pin is electrically connected to the a rail').toBeDefined();
    expect(result.scene.strokes.some((stroke) => stroke.id === 'rail:a')).toBe(true);
  });

  it('certifies directional glyph orientation from authored terminal order', async () => {
    const cases = [
      { id: 'D1', line: 'D1: right left', glyph: 'D1-bar' },
      { id: 'I1', line: 'I1: right left', glyph: 'I1' },
      { id: 'V1', line: 'V1: right left', glyph: 'V1-plus' },
    ];
    for (const entry of cases) {
      // The reference chain fixes mid to the right of left; each tested device
      // then deliberately authors n1=mid, n2=left so geometry reverses n1/n2.
      const result = await compileDiagramSpec({ type: 'circuit', content: `std: ieee\nVref: left 0\nRref: left mid\n${entry.line.replace('right left', 'mid left')}` }, 'step');
      expect(result.ok, result.ok ? 'ok' : result.reason).toBe(true);
      if (!result.ok) continue;
      const n1 = result.scene.strokes.find((stroke) => stroke.id === `${entry.id}-n1`);
      const n2 = result.scene.strokes.find((stroke) => stroke.id === `${entry.id}-n2`);
      expect(n1?.points[0]).toBeGreaterThan(n2?.points[0] ?? Number.POSITIVE_INFINITY);
      if (entry.id === 'D1') {
        const bar = result.scene.strokes.find((stroke) => stroke.id === entry.glyph);
        expect(bar?.points[0]).toBeLessThan(150);
      } else if (entry.id === 'I1') {
        const arrow = result.scene.strokes.find((stroke) => stroke.id === entry.glyph);
        expect(arrow?.points[0]).toBeGreaterThan(arrow?.points[2] ?? Number.POSITIVE_INFINITY);
      } else {
        const plus = result.scene.labels.find((label) => label.id === 'V1-plus');
        const minus = result.scene.labels.find((label) => label.id === 'V1-minus');
        expect(plus?.x).toBeGreaterThan(minus?.x ?? Number.POSITIVE_INFINITY);
      }
    }
  });
});
