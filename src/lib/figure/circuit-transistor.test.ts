import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { boxHitsAny, boxesOverlap, distPointSeg, measureText, samplePathD, type Box, type Segment } from './geom';
import { strokeSegments } from './slk';
import type { Scene } from './types';

const circuit = (...lines: string[]) => ['std: ieee', ...lines].join('\n');

/** Transistor circuits a course actually draws: bias networks, amplifiers, mirrors, pairs, CMOS. */
const TRANSISTOR_SPECS: Record<string, string> = {
  // A real Gemini answer (2026-09-13): direct-coupled two-stage amplifier, no type tokens, two probes.
  'two-stage (real capture)': circuit('V_CC: 12V_node 0 DC 12', 'R_B1: 12V_node node_B1 150k', 'R_C1: 12V_node node_C1 1k', 'R_E1: node_E1 0 1k',
    'R_C2: 12V_node node_C2 330', 'R_E2: node_E2 0 1k', 'Q1: node_C1 node_B1 node_E1', 'Q2: node_C2 node_C1 node_E2', 'probe: VceT1=node_C1', 'probe: VceT2=node_C2'),
  'common-emitter with divider bias': circuit('VCC: vcc 0 DC 12', 'R1: vcc base 47k', 'R2: base 0 10k', 'RC: vcc col 2.2k', 'RE: emit 0 1k', 'CE: emit 0 100uF',
    'Q1: col base emit npn', 'Cin: in base 10uF', 'Vs: in 0 AC 10mV', 'Cout: col out 10uF', 'RL: out 0 10k', 'probe: V_out=out'),
  'fixed bias': circuit('VCC: vcc 0 DC 9', 'RB: vcc b 220k', 'RC: vcc c 1k', 'Q1: c b 0 npn β=100'),
  'emitter follower': circuit('VCC: vcc 0 DC 15', 'RB: vcc b 100k', 'Q1: vcc b e npn', 'RE: e 0 1k', 'Vs: in 0 AC 1V', 'C1: in b 1uF', 'probe: V_out=e'),
  'pnp': circuit('VCC: vcc 0 DC 10', 'RE: vcc e 2k', 'Q1: c b e pnp', 'RB: b 0 100k', 'RC: c 0 3k'),
  'collector feedback': circuit('VCC: vcc 0 DC 10', 'RC: vcc c 4.7k', 'RB: c b 250k', 'Q1: c b 0 npn'),
  'current mirror': circuit('VCC: vcc 0 DC 10', 'RREF: vcc x 9.3k', 'Q1: x x 0 npn', 'Q2: out x 0 npn', 'RL: vcc out 2k'),
  'differential pair': circuit('VCC: vcc 0 DC 12', 'RC1: vcc c1 5k', 'RC2: vcc c2 5k', 'Q1: c1 b1 e npn', 'Q2: c2 b2 e npn', 'I1: e 0 1mA', 'port: b1 input', 'port: b2 input'),
  'push-pull': circuit('VCC: vcc 0 DC 12', 'Q1: vcc in out npn', 'Q2: 0 in out pnp', 'RL: out 0 8', 'Vs: in 0 AC 1V'),
  'darlington': circuit('VCC: vcc 0 DC 12', 'RB: vcc b1 1M', 'Q1: vcc b1 e1 npn', 'Q2: vcc e1 e2 npn', 'RE: e2 0 1k'),
  'common-source with divider': circuit('VDD: vdd 0 DC 15', 'RG1: vdd g 2M', 'RG2: g 0 1M', 'RD: vdd d 5k', 'RS: s 0 1k', 'M1: d g s nmos', 'probe: V_D=d'),
  'cmos inverter': circuit('VDD: vdd 0 DC 5', 'M1: out in vdd pmos', 'M2: out in 0 nmos', 'port: in input', 'port: out output'),
  'source follower': circuit('VDD: vdd 0 DC 10', 'VG: g 0 DC 6', 'M1: vdd g s nmos', 'RS: s 0 2k', 'probe: V_S=s'),
  'wired output node': circuit('VDD: vdd 0 DC 5', 'RD: vdd d 10k', 'M1: d g 0 nmos', 'VG: g 0 DC 2', 'RL: out 0 100k', 'wire: d out'),
};

async function compiled(content: string): Promise<Scene> {
  const result = await compileDiagramSpec({ type: 'circuit', content }, 'step');
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

type Terminal = { device: string; lead: string; node: string; pin: { x: number; y: number } };

function declaredTerminals(content: string, scene: Scene): Terminal[] {
  const terminals: Terminal[] = [];
  for (const line of content.split('\n')) {
    const match = /^([RCLVIDMSQ][A-Za-z0-9_]*):\s*(.+)$/.exec(line);
    if (!match) continue;
    const tokens = match[2]!.split(/\s+/);
    const count = /^[QM]/.test(match[1]!) && (match[1]!.startsWith('Q') || tokens.some((t) => /^(nmos|pmos)$/i.test(t))) ? 3 : 2;
    for (let k = 1; k <= count; k++) {
      const lead = scene.strokes.find((stroke) => stroke.id === `${match[1]}-n${k}`);
      expect(lead, `${match[1]}-n${k} lead`).toBeDefined();
      terminals.push({ device: match[1]!, lead: `${match[1]}-n${k}`, node: tokens[k - 1]!, pin: { x: lead!.points[0]!, y: lead!.points[1]! } });
    }
  }
  return terminals;
}

/** Electrical node of each spec node name: wires join, every ground spelling is one node. */
function nodeGroups(content: string): (name: string) => string {
  const parent = new Map<string, string>();
  const find = (n: string): string => (parent.get(n) && parent.get(n) !== n ? find(parent.get(n)!) : n);
  for (const line of content.split('\n')) {
    const wire = /^wire:\s*(\S+)\s+(\S+)$/.exec(line);
    if (wire) parent.set(find(wire[1]!), find(wire[2]!));
  }
  return (name) => (/^(0|gnd|ground)$/i.test(name) ? 'GROUND' : find(name));
}

/** Conductors as drawn: every connector line (leads, net wires, rails). */
function conductors(scene: Scene): Array<{ id: string; seg: Segment }> {
  return scene.strokes
    .filter((stroke) => stroke.role === 'connector' && stroke.kind === 'line')
    .map((stroke) => ({ id: stroke.id, seg: { x1: stroke.points[0]!, y1: stroke.points[1]!, x2: stroke.points[2]!, y2: stroke.points[3]! } }));
}

/** Read the drawing back as a netlist: conductors join only where one ends on another. */
function drawnComponent(scene: Scene): (point: { x: number; y: number }) => number {
  const wires = conductors(scene);
  const parent = wires.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const on = (x: number, y: number, s: Segment) => distPointSeg(x, y, s) < 0.75;
  wires.forEach((a, i) => wires.forEach((c, j) => {
    if (j > i && (on(a.seg.x1, a.seg.y1, c.seg) || on(a.seg.x2, a.seg.y2, c.seg) || on(c.seg.x1, c.seg.y1, a.seg) || on(c.seg.x2, c.seg.y2, a.seg))) parent[find(i)] = find(j);
  }));
  return (point) => {
    const index = wires.findIndex((w) => on(point.x, point.y, w.seg));
    return index < 0 ? -1 : find(index);
  };
}

function labelBoxes(scene: Scene): Array<{ id: string; box: Box }> {
  return scene.labels.map((label) => {
    const size = measureText(label.text ?? '', 12);
    return { id: label.id, box: { x1: label.x - size.w / 2, y1: label.y - size.h / 2, x2: label.x + size.w / 2, y2: label.y + size.h / 2 } };
  });
}

describe('transistor circuits (Q = C B E npn|pnp, M = D G S nmos|pmos)', () => {
  it.each(Object.entries(TRANSISTOR_SPECS))('%s: the drawing connects exactly the declared nodes', async (_name, content) => {
    const scene = await compiled(content);
    const terminals = declaredTerminals(content, scene);
    const node = nodeGroups(content);
    const component = drawnComponent(scene);
    for (const t of terminals) expect(component(t.pin), `${t.lead} pin is on a wire`).toBeGreaterThanOrEqual(0);
    for (const a of terminals) {
      for (const c of terminals) {
        if (a === c) continue;
        expect(component(a.pin) === component(c.pin), `${a.lead}(${a.node}) vs ${c.lead}(${c.node})`).toBe(node(a.node) === node(c.node));
      }
    }
  });

  it.each(Object.entries(TRANSISTOR_SPECS))('%s: transistors stand upright with the control lead from the left', async (_name, content) => {
    const scene = await compiled(content);
    const transistors = [...content.matchAll(/^([QM][A-Za-z0-9_]*):\s*\S+\s+\S+\s+\S+(?:\s+(npn|pnp|nmos|pmos))?/gm)]
      .filter((m) => m[1]!.startsWith('Q') || m[2]);
    expect(transistors.length).toBeGreaterThan(0);
    for (const m of transistors) {
      const id = m[1]!;
      const kind = (m[2] ?? 'npn').toLowerCase();
      const pin = (k: number) => { const s = scene.strokes.find((stroke) => stroke.id === `${id}-n${k}`)!; return { x: s.points[0]!, y: s.points[1]!, endX: s.points[2]!, endY: s.points[3]! }; };
      const control = pin(2);
      const column = control.x + 24;
      const [upper, lower] = kind === 'npn' || kind === 'nmos' ? [pin(1), pin(3)] : [pin(3), pin(1)];
      expect(upper.x, `${id} upper terminal in the column`).toBeCloseTo(column, 5);
      expect(lower.x, `${id} lower terminal in the column`).toBeCloseTo(column, 5);
      expect(upper.y, `${id} upper terminal above the body`).toBeLessThan(control.y);
      expect(lower.y, `${id} lower terminal below the body`).toBeGreaterThan(control.y);
      expect(control.endX, `${id} control lead enters from the left`).toBeGreaterThan(control.x);
      // The emitter/source arrow points out of an n-type device and into a p-type one.
      const arrow = scene.strokes.find((stroke) => stroke.id === `${id}-arrow`)!;
      const [tipX, tipY] = arrow.points as [number, number];
      const baseX = (arrow.points[2]! + arrow.points[4]!) / 2;
      const baseY = (arrow.points[3]! + arrow.points[5]!) / 2;
      if (kind === 'npn' || kind === 'nmos') {
        expect(tipX - baseX, `${id} arrow points away from the control side`).toBeGreaterThan(0);
        expect(tipY, `${id} arrow on the lower (emitter/source) terminal`).toBeGreaterThan(control.y);
      } else {
        expect(tipX - baseX, `${id} arrow points toward the control side`).toBeLessThan(0);
        expect(tipY, `${id} arrow on the upper (emitter/source) terminal`).toBeLessThan(control.y);
      }
      expect(Math.hypot(tipX - baseX, tipY - baseY)).toBeGreaterThan(4);
    }
  });

  it.each(Object.entries(TRANSISTOR_SPECS))('%s: supply on top, ground at the bottom', async (_name, content) => {
    const scene = await compiled(content);
    const terminals = declaredTerminals(content, scene);
    const ys = terminals.map((t) => t.pin.y);
    for (const t of terminals) {
      if (/^(0|gnd)$/i.test(t.node)) expect(t.pin.y, `${t.lead} on the ground rail`).toBe(Math.max(...ys));
      if (/^(vcc|vdd|12V_node)$/i.test(t.node)) expect(t.pin.y, `${t.lead} on the supply rail`).toBe(Math.min(...ys));
    }
    expect(scene.labels.some((label) => label.id === 'gndl' && label.text === 'GND')).toBe(true);
  });

  it.each(Object.entries(TRANSISTOR_SPECS))('%s: a dot marks every joint of three or more wires, and only those', async (_name, content) => {
    const scene = await compiled(content);
    const wires = conductors(scene);
    const arms = (p: { x: number; y: number }) => wires.reduce((sum, w) => {
      const ends = [[w.seg.x1, w.seg.y1], [w.seg.x2, w.seg.y2]].filter(([x, y]) => Math.hypot(x! - p.x, y! - p.y) < 0.75).length;
      return sum + (ends || (distPointSeg(p.x, p.y, w.seg) < 0.75 ? 2 : 0));
    }, 0);
    const dots = scene.strokes.filter((stroke) => stroke.id.startsWith('dot:')).map((stroke) => ({ x: stroke.points[0]!, y: stroke.points[1]! }));
    for (const dot of dots) expect(arms(dot), `dot at ${dot.x},${dot.y}`).toBeGreaterThanOrEqual(3);
    const ends = wires.flatMap((w) => [{ x: w.seg.x1, y: w.seg.y1 }, { x: w.seg.x2, y: w.seg.y2 }]);
    for (const end of ends) {
      if (arms(end) >= 3) expect(dots.some((dot) => Math.hypot(dot.x - end.x, dot.y - end.y) < 0.75), `joint at ${end.x},${end.y}`).toBe(true);
    }
  });

  it.each(Object.entries(TRANSISTOR_SPECS))('%s: every label is legible — no overlaps, clear of every stroke', async (_name, content) => {
    const scene = await compiled(content);
    const boxes = labelBoxes(scene);
    const segments = strokeSegments(scene);
    for (const [i, a] of boxes.entries()) {
      if (!/-(plus|minus)$/.test(a.id)) expect(boxHitsAny(a.box, segments, 0), `${a.id} crosses a stroke`).toBe(false);
      for (const c of boxes.slice(i + 1)) expect(boxesOverlap(a.box, c.box, 0), `${a.id} overlaps ${c.id}`).toBe(false);
      expect(a.box.x1 >= 0 && a.box.y1 >= 0 && a.box.x2 <= scene.width && a.box.y2 <= scene.height, `${a.id} inside the frame`).toBe(true);
    }
    for (const line of content.split('\n')) {
      const id = /^([RCLVIDMSQ][A-Za-z0-9_]*):/.exec(line)?.[1];
      if (id) expect(scene.labels.some((label) => label.id === id && label.text === id), `${id} designator`).toBe(true);
    }
  });

  it('prints every probe, not only the first', async () => {
    const scene = await compiled(TRANSISTOR_SPECS['two-stage (real capture)']!);
    expect(scene.labels.filter((label) => /^VceT[12]$/.test(label.text ?? '')).map((label) => label.text).sort()).toEqual(['VceT1', 'VceT2']);
  });

  it('prints every probe on a ladder network too', async () => {
    const ladder = await compiled(circuit('V1: a 0 DC 10', 'R1: a b 1k', 'R2: b 0 1k', 'probe: V_a=a', 'probe: V_b=b'));
    expect(ladder.labels.filter((label) => /^V_[ab]$/.test(label.text ?? '')).map((label) => label.text).sort()).toEqual(['V_a', 'V_b']);
  });

  it('draws M with nmos|pmos as a MOSFET, never as a two-terminal meter', async () => {
    const scene = await compiled(TRANSISTOR_SPECS['common-source with divider']!);
    expect(scene.labels.some((label) => label.id === 'M1-meter')).toBe(false);
    expect(scene.strokes.some((stroke) => stroke.id === 'M1-gate')).toBe(true);
    const tied = await compiled(circuit('VDD: vdd 0 DC 5', 'RD: vdd d 1k', 'M1: d g s s nmos', 'RS: s 0 1k', 'VG: g 0 DC 2'));
    expect(tied.strokes.some((stroke) => stroke.id === 'M1-gate')).toBe(true);
    const meter = await compiled(circuit('V1: a 0 DC 5', 'R1: a b 1k', 'M1: b 0 voltmeter'));
    expect(meter.labels.some((label) => label.id === 'M1-meter')).toBe(true);
  });

  it.each([
    ['a three-node M without nmos|pmos', circuit('VDD: vdd 0 DC 5', 'RD: vdd d 1k', 'M1: d g s', 'RS: s 0 1k', 'VG: g 0 DC 2'), /nmos or pmos/],
    ['a MOSFET body terminal away from its source', circuit('VDD: vdd 0 DC 5', 'RD: vdd d 1k', 'M1: d g s 0 nmos', 'RS: s 0 1k', 'VG: g 0 DC 2'), /body terminal/],
    ['a BJT typed as a MOSFET', circuit('VCC: vcc 0 DC 5', 'RC: vcc c 1k', 'Q1: c b 0 nmos', 'RB: vcc b 100k'), /npn or pnp/],
  ])('refuses %s as malformed', async (_name, content, reason) => {
    const result = await compileDiagramSpec({ type: 'circuit', content }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('malformed');
      expect(result.reason).toMatch(reason);
    }
  });

  it.each([
    ['no ground node', circuit('RC: c b 1k', 'Q1: c b e npn', 'RE: e b 1k'), /ground/],
    ['a negative supply rail', circuit('VCC: vcc 0 DC 12', 'RC: vcc c 1k', 'Q1: c 0 e npn', 'RE: e vee 1k', 'VEE: vee 0 DC -12'), /negative supply/],
    ['transistors that contradict each other', circuit('VCC: vcc 0 DC 5', 'R1: vcc a 1k', 'Q1: a b c npn', 'Q2: c d a npn', 'R2: c 0 1k', 'R3: b 0 1k', 'R4: d 0 1k'), /upside down/],
  ])('fails closed for %s instead of guessing a layout', async (_name, content, reason) => {
    const result = await compileDiagramSpec({ type: 'circuit', content }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });
});

describe('inductor glyph', () => {
  it('is four loops on one side that meet both leads exactly', async () => {
    for (const content of [
      circuit('V1: a 0 AC 10V 50Hz', 'R1: a b 10', 'L1: b c 50mH', 'C1: c 0 100uF'),
      circuit('V1: a 0 DC 9', 'S1: a b closed', 'R1: b c 100', 'L1: c 0 10mH'),
    ]) {
      const scene = await compiled(content);
      const coil = scene.strokes.find((stroke) => stroke.id === 'L1')!;
      const n1 = scene.strokes.find((stroke) => stroke.id === 'L1-n1')!;
      const n2 = scene.strokes.find((stroke) => stroke.id === 'L1-n2')!;
      const ends = [n1, n2].map((lead) => ({ x: lead.points[2]!, y: lead.points[3]! }));
      const samples = samplePathD(coil.d!).flatMap((seg) => [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }]);
      const horizontal = Math.abs(ends[0]!.y - ends[1]!.y) < 0.5;
      const along = (p: { x: number; y: number }) => (horizontal ? p.x : p.y);
      const across = (p: { x: number; y: number }) => (horizontal ? p.y : p.x);
      expect(Math.min(...samples.map(along))).toBeCloseTo(Math.min(...ends.map(along)), 0);
      expect(Math.max(...samples.map(along))).toBeCloseTo(Math.max(...ends.map(along)), 0);
      const axis = across(ends[0]!);
      const offsets = samples.map((p) => across(p) - axis).filter((d) => Math.abs(d) > 0.5);
      expect(offsets.length).toBeGreaterThan(8);
      expect(offsets.every((d) => Math.sign(d) === Math.sign(offsets[0]!)), 'every loop on one side').toBe(true);
      // Four loops: the curve returns to the axis three times between its ends.
      const touches = samples.filter((p, i) => i > 0 && Math.abs(across(p) - axis) < 0.5).map(along);
      expect(new Set(touches.map((v) => Math.round(v))).size).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('ladder ports and switches', () => {
  const PORTS = [
    circuit('Vs: in 0 AC 1V', 'R1: in out 1k', 'C1: out 0 100nF', 'port: out output'),
    circuit('R1: in out 1k', 'C1: out 0 100nF', 'port: in input', 'port: out output'),
    circuit('V1: a 0 DC 5', 'R1: a b 1k', 'R2: b c 1k', 'R3: c 0 1k', 'port: c output'),
  ];

  it.each(PORTS)('prints a port name beside its terminal, not over it (%#)', async (content) => {
    const scene = await compiled(content);
    for (const dot of scene.strokes.filter((stroke) => /^port:.*:dot$/.test(stroke.id))) {
      const node = dot.id.slice(5, -4);
      const label = labelBoxes(scene).find((entry) => entry.id === `port:${node}:label`)!;
      const [cx, cy, radius] = dot.points as [number, number, number];
      const ring = { x1: cx - radius - 1, y1: cy - radius - 1, x2: cx + radius + 1, y2: cy + radius + 1 };
      expect(boxesOverlap(label.box, ring, 0), `${node} label clear of its terminal`).toBe(false);
      expect(Math.hypot((label.box.x1 + label.box.x2) / 2 - cx, (label.box.y1 + label.box.y2) / 2 - cy), `${node} label near its terminal`).toBeLessThan(30);
    }
  });

  it.each(PORTS)('runs a port straight to a pin on its own row when there is one (%#)', async (content) => {
    const scene = await compiled(content);
    for (const wire of scene.strokes.filter((stroke) => /^port:.*:connection$/.test(stroke.id))) {
      const ys = wire.points.filter((_, i) => i % 2 === 1);
      expect(new Set(ys.map((v) => Math.round(v))).size, `${wire.id} has no detour`).toBe(1);
    }
  });

  it('draws a switch with visible contacts, so a closed switch is not just a wire', async () => {
    for (const state of ['closed', 'open']) {
      const scene = await compiled(circuit('V1: a 0 DC 9', `S1: a b ${state}`, 'R1: b 0 100'));
      const contacts = scene.strokes.filter((stroke) => /^S1-contact/.test(stroke.id));
      expect(contacts.map((stroke) => stroke.kind), state).toEqual(['circle', 'circle']);
      const blade = scene.strokes.find((stroke) => stroke.id === 'S1-blade')!;
      expect(Math.hypot(blade.points[0]! - contacts[0]!.points[0]!, blade.points[1]! - contacts[0]!.points[1]!)).toBeLessThan(0.5);
    }
  });
});

describe('stacked designator/value labels', () => {
  it.each([
    ['ladder (the Guide specimen)', circuit('V_source: node_input 0 DC 1', 'R_load: node_input node_output 1k', 'R_return: node_output 0 1k', 'probe: V_out=node_output')],
    ['transistor (real capture)', TRANSISTOR_SPECS['two-stage (real capture)']!],
  ])('%s: a subscripted designator keeps its drop clear of the value below it', async (_name, content) => {
    const scene = await compiled(content);
    const subscripted = scene.labels.filter((label) => /_/.test(label.text ?? '') && scene.labels.some((other) => other.id === `${label.id}-val`));
    expect(subscripted.length).toBeGreaterThan(1);
    for (const designator of subscripted) {
      const value = scene.labels.find((label) => label.id === `${designator.id}-val`)!;
      expect(Math.abs(value.x - designator.x), `${designator.id} pair aligned`).toBeLessThan(0.1);
      // 16 units line to line, plus the 0.3 em (3.6 unit) drop of the subscript.
      expect(value.y - designator.y, `${designator.id} pair gap`).toBeGreaterThanOrEqual(16 + 3.6 - 0.05);
    }
  });
});

describe('any transistor circuit the engine accepts is drawn faithfully', () => {
  it('holds for 300 seeded random netlists: refused cleanly, or connected exactly as declared', async () => {
    let seed = 20260925;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;
    const nodes = ['0', 'vcc', 'a', 'b', 'c', 'd', 'e'];
    let accepted = 0;
    for (let n = 0; n < 300; n++) {
      const lines = ['VCC: vcc 0 DC 10'];
      const transistors = 1 + Math.floor(random() * 3);
      for (let t = 1; t <= transistors; t++) {
        const [upper, control, lower] = [pick(nodes), pick(nodes), pick(nodes)];
        lines.push(`${random() < 0.5 ? 'Q' : 'M'}${t}: ${upper} ${control} ${lower} ${pick(['npn', 'pnp', 'nmos', 'pmos'].filter((kind) => kind.endsWith('os') === (lines.length % 2 === 0)))}`);
      }
      for (let p = 1; p <= 2 + Math.floor(random() * 5); p++) {
        const a = pick(nodes);
        const c = pick(nodes.filter((node) => node !== a));
        lines.push(`${pick(['R', 'C'])}${p}: ${a} ${c} 1k`);
      }
      // Keep each transistor's letter consistent with its type token.
      const content = circuit(...lines.map((line) => line.replace(/^Q(\d+): (.+) (nmos|pmos)$/, 'M$1: $2 $3').replace(/^M(\d+): (.+) (npn|pnp)$/, 'Q$1: $2 $3')));
      const result = await compileDiagramSpec({ type: 'circuit', content }, 'step');
      if (!result.ok) {
        expect(['malformed', 'unsatisfiable'], `${content}\n→ ${result.reason}`).toContain(result.code);
        continue;
      }
      accepted += 1;
      const scene = result.scene;
      const terminals = declaredTerminals(content, scene);
      const node = nodeGroups(content);
      const component = drawnComponent(scene);
      for (const a of terminals) {
        expect(component(a.pin), `${content}\n${a.lead} on a wire`).toBeGreaterThanOrEqual(0);
        for (const c of terminals) {
          if (a !== c) expect(component(a.pin) === component(c.pin), `${content}\n${a.lead}(${a.node}) vs ${c.lead}(${c.node})`).toBe(node(a.node) === node(c.node));
        }
      }
    }
    expect(accepted, 'a useful share of random netlists is drawable').toBeGreaterThan(30);
  });
});
