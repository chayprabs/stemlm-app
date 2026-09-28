import type { CompileCtx, CompileResult, Scene } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { emitSvg } from '../emit';
import { layoutScene, overlaysFromLayout, strokeSegments } from '../slk';
import { boxHitsAny, boxesOverlap, measureText } from '../geom';
import { deviceHalf, displayDeviceValue, drawGlyph } from './circuit-glyphs';
import { compileStageCircuit, portName, probeNeedsLabel } from './circuit-stage';
import { compileOpampStage } from './circuit-opamp';

export interface Device {
  id: string;
  kind: string;
  n1: string;
  n2: string;
  n3?: string;
  value?: string;
  switchState?: 'open' | 'closed';
  /** Q (C B E) and M (D G S) transistors; n1..n3 keep the written terminal order. */
  transistor?: 'npn' | 'pnp' | 'nmos' | 'pmos';
}

export interface ParsedCircuit {
  devices: Device[];
  wires: Array<{ a: string; b: string }>;
  ports: Array<{ node: string; role: 'input' | 'output' | 'return' }>;
  labels: Array<{ target: string; text: string; id: string }>;
  probes: Array<{ id: string; name: string; node: string }>;
  error?: string;
}

interface CircuitPairLayout {
  id: string;
  centerX: number;
  centerY: number;
  horizontal: boolean;
  half: number;
}

const CONTROL_KEYS = new Set(['std', 'probe', 'highlight', 'caption', 'kind', 'title', 'wire', 'port', 'label']);
const TWO_TERM = new Set(['r', 'c', 'l', 'v', 'i', 'd', 'm', 's']);
const THREE_TERM = new Set(['a', 'q']);
const BJT_TYPE = /^(npn|pnp)$/i;
const FET_TYPE = /^(nmos|pmos)$/i;
const UNSUPPORTED_DIODE_VARIANT = /\b(?:zener|schottky|led|light[- ]emitting|photodiode|varactor|tunnel|avalanche|laser)\b/i;

function isGnd(n: string): boolean {
  return /^(0|gnd|ground)$/i.test(n);
}

function isBottomReference(n: string): boolean {
  return /^(bottom|reference|n0)$/i.test(n);
}

function isDesignator(key: string): boolean {
  return /^[A-Z][A-Za-z0-9_]*$/.test(key);
}

function parseDevice(id: string, raw: string): { device?: Device; error?: string } {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  const kind = id[0]?.toLowerCase() ?? '';
  const terminalCount = TWO_TERM.has(kind) ? 2 : THREE_TERM.has(kind) ? 3 : 0;
  if (!terminalCount) return { error: `unsupported device ${id}` };
  if (parts.length < terminalCount) {
    return { error: `${id} is missing terminal ${terminalCount === 3 ? 'n3' : 'n2'}` };
  }
  if (kind === 'q') {
    // Q<id>: C B E [npn|pnp] [value] — npn unless declared otherwise.
    if (parts[3] && FET_TYPE.test(parts[3])) return { error: `transistor ${id} is a BJT: write npn or pnp` };
    const type = parts[3] && BJT_TYPE.test(parts[3]) ? parts[3].toLowerCase() as 'npn' | 'pnp' : undefined;
    const value = parts.slice(type ? 4 : 3).join(' ') || undefined;
    return { device: { id, kind, n1: parts[0]!, n2: parts[1]!, n3: parts[2]!, value, transistor: type ?? 'npn' } };
  }
  const fetIndex = kind === 'm' ? parts.findIndex((part) => FET_TYPE.test(part)) : -1;
  if (fetIndex >= 0) {
    // M<id>: D G S nmos|pmos [value]; a body terminal is accepted only when tied to the source.
    if (fetIndex !== 3 && !(fetIndex === 4 && parts[3] === parts[2])) {
      return { error: `transistor ${id} needs D G S nmos|pmos (a body terminal apart from the source is not drawn)` };
    }
    const value = parts.slice(fetIndex + 1).join(' ') || undefined;
    return { device: { id, kind, n1: parts[0]!, n2: parts[1]!, n3: parts[2]!, value, transistor: parts[fetIndex]!.toLowerCase() as 'nmos' | 'pmos' } };
  }
  const value = parts.slice(terminalCount).join(' ') || undefined;
  if (kind === 's') {
    const switchState = (value ?? 'open').toLowerCase();
    if (switchState !== 'open' && switchState !== 'closed') {
      return { error: `unsupported switch state for ${id}: ${value}` };
    }
    return {
      device: {
        id,
        kind,
        n1: parts[0]!,
        n2: parts[1]!,
        value,
        switchState,
      },
    };
  }
  if (kind === 'd' && value && UNSUPPORTED_DIODE_VARIANT.test(value)) {
    return { error: `unsupported diode variant for ${id}: ${value}` };
  }
  return {
    device: {
      id,
      kind,
      n1: parts[0]!,
      n2: parts[1]!,
      n3: terminalCount === 3 ? parts[2] : undefined,
      value,
    },
  };
}

function parsePort(raw: string): ParsedCircuit['ports'][number] | null {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 2 || !/^(input|output|return)$/i.test(parts[1]!)) return null;
  return { node: parts[0]!, role: parts[1]!.toLowerCase() as ParsedCircuit['ports'][number]['role'] };
}

function parseLabel(raw: string, index: number): ParsedCircuit['labels'][number] | null {
  const split = raw.indexOf('=');
  if (split <= 0 || split === raw.length - 1) return null;
  const target = raw.slice(0, split).trim();
  const text = raw.slice(split + 1).trim();
  if (!target || !text) return null;
  return { target, text, id: `label:${target}${index ? `:${index}` : ''}` };
}

function parseCircuit(spec: SpecDoc): ParsedCircuit {
  const result: ParsedCircuit = { devices: [], wires: [], ports: [], labels: [], probes: [] };
  if (spec.lists.size) {
    result.error = 'circuit declarations need inline values; repeat wire, port, or label keys';
    return result;
  }
  const emptyDeclaration = spec.emptyDeclarations.keys().next().value as string | undefined;
  if (emptyDeclaration) {
    result.error = `circuit declaration ${emptyDeclaration} must not be empty`;
    return result;
  }
  const std = (specGet(spec, 'std') ?? 'ieee').toLowerCase();
  if (std !== 'ieee' && std !== 'iec') {
    result.error = `unsupported circuit standard ${std}`;
    return result;
  }

  for (const [key, values] of spec.values) {
    if (CONTROL_KEYS.has(key)) continue;
    const original = spec.originals.get(key) ?? key;
    if (!isDesignator(original)) {
      result.error = `unsupported circuit key ${original}`;
      return result;
    }
    if (values.length !== 1) {
      result.error = `${original} must have one device line`;
      return result;
    }
    const parsed = parseDevice(original, values[0] ?? '');
    if (parsed.error) {
      result.error = parsed.error;
      return result;
    }
    result.devices.push(parsed.device!);
  }

  const wireKeys = new Set<string>();
  for (const [index, raw] of specGetAll(spec, 'wire').entries()) {
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (parts.length !== 2) {
      result.error = `wire ${index + 1} needs two named endpoints`;
      return result;
    }
    const endpoints = [parts[0]!, parts[1]!].sort();
    const wireKey = endpoints.join('\u0000');
    if (wireKeys.has(wireKey)) {
      result.error = `wire ${index + 1} duplicates an earlier connection`;
      return result;
    }
    wireKeys.add(wireKey);
    result.wires.push({ a: parts[0]!, b: parts[1]! });
  }
  const portNodes = new Set<string>();
  for (const raw of specGetAll(spec, 'port')) {
    const port = parsePort(raw);
    if (!port) {
      result.error = `port needs node and role (input, output, or return)`;
      return result;
    }
    if (portNodes.has(port.node)) {
      result.error = `port ${port.node} duplicates an earlier port`;
      return result;
    }
    portNodes.add(port.node);
    result.ports.push(port);
  }
  const declaredNodes = new Set<string>();
  for (const device of result.devices) {
    declaredNodes.add(device.n1);
    declaredNodes.add(device.n2);
    if (device.n3) declaredNodes.add(device.n3);
  }
  for (const port of result.ports) declaredNodes.add(port.node);
  for (const [index, wire] of result.wires.entries()) {
    const unknown = [wire.a, wire.b].find((endpoint) => !declaredNodes.has(endpoint));
    if (unknown) {
      result.error = `wire ${index + 1} endpoint ${unknown} is not a declared circuit node or port`;
      return result;
    }
  }
  for (const meter of result.devices) {
    // A meter reads two nodes; a third node token is a MOSFET missing its type, never a meter value.
    const first = meter.kind === 'm' && !meter.transistor ? meter.value?.split(/\s+/)[0] : undefined;
    if (first && result.devices.some((device) => device !== meter && [device.n1, device.n2, device.n3].includes(first))) {
      result.error = `${meter.id} has three nodes: write nmos or pmos for a MOSFET`;
      return result;
    }
  }
  for (const [index, raw] of specGetAll(spec, 'probe').entries()) {
    const m = /^([A-Za-z0-9_-]+)\s*=\s*([A-Za-z0-9_+-]+)$/.exec(raw.trim());
    if (!m) {
      result.error = 'probe needs name=node';
      return result;
    }
    if (!declaredNodes.has(m[2]!)) {
      result.error = `probe node not found: ${m[2]}`;
      return result;
    }
    const repeated = result.probes.some((probe) => probe.name === m[1]);
    result.probes.push({ id: repeated ? `${m[1]}:${index}` : m[1]!, name: m[1]!, node: m[2]! });
  }
  for (const [index, raw] of specGetAll(spec, 'label').entries()) {
    const label = parseLabel(raw, index);
    if (!label) {
      result.error = 'label needs target=text';
      return result;
    }
    result.labels.push(label);
  }
  return result;
}

export function parseNetlist(spec: SpecDoc): Device[] {
  return parseCircuit(spec).devices;
}

function hasUnsupportedAmplifierFeedback(devices: Device[]): boolean {
  return devices.some((amplifier) => {
    if (amplifier.kind !== 'a' || !amplifier.n3) return false;
    const inputs = new Set([amplifier.n1, amplifier.n2]);
    return devices.some((device) => {
      if (device === amplifier || !['r', 'c', 'l'].includes(device.kind)) return false;
      return (device.n1 === amplifier.n3 && inputs.has(device.n2)) ||
        (device.n2 === amplifier.n3 && inputs.has(device.n1));
    });
  });
}

function portsReachDeviceNodes(
  devices: Device[],
  wires: ParsedCircuit['wires'],
  ports: ParsedCircuit['ports'],
): Set<string> {
  const adjacent = new Map<string, Set<string>>();
  const connect = (a: string, b: string) => {
    const aSet = adjacent.get(a) ?? new Set<string>();
    const bSet = adjacent.get(b) ?? new Set<string>();
    aSet.add(b);
    bSet.add(a);
    adjacent.set(a, aSet);
    adjacent.set(b, bSet);
  };
  const deviceNodes = new Set<string>();
  for (const device of devices) {
    deviceNodes.add(device.n1);
    deviceNodes.add(device.n2);
    if (device.n3) deviceNodes.add(device.n3);
  }
  for (const wire of wires) connect(wire.a, wire.b);
  const reachable = new Set(deviceNodes);
  const queue = [...deviceNodes];
  while (queue.length) {
    const node = queue.shift()!;
    for (const next of adjacent.get(node) ?? []) {
      if (reachable.has(next)) continue;
      reachable.add(next);
      queue.push(next);
    }
  }
  return new Set(ports.filter((port) => reachable.has(port.node)).map((port) => port.node));
}

/** Designator-to-value spacing: 16 units, plus a subscript's drop and a superscript's rise between them. */
function pairGap(designator: string, value: string): number {
  return 16 + (/_/.test(designator) ? 3.6 : 0) + (/\^/.test(value) ? 4.8 : 0);
}

function pairGroups(scene: Scene): string[] {
  return [...new Set(scene.labels.map((label) => label.groupId).filter((id): id is string => Boolean(id && id.startsWith('pair:'))))];
}

function compileCircuitScene(builder: SceneBuilder): CompileResult {
  const scene = builder.scene();
  const layout = layoutScene(scene);
  if (!layout.ok) return layout;
  const placedById = new Map(layout.placed.map((placed) => [placed.label.id, placed]));
  for (const group of pairGroups(scene)) {
    const pair = scene.labels.filter((label) => label.groupId === group);
    const designator = pair.find((label) => !label.id.endsWith('-val'));
    const value = pair.find((label) => label.id.endsWith('-val'));
    const placedDesignator = designator ? placedById.get(designator.id) : undefined;
    const placedValue = value ? placedById.get(value.id) : undefined;
    const pairPlaced = placedDesignator && placedValue;
    const pairBoxes = pairPlaced ? [placedDesignator.box, placedValue.box] : [];
    const pairFits = pairPlaced && pairBoxes.every((box) =>
      box.x1 >= 4 && box.y1 >= 4 && box.x2 <= scene.width - 4 && box.y2 <= scene.height - 4 &&
      !boxHitsAny(box, layout.strokes, 0)) &&
      !boxesOverlap(placedDesignator.box, placedValue.box, 0) &&
      !layout.placed.some((placed) => placed.label.groupId !== group && pairBoxes.some((box) => boxesOverlap(box, placed.box, 0)));
    // Pair members are a single semantic label. SLK may move required labels when
    // their asserted slot is occupied, so validate the final placement, not the
    // source coordinates. A split or missing joint slot must fail closed.
    const verticalGap = pairPlaced ? placedValue.y - placedDesignator.y : Number.NaN;
    if (!designator || !value || !pairPlaced || Math.abs(placedDesignator.x - placedValue.x) > 0.1 ||
      placedDesignator.y >= placedValue.y || Math.abs(verticalGap - pairGap(designator.text ?? '', value.text ?? '')) > 0.1 || !pairFits) {
      return { ok: false, code: 'unsatisfiable', reason: `designator/value pair ${group} is not ordered (${Boolean(pairFits)},${Number.isFinite(verticalGap) ? verticalGap : 'missing'})` };
    }
  }
  return { ok: true, svg: emitSvg(scene, layout), overlays: overlaysFromLayout(layout), scene };
}

function arrangeCircuitPairs(scene: Scene, pairs: CircuitPairLayout[]): boolean {
  const gap = 4;
  const boxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const segments = strokeSegments(scene);
  const boxFor = (x: number, y: number, width: number, height: number) => ({ x1: x - width / 2, y1: y - height / 2, x2: x + width / 2, y2: y + height / 2 });
  const fits = (box: { x1: number; y1: number; x2: number; y2: number }, occupied: typeof boxes) =>
    box.x1 >= 4 && box.y1 >= 4 && box.x2 <= scene.width - 4 && box.y2 <= scene.height - 4 &&
    !boxHitsAny(box, segments, 0) &&
    !occupied.some((other) => box.x1 < other.x2 + gap && other.x1 < box.x2 + gap && box.y1 < other.y2 + gap && other.y1 < box.y2 + gap);
  const pairAt = (pair: CircuitPairLayout, x: number, y: number) => {
    const labels = scene.labels.filter((label) => label.groupId === `pair:${pair.id}`);
    const designator = labels.find((label) => !label.id.endsWith('-val'));
    const value = labels.find((label) => label.id.endsWith('-val'));
    if (!designator || !value) return null;
    const gap = pairGap(designator.text ?? '', value.text ?? '');
    const designatorY = pair.horizontal ? y - 16 - gap : y - gap / 2;
    const valueY = pair.horizontal ? y - 16 : y + gap / 2;
    const designatorSize = measureText(designator.text ?? designator.id, 12, false);
    const valueSize = measureText(value.text ?? '', 12, false);
    return { designator, value, boxes: [boxFor(x, designatorY, designatorSize.w, designatorSize.h), boxFor(x, valueY, valueSize.w, valueSize.h)] };
  };
  const setPair = (candidate: NonNullable<ReturnType<typeof pairAt>>) => {
    const { designator, value, boxes: pairBoxes } = candidate;
    designator.x = value.x = (pairBoxes[0]!.x1 + pairBoxes[0]!.x2) / 2;
    // Reconstruct center coordinates from the candidate boxes; this keeps the
    // two source labels exactly coincident in x while preserving their gap.
    designator.y = (pairBoxes[0]!.y1 + pairBoxes[0]!.y2) / 2;
    value.y = (pairBoxes[1]!.y1 + pairBoxes[1]!.y2) / 2;
    boxes.push(...pairBoxes);
  };
  const vertical = pairs.filter((pair) => !pair.horizontal).sort((a, b) => a.centerX - b.centerX || a.id.localeCompare(b.id));
  const placeVertical = (index: number): boolean => {
    if (index >= vertical.length) return true;
    const pair = vertical[index]!;
    const labels = scene.labels.filter((label) => label.groupId === `pair:${pair.id}`);
    if (labels.length !== 2) return false;
    const width = Math.max(...labels.map((label) => measureText(label.text ?? '', 12, false).w));
    // Vertical glyphs are narrow in x even when their terminal-to-terminal
    // length is large; use the glyph's side extent, not its axial half-length.
    const sideOffset = Math.min(12, pair.half) + width / 2 + 6;
    const candidates = [
      [pair.centerX - sideOffset, 0], [pair.centerX + sideOffset, 0],
      [pair.centerX - sideOffset, -34], [pair.centerX + sideOffset, -34],
      [pair.centerX - sideOffset, -64], [pair.centerX + sideOffset, -64],
      [pair.centerX - sideOffset, -80], [pair.centerX + sideOffset, -80],
      [pair.centerX - Math.min(12, pair.half) - 8, -64], [pair.centerX + Math.min(12, pair.half) + 8, -64],
      [pair.centerX - Math.min(12, pair.half) - 8, -50], [pair.centerX + Math.min(12, pair.half) + 8, -50],
      [pair.centerX - sideOffset, 34], [pair.centerX + sideOffset, 34],
    ];
    for (const [x, offset] of candidates) {
      const candidate = pairAt(pair, x!, pair.centerY + offset!);
      if (!candidate || boxesOverlap(candidate.boxes[0]!, candidate.boxes[1]!, 0) || !candidate.boxes.every((box) => fits(box, boxes))) continue;
      const previous = { designator: { x: candidate.designator.x, y: candidate.designator.y }, value: { x: candidate.value.x, y: candidate.value.y } };
      const before = boxes.length;
      setPair(candidate);
      if (placeVertical(index + 1)) return true;
      boxes.length = before;
      candidate.designator.x = previous.designator.x;
      candidate.designator.y = previous.designator.y;
      candidate.value.x = previous.value.x;
      candidate.value.y = previous.value.y;
    }
    return false;
  };
  if (!placeVertical(0)) return false;
  const horizontal = pairs.filter((pair) => pair.horizontal);
  const placeHorizontal = (index: number): boolean => {
    if (index >= horizontal.length) return true;
    const pair = horizontal[index]!;
    const candidates = [0, -24, 24, -64, 64, -80, 80, -104, 104, -128, 128].flatMap((x) => [0, -24, 24, -48, 48].map((y) => [pair.centerX + x, pair.centerY + y]));
    for (const [x, y] of candidates) {
      const candidate = pairAt(pair, x!, y!);
      if (!candidate || boxesOverlap(candidate.boxes[0]!, candidate.boxes[1]!, 0) || !candidate.boxes.every((box) => fits(box, boxes))) continue;
      const previous = { designator: { x: candidate.designator.x, y: candidate.designator.y }, value: { x: candidate.value.x, y: candidate.value.y } };
      const before = boxes.length;
      setPair(candidate);
      if (placeHorizontal(index + 1)) return true;
      boxes.length = before;
      candidate.designator.x = previous.designator.x;
      candidate.designator.y = previous.designator.y;
      candidate.value.x = previous.value.x;
      candidate.value.y = previous.value.y;
    }
    return false;
  };
  return placeHorizontal(0);
}


function rankNodes(devices: Device[], ports: ParsedCircuit['ports']): { ranks: Map<string, number>; cyclic: boolean } {
  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  const addNode = (n: string) => { if (!outgoing.has(n)) outgoing.set(n, []); if (!indegree.has(n)) indegree.set(n, 0); };
  for (const d of devices) {
    addNode(d.n1); addNode(d.n2); if (d.n3) addNode(d.n3);
    outgoing.get(d.n1)!.push(d.n2);
    indegree.set(d.n2, (indegree.get(d.n2) ?? 0) + 1);
  }
  for (const p of ports) addNode(p.node);
  const rank = new Map<string, number>();
  const remaining = new Map(indegree);
  const queue: string[] = [];
  for (const [n, degree] of remaining) if (!degree) { rank.set(n, 0); queue.push(n); }
  let processed = 0;
  while (queue.length) {
    const n = queue.shift()!;
    processed += 1;
    for (const next of outgoing.get(n) ?? []) {
      const candidate = (rank.get(n) ?? 0) + 1;
      if (candidate > (rank.get(next) ?? -1)) rank.set(next, candidate);
      const degree = (remaining.get(next) ?? 0) - 1;
      remaining.set(next, degree);
      if (degree === 0) queue.push(next);
    }
  }
  for (const n of indegree.keys()) if (!rank.has(n)) rank.set(n, 0);
  return { ranks: rank, cyclic: processed !== indegree.size };
}

function undirectedOrder(
  devices: Device[],
  ports: ParsedCircuit['ports'],
  reference: string,
): Map<string, number> {
  const adjacent = new Map<string, Set<string>>();
  const addNode = (node: string) => { if (!adjacent.has(node)) adjacent.set(node, new Set()); };
  const connect = (a: string, b: string) => {
    addNode(a); addNode(b);
    adjacent.get(a)!.add(b);
    adjacent.get(b)!.add(a);
  };
  for (const d of devices) {
    addNode(d.n1); addNode(d.n2);
    connect(d.n1, d.n2);
    if (d.n3) connect(d.n1, d.n3);
  }
  for (const port of ports) addNode(port.node);
  const starts = [
    ...devices
      .filter((d) => (d.kind === 'v' || d.kind === 'i') && (d.n1 === reference || d.n2 === reference))
      .map((d) => d.n1 === reference ? d.n2 : d.n1),
    ...ports.filter((port) => port.role === 'input').map((port) => port.node),
  ].filter((node, index, all) => node !== reference && all.indexOf(node) === index).sort();
  const queue = starts.length ? starts : [...adjacent.keys()].filter((node) => node !== reference).sort();
  const seen = new Set<string>();
  const order: string[] = [];
  while (queue.length) {
    const node = queue.shift()!;
    if (seen.has(node) || node === reference) continue;
    seen.add(node);
    order.push(node);
    [...(adjacent.get(node) ?? [])].filter((next) => next !== reference && !seen.has(next)).sort().forEach((next) => queue.push(next));
  }
  for (const node of [...adjacent.keys()].filter((entry) => entry !== reference).sort()) {
    if (!seen.has(node)) order.push(node);
  }
  order.push(reference);
  return new Map(order.map((node, index) => [node, index]));
}

export function compileCircuit(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const parsed = parseCircuit(spec);
  if (parsed.error) return { ok: false, code: 'malformed', reason: parsed.error };
  const devices = parsed.devices;
  if (!devices.length) return { ok: false, code: 'malformed', reason: 'circuit needs devices' };
  if (devices.some((device) => device.transistor)) {
    return compileStageCircuit({ ...parsed, isGround: isGnd, std: (specGet(spec, 'std') ?? 'ieee').toLowerCase(), highlight: spec.highlight });
  }
  // An op-amp with feedback (or a follower) gets the textbook feedback layout; other feedback topologies
  // around an amplifier are refused.
  const feedback = hasUnsupportedAmplifierFeedback(devices);
  if (feedback || devices.some((d) => d.kind === 'a' && d.n3 && d.n2 === d.n3)) {
    const stage = compileOpampStage({ ...parsed, isGround: isGnd, std: (specGet(spec, 'std') ?? 'ieee').toLowerCase(), highlight: spec.highlight });
    if (stage) return stage;
    if (feedback) return { ok: false, code: 'unsatisfiable', reason: 'feedback around a three-terminal amplifier needs a feedback-aware layout' };
  }
  // The single-row layout keeps its drawing when no wire or junction runs through another symbol and no two
  // symbols overlap (a shunt whose lead started inside a series resistor read as a tap into it). Otherwise, or
  // when it cannot lay the circuit out, the verified row/column stage layout draws it when it can.
  const row = layoutRowCircuit(spec, ctx, parsed);
  if (row.ok && !symbolCrossing(row.scene, devices)) return row;
  const staged = compileStageCircuit({ ...parsed, isGround: isGnd, std: (specGet(spec, 'std') ?? 'ieee').toLowerCase(), highlight: spec.highlight });
  return staged.ok ? staged : row;
}

/** Why the drawing is wrong (a wire through a symbol, or two symbols on each other), or null. */
function symbolCrossing(scene: Scene, devices: Device[]): string | null {
  const glyphBox = (d: Device) => {
    const own = scene.strokes.filter((s) => (s.id === d.id || s.id.startsWith(`${d.id}-`)) && !/-n[123]$/.test(s.id));
    const segs = strokeSegments({ ...scene, strokes: own.map((s) => ({ ...s, protected: false })) });
    if (!segs.length) return null;
    const xs = segs.flatMap((g) => [g.x1, g.x2]);
    const ys = segs.flatMap((g) => [g.y1, g.y2]);
    return { x1: Math.min(...xs) + 1.5, y1: Math.min(...ys) + 1.5, x2: Math.max(...xs) - 1.5, y2: Math.max(...ys) - 1.5 };
  };
  const boxes = devices.map((d) => ({ d, box: glyphBox(d) })).filter((entry): entry is { d: Device; box: NonNullable<ReturnType<typeof glyphBox>> } => Boolean(entry.box));
  for (const [i, a] of boxes.entries()) {
    for (const c of boxes.slice(i + 1)) if (boxesOverlap(a.box, c.box, 0)) return `symbols ${a.d.id} and ${c.d.id} overlap`;
    const foreign = scene.strokes.filter((s) => (s.role === 'connector' || s.role === 'guide') && s.id !== a.d.id && !s.id.startsWith(`${a.d.id}-`) && !s.id.startsWith(`j:${a.d.id}:`));
    for (const g of strokeSegments({ ...scene, strokes: foreign.map((s) => ({ ...s, protected: false })) })) {
      const inside = Math.max(g.x1, g.x2) > a.box.x1 && Math.min(g.x1, g.x2) < a.box.x2 && Math.max(g.y1, g.y2) > a.box.y1 && Math.min(g.y1, g.y2) < a.box.y2;
      if (inside) return `a wire would pass through ${a.d.id}`;
    }
  }
  return null;
}

function layoutRowCircuit(spec: SpecDoc, ctx: CompileCtx, parsed: ParsedCircuit): CompileResult {
  const devices = parsed.devices;
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('circuit', w, h);
  b.hl(spec.highlight);
  const std = (specGet(spec, 'std') ?? 'ieee').toLowerCase();
  const nodeSet = new Set<string>();
  for (const d of devices) { nodeSet.add(d.n1); nodeSet.add(d.n2); if (d.n3) nodeSet.add(d.n3); }
  for (const wire of parsed.wires) { nodeSet.add(wire.a); nodeSet.add(wire.b); }
  for (const port of parsed.ports) nodeSet.add(port.node);
  const reachablePortNodes = portsReachDeviceNodes(devices, parsed.wires, parsed.ports);
  for (const port of parsed.ports) {
    if (!reachablePortNodes.has(port.node)) {
      return { ok: false, code: 'unsatisfiable', reason: `port ${port.node} is not connected to a circuit node` };
    }
  }
  const gnd = [...nodeSet].find((node) => isGnd(node) || isBottomReference(node));
  const hasGroundSymbol = Boolean(gnd && isGnd(gnd));
  const ranked = rankNodes(devices, parsed.ports);
  if (ranked.cyclic && !gnd) {
    return { ok: false, code: 'unsatisfiable', reason: 'cyclic netlist without a reference needs a cycle-aware circuit layout' };
  }
  const ranks = ranked.cyclic ? undirectedOrder(devices, parsed.ports, gnd!) : ranked.ranks;
  const nonGround = [...nodeSet].filter((n) => n !== gnd).sort((a, c) => (ranks.get(a)! - ranks.get(c)!) || a.localeCompare(c));
  // Rank determines signal-flow order only. Keeping every non-ground node on one
  // row gives two-terminal branches their conventional horizontal orientation;
  // branches that span multiple columns are lifted onto a separate track below.
  const maxRank = Math.max(1, ...nonGround.map((node) => ranks.get(node) ?? 0));
  const xLeft = 40;
  const xRight = w - 40;
  const xOf = (node: string) => node === gnd
    ? xRight
    : xLeft + ((ranks.get(node) ?? 0) * (xRight - xLeft)) / maxRank;
  const yGround = h - 22;
  const yTop = 32;
  const usable = Math.max(24, yGround - yTop);
  const signalY = yTop + usable * 0.58;
  const yOf = new Map<string, number>();
  if (gnd) yOf.set(gnd, yGround);
  nonGround.forEach((node) => yOf.set(node, signalY));

  const isGroundEdge = (d: Device) => Boolean(gnd && (d.n1 === gnd || d.n2 === gnd));
  const nonGroundEnd = (d: Device) => d.n1 === gnd ? d.n2 : d.n1;
  const baseX = (d: Device) => {
    if (isGroundEdge(d)) return xOf(nonGroundEnd(d));
    return (xOf(d.n1) + xOf(d.n2)) / 2;
  };
  const pairKey = (d: Device) => [d.n1, d.n2].sort().join('\u0000');
  const pairGroups = new Map<string, Device[]>();
  for (const d of devices) {
    if (!isGroundEdge(d) && d.n1 !== d.n2 && !d.n3) {
      const group = pairGroups.get(pairKey(d)) ?? [];
      group.push(d);
      pairGroups.set(pairKey(d), group);
    }
  }
  const deviceX = new Map<string, number>();
  // Parallel shunts need separate x slots, while a bridge branch stays above
  // the node row with its terminals still anchored to the named nodes.
  for (const d of devices) deviceX.set(d.id, baseX(d));
  for (const group of devices.filter((d) => isGroundEdge(d)).reduce((groups, d) => {
    const key = nonGroundEnd(d);
    const current = groups.get(key) ?? [];
    current.push(d);
    groups.set(key, current);
    return groups;
  }, new Map<string, Device[]>()).values()) {
    if (group.length < 2) continue;
    const nodeX = xOf(nonGroundEnd(group[0]!));
    const span = (group.length - 1) * 26;
    if (span > xRight - xLeft - 36) {
      return { ok: false, code: 'unsatisfiable', reason: 'parallel shunts need more separate device slots than the frame can fit' };
    }
    const start = Math.max(xLeft + 18, Math.min(xRight - 18 - span, nodeX - span / 2));
    group.forEach((d, index) => {
      deviceX.set(d.id, start + index * 26);
    });
  }
  const edgeY = new Map<string, number>();
  for (const [key, group] of pairGroups) {
    const [a, c] = key.split('\u0000');
    const span = Math.abs(xOf(a!) - xOf(c!));
    group.forEach((d, index) => {
      // A long-span edge is the outer/top branch of a bridge. Parallel edges
      // are separated into tracks instead of being drawn on top of one another.
      const lifted = span > (xRight - xLeft) / Math.max(2, nonGround.length - 1) * 1.5;
      edgeY.set(d.id, lifted || group.length > 1
        ? yTop + 12 + index * 18
        : signalY);
    });
  }
  const pins = new Map<string, Array<{ x: number; y: number }>>();
  const pairLayouts: CircuitPairLayout[] = [];
  const addPin = (node: string, x: number, y: number) => { const points = pins.get(node) ?? []; points.push({ x, y }); pins.set(node, points); };
  const addTerminal = (d: Device, terminal: 'n1' | 'n2' | 'n3', x: number, y: number, gx: number, gy: number) => {
    b.line(`${d.id}-${terminal}`, x, y, gx, gy, { role: 'connector', width: 1.2 });
    b.circle(`j:${d.id}:${d[terminal]!}`, x, y, 2.2, { fill: 'ink', role: 'connector' });
    b.node(`n:${d.id}:${d[terminal]!}`, x - 2, y - 2, 4, 4, 'junction');
    addPin(d[terminal]!, x, y);
  };
  const addRoutedTerminal = (d: Device, terminal: 'n1' | 'n2' | 'n3', x: number, y: number, gx: number, gy: number) => {
    const bendX = (x + gx) / 2;
    b.polyline(`${d.id}-${terminal}`, [x, y, bendX, y, bendX, gy, gx, gy], { role: 'connector', width: 1.2 });
    b.circle(`j:${d.id}:${d[terminal]!}`, x, y, 2.2, { fill: 'ink', role: 'connector' });
    b.node(`n:${d.id}:${d[terminal]!}`, x - 2, y - 2, 4, 4, 'junction');
    addPin(d[terminal]!, x, y);
  };
  for (const d of devices) {
    const n1y = yOf.get(d.n1)!;
    const n2y = yOf.get(d.n2)!;
    let horizontal = !isGroundEdge(d) && d.n1 !== d.n2;
    let centerX = deviceX.get(d.id) ?? baseX(d);
    let centerY = horizontal ? (edgeY.get(d.id) ?? signalY) : (n1y + n2y) / 2;
    const half = deviceHalf(d, horizontal);
    if (d.kind === 'a') {
      horizontal = true;
      const n3y = yOf.get(d.n3!)!;
      const outputLeft = xOf(d.n3!) < (xOf(d.n1) + xOf(d.n2)) / 2;
      if (outputLeft) {
        centerX = Math.min(w - 30, Math.max(centerX, Math.max(xOf(d.n1), xOf(d.n2)) + 30));
      }
      const middle = [n1y, n2y, n3y].sort((a, c) => a - c)[1]!;
      centerY = Math.min(yGround - 36, Math.max(yTop + 20, middle));
      drawGlyph(b, d, centerX, centerY, true, std, half, outputLeft ? 'left' : 'right');
      const inputX = centerX + (outputLeft ? 17 : -17);
      const outputX = centerX + (outputLeft ? -18 : 18);
      addRoutedTerminal(d, 'n1', xOf(d.n1), n1y, inputX, centerY - 8);
      addRoutedTerminal(d, 'n2', xOf(d.n2), n2y, inputX, centerY + 8);
      addRoutedTerminal(d, 'n3', xOf(d.n3!), n3y, outputX, centerY);
    } else {
      const direction = horizontal
        ? (xOf(d.n2) >= xOf(d.n1) ? 'right' : 'left')
        : (n2y >= n1y ? 'down' : 'up');
      drawGlyph(b, d, centerX, centerY, horizontal, std, half, direction);
      if (horizontal) {
        let x1 = xOf(d.n1); let x2 = xOf(d.n2);
        if (Math.abs(x1 - x2) < half * 2 + 12) {
          return { ok: false, code: 'unsatisfiable', reason: `device ${d.id} has insufficient horizontal track space` };
        }
        const n1GlyphX = direction === 'right' ? centerX - half : centerX + half;
        const n2GlyphX = direction === 'right' ? centerX + half : centerX - half;
        addTerminal(d, 'n1', x1, centerY, n1GlyphX, centerY);
        addTerminal(d, 'n2', x2, centerY, n2GlyphX, centerY);
      } else {
        const top = n1y < n2y;
        addTerminal(d, 'n1', centerX, n1y, centerX, top ? centerY - half : centerY + half);
        addTerminal(d, 'n2', centerX, n2y, centerX, top ? centerY + half : centerY - half);
      }
      if (d.n3) {
      const x3 = centerX;
      const y3 = yOf.get(d.n3)!;
      addTerminal(d, 'n3', x3, y3, x3, centerY + (d.kind === 'a' ? 18 : 16));
      }
    }
    if (d.value) {
      b.labelPair(`pair:${d.id}`, { id: d.id, text: d.id }, { id: `${d.id}-val`, text: displayDeviceValue(d)! }, centerX, centerY, { protected: true, priority: 'required', anchorId: d.id, slot: horizontal ? 'N' : 'E' });
      pairLayouts.push({ id: d.id, centerX, centerY, horizontal, half });
      const pair = b.labels.slice(-2);
      if (horizontal) {
        pair[0]!.y = centerY - 24;
        pair[1]!.y = centerY + 24;
      } else {
        const pairWidth = Math.max(measureText(d.id, 12, false).w, measureText(d.value, 12, false).w);
        const clear = pairWidth / 2 + half + 14;
        const nearest = devices
          .filter((entry) => entry.id !== d.id)
          .map((entry) => ({ x: deviceX.get(entry.id) ?? baseX(entry), distance: Math.abs((deviceX.get(entry.id) ?? baseX(entry)) - centerX) }))
          .sort((a, c) => a.distance - c.distance)[0];
        const preferredSide = nearest && nearest.x > centerX ? -1 : 1;
        const rightFits = centerX + clear + pairWidth / 2 <= w - 4;
        const leftFits = centerX - clear - pairWidth / 2 >= 4;
        const side = preferredSide === 1 && rightFits ? 1 : preferredSide === -1 && leftFits ? -1 : rightFits ? 1 : -1;
        const labelX = Math.min(w - pairWidth / 2 - 4, Math.max(pairWidth / 2 + 4, centerX + side * clear));
        pair[0]!.x = labelX;
        pair[1]!.x = labelX;
        pair[0]!.y = centerY - 8;
        pair[1]!.y = centerY + 8;
      }
    } else {
      b.label(d.id, d.id, centerX, centerY, { protected: false, priority: 'required', anchorId: d.id, slot: horizontal ? 'N' : 'E' });
    }
  }
  for (const [node, points] of pins) {
    if (points.length < 2) continue;
    const y = yOf.get(node)!;
    const xMin = Math.min(...points.map((point) => point.x));
    const xMax = Math.max(...points.map((point) => point.x));
    const yMin = Math.min(...points.map((point) => point.y));
    const yMax = Math.max(...points.map((point) => point.y));
    // A lifted long-span branch still terminates at the named node. Route each
    // off-row pin to the node's canonical rail before drawing the shared rail;
    // emitting only the rail at y would leave that pin electrically floating.
    points.forEach((point, index) => {
      if (Math.abs(point.y - y) > 4) b.line(`rail:${node}:pin:${index}`, point.x, point.y, point.x, y, { role: 'connector', width: 1.2 });
    });
    if (xMax - xMin > 4) b.line(`rail:${node}`, xMin, y, xMax, y, { role: 'connector', width: 1.2 });
    if (yMax - yMin > 4 && xMax - xMin <= 4) b.line(`rail:${node}`, xMin, yMin, xMin, yMax, { role: 'connector', width: 1.2 });
  }
  if (gnd) {
    const referencePins = pins.get(gnd) ?? [];
    const referenceX = referencePins.length
      ? [Math.min(...referencePins.map((point) => point.x)), Math.max(...referencePins.map((point) => point.x))]
      : [xLeft, xRight];
    const railStart = referenceX[0]!;
    const railEnd = referenceX[1]!;
    if (railEnd - railStart > 4) {
      b.line(hasGroundSymbol ? 'gndrail' : 'referenceRail', railStart, yGround, railEnd, yGround, { color: 'muted', role: 'guide', width: 1.2 });
    }
    if (hasGroundSymbol) b.label('gndl', 'GND', 28, yGround + 10, { protected: true, priority: 'required', slot: 'S', anchorId: gnd });
  }
  // Reserve pair slots after shared node/reference rails exist, so the pair
  // allocator cannot approve a source position that the final conductor hits.
  if (!arrangeCircuitPairs(b.scene(), pairLayouts)) {
    return { ok: false, code: 'unsatisfiable', reason: 'circuit label pairs have no collision-free slots' };
  }
  for (const node of nodeSet) if (/^(vcc|vdd|supply|vin)$/i.test(node)) {
    const points = pins.get(node) ?? [];
    const min = points.length ? Math.min(...points.map((point) => point.x)) : xOf(node);
    const max = points.length ? Math.max(...points.map((point) => point.x)) : min;
    b.line(`supplyrail:${node}`, Math.max(24, min - 12), yTop - 8, Math.min(w - 24, max + 12), yTop - 8, { color: 'muted', role: 'guide', width: 1.2 });
    b.label(`supply:${node}`, node, Math.max(28, min), yTop - 12, { protected: true, priority: 'preferred', slot: 'N', anchorId: node });
  }
  for (const [index, wire] of parsed.wires.entries()) {
    const a = pins.get(wire.a)?.[0] ?? { x: xOf(wire.a), y: yOf.get(wire.a) ?? yTop };
    const c = pins.get(wire.b)?.[0] ?? { x: xOf(wire.b), y: yOf.get(wire.b) ?? yTop };
    const mid = (a.x + c.x) / 2;
    b.polyline(`wire:${index}`, [a.x, a.y, mid, a.y, mid, c.y, c.x, c.y], { role: 'connector', width: 1.2 });
    b.circle(`wire:${index}:a`, a.x, a.y, 2.2, { fill: 'ink', role: 'connector' });
    b.circle(`wire:${index}:b`, c.x, c.y, 2.2, { fill: 'ink', role: 'connector' });
  }
  for (const port of parsed.ports) {
    const x = port.role === 'input' ? 24 : port.role === 'output' ? w - 24 : xOf(port.node);
    // Join the node where it runs on its own row (nearest end first); a node drawn only on a lifted
    // track takes the port to that track. Either way the lead runs straight.
    const rowY = yOf.get(port.node) ?? yTop;
    const nearest = (points: Array<{ x: number; y: number }>) => [...points].sort((p, q) => Math.abs(p.x - x) - Math.abs(q.x - x))[0];
    const nodePins = pins.get(port.node) ?? [];
    const target = nearest(nodePins.filter((pin) => Math.abs(pin.y - rowY) < 0.5)) ?? nearest(nodePins) ?? { x: xOf(port.node), y: rowY };
    const y = target.y;
    const bendX = (x + target.x) / 2;
    b.polyline(`port:${port.node}:connection`, [x, y, bendX, y, bendX, target.y, target.x, target.y], { role: 'connector', width: 1.2 });
    b.node(`port:${port.node}`, x - 3, y - 3, 6, 6, 'port');
    b.circle(`port:${port.node}:dot`, x, y, 3, { color: 'accent', role: 'connector', fill: 'none' });
    // The name sits beside the terminal on its outer side, or above it when the frame edge is too close.
    const name = portName(port.node, parsed.probes);
    const size = measureText(name, 12, false);
    const besideX = x + (port.role === 'input' ? -1 : 1) * (7 + size.w / 2);
    const beside = besideX - size.w / 2 >= 4 && besideX + size.w / 2 <= w - 4;
    b.label(`port:${port.node}:label`, name, beside ? besideX : x, beside ? y : y - 7 - size.h / 2, { protected: true, priority: 'required', anchorId: `port:${port.node}`, slot: port.role === 'input' ? 'W' : 'E' });
  }
  for (const label of parsed.labels) {
    const device = devices.find((entry) => entry.id.toLowerCase() === label.target.toLowerCase());
    const node = [...nodeSet].find((entry) => entry.toLowerCase() === label.target.toLowerCase());
    const port = parsed.ports.find((entry) => entry.node.toLowerCase() === label.target.toLowerCase());
    if (!device && !node && !port) return { ok: false, code: 'malformed', reason: `label target not found: ${label.target}` };
    const targetNode = node ?? port?.node;
    const x = device ? (deviceX.get(device.id) ?? baseX(device)) : xOf(targetNode!);
    const y = device
      ? (isGroundEdge(device) ? (yOf.get(device.n1)! + yOf.get(device.n2)!) / 2 : (edgeY.get(device.id) ?? signalY))
      : yOf.get(targetNode!)!;
    b.label(label.id, label.text, x, y, { anchorId: device?.id ?? targetNode ?? `port:${port!.node}`, priority: 'preferred', slot: device ? 'NE' : 'W' });
  }
  for (const probe of parsed.probes) {
    if (!probeNeedsLabel(probe, { ports: parsed.ports, devices, isGround: isGnd })) continue;
    b.label(probe.id, probe.name, xOf(probe.node), yOf.get(probe.node)!, { slot: 'NE', anchorId: `n:${probe.node}` });
  }
  return compileCircuitScene(b);
}
