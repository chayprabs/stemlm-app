import type { CompileResult } from '../types';
import type { Device, ParsedCircuit } from './circuit';
import { SceneBuilder } from '../scene-build';
import { layoutAndCompile } from '../pipeline';
import { strokeSegments } from '../slk';
import { boxHitsAny, boxesOverlap, distPointSeg, measureText, type Box, type Segment } from '../geom';
import {
  CONTROL_REACH,
  deviceHalf,
  deviceSide,
  displayDeviceValue,
  drawGlyph,
  drawTransistor,
  type Transistor,
} from './circuit-glyphs';

/**
 * Transistor-circuit schematics (BJT `Q`, MOSFET `M … nmos|pmos`), drawn the textbook way: positive
 * supply rails on top, ground at the bottom, every transistor upright — collector/drain up for n-type,
 * emitter/source up for p-type — with its base/gate fed from the left.
 *
 * Nets get rows from the transistors' terminal order (longest path from the supply); a device joining
 * two rows stands vertically, one within a row lies horizontally; columns follow the signal from the
 * inputs. A net whose pins sit on several rows gets one vertical trunk. The finished drawing is read
 * back as a netlist — conductors that end on each other connect, crossings do not — and must equal
 * the spec's, with no wire through a symbol, or the circuit is refused.
 */

const PITCH = 44;
const TOP = 30;
const MARGIN = 12;
const GAP = 10;
const FONT = 12;
const LINE = 16;
const FONT_LINE_BOX = measureText('M', FONT).h;
const MAX_W = 640;
const MAX_H = 360;
const SUPPLY_NAME = /^(?:v(?:cc|dd)[a-z0-9_]*|v\+|supply)$/i;

type Failure = { ok: false; code: 'malformed' | 'unsatisfiable'; reason: string };
const fail = (reason: string, code: Failure['code'] = 'unsatisfiable'): Failure => ({ ok: false, code, reason });

interface Part { tag: 'part'; device: Device; a: string; b: string }
interface Stage { tag: 'stage'; device: Device; kind: Transistor; u: string; k: string; l: string; body: string }
type Element = Part | Stage;
type Pin = { x: number; y: number };
type Conductor = { seg: Segment; net: string; owner?: string };

export interface StageInput extends Pick<ParsedCircuit, 'devices' | 'ports' | 'labels' | 'probes' | 'wires'> {
  isGround: (node: string) => boolean;
  std: string;
  highlight: string[];
}

/** Which written terminal (n1..n3) is the upper and which the lower one; n2 is always the control. */
function terminalOrder(kind: Transistor): { upper: 'n1' | 'n3'; lower: 'n1' | 'n3' } {
  return kind === 'npn' || kind === 'nmos' ? { upper: 'n1', lower: 'n3' } : { upper: 'n3', lower: 'n1' };
}

const onSeg = (x: number, y: number, s: Segment) => distPointSeg(x, y, s) < 0.75;
/** Two conductors are joined where one ends on the other; a crossing is not a joint. */
const joined = (a: Segment, c: Segment) =>
  onSeg(a.x1, a.y1, c) || onSeg(a.x2, a.y2, c) || onSeg(c.x1, c.y1, a) || onSeg(c.x2, c.y2, a);

export function compileStageCircuit(input: StageInput): CompileResult {
  // Nets: explicit wires join nodes; every ground spelling is one net.
  const parent = new Map<string, string>();
  const find = (node: string): string => {
    const up = parent.get(node);
    if (!up || up === node) return node;
    const root = find(up);
    parent.set(node, root);
    return root;
  };
  const join = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (input.isGround(rb)) parent.set(ra, rb);
    else parent.set(rb, ra);
  };
  const terminals = input.devices.flatMap((d) => [d.n1, d.n2, ...(d.n3 ? [d.n3] : [])]);
  const names = [...new Set(terminals.concat(input.ports.map((p) => p.node)))];
  const grounds = names.filter(input.isGround);
  for (const g of grounds.slice(1)) join(grounds[0]!, g);
  for (const wire of input.wires) join(wire.a, wire.b);
  const gnd = grounds.length ? find(grounds[0]!) : undefined;
  if (!gnd) return fail('a transistor circuit needs a ground node (0 or gnd)');

  const parts: Part[] = [];
  const stages: Stage[] = [];
  const byDevice = new Map<Device, Element>();
  for (const device of input.devices) {
    if (device.kind === 'a') return fail(`op-amp ${device.id} and transistors in one circuit need a combined layout`);
    if (device.transistor) {
      const order = terminalOrder(device.transistor);
      const stage: Stage = { tag: 'stage', device, kind: device.transistor, u: find(device[order.upper]!), k: find(device.n2), l: find(device[order.lower]!), body: '' };
      if (stage.u === stage.l) return fail(`transistor ${device.id} has its ${/os$/.test(stage.kind) ? 'drain and source' : 'collector and emitter'} on one node`);
      stages.push(stage);
      byDevice.set(device, stage);
    } else {
      const part: Part = { tag: 'part', device, a: find(device.n1), b: find(device.n2) };
      if (part.a === part.b) return fail(`${device.id} has both terminals on one node`);
      parts.push(part);
      byDevice.set(device, part);
    }
  }
  const nets = new Set(names.map(find));
  const deviceNets = new Set(terminals.map(find));
  for (const port of input.ports) if (!deviceNets.has(find(port.node))) return fail(`port ${port.node} is not connected to a device`);
  const other = (p: Part, net: string) => (p.a === net ? p.b : p.a);
  const touches = (p: Part, net: string) => p.a === net || p.b === net;

  // Rails: a positive DC supply (or a vcc/vdd-named node) that feeds a transistor's upper terminal.
  const controls = new Set(stages.map((s) => s.k));
  const uppers = new Set(stages.map((s) => s.u));
  const lowers = new Set(stages.map((s) => s.l));
  const nextTo = (set: Set<string>, net: string) => set.has(net) || parts.some((p) => touches(p, net) && set.has(other(p, net)));
  const sourced = new Map<string, number>();
  for (const p of parts) {
    if (p.device.kind !== 'v' || /^ac(?:\s|$)/i.test(p.device.value ?? '') || (p.a === gnd) === (p.b === gnd)) continue;
    const net = p.a === gnd ? p.b : p.a;
    const sign = Number(/-?\d*\.?\d+/.exec(p.device.value ?? '')?.[0] ?? 1) < 0 ? -1 : 1;
    sourced.set(net, (net === p.a ? 1 : -1) * sign);
  }
  const named = new Set(names.filter((n) => SUPPLY_NAME.test(n)).map(find));
  const rails = new Set<string>();
  for (const net of nets) {
    if (net === gnd || controls.has(net)) continue;
    if (named.has(net) || (sourced.get(net) === 1 && nextTo(uppers, net))) rails.add(net);
    else if (sourced.get(net) === -1 && nextTo(lowers, net)) return fail(`negative supply ${net} needs a rail below ground, which this layout does not draw`);
  }
  const railish = (net: string) => net === gnd || rails.has(net);

  // Rows: each transistor puts its upper terminal above its body and its lower terminal below; the body
  // shares its control net's row unless that would contradict another transistor (CMOS, push-pull).
  const below = new Map<string, Set<string>>();
  const edge = (a: string, b: string) => { const set = below.get(a) ?? new Set<string>(); set.add(b); below.set(a, set); };
  const reaches = (from: string, to: string): boolean => {
    const stack = [from];
    const seen = new Set<string>();
    while (stack.length) {
      const node = stack.pop()!;
      if (node === to) return true;
      if (seen.has(node)) continue;
      seen.add(node);
      stack.push(...(below.get(node) ?? []));
    }
    return false;
  };
  for (const s of stages) {
    if (reaches(s.l, s.u)) return fail(`transistor ${s.device.id} is upside down relative to the other transistors`);
    const merge = s.k !== s.u && s.k !== s.l && !railish(s.k) && !reaches(s.k, s.u) && !reaches(s.l, s.k);
    s.body = merge ? s.k : `stage:${s.device.id}`;
    edge(s.u, s.body);
    edge(s.body, s.l);
  }
  for (const [a, set] of below) {
    for (const b of set) {
      if (rails.has(b)) return fail(`supply ${b} would sit below ${a}`);
      if (a === gnd) return fail(`ground would sit above ${b}`);
    }
  }
  const above = new Map<string, string[]>();
  for (const [a, set] of below) for (const b of set) above.set(b, [...(above.get(b) ?? []), a]);
  const row = new Map<string, number>();
  const rowOf = (node: string): number => {
    const known = row.get(node);
    if (known !== undefined) return known;
    const value = rails.has(node) ? 0 : Math.max(1, ...(above.get(node) ?? []).map((a) => rowOf(a) + 1));
    row.set(node, value);
    return value;
  };
  for (const node of new Set([...below.keys(), ...above.keys()])) if (node !== gnd) rowOf(node);
  for (const rail of rails) row.set(rail, 0);
  // Other nets follow a non-rail neighbour so the device between them lies flat (coupling caps, series R).
  for (let changed = true; changed;) {
    changed = false;
    for (const p of parts) {
      for (const [from, to] of [[p.a, p.b], [p.b, p.a]] as const) {
        if (!row.has(to) && !railish(to) && row.has(from) && !railish(from)) {
          row.set(to, row.get(from)!);
          changed = true;
        }
      }
    }
  }
  const deepest = Math.max(1, ...row.values());
  for (const net of nets) if (!row.has(net) && net !== gnd) row.set(net, Math.max(1, Math.round(deepest / 2)));
  const groundRow = Math.max(...row.values()) + 1;
  row.set(gnd, groundRow);
  const r = (node: string) => row.get(node)!;
  const vertical = (p: Part) => r(p.a) !== r(p.b);

  // Stacks: a transistor whose upper terminal is another's lower terminal shares its column (CMOS, cascode).
  const lowerOf = new Map<Stage, Stage>();
  const stacked = new Set<Stage>();
  for (const t1 of stages) {
    if (railish(t1.l)) continue;
    const t2 = stages.find((t) => t !== t1 && !stacked.has(t) && t.u === t1.l);
    if (t2) { lowerOf.set(t1, t2); stacked.add(t2); }
  }
  const stacks = stages.filter((s) => !stacked.has(s)).map((top) => {
    const stack = [top];
    for (let next = lowerOf.get(top); next && !stack.includes(next); next = lowerOf.get(next)) stack.push(next);
    return stack;
  });
  const stackOf = (s: Stage) => stacks.find((stack) => stack.includes(s))!;

  // Devices that belong beside a stack: in line above/below it, in extra columns to its right, or in
  // control columns to its left.
  type Role = 'up' | 'down' | 'side' | 'ctrl';
  const owner = new Map<Part, { stack: Stage[]; role: Role }>();
  const claim = (stack: Stage[], net: string, direction: 1 | -1 | 0, inlineRole: Role | null) => {
    const found = parts.filter((p) => !owner.has(p) && vertical(p) && touches(p, net) &&
      (direction === 0 || Math.sign(r(other(p, net)) - r(net)) === direction));
    found.forEach((p, i) => owner.set(p, { stack, role: inlineRole === 'ctrl' || (i === 0 && inlineRole) ? inlineRole! : 'side' }));
  };
  for (const stack of stacks) {
    if (!railish(stack[0]!.u)) claim(stack, stack[0]!.u, -1, 'up');
    if (!railish(stack.at(-1)!.l)) claim(stack, stack.at(-1)!.l, 1, 'down');
    for (const s of stack.slice(0, -1)) claim(stack, s.l, 0, null);
  }
  for (const stack of stacks) for (const s of stack) if (!railish(s.k)) claim(stack, s.k, 0, 'ctrl');

  // Signal-flow order of units, breadth-first from the inputs.
  type Unit = { tag: 'stack'; stack: Stage[] } | { tag: 'part'; part: Part; left?: string } | { tag: 'port'; port: ParsedCircuit['ports'][number] };
  const units: Unit[] = [];
  const done = new Set<Element>();
  const queue: string[] = [];
  const enqueue = (...list: string[]) => queue.push(...list.filter((net) => !railish(net)));
  for (const p of parts) {
    if (!owner.has(p) && railish(p.a) && railish(p.b)) { units.push({ tag: 'part', part: p }); done.add(p); }
  }
  const emitStack = (stack: Stage[]) => {
    if (done.has(stack[0]!)) return;
    units.push({ tag: 'stack', stack });
    for (const s of stack) { done.add(s); enqueue(s.u, s.k, s.l); }
    for (const [p, own] of owner) if (own.stack === stack) { done.add(p); enqueue(p.a, p.b); }
  };
  const emitElement = (e: Element, from?: string) => {
    if (done.has(e)) return;
    if (e.tag === 'stage') return emitStack(stackOf(e));
    const own = owner.get(e);
    if (own) return emitStack(own.stack);
    units.push({ tag: 'part', part: e, left: from });
    done.add(e);
    enqueue(e.a, e.b);
  };
  const inputs = input.ports.filter((p) => p.role === 'input');
  queue.push(...inputs.map((p) => find(p.node)));
  for (const p of parts) if (/^ac(?:\s|$)/i.test(p.device.value ?? '') && (p.device.kind === 'v' || p.device.kind === 'i')) enqueue(p.a, p.b);
  if (!queue.length) {
    const first = stages.find((t) => !stages.some((s) => s !== t && (s.u === t.k || s.l === t.k))) ?? stages[0]!;
    enqueue(first.k, first.u, first.l);
  }
  const seen = new Set<string>();
  // A net's hanging devices come before the flat device that carries the signal on, so the net's
  // wire ends where that device begins.
  const onward = (e: Element) => (e.tag === 'part' && !owner.has(e) && !vertical(e) ? 1 : 0);
  const incident = (net: string) => input.devices.map((d) => byDevice.get(d)!).filter((e) =>
    e.tag === 'stage' ? [e.u, e.k, e.l].includes(net) : touches(e, net)).sort((a, c) => onward(a) - onward(c));
  for (;;) {
    const net = queue.shift();
    if (net === undefined) {
      const rest = input.devices.map((d) => byDevice.get(d)!).find((e) => !done.has(e));
      if (!rest) break;
      emitElement(rest);
      continue;
    }
    if (seen.has(net)) continue;
    seen.add(net);
    for (const port of inputs) if (find(port.node) === net) units.push({ tag: 'port', port });
    for (const e of incident(net)) emitElement(e, net);
  }
  for (const port of input.ports) if (port.role !== 'input') units.push({ tag: 'port', port });

  // Columns and x positions. Labels sit to the right of vertical symbols, so each column reserves them.
  const pairWidth = (d: Device) => Math.max(measureText(d.id, FONT).w, measureText(displayDeviceValue(d) ?? '', FONT).w);
  type Item = { part?: Part; stage?: Stage; top: number; bottom: number };
  type Column = { tag: 'col'; items: Item[]; left: number; right: number; x: number };
  type Slot = Column | { tag: 'h'; part: Part; leftNet: string; width: number; x: number } | { tag: 'port'; port: ParsedCircuit['ports'][number]; width: number; x: number };
  const partItem = (p: Part): Item => ({ part: p, top: Math.min(r(p.a), r(p.b)), bottom: Math.max(r(p.a), r(p.b)) });
  const column = (items: Item[]): Column => {
    const right = Math.max(...items.map((item) => item.stage
      ? 13 + 6 + pairWidth(item.stage.device)
      : deviceSide(item.part!.device) + 6 + pairWidth(item.part!.device)));
    const left = Math.max(...items.map((item) => item.stage ? CONTROL_REACH : deviceSide(item.part!.device)));
    return { tag: 'col', items, left, right, x: 0 };
  };
  const slots: Slot[] = [];
  for (const unit of units) {
    if (unit.tag === 'port') {
      slots.push({ tag: 'port', port: unit.port, width: 10 + measureText(unit.port.node, FONT).w, x: 0 });
    } else if (unit.tag === 'part') {
      const p = unit.part;
      if (vertical(p)) slots.push(column([partItem(p)]));
      else slots.push({ tag: 'h', part: p, leftNet: unit.left ?? p.a, width: Math.max(2 * deviceHalf(p.device, true) + 24, pairWidth(p.device) + 12), x: 0 });
    } else {
      const { stack } = unit;
      const owned = [...owner].filter(([, own]) => own.stack === stack);
      const ctrlColumns: Item[][] = [];
      for (const [p, own] of owned) {
        if (own.role !== 'ctrl') continue;
        const item = partItem(p);
        const fits = ctrlColumns.find((items) => items.every((other) => item.bottom <= other.top || item.top >= other.bottom));
        if (fits) fits.push(item);
        else ctrlColumns.push([item]);
      }
      for (const items of ctrlColumns.reverse()) slots.push(column(items));
      const up = owned.find(([, own]) => own.role === 'up')?.[0];
      const down = owned.find(([, own]) => own.role === 'down')?.[0];
      const main: Item[] = [
        ...(up ? [partItem(up)] : []),
        ...stack.map((s) => ({ stage: s, top: r(s.u), bottom: r(s.l) })),
        ...(down ? [partItem(down)] : []),
      ];
      slots.push(column(main));
      for (const [p, own] of owned) if (own.role === 'side') slots.push(column([partItem(p)]));
    }
  }
  let cursor = MARGIN;
  for (const slot of slots) {
    if (slot.tag === 'col') { slot.x = cursor + slot.left; cursor = slot.x + slot.right + GAP; }
    else { slot.x = cursor; cursor += slot.width; }
  }
  const width = Math.round(cursor - GAP + MARGIN);
  const y = (rowIndex: number) => TOP + rowIndex * PITCH;
  const height = Math.round(y(groundRow) + 30);
  if (width > MAX_W || height > MAX_H) return fail(`transistor circuit needs ${width}x${height}, more than a readable figure`);

  const b = new SceneBuilder('circuit', width, height);
  b.hl(input.highlight);
  const pins = new Map<string, Pin[]>();
  const conductors: Conductor[] = [];
  const glyphs: Array<{ id: string; box: Box }> = [];
  const addPin = (net: string, pin: Pin) => pins.set(net, [...(pins.get(net) ?? []), pin]);
  const lead = (id: string, net: string, owner: string, from: Pin, to: Pin, node: string) => {
    b.line(id, from.x, from.y, to.x, to.y, { role: 'connector', width: 1.4 });
    b.node(`n:${owner}:${node}`, from.x - 2, from.y - 2, 4, 4, 'junction');
    conductors.push({ seg: { x1: from.x, y1: from.y, x2: to.x, y2: to.y }, net, owner });
    addPin(net, from);
  };

  const drawPart = (p: Part, x1: number, y1: number, x2: number, y2: number, leftNet?: string) => {
    const d = p.device;
    const horizontal = y1 === y2;
    const pinA = horizontal ? { x: leftNet === p.b ? x2 : x1, y: y1 } : { x: x1, y: y(r(p.a)) };
    const pinB = horizontal ? { x: leftNet === p.b ? x1 : x2, y: y1 } : { x: x1, y: y(r(p.b)) };
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const span = horizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
    const half = Math.min(deviceHalf(d, horizontal), (span - 8) / 2);
    const direction = horizontal ? (pinB.x > pinA.x ? 'right' : 'left') : (pinB.y > pinA.y ? 'down' : 'up');
    drawGlyph(b, d, cx, cy, horizontal, input.std, half, direction);
    const toward = (pin: Pin) => horizontal
      ? { x: cx + Math.sign(pin.x - cx) * half, y: cy }
      : { x: cx, y: cy + Math.sign(pin.y - cy) * half };
    lead(`${d.id}-n1`, p.a, d.id, pinA, toward(pinA), d.n1);
    lead(`${d.id}-n2`, p.b, d.id, pinB, toward(pinB), d.n2);
    const side = deviceSide(d);
    glyphs.push({ id: d.id, box: horizontal ? { x1: cx - half, y1: cy - side, x2: cx + half, y2: cy + side } : { x1: cx - side, y1: cy - half, x2: cx + side, y2: cy + half } });
  };

  for (const slot of slots) {
    const sx = slot.x;
    if (slot.tag === 'col') {
      for (const item of slot.items) {
        if (item.part) { drawPart(item.part, sx, y(item.top), sx, y(item.bottom)); continue; }
        const s = item.stage!;
        const d = s.device;
        const by = y(r(s.body));
        const body = drawTransistor(b, d.id, s.kind, sx, by);
        const order = terminalOrder(s.kind);
        lead(`${d.id}-${order.upper}`, s.u, d.id, { x: sx, y: y(r(s.u)) }, { x: sx, y: body.upperY }, d[order.upper]!);
        lead(`${d.id}-${order.lower}`, s.l, d.id, { x: sx, y: y(r(s.l)) }, { x: sx, y: body.lowerY }, d[order.lower]!);
        lead(`${d.id}-n2`, s.k, d.id, { x: sx - CONTROL_REACH, y: by }, { x: body.controlX, y: by }, d.n2);
        glyphs.push({ id: d.id, box: { x1: sx - 18, y1: by - 15, x2: sx + 12, y2: by + 15 } });
      }
    } else if (slot.tag === 'h') {
      const yy = y(r(slot.part.a));
      drawPart(slot.part, sx, yy, sx + slot.width, yy, slot.leftNet);
    } else {
      const net = find(slot.port.node);
      const px = slot.port.role === 'input' ? sx + slot.width - 4 : sx + 4;
      const py = y(r(net));
      b.circle(`port:${slot.port.node}:dot`, px, py, 3, { color: 'accent', role: 'connector', fill: 'none' });
      b.node(`port:${slot.port.node}`, px - 3, py - 3, 6, 6, 'port');
      addPin(net, { x: px, y: py });
    }
  }

  // Wires: one segment per row a net occupies, joined by a single vertical trunk when it spans rows.
  const crosses = (seg: Segment, box: Box) => {
    const inner = { x1: box.x1 + 1.5, y1: box.y1 + 1.5, x2: box.x2 - 1.5, y2: box.y2 - 1.5 };
    return Math.max(seg.x1, seg.x2) > inner.x1 && Math.min(seg.x1, seg.x2) < inner.x2 &&
      Math.max(seg.y1, seg.y2) > inner.y1 && Math.min(seg.y1, seg.y2) < inner.y2;
  };
  const wireFor = (net: string): Segment[] | null => {
    const netPins = pins.get(net) ?? [];
    const rowsY = [...new Set(netPins.map((p) => p.y))].sort((a, c) => a - c);
    const build = (tx?: number): Segment[] => {
      const segs: Segment[] = [];
      for (const yy of rowsY) {
        const xs = netPins.filter((p) => p.y === yy).map((p) => p.x).concat(tx === undefined ? [] : [tx]);
        const lo = Math.min(...xs);
        const hi = Math.max(...xs);
        if (hi - lo > 0.5) segs.push({ x1: lo, y1: yy, x2: hi, y2: yy });
      }
      if (tx !== undefined) segs.push({ x1: tx, y1: rowsY[0]!, x2: tx, y2: rowsY.at(-1)! });
      return segs;
    };
    const clean = (segs: Segment[]) => segs.every((seg) =>
      !glyphs.some((g) => crosses(seg, g.box)) && !conductors.some((c) => c.net !== net && joined(seg, c.seg)));
    if (rowsY.length < 2) { const segs = build(); return clean(segs) ? segs : null; }
    const length = (segs: Segment[]) => segs.reduce((sum, s) => sum + Math.abs(s.x2 - s.x1) + Math.abs(s.y2 - s.y1), 0);
    const crossings = (segs: Segment[]) => segs.reduce((sum, s) => sum + conductors.filter((c) => c.net !== net && !joined(s, c.seg) && segmentsCross(s, c.seg)).length, 0);
    const options = [...new Set(netPins.map((p) => p.x))].map((tx) => build(tx)).filter(clean)
      .sort((a, c) => crossings(a) - crossings(c) || length(a) - length(c));
    return options[0] ?? null;
  };
  const netOrder = [...pins.keys()].sort((a, c) => Number(railish(c)) - Number(railish(a)) || (pins.get(c)!.length - pins.get(a)!.length));
  for (const net of netOrder) {
    const segs = wireFor(net);
    if (!segs) return fail(`net ${net} has no wire route clear of the other symbols`);
    segs.forEach((seg, i) => {
      const id = net === gnd ? (i ? `gndrail:${i}` : 'gndrail') : `net:${net}${i ? `:${i}` : ''}`;
      b.line(id, seg.x1, seg.y1, seg.x2, seg.y2, { role: 'connector', width: 1.4 });
      conductors.push({ seg, net });
    });
  }

  // Junction dots where three or more conductors of one net meet.
  const dots = new Set<string>();
  for (const net of pins.keys()) {
    const own = conductors.filter((c) => c.net === net);
    const points = own.flatMap((c) => [{ x: c.seg.x1, y: c.seg.y1 }, { x: c.seg.x2, y: c.seg.y2 }]);
    for (const p of points) {
      const key = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      if (dots.has(key)) continue;
      const arms = own.reduce((sum, c) => {
        const end = (Math.hypot(c.seg.x1 - p.x, c.seg.y1 - p.y) < 0.75 ? 1 : 0) + (Math.hypot(c.seg.x2 - p.x, c.seg.y2 - p.y) < 0.75 ? 1 : 0);
        return sum + (end ? end : onSeg(p.x, p.y, c.seg) ? 2 : 0);
      }, 0);
      if (arms >= 3) {
        dots.add(key);
        b.circle(`dot:${net}:${dots.size}`, p.x, p.y, 2.4, { fill: 'ink', role: 'connector' });
      }
    }
  }

  // Read the drawing back as a netlist: it must match the spec exactly.
  const verdict = verifyConnectivity(conductors);
  if (verdict) return fail(verdict);
  for (const c of conductors) {
    const hit = glyphs.find((g) => g.id !== c.owner && crosses(c.seg, g.box));
    if (hit) return fail(`a wire of ${c.net} would pass through ${hit.id}`);
  }

  // Labels: designator/value beside each symbol, then rails, ground, probes, user labels and ports.
  const segs = strokeSegments(b.scene());
  const taken: Box[] = b.labels.map((label) => {
    const size = measureText(label.text ?? '', FONT);
    return { x1: label.x - size.w / 2, y1: label.y - size.h / 2, x2: label.x + size.w / 2, y2: label.y + size.h / 2 };
  });
  const free = (box: Box) => box.x1 >= 4 && box.y1 >= 4 && box.x2 <= b.width - 4 && box.y2 <= b.height - 4 &&
    !boxHitsAny(box, segs, 2.5) && !taken.some((other) => boxesOverlap(box, other, 2));
  // Each line's box reserves the rise of a superscript and the drop of a subscript, so stacked lines
  // (designator over value) never run into each other on screen.
  const place = (lines: Array<{ id: string; text: string }>, candidates: Array<(size: { w: number; h: number }) => Pin>, opts: { anchorId?: string } = {}): boolean => {
    const extents = lines.map((line) => {
      const { w, h } = measureText(line.text, FONT);
      return { w, h, up: /\^/.test(line.text) ? 0.4 * FONT : 0, down: /_/.test(line.text) ? 0.3 * FONT : 0 };
    });
    const stackH = extents.reduce((sum, e) => sum + e.h + e.up + e.down, 0) + (lines.length - 1) * (LINE - FONT_LINE_BOX);
    const size = { w: Math.max(...extents.map((e) => e.w)), h: stackH };
    for (const candidate of candidates) {
      const c = candidate(size);
      let top = c.y - stackH / 2;
      const placed = extents.map((e) => {
        const box = { x1: c.x - e.w / 2, y1: top, x2: c.x + e.w / 2, y2: top + e.h + e.up + e.down };
        const textY = top + e.up + e.h / 2;
        top = box.y2 + LINE - FONT_LINE_BOX;
        return { box, textY };
      });
      if (!placed.every((p) => free(p.box))) continue;
      lines.forEach((line, i) => b.label(line.id, line.text, c.x, placed[i]!.textY, { protected: true, priority: 'required', anchorId: opts.anchorId, groupId: lines.length > 1 ? `pair:${lines[0]!.id}` : undefined }));
      taken.push(...placed.map((p) => p.box));
      return true;
    }
    return false;
  };
  const around = (box: Box, order: Array<'E' | 'W' | 'N' | 'S'>) => order.map((side) => (size: { w: number; h: number }) => {
    const cx = (box.x1 + box.x2) / 2;
    const cy = (box.y1 + box.y2) / 2;
    if (side === 'E') return { x: box.x2 + 5 + size.w / 2, y: cy };
    if (side === 'W') return { x: box.x1 - 5 - size.w / 2, y: cy };
    if (side === 'N') return { x: cx, y: box.y1 - 4 - size.h / 2 };
    return { x: cx, y: box.y2 + 4 + size.h / 2 };
  });
  for (const d of input.devices) {
    const glyph = glyphs.find((g) => g.id === d.id)!;
    const value = displayDeviceValue(d);
    const lines = [{ id: d.id, text: d.id }, ...(value ? [{ id: `${d.id}-val`, text: value }] : [])];
    const horizontal = glyph.box.x2 - glyph.box.x1 > glyph.box.y2 - glyph.box.y1 && !d.transistor;
    if (!place(lines, around(glyph.box, horizontal ? ['N', 'S', 'E', 'W'] : ['E', 'W', 'N', 'S']), { anchorId: d.id })) {
      return fail(`no clear place for the ${d.id} label`);
    }
  }
  const netAnchors = (net: string) => {
    const wires = conductors.filter((c) => c.net === net && c.owner === undefined);
    const flat = wires.filter((c) => c.seg.y1 === c.seg.y2).sort((a, c) => Math.abs(c.seg.x2 - c.seg.x1) - Math.abs(a.seg.x2 - a.seg.x1));
    const anchors: Array<(size: { w: number; h: number }) => Pin> = [];
    for (const c of flat) {
      for (const t of [0.5, 0.3, 0.7, 0.15, 0.85]) {
        const x = c.seg.x1 + (c.seg.x2 - c.seg.x1) * t;
        anchors.push((size) => ({ x, y: c.seg.y1 - 5 - size.h / 2 }), (size) => ({ x, y: c.seg.y1 + 5 + size.h / 2 }));
      }
    }
    for (const p of pins.get(net) ?? []) {
      anchors.push((size) => ({ x: p.x + 5 + size.w / 2, y: p.y - 5 - size.h / 2 }), (size) => ({ x: p.x - 5 - size.w / 2, y: p.y - 5 - size.h / 2 }),
        (size) => ({ x: p.x + 5 + size.w / 2, y: p.y + 5 + size.h / 2 }), (size) => ({ x: p.x - 5 - size.w / 2, y: p.y + 5 + size.h / 2 }));
    }
    return anchors;
  };
  for (const rail of rails) {
    const node = names.find((n) => find(n) === rail && SUPPLY_NAME.test(n));
    if (node && !place([{ id: `supply:${node}`, text: node }], netAnchors(rail))) return fail(`no clear place for the ${node} rail label`);
  }
  const groundWire = conductors.find((c) => c.net === gnd && c.owner === undefined)?.seg;
  const groundCandidates = groundWire
    ? [0.02, 0.5, 0.98].map((t) => (size: { w: number; h: number }) => ({ x: Math.min(Math.max(groundWire.x1 + (groundWire.x2 - groundWire.x1) * t, groundWire.x1 + size.w / 2), groundWire.x2 - size.w / 2), y: groundWire.y1 + 5 + size.h / 2 }))
    : [];
  if (!place([{ id: 'gndl', text: 'GND' }], [...groundCandidates, ...netAnchors(gnd)])) return fail('no clear place for the GND label');
  for (const probe of input.probes) {
    const net = find(probe.node);
    if (!place([{ id: probe.id, text: probe.name }], netAnchors(net), { anchorId: `n:${probe.node}` })) return fail(`no clear place for probe ${probe.name}`);
  }
  for (const label of input.labels) {
    const device = input.devices.find((d) => d.id.toLowerCase() === label.target.toLowerCase());
    const node = names.find((n) => n.toLowerCase() === label.target.toLowerCase());
    if (!device && !node) return fail(`label target not found: ${label.target}`, 'malformed');
    const glyph = device && glyphs.find((g) => g.id === device.id);
    const candidates = glyph ? around(glyph.box, ['E', 'W', 'N', 'S']).concat(around({ ...glyph.box, y1: glyph.box.y1 - 2 * LINE, y2: glyph.box.y2 + 2 * LINE }, ['N', 'S'])) : netAnchors(find(node!));
    if (!place([{ id: label.id, text: label.text }], candidates)) return fail(`no clear place for label ${label.target}`);
  }
  for (const port of input.ports) {
    const dot = b.strokes.find((s) => s.id === `port:${port.node}:dot`)!;
    const [px, py] = dot.points as [number, number];
    const box = { x1: px - 3, y1: py - 3, x2: px + 3, y2: py + 3 };
    if (!place([{ id: `port:${port.node}:label`, text: port.node }], around(box, port.role === 'input' ? ['W', 'N', 'S'] : ['E', 'N', 'S']))) {
      return fail(`no clear place for port ${port.node}`);
    }
  }
  return layoutAndCompile(b.scene());
}

function segmentsCross(a: Segment, c: Segment): boolean {
  const d = (p: Pin, q: Pin, s: Pin) => (q.x - p.x) * (s.y - p.y) - (q.y - p.y) * (s.x - p.x);
  const a1 = { x: a.x1, y: a.y1 }, a2 = { x: a.x2, y: a.y2 }, c1 = { x: c.x1, y: c.y1 }, c2 = { x: c.x2, y: c.y2 };
  return d(a1, a2, c1) * d(a1, a2, c2) < 0 && d(c1, c2, a1) * d(c1, c2, a2) < 0;
}

/**
 * Conductors connect only where one ends on another (a crossing is not a joint). Every net must form
 * one connected piece and no piece may hold two nets; returns why not, or null.
 */
function verifyConnectivity(conductors: ReadonlyArray<{ seg: Segment; net: string }>): string | null {
  const parent = conductors.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  conductors.forEach((a, i) => conductors.forEach((c, j) => {
    if (j > i && joined(a.seg, c.seg)) parent[find(i)] = find(j);
  }));
  const netsOf = new Map<number, Set<string>>();
  const pieces = new Map<string, Set<number>>();
  conductors.forEach((c, i) => {
    const root = find(i);
    netsOf.set(root, (netsOf.get(root) ?? new Set()).add(c.net));
    pieces.set(c.net, (pieces.get(c.net) ?? new Set()).add(root));
  });
  for (const set of netsOf.values()) if (set.size > 1) return `the drawing would join nets ${[...set].join(' and ')}`;
  for (const [net, roots] of pieces) if (roots.size > 1) return `the drawing would split net ${net}`;
  return null;
}
