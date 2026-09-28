import type { CompileResult } from '../types';
import type { Device } from './circuit';
import { portName, probeNeedsLabel, type StageInput, verifyConnectivity } from './circuit-stage';
import { SceneBuilder } from '../scene-build';
import { layoutAndCompile } from '../pipeline';
import { strokeSegments } from '../slk';
import { boxHitsAny, boxesOverlap, distPointSeg, measureText, type Box, type Segment } from '../geom';
import { deviceHalf, deviceSide, displayDeviceValue, drawGlyph } from './circuit-glyphs';

/**
 * One op-amp with feedback, drawn the textbook way: the inverting input (−) on top with the feedback
 * element(s) bridged over the amplifier to the output; inverting-input elements to the left, each fed by a
 * source to ground or an input terminal; a ground return from the − node; the + input grounded, or fed from
 * below by a source or an element (and a ground return beside it: difference amplifier); loads from the
 * output to ground. Inverting, summing, integrator, differentiator, non-inverting, follower and difference
 * amplifiers fit. Any other topology returns null and the caller refuses it. The finished drawing is read
 * back as a netlist and must equal the spec, with no wire through a symbol.
 */

type Pin = { x: number; y: number };
type Conductor = { seg: Segment; net: string; owner?: string };
type Part = { d: Device; a: string; b: string };

const FONT = 12;
const LINE = 16;
const MAX_W = 640;
const MAX_H = 360;

export function compileOpampStage(input: StageInput): CompileResult | null {
  const amps = input.devices.filter((d) => d.kind === 'a' && d.n3);
  if (amps.length !== 1 || input.devices.some((d) => d.transistor || (d.kind === 'a' && d !== amps[0]))) return null;
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
    if (ra !== rb) parent.set(input.isGround(rb) ? ra : rb, input.isGround(rb) ? rb : ra);
  };
  const names = [...new Set(input.devices.flatMap((d) => [d.n1, d.n2, ...(d.n3 ? [d.n3] : [])]).concat(input.ports.map((p) => p.node)))];
  const grounds = names.filter(input.isGround);
  for (const g of grounds.slice(1)) join(grounds[0]!, g);
  for (const wire of input.wires) join(wire.a, wire.b);
  if (!grounds.length) return null;
  const gnd = find(grounds[0]!);

  const amp = amps[0]!;
  const P = find(amp.n1);
  const N = find(amp.n2);
  const O = find(amp.n3!);
  if (N === gnd || O === gnd || P === O || P === N) return null;
  const follower = N === O;
  const parts: Part[] = input.devices.filter((d) => d !== amp).map((d) => ({ d, a: find(d.n1), b: find(d.n2) }));
  if (parts.some((p) => p.a === p.b || p.d.n3)) return null;
  const between = (p: Part, x: string, y: string) => (p.a === x && p.b === y) || (p.a === y && p.b === x);
  const touches = (p: Part, net: string) => p.a === net || p.b === net;
  const other = (p: Part, net: string) => (p.a === net ? p.b : p.a);

  const fb = follower ? [] : parts.filter((p) => between(p, N, O));
  if (!fb.length && !follower) return null;
  const gn = parts.filter((p) => between(p, N, gnd));
  const load = parts.filter((p) => between(p, O, gnd));
  const inn = parts.filter((p) => touches(p, N) && !fb.includes(p) && !gn.includes(p));
  const pGrounded = P === gnd;
  const pSide = pGrounded ? [] : parts.filter((p) => touches(p, P) && !touches(p, N));
  const gp = pSide.filter((p) => other(p, P) === gnd);
  const inp = pSide.filter((p) => other(p, P) !== gnd);
  if (fb.length > 2 || inn.length > 3 || gn.length > 1 || load.length > 1 || gp.length > 1 || inp.length > 1) return null;
  if (gn.length && inn.length > 1) return null;
  // Outer nodes: the far end of each input element; at most one source from it to ground, nothing else.
  const outer = [...inn.map((p) => other(p, N)), ...inp.map((p) => other(p, P))];
  if (new Set(outer).size !== outer.length || outer.some((x) => x === O || x === gnd || x === P || x === N)) return null;
  const sourceAt = new Map<string, Part>();
  for (const x of outer) {
    const at = parts.filter((p) => touches(p, x) && !inn.includes(p) && !inp.includes(p));
    if (at.length > 1 || at.some((p) => other(p, x) !== gnd)) return null;
    if (at[0]) sourceAt.set(x, at[0]);
  }
  const used = new Set([...fb, ...gn, ...load, ...inn, ...gp, ...inp, ...sourceAt.values()]);
  if (parts.some((p) => !used.has(p))) return null;
  for (const port of input.ports) if (![...outer, N, O, P, gnd].includes(find(port.node))) return null;

  // Columns, left to right: outer nodes (row 0 leftmost, so its source drops past the lower rows), the −
  // node, the + column (and its ground return), the amplifier, the output node, the load, the output end.
  // Each vertical symbol reserves a label column beside it; each horizontal one a span its label fits over.
  const M = 18;
  const labelW = (p: Part) => Math.max(measureText(p.d.id, FONT).w, measureText(displayDeviceValue(p.d) ?? '', FONT).w);
  const room = (p: Part | undefined, node: string) => (p ? deviceSide(p.d) + 8 + labelW(p) + 8 : measureText(node, FONT).w + 16);
  const k = inn.length;
  const xs: number[] = [];
  inn.forEach((p, i) => {
    const x = other(p, N);
    const source = sourceAt.get(x);
    const previous = i ? inn[i - 1]! : undefined;
    const prevSide = previous && sourceAt.get(other(previous, N)) ? deviceSide(sourceAt.get(other(previous, N))!.d) : 4;
    xs.push((i ? xs[i - 1]! + prevSide : M) + room(source, x) + (source ? deviceSide(source.d) : 0));
  });
  const xX = (i: number) => xs[i]!;
  const span = Math.max(90, ...inn.map((p) => labelW(p) + 44));
  const xN = k ? xX(k - 1) + span : M + 46;
  const diff = inp.length > 0 && gp.length > 0;
  const xP = xN + (gn[0] ? room(gn[0], '') + 8 : 40);
  const inputSource = inp[0] ? sourceAt.get(other(inp[0], P)) : undefined;
  const pColumn = inp[0] ? Math.max(room(inp[0], ''), room(inputSource, other(inp[0], P))) : gp[0] ? room(gp[0], '') : 0;
  const xPg = diff ? xP + pColumn + 8 : xP;
  const xIn = xPg + Math.max(30, (diff ? room(gp[0], '') : pColumn) + 6);
  const tx = xIn + 27;
  const xApex = tx + 18;
  const xO = xApex + 20;
  const xL = load.length ? xO + 36 : xO;
  const xEnd = load[0] ? xL + room(load[0], '') + 6 : xO + 34;
  const tracks = follower ? 1 : fb.length;
  const yF = (j: number) => 56 + j * 52;
  const yN = yF(tracks - 1) + 50;
  const ty = yN + 8;
  const yP = yN + 16;
  const yRow = (i: number) => yN + i * 62;
  const yXp = yP + 52;
  let yG = Math.max(ty + 48, yN + 60);
  if (k) yG = Math.max(yG, yRow(k - 1) + 52);
  if (inp.length) yG = Math.max(yG, yXp + (sourceAt.has(other(inp[0]!, P)) ? 52 : 24));
  if (gp.length) yG = Math.max(yG, yP + 52);
  const width = Math.round(xEnd + 70);
  const height = Math.round(yG + 30);
  if (width > MAX_W || height > MAX_H) return null;

  const b = new SceneBuilder('circuit', width, height);
  b.hl(input.highlight);
  const conductors: Conductor[] = [];
  const glyphs: Array<{ id: string; box: Box; horizontal?: boolean }> = [];
  const pins = new Map<string, Pin[]>();
  const addPin = (net: string, pin: Pin) => pins.set(net, [...(pins.get(net) ?? []), pin]);
  let wires = 0;
  const wire = (net: string, x1: number, y1: number, x2: number, y2: number, owner?: string) => {
    if (Math.hypot(x2 - x1, y2 - y1) < 0.5) return;
    b.line(owner ? `${owner}-lead-${conductors.length}` : `net:${net}:${wires++}`, x1, y1, x2, y2, { role: 'connector', width: 1.4 });
    conductors.push({ seg: { x1, y1, x2, y2 }, net, owner });
  };
  /** A two-terminal part between its n1 pin and its n2 pin, leads owned by the part. */
  const drawPart = (p: Part, pinA: Pin, pinB: Pin) => {
    const d = p.d;
    const horizontal = Math.abs(pinA.y - pinB.y) < 0.5;
    const cx = (pinA.x + pinB.x) / 2;
    const cy = (pinA.y + pinB.y) / 2;
    const span = horizontal ? Math.abs(pinB.x - pinA.x) : Math.abs(pinB.y - pinA.y);
    const half = Math.min(deviceHalf(d, horizontal), (span - 8) / 2);
    const direction = horizontal ? (pinB.x > pinA.x ? 'right' : 'left') : (pinB.y > pinA.y ? 'down' : 'up');
    drawGlyph(b, d, cx, cy, horizontal, input.std, half, direction);
    const end = (pin: Pin) => horizontal ? { x: cx + Math.sign(pin.x - cx) * half, y: cy } : { x: cx, y: cy + Math.sign(pin.y - cy) * half };
    wire(p.a, pinA.x, pinA.y, end(pinA).x, end(pinA).y, d.id);
    wire(p.b, pinB.x, pinB.y, end(pinB).x, end(pinB).y, d.id);
    addPin(p.a, pinA);
    addPin(p.b, pinB);
    const side = deviceSide(d);
    glyphs.push({ id: d.id, horizontal, box: horizontal ? { x1: cx - half, y1: cy - side, x2: cx + half, y2: cy + side } : { x1: cx - side, y1: cy - half, x2: cx + side, y2: cy + half } });
  };
  const orient = (p: Part, net: string, at: Pin, far: Pin) => (p.a === net ? drawPart(p, at, far) : drawPart(p, far, at));
  const openPorts: Array<{ node: string; pin: Pin; west: boolean }> = [];

  // The amplifier: − on top, + below, output at the apex.
  b.polygon(amp.id, [tx - 17, ty - 16, tx - 17, ty + 16, tx + 18, ty], { fill: 'none', role: 'geometry', width: 1.8 });
  b.label(`${amp.id}-minus`, '−', tx - 11, yN, { protected: true, priority: 'optional' });
  b.label(`${amp.id}-plus`, '+', tx - 11, yP, { protected: true, priority: 'optional' });
  glyphs.push({ id: amp.id, box: { x1: tx - 17, y1: ty - 16, x2: tx + 18, y2: ty + 16 } });
  wire(N, xIn, yN, tx - 17, yN, amp.id);
  wire(P, xIn, yP, tx - 17, yP, amp.id);
  wire(O, xApex, ty, xO, ty, amp.id);

  // − node: inputs from the left, a ground return straight down, the feedback bus up to the tracks.
  wire(N, xN, yN, xIn, yN);
  inn.forEach((p, i) => {
    const x = other(p, N);
    const pin = { x: xX(i), y: yRow(i) };
    orient(p, N, { x: xN, y: yRow(i) }, pin);
    const source = sourceAt.get(x);
    if (source) orient(source, x, pin, { x: pin.x, y: yG });
    else openPorts.push({ node: x, pin, west: true });
  });
  if (k > 1) wire(N, xN, yN, xN, yRow(k - 1));
  if (gn[0]) orient(gn[0], N, { x: xN, y: yN }, { x: xN, y: yG });
  // Feedback: each element on its own track over the amplifier; a follower's output is its − node.
  wire(N, xN, yF(0), xN, yN);
  wire(O, xO, yF(0), xO, ty);
  if (follower) wire(N, xN, yF(0), xO, yF(0));
  fb.forEach((p, j) => orient(p, N, { x: xN, y: yF(j) }, { x: xO, y: yF(j) }));

  // + input: grounded, or a ground return and/or an input element hanging below it.
  wire(P, xP, yP, xIn, yP);
  if (pGrounded) wire(gnd, xP, yP, xP, yG);
  if (inp[0]) {
    const x = other(inp[0], P);
    const pin = { x: xP, y: yXp };
    orient(inp[0], P, { x: xP, y: yP }, pin);
    const source = sourceAt.get(x);
    if (source) orient(source, x, pin, { x: xP, y: yG });
    else openPorts.push({ node: x, pin, west: true });
  }
  if (gp[0]) orient(gp[0], P, { x: xPg, y: yP }, { x: xPg, y: yG });

  // Output: on to the load and the output end.
  wire(O, xO, ty, xEnd, ty);
  if (load[0]) orient(load[0], O, { x: xL, y: ty }, { x: xL, y: yG });
  addPin(O, { x: xEnd, y: ty });
  const groundXs = conductors.filter((c) => c.net === gnd).flatMap((c) => [c.seg.x1, c.seg.x2].filter((_, i) => (i ? c.seg.y2 : c.seg.y1) === yG));
  if (groundXs.length > 1) wire(gnd, Math.min(...groundXs), yG, Math.max(...groundXs), yG);
  for (const port of openPorts) {
    b.circle(`port:${port.node}:dot`, port.pin.x, port.pin.y, 3, { color: 'accent', role: 'connector', fill: 'none' });
    b.node(`port:${port.node}`, port.pin.x - 3, port.pin.y - 3, 6, 6, 'port');
  }
  const outPort = input.ports.find((port) => find(port.node) === O);
  if (outPort) {
    b.circle(`port:${outPort.node}:dot`, xEnd, ty, 3, { color: 'accent', role: 'connector', fill: 'none' });
    b.node(`port:${outPort.node}`, xEnd - 3, ty - 3, 6, 6, 'port');
  }

  // Junction dots where three or more conductors of one net meet.
  const dots = new Set<string>();
  const onSeg = (x: number, y: number, s: Segment) => distPointSeg(x, y, s) < 0.75;
  for (const net of new Set(conductors.map((c) => c.net))) {
    const own = conductors.filter((c) => c.net === net);
    for (const p of own.flatMap((c) => [{ x: c.seg.x1, y: c.seg.y1 }, { x: c.seg.x2, y: c.seg.y2 }])) {
      const key = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      if (dots.has(key)) continue;
      const arms = own.reduce((sum, c) => {
        const ends = (Math.hypot(c.seg.x1 - p.x, c.seg.y1 - p.y) < 0.75 ? 1 : 0) + (Math.hypot(c.seg.x2 - p.x, c.seg.y2 - p.y) < 0.75 ? 1 : 0);
        return sum + (ends || (onSeg(p.x, p.y, c.seg) ? 2 : 0));
      }, 0);
      if (arms >= 3) {
        dots.add(key);
        b.circle(`dot:${net}:${dots.size}`, p.x, p.y, 2.4, { fill: 'ink', role: 'connector' });
      }
    }
  }

  // Read the drawing back as a netlist: it must equal the spec, and no wire may cross another symbol.
  const verdict = verifyConnectivity(conductors);
  if (verdict) return { ok: false, code: 'unsatisfiable', reason: verdict };
  const through = (seg: Segment, box: Box) => Math.max(seg.x1, seg.x2) > box.x1 + 1.5 && Math.min(seg.x1, seg.x2) < box.x2 - 1.5 &&
    Math.max(seg.y1, seg.y2) > box.y1 + 1.5 && Math.min(seg.y1, seg.y2) < box.y2 - 1.5;
  for (const c of conductors) {
    const hit = glyphs.find((g) => g.id !== c.owner && through(c.seg, g.box));
    if (hit) return { ok: false, code: 'unsatisfiable', reason: `a wire of ${c.net} would pass through ${hit.id}` };
  }

  // Labels: designator over value beside each symbol, then the amplifier, probes, ports, labels, ground.
  const segs = strokeSegments(b.scene());
  const taken: Box[] = b.labels.map((label) => {
    const size = measureText(label.text ?? '', FONT);
    return { x1: label.x - size.w / 2, y1: label.y - size.h / 2, x2: label.x + size.w / 2, y2: label.y + size.h / 2 };
  });
  const free = (box: Box) => box.x1 >= 4 && box.y1 >= 4 && box.x2 <= width - 4 && box.y2 <= height - 4 &&
    !boxHitsAny(box, segs, 2.5) && !taken.some((other) => boxesOverlap(box, other, 2));
  const place = (lines: Array<{ id: string; text: string }>, candidates: Array<(size: { w: number; h: number }) => Pin>, anchorId?: string): boolean => {
    const sizes = lines.map((line) => measureText(line.text, FONT));
    const size = { w: Math.max(...sizes.map((s) => s.w)), h: lines.length * LINE };
    for (const candidate of candidates) {
      const c = candidate(size);
      const boxes = lines.map((_, i) => ({ x1: c.x - sizes[i]!.w / 2, y1: c.y - size.h / 2 + i * LINE, x2: c.x + sizes[i]!.w / 2, y2: c.y - size.h / 2 + (i + 1) * LINE }));
      if (!boxes.every(free)) continue;
      lines.forEach((line, i) => b.label(line.id, line.text, c.x, (boxes[i]!.y1 + boxes[i]!.y2) / 2, { protected: true, priority: 'required', anchorId, groupId: lines.length > 1 ? `pair:${lines[0]!.id}` : undefined }));
      taken.push(...boxes);
      return true;
    }
    return false;
  };
  const around = (box: Box, order: Array<'E' | 'W' | 'N' | 'S'>) => order.map((side) => (size: { w: number; h: number }) => {
    const cx = (box.x1 + box.x2) / 2;
    const cy = (box.y1 + box.y2) / 2;
    if (side === 'E') return { x: box.x2 + 6 + size.w / 2, y: cy };
    if (side === 'W') return { x: box.x1 - 6 - size.w / 2, y: cy };
    if (side === 'N') return { x: cx, y: box.y1 - 5 - size.h / 2 };
    return { x: cx, y: box.y2 + 5 + size.h / 2 };
  });
  const fail = (what: string): CompileResult => ({ ok: false, code: 'unsatisfiable', reason: `no clear place for ${what}` });
  // A `label: <device>=<text>` is that device's value line (it usually restates the value with its unit).
  const deviceLabel = (d: Device) => input.labels.find((label) => label.target.toLowerCase() === d.id.toLowerCase());
  for (const p of parts) {
    const glyph = glyphs.find((g) => g.id === p.d.id)!;
    const value = deviceLabel(p.d)?.text ?? displayDeviceValue(p.d);
    const lines = [{ id: p.d.id, text: p.d.id }, ...(value ? [{ id: `${p.d.id}-val`, text: value }] : [])];
    if (!place(lines, around(glyph.box, glyph.horizontal ? ['N', 'S'] : ['E', 'W']), p.d.id)) return fail(`the ${p.d.id} label`);
  }
  const ampBox = glyphs.find((g) => g.id === amp.id)!.box;
  if (!place([{ id: `${amp.id}-name`, text: amp.id }], around(ampBox, ['S', 'N', 'E']), amp.id)) return fail(`the ${amp.id} label`);
  const netAnchors = (net: string) => (pins.get(net) ?? []).flatMap((p) => [
    (size: { w: number; h: number }) => ({ x: p.x + 6 + size.w / 2, y: p.y - 6 - size.h / 2 }),
    (size: { w: number; h: number }) => ({ x: p.x - 6 - size.w / 2, y: p.y - 6 - size.h / 2 }),
    (size: { w: number; h: number }) => ({ x: p.x + 6 + size.w / 2, y: p.y + 6 + size.h / 2 }),
    (size: { w: number; h: number }) => ({ x: p.x - 6 - size.w / 2, y: p.y + 6 + size.h / 2 }),
  ]);
  const sameNet = (a: string, c: string) => find(a) === find(c);
  for (const port of openPorts) {
    const box = { x1: port.pin.x - 3, y1: port.pin.y - 3, x2: port.pin.x + 3, y2: port.pin.y + 3 };
    if (!place([{ id: `port:${port.node}:label`, text: portName(port.node, input.probes, sameNet) }], around(box, ['W', 'N', 'S', 'E']))) return fail(`port ${port.node}`);
  }
  if (outPort && !place([{ id: `port:${outPort.node}:label`, text: portName(outPort.node, input.probes, sameNet) }], around({ x1: xEnd - 3, y1: ty - 3, x2: xEnd + 3, y2: ty + 3 }, ['E', 'N', 'S']))) {
    return fail(`port ${outPort.node}`);
  }
  for (const probe of input.probes) {
    if (!probeNeedsLabel(probe, input, sameNet)) continue;
    if (!place([{ id: probe.id, text: probe.name }], netAnchors(find(probe.node)), `n:${probe.node}`)) return fail(`probe ${probe.name}`);
  }
  for (const label of input.labels) {
    const device = input.devices.find((d) => d.id.toLowerCase() === label.target.toLowerCase());
    if (device && device !== amp) continue;
    const node = names.find((n) => n.toLowerCase() === label.target.toLowerCase());
    if (!device && !node) return { ok: false, code: 'malformed', reason: `label target not found: ${label.target}` };
    const glyph = device && glyphs.find((g) => g.id === device.id);
    const candidates = glyph ? around(glyph.box, ['N', 'S', 'E', 'W']).concat(around({ ...glyph.box, y1: glyph.box.y1 - 2 * LINE, y2: glyph.box.y2 + 2 * LINE }, ['N', 'S'])) : netAnchors(find(node!));
    if (!place([{ id: label.id, text: label.text }], candidates)) return fail(`label ${label.target}`);
  }
  const rail = conductors.filter((c) => c.net === gnd && c.seg.y1 === yG && c.seg.y2 === yG && !c.owner).sort((a, c) => Math.abs(c.seg.x2 - c.seg.x1) - Math.abs(a.seg.x2 - a.seg.x1))[0]?.seg;
  const groundSpots = rail ? [0.5, 0.2, 0.8].map((t) => (size: { w: number; h: number }) => ({ x: rail.x1 + (rail.x2 - rail.x1) * t, y: yG + 5 + size.h / 2 })) : [];
  if (!place([{ id: 'gndl', text: 'GND' }], [...groundSpots, ...netAnchors(gnd)])) return fail('the GND label');
  return layoutAndCompile(b.scene());
}
