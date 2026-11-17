/**
 * Logic circuit derived from Boolean expressions.
 *
 *   expr:   F = (A AND B) OR NOT C     repeatable; one output each (grammar in boolexpr.ts)
 *   std:    ansi | iec                 distinctive shapes (default) or rectangles with & ≥1 =1 1
 *   inputs: A, B, C                    optional top-to-bottom order of the input terminals
 *
 * The gate network is exactly the expression: one gate per operator, a multi-input gate for an unparenthesised
 * chain, a bubble for a complemented AND/OR/XOR, and one shared gate for sub-expressions that are textually
 * identical. Nothing is simplified.
 *
 * Layout. Gates stand in columns by depth from the inputs. Vertically each expression is a tree drawn sideways:
 * every operand owns a band of rows that nothing else enters, and a gate sits centred on its operands. Wires
 * run horizontally inside their own band and turn only in the channels between columns, so a wire can cross
 * another wire but never a gate. Each channel orders its vertical runs to minimise those crossings.
 */
import type { CompileCtx, CompileResult, SemanticColor } from '../../types';
import { specGet, specList, type SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { layoutAndCompile } from '../../pipeline';
import { BoolSyntaxError, formatExpr, parseBoolSystem, type BoolNode, type BoolSystem, type GateOp } from './boolexpr';
import { LINE_PITCH, fail, textWidth } from './common';

export const LOGIC_MAX_GATES = 32;
export const LOGIC_MAX_FAN_IN = 8;
export const LOGIC_MAX_INPUTS = 10;

export type GateKind = GateOp | 'not';

export interface Gate {
  id: number;
  op: GateKind;
  inputs: Net[];
  /** Longest path from an input: the gate's column. */
  level: number;
}

export type Net = { type: 'input'; id: string; name: string } | { type: 'gate'; id: string; gate: Gate };

export interface Netlist {
  gates: Gate[];
  /** Input names in order of first appearance; the constants 0 and 1 are inputs named by their digit. */
  inputs: string[];
  outputs: Array<{ name: string | null; net: Net; text: string }>;
}

const COMPLEMENT = { and: 'nand', or: 'nor', xor: 'xnor' } as const;
const levelOf = (net: Net) => (net.type === 'gate' ? net.gate.level : 0);

export function buildNetlist(system: BoolSystem): Netlist {
  const nets = new Map<string, Net>();
  const gates: Gate[] = [];
  const inputs: string[] = [];
  const netOf = (node: BoolNode): Net => {
    if (node.kind === 'var' || node.kind === 'const') {
      const name = node.kind === 'var' ? node.name : String(node.value);
      const id = `in:${name}`;
      if (!nets.has(id)) {
        nets.set(id, { type: 'input', id, name });
        inputs.push(name);
      }
      return nets.get(id)!;
    }
    // A complement drawn straight onto an AND, OR or XOR is that gate's output bubble.
    const bubbled = node.kind === 'not' && (node.arg.kind === 'and' || node.arg.kind === 'or' || node.arg.kind === 'xor') ? node.arg : null;
    const op: GateKind = bubbled ? COMPLEMENT[bubbled.kind as 'and' | 'or' | 'xor'] : node.kind;
    const operands = bubbled ? (bubbled as { args: BoolNode[] }).args : node.kind === 'not' ? [node.arg] : node.args;
    const ins = operands.map(netOf);
    const id = `${op}(${ins.map((net) => net.id).join(',')})`;
    if (!nets.has(id)) {
      const gate: Gate = { id: gates.length, op, inputs: ins, level: 1 + Math.max(...ins.map(levelOf)) };
      gates.push(gate);
      nets.set(id, { type: 'gate', id, gate });
    }
    return nets.get(id)!;
  };
  const outputs = system.outputs.map((output) => ({ name: output.name, net: netOf(output.expr), text: formatExpr(output.expr) }));
  return { gates, inputs, outputs };
}

/** A node of the sideways tree that fixes the vertical layout: a gate where it is drawn, a reference to a net, or an output. */
interface TreeNode {
  kind: 'gate' | 'leaf' | 'out';
  net: Net;
  gate?: Gate;
  children: TreeNode[];
  column: number;
  /** Offset from the parent's centre, then the absolute centre once placed. */
  dy: number;
  y: number;
  top: number;
  bottom: number;
  pins: number[];
}

interface Sink {
  net: Net;
  column: number;
  node: TreeNode;
  pin: number;
  pinY: number;
  /** The row the wire travels on before it reaches the sink's channel. */
  laneY: number;
}

interface Run {
  net: string;
  channel: number;
  lo: number;
  hi: number;
  /** Rows where a horizontal wire arrives from the left / leaves to the right. */
  left: number[];
  right: number[];
  track: number;
}

const EPS = 0.01;
const same = (a: number, b: number) => Math.abs(a - b) < EPS;

function crossings(a: Run, b: Run): number {
  let cost = 0;
  for (const y of a.right) {
    if (b.left.some((other) => same(other, y))) cost += 100;
    else if (same(y, b.lo) || same(y, b.hi)) cost += 3;
    else if (y > b.lo && y < b.hi) cost += 1;
  }
  for (const y of b.left) {
    if (same(y, a.lo) || same(y, a.hi)) cost += 3;
    else if (y > a.lo && y < a.hi) cost += 1;
  }
  return cost;
}

const overlaps = (a: Run, b: Run) => a.lo < b.hi + 3 && b.lo < a.hi + 3;

/** Left-to-right order of a channel's vertical runs with the fewest wire crossings; runs that never meet share a track. */
function assignTracks(runs: Run[]): number {
  if (!runs.length) return 0;
  const cost = (order: Run[]) => {
    let total = 0;
    for (let i = 0; i < order.length; i++) {
      for (let j = i + 1; j < order.length; j++) {
        if (order[i]!.net !== order[j]!.net && overlaps(order[i]!, order[j]!)) total += crossings(order[i]!, order[j]!);
      }
    }
    return total;
  };
  let best = [...runs].sort((a, b) => a.lo - b.lo || a.hi - b.hi);
  if (runs.length <= 7) {
    let bestCost = cost(best);
    const permute = (rest: Run[], done: Run[]) => {
      if (!bestCost) return;
      if (!rest.length) {
        const c = cost(done);
        if (c < bestCost) { bestCost = c; best = done; }
        return;
      }
      rest.forEach((run, i) => permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...done, run]));
    };
    permute(best, []);
  }
  best.forEach((run, i) => {
    run.track = Math.max(-1, ...best.slice(0, i).filter((earlier) => overlaps(earlier, run)).map((earlier) => earlier.track)) + 1;
  });
  return Math.max(...runs.map((run) => run.track)) + 1;
}

interface Plan {
  width: number;
  height: number;
  draw: (b: SceneBuilder, dx: number, dy: number) => void;
}

function plan(netlist: Netlist, order: string[], iec: boolean, u: number, highlight: Set<string>): Plan {
  const pitch = Math.max(16 * u, LINE_PITCH + 1);
  const pad = 4 * u;
  const bubble = 3 * u;
  const gateW = (iec ? 26 : 30) * u;
  const xorBack = iec ? 0 : 5 * u;
  const notW = (iec ? 20 : 15) * u;
  const notHalf = (iec ? 10 : 6) * u;
  const edge = 7 * u;
  const trackGap = 6 * u;
  const margin = 8;
  const half = (n: number) => ((n - 1) * pitch + 14 * u) / 2;
  const negated = (op: GateKind) => op === 'not' || op === 'nand' || op === 'nor' || op === 'xnor';
  const isXor = (op: GateKind) => op === 'xor' || op === 'xnor';
  const widthOf = (gate: Gate) => (gate.op === 'not' ? notW : gateW + (isXor(gate.op) ? xorBack : 0)) + (negated(gate.op) ? 2 * bubble : 0);

  // 1. The sideways trees: a gate is drawn where it is first used; later uses refer to its output.
  const depth = Math.max(0, ...netlist.gates.map((gate) => gate.level));
  const drawn = new Set<number>();
  const node = (kind: TreeNode['kind'], net: Net, children: TreeNode[], column: number): TreeNode => ({ kind, net, gate: kind === 'gate' && net.type === 'gate' ? net.gate : undefined, children, column, dy: 0, y: 0, top: 0, bottom: 0, pins: [] });
  const host = (net: Net): TreeNode => {
    if (net.type !== 'gate' || drawn.has(net.gate.id)) return node('leaf', net, [], 0);
    drawn.add(net.gate.id);
    return node('gate', net, net.gate.inputs.map(host), net.gate.level);
  };
  const roots = netlist.outputs.map((output) => node('out', output.net, [host(output.net)], depth + 1));

  const thin = (item: TreeNode) => item.bottom - item.top <= pitch + EPS;
  const measure = (item: TreeNode): void => {
    item.children.forEach(measure);
    if (item.kind === 'leaf') {
      item.top = -pitch / 2;
      item.bottom = pitch / 2;
    } else if (item.children.length === 1) {
      const child = item.children[0]!;
      const body = item.kind === 'out' ? 0 : notHalf + (iec ? 2 * u : 0);
      item.top = Math.min(child.top, -body);
      item.bottom = Math.max(child.bottom, body);
      item.pins = [0];
    } else {
      const n = item.children.length;
      let cursor = 0;
      const ys = item.children.map((child, i) => {
        if (i > 0 && !(thin(child) && thin(item.children[i - 1]!))) cursor += pad;
        const y = cursor - child.top;
        cursor = y + child.bottom;
        return y;
      });
      const pinAt = (i: number) => (i - (n - 1) / 2) * pitch;
      // Centred on its operands, unless that leaves a wire with a step too short to read as one: then the gate
      // moves to the nearest position that makes the most operands arrive straight.
      const middle = (ys[0]! + ys[n - 1]!) / 2;
      const steps = ys.map((y, i) => Math.abs(y - middle - pinAt(i)));
      let centre = middle;
      if (steps.some((step) => step > EPS && step < 9 * u)) {
        const straight = (candidate: number) => ys.filter((y, i) => same(y, candidate + pinAt(i))).length;
        centre = ys.map((y, i) => y - pinAt(i)).sort((p, q) => straight(q) - straight(p) || Math.abs(p - middle) - Math.abs(q - middle))[0]!;
      }
      item.children.forEach((child, i) => { child.dy = ys[i]! - centre; });
      item.top = Math.min(0, centre - half(n) - pad) - centre;
      item.bottom = Math.max(cursor, centre + half(n) + pad) - centre;
      item.pins = item.children.map((_, i) => pinAt(i));
    }
  };
  const place = (item: TreeNode, y: number): void => {
    item.y = y;
    item.children.forEach((child) => place(child, y + child.dy));
  };
  let cursor = 0;
  roots.forEach((root) => {
    measure(root);
    place(root, cursor - root.top);
    cursor += root.bottom - root.top + 8 * u;
  });
  const contentH = cursor - 8 * u;

  // 2. Every connection, with the row it travels on.
  const hosts = new Map<string, TreeNode>();
  const sinks = new Map<string, Sink[]>();
  const walk = (item: TreeNode): void => {
    if (item.kind === 'gate') hosts.set(item.net.id, item);
    item.children.forEach((child, pin) => {
      const list = sinks.get(child.net.id) ?? [];
      list.push({ net: child.net, column: item.column, node: item, pin, pinY: item.y + item.pins[pin]!, laneY: child.y });
      sinks.set(child.net.id, list);
      walk(child);
    });
  };
  roots.forEach(walk);
  const sourceColumn = (net: Net) => levelOf(net);
  const tapY = (sink: Sink) => (sink.column - 1 === sourceColumn(sink.net) ? sink.pinY : sink.laneY);

  // 3. Input terminals top to bottom in `order`. Each sits on the row of one of its own connections when the
  //    order allows, which makes that wire straight; an order that fights the expression gets rows of its own.
  const used = order.filter((name) => sinks.has(`in:${name}`));
  const terminalY = new Map<string, number>();
  let previous = -Infinity;
  for (const name of used) {
    const rows = sinks.get(`in:${name}`)!.map(tapY).sort((a, b) => a - b);
    const row = rows.find((y) => y >= previous + pitch - EPS);
    if (row === undefined) { terminalY.clear(); break; }
    terminalY.set(name, row);
    previous = row;
  }
  if (!terminalY.size) {
    const taken = [...sinks.values()].flat().filter((sink) => sink.net.type === 'input').map(tapY);
    used.forEach((name, i) => {
      let y = ((i + 0.5) * Math.max(contentH, used.length * pitch)) / used.length;
      while (taken.some((row) => Math.abs(row - y) < 4)) y += 4.5;
      terminalY.set(name, y);
    });
  }
  const sourceY = (net: Net) => (net.type === 'input' ? terminalY.get(net.name)! : hosts.get(net.id)!.y);

  // 4. Vertical runs: one trunk per net in the channel after its source, one jog per far connection before its sink.
  const runs: Run[] = [];
  const trunks = new Map<string, Run>();
  const jogs = new Map<Sink, Run>();
  for (const [id, list] of sinks) {
    const net = list[0]!.net;
    const ys = [sourceY(net), ...list.map(tapY)];
    if (Math.max(...ys) - Math.min(...ys) > EPS) {
      const trunk: Run = { net: id, channel: sourceColumn(net), lo: Math.min(...ys), hi: Math.max(...ys), left: [sourceY(net)], right: list.map(tapY), track: 0 };
      trunks.set(id, trunk);
      runs.push(trunk);
    }
    for (const sink of list) {
      if (sink.column - 1 === sourceColumn(net) || same(sink.laneY, sink.pinY)) continue;
      const jog: Run = { net: id, channel: sink.column - 1, lo: Math.min(sink.laneY, sink.pinY), hi: Math.max(sink.laneY, sink.pinY), left: [sink.laneY], right: [sink.pinY], track: 0 };
      jogs.set(sink, jog);
      runs.push(jog);
    }
  }
  const tracks = Array.from({ length: depth + 1 }, (_, channel) => assignTracks(runs.filter((run) => run.channel === channel)));

  // 5. Horizontal positions.
  const outLabels = netlist.outputs.map((output) => output.name ?? (textWidth(output.text) <= 70 ? output.text : ''));
  const inLabelW = Math.max(0, ...used.map(textWidth));
  const outLabelW = Math.max(0, ...outLabels.map(textWidth));
  const columnW = Array.from({ length: depth + 1 }, (_, column) => Math.max(0, ...netlist.gates.filter((gate) => gate.level === column).map(widthOf)));
  const channelX: number[] = [];
  const columnX: number[] = [0];
  // Labels are centre-anchored on an estimated width, so a name set wider than estimated still clears its wire.
  const labelGap = 7;
  let x = margin + inLabelW + labelGap;
  for (let channel = 0; channel <= depth; channel++) {
    channelX[channel] = x;
    x += tracks[channel] ? 2 * edge + (tracks[channel]! - 1) * trackGap : 12 * u;
    columnX[channel + 1] = x;
    x += columnW[channel + 1] ?? 0;
  }
  const outX = columnX[depth + 1]!;
  const width = outX + (outLabelW ? labelGap + outLabelW : 0) + margin;
  const trackX = (run: Run) => channelX[run.channel]! + edge + run.track * trackGap;
  const gateX = (gate: Gate) => columnX[gate.level]!;
  const sourceX = (net: Net) => (net.type === 'input' ? channelX[0]! : gateX(net.gate) + widthOf(net.gate));
  /** How far the concave back of an OR or XOR has curved in at height `offset` from the centre. */
  const backBulge = (h: number, offset: number) => {
    const t = (offset + h) / (2 * h);
    return 4 * Math.min(h / 3, 7 * u) * t * (1 - t);
  };
  const pinX = (sink: Sink) => {
    if (sink.node.kind === 'out') return outX;
    const gate = sink.node.gate!;
    const curved = !iec && (gate.op === 'or' || gate.op === 'nor' || isXor(gate.op));
    return gateX(gate) + (curved ? backBulge(half(gate.inputs.length), sink.node.pins[sink.pin]!) : 0);
  };

  const draw = (b: SceneBuilder, dx: number, dy: number): void => {
    const X = (value: number) => Number((value + dx).toFixed(2));
    const Y = (value: number) => Number((value + dy).toFixed(2));
    const tone = (net: Net): SemanticColor => {
      const names = net.type === 'input' ? [net.name] : netlist.outputs.filter((output) => output.net === net).flatMap((output) => (output.name ? [output.name] : []));
      return names.some((name) => highlight.has(name.toLowerCase())) ? 'accent' : 'neutral';
    };

    for (const [id, list] of sinks) {
      const net = list[0]!.net;
      const color = tone(net);
      const wire = { color, role: 'connector' as const, width: color === 'accent' ? 1.8 : 1.3 };
      const tag = `wire-${net.type === 'input' ? net.name : `g${net.gate.id}`}`;
      const trunk = trunks.get(id);
      const sx = sourceX(net);
      const sy = sourceY(net);
      if (trunk) {
        const tx = trackX(trunk);
        b.line(`${tag}-source`, X(sx), Y(sy), X(tx), Y(sy), wire);
        b.line(`${tag}-trunk`, X(tx), Y(trunk.lo), X(tx), Y(trunk.hi), wire);
        // A dot wherever three or more wire ends meet on the trunk; a bare corner needs none.
        [...new Set([sy, ...trunk.right].map((y) => Number(y.toFixed(2))))].forEach((y, i) => {
          const arms = (same(y, sy) ? 1 : 0) + (trunk.right.some((tap) => same(tap, y)) ? 1 : 0) + (y > trunk.lo + EPS ? 1 : 0) + (y < trunk.hi - EPS ? 1 : 0);
          if (arms >= 3) b.circle(`${tag}-dot-${i}`, X(tx), Y(y), 2.2, { color, fill: 'ink', width: 1, role: 'connector' });
        });
      }
      list.forEach((sink, i) => {
        const from = trunk ? trackX(trunk) : sx;
        const y = tapY(sink);
        const jog = jogs.get(sink);
        const points = jog
          ? [X(from), Y(y), X(trackX(jog)), Y(y), X(trackX(jog)), Y(sink.pinY), X(pinX(sink)), Y(sink.pinY)]
          : [X(from), Y(y), X(pinX(sink)), Y(sink.pinY)];
        b.polyline(`${tag}-${i}`, points, wire);
      });
    }

    for (const item of hosts.values()) {
      const gate = item.gate!;
      const gx = gateX(gate);
      const y = item.y;
      const id = `gate-${gate.id}`;
      const body = { role: 'geometry' as const, fill: 'none' as const, width: 1.6 };
      const n = gate.inputs.length;
      const h = gate.op === 'not' ? notHalf : half(n);
      const bodyW = gate.op === 'not' ? notW : gateW;
      const bodyX = gx + (gate.op !== 'not' && isXor(gate.op) ? xorBack : 0);
      if (iec) {
        b.rect(id, X(bodyX), Y(y - h), bodyW, 2 * h, body);
        const symbol = gate.op === 'not' ? '1' : gate.op === 'and' || gate.op === 'nand' ? '&' : isXor(gate.op) ? '=1' : '≥1';
        b.label(`${id}-symbol`, symbol, X(bodyX + bodyW / 2), Y(y), { protected: true });
      } else if (gate.op === 'not') {
        b.polygon(id, [X(gx), Y(y - h), X(gx), Y(y + h), X(gx + bodyW), Y(y)], body);
      } else if (gate.op === 'and' || gate.op === 'nand') {
        const r = Math.min(h, 18 * u);
        b.path(id, `M ${X(bodyX)} ${Y(y - h)} H ${X(bodyX + bodyW - r)} A ${r} ${h} 0 0 1 ${X(bodyX + bodyW - r)} ${Y(y + h)} H ${X(bodyX)} Z`, body);
      } else {
        const bulge = 2 * Math.min(h / 3, 7 * u);
        const tip = bodyX + bodyW;
        b.path(id, `M ${X(bodyX)} ${Y(y - h)} C ${X(bodyX + 0.5 * bodyW)} ${Y(y - h)} ${X(bodyX + 0.82 * bodyW)} ${Y(y - 0.58 * h)} ${X(tip)} ${Y(y)} `
          + `C ${X(bodyX + 0.82 * bodyW)} ${Y(y + 0.58 * h)} ${X(bodyX + 0.5 * bodyW)} ${Y(y + h)} ${X(bodyX)} ${Y(y + h)} Q ${X(bodyX + bulge)} ${Y(y)} ${X(bodyX)} ${Y(y - h)} Z`, body);
        if (isXor(gate.op)) b.path(`${id}-back`, `M ${X(gx)} ${Y(y - h)} Q ${X(gx + bulge)} ${Y(y)} ${X(gx)} ${Y(y + h)}`, { role: 'geometry', width: 1.6 });
      }
      if (negated(gate.op)) b.circle(`${id}-bubble`, X(bodyX + bodyW + bubble), Y(y), bubble, { role: 'geometry', fill: 'none', width: 1.4 });
    }

    used.forEach((name) => b.label(`in-${name}`, name, X(channelX[0]! - labelGap - textWidth(name) / 2), Y(terminalY.get(name)!), { protected: true }));
    roots.forEach((root, i) => {
      if (outLabels[i]) b.label(`out-${i}`, outLabels[i]!, X(outX + labelGap + textWidth(outLabels[i]!) / 2), Y(root.y), { protected: true });
    });
  };
  return { width, height: contentH, draw };
}

function standard(raw: string | undefined): boolean | null {
  const value = (raw ?? 'ansi').trim().toLowerCase();
  if (/^(ansi|ieee|us|american|distinctive)\b/.test(value)) return false;
  if (/^(iec|din|european|rect|rectangular|box)\b/.test(value)) return true;
  return null;
}

export function compileLogic(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const sources = specList(spec, 'expr');
  const inputs = specGet(spec, 'inputs');
  const std = specGet(spec, 'std');
  if (!sources.length) return fail('logic needs an expr line');
  const iec = standard(std);
  if (iec === null) return fail(`logic std: ${std} is not ansi or iec`);

  let system: BoolSystem;
  try {
    system = parseBoolSystem(sources, inputs);
  } catch (error) {
    if (error instanceof BoolSyntaxError) return fail(`logic: ${error.message}`);
    throw error;
  }
  const netlist = buildNetlist(system);
  if (netlist.inputs.length > LOGIC_MAX_INPUTS) return fail(`logic draws at most ${LOGIC_MAX_INPUTS} inputs legibly; this circuit has ${netlist.inputs.length}`, 'refused');
  if (netlist.gates.length > LOGIC_MAX_GATES) return fail(`logic draws at most ${LOGIC_MAX_GATES} gates legibly; this circuit has ${netlist.gates.length}`, 'refused');
  const widest = Math.max(0, ...netlist.gates.map((gate) => gate.inputs.length));
  if (widest > LOGIC_MAX_FAN_IN) return fail(`logic draws gates of at most ${LOGIC_MAX_FAN_IN} inputs; one has ${widest}`, 'refused');

  // Terminals follow the declared order; inputs the declaration left out keep their order of appearance.
  const declared = system.declared ?? [];
  const order = [...declared.filter((name) => netlist.inputs.includes(name)), ...netlist.inputs.filter((name) => !declared.includes(name))];
  const highlight = new Set(spec.highlight.map((name) => name.toLowerCase()));
  const nominal = frameSize(ctx.profile);
  // Gates are drawn as large as the nominal frame allows; only a circuit too big for it keeps the base size and grows the canvas.
  let chosen = plan(netlist, order, iec, 1, highlight);
  for (const u of [1.6, 1.5, 1.4, 1.3, 1.2, 1.1]) {
    const candidate = plan(netlist, order, iec, u, highlight);
    if (candidate.width <= nominal.w && candidate.height + 16 <= nominal.h) { chosen = candidate; break; }
  }
  const depth = Math.max(0, ...netlist.gates.map((gate) => gate.level));
  if (chosen.width > nominal.w * 1.5 || chosen.height + 16 > nominal.h * 3) {
    return fail(`logic circuit is too large to draw legibly (${netlist.gates.length} gates, ${depth} levels deep)`, 'refused');
  }
  const b = new SceneBuilder('logic', Math.max(nominal.w, chosen.width), Math.max(chosen.height + 16, Math.min(nominal.h, 96)));
  chosen.draw(b, (b.width - chosen.width) / 2, (b.height - chosen.height) / 2);
  return layoutAndCompile(b.scene());
}
