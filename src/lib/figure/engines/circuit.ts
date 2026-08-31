import type { CompileCtx, CompileResult, Scene } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { emitSvg } from '../emit';
import { layoutScene, overlaysFromLayout, type LayoutResult } from '../slk';
import { boxHitsAny, boxesOverlap, measureText } from '../geom';

export interface Device {
  id: string;
  kind: string;
  n1: string;
  n2: string;
  n3?: string;
  value?: string;
}

interface ParsedCircuit {
  devices: Device[];
  wires: Array<{ a: string; b: string }>;
  ports: Array<{ node: string; role: 'input' | 'output' | 'return' }>;
  labels: Array<{ target: string; text: string; id: string }>;
  error?: string;
}

const CONTROL_KEYS = new Set(['std', 'probe', 'highlight', 'caption', 'kind', 'title', 'wire', 'port', 'label']);
const TWO_TERM = new Set(['r', 'c', 'l', 'v', 'i', 'd', 'm', 's']);
const THREE_TERM = new Set(['a', 'q']);

function isGnd(n: string): boolean {
  return /^(0|gnd|ground)$/i.test(n);
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
  if (kind === 'q') return { error: `unsupported transistor ${id}` };
  return {
    device: {
      id,
      kind,
      n1: parts[0]!,
      n2: parts[1]!,
      n3: terminalCount === 3 ? parts[2] : undefined,
      value: parts.slice(terminalCount).join(' ') || undefined,
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
  const result: ParsedCircuit = { devices: [], wires: [], ports: [], labels: [] };
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

  for (const [index, raw] of specGetAll(spec, 'wire').entries()) {
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (parts.length !== 2) {
      result.error = `wire ${index + 1} needs two named endpoints`;
      return result;
    }
    result.wires.push({ a: parts[0]!, b: parts[1]! });
  }
  for (const raw of specGetAll(spec, 'port')) {
    const port = parsePort(raw);
    if (!port) {
      result.error = `port needs node and role (input, output, or return)`;
      return result;
    }
    result.ports.push(port);
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

function pairGroups(scene: Scene): string[] {
  return [...new Set(scene.labels.map((label) => label.groupId).filter((id): id is string => Boolean(id && id.startsWith('pair:'))))];
}

function pairReadable(
  scene: Scene,
  group: string,
  layout: LayoutResult,
): boolean {
  const pair = scene.labels.filter((label) => label.groupId === group);
  const designator = pair.find((label) => !label.id.endsWith('-val'));
  const value = pair.find((label) => label.id.endsWith('-val'));
  const placedById = new Map(layout.placed.map((placed) => [placed.label.id, placed]));
  const placedDesignator = designator ? placedById.get(designator.id) : undefined;
  const placedValue = value ? placedById.get(value.id) : undefined;
  if (!designator || !value || !placedDesignator || !placedValue) return false;
  if (Math.abs(placedDesignator.x - placedValue.x) > 0.1 || placedDesignator.y >= placedValue.y) return false;
  if (boxHitsAny(placedDesignator.box, layout.strokes, layout.gap) || boxHitsAny(placedValue.box, layout.strokes, layout.gap)) return false;
  return !layout.placed.some((placed) =>
    placed.label.id !== designator.id && placed.label.id !== value.id &&
    (boxesOverlap(placed.box, placedDesignator.box, 0.5) || boxesOverlap(placed.box, placedValue.box, 0.5)));
}

function pairCenters(scene: Scene, group: string): Array<{ x: number; y: number }> {
  const pair = scene.labels.filter((label) => label.groupId === group);
  const designator = pair.find((label) => !label.id.endsWith('-val'));
  const value = pair.find((label) => label.id.endsWith('-val'));
  if (!designator || !value) return [];
  const centerX = (designator.x + value.x) / 2;
  const centerY = (designator.y + value.y) / 2;
  const shifts = [0, 48, -48, 80, -80, 24, -24];
  return [...new Set(shifts.flatMap((xShift) => shifts.map((yShift) => `${centerX + xShift},${centerY + yShift}`)))].map((key) => {
    const coordinates = key.split(',');
    return { x: Number(coordinates[0]), y: Number(coordinates[1]) };
  });
}

function movePair(scene: Scene, group: string, x: number, y: number): void {
  const pair = scene.labels.filter((label) => label.groupId === group);
  const designator = pair.find((label) => !label.id.endsWith('-val'));
  const value = pair.find((label) => label.id.endsWith('-val'));
  if (!designator || !value) return;
  const halfGap = (value.y - designator.y) / 2;
  designator.x = x;
  designator.y = y - halfGap;
  value.x = x;
  value.y = y + halfGap;
}

function compileCircuitScene(builder: SceneBuilder): CompileResult {
  const scene = builder.scene();
  let layout = layoutScene(scene);
  if (!layout.ok) return layout;
  for (const group of pairGroups(scene)) {
    if (pairReadable(scene, group, layout)) continue;
    let fitted = false;
    for (const center of pairCenters(scene, group)) {
      movePair(scene, group, center.x, center.y);
      const candidate = layoutScene(scene);
      if (candidate.ok && pairReadable(scene, group, candidate)) {
        layout = candidate;
        fitted = true;
        break;
      }
    }
    if (!fitted) return { ok: false, code: 'unsatisfiable', reason: `designator/value pair ${group} has no readable slot` };
  }
  for (const group of pairGroups(scene)) {
    const pair = scene.labels.filter((label) => label.groupId === group);
    const designator = pair.find((label) => !label.id.endsWith('-val'));
    const value = pair.find((label) => label.id.endsWith('-val'));
    if (!designator || !value || !pairReadable(scene, group, layout)) return { ok: false, code: 'unsatisfiable', reason: `designator/value pair ${group} does not fit` };
  }
  return { ok: true, svg: emitSvg(scene, layout), overlays: overlaysFromLayout(layout), scene };
}


function ieeeZigzag(x: number, y: number, horiz: boolean, half: number): number[] {
  const h = Math.max(12, half);
  if (horiz) {
    return [x - h, y, x - h * 0.66, y - 6, x - h * 0.33, y + 6, x, y - 6, x + h * 0.33, y + 6, x + h * 0.66, y - 6, x + h, y];
  }
  return [x, y - h, x - 6, y - h * 0.66, x + 6, y - h * 0.33, x, y, x - 6, y + h * 0.33, x + 6, y + h * 0.66, x, y + h];
}

function drawGlyph(
  b: SceneBuilder,
  d: Device,
  x: number,
  y: number,
  horiz: boolean,
  std: string,
  half: number,
  direction: 'right' | 'left' = 'right',
): void {
  const iec = std === 'iec';
  if (d.kind === 'r') {
    if (iec) {
      if (horiz) b.rect(d.id, x - half, y - 7, half * 2, 14, { fill: 'none', role: 'geometry', width: 1.8 });
      else b.rect(d.id, x - 7, y - half, 14, half * 2, { fill: 'none', role: 'geometry', width: 1.8 });
    } else b.polyline(d.id, ieeeZigzag(x, y, horiz, half), { role: 'geometry', width: 1.8 });
    return;
  }
  if (d.kind === 'c') {
    if (horiz) {
      b.line(d.id, x - 5, y - 12, x - 5, y + 12, { role: 'geometry', width: 2 });
      b.line(`${d.id}-b`, x + 5, y - 12, x + 5, y + 12, { role: 'geometry', width: 2 });
    } else {
      b.line(d.id, x - 12, y - 5, x + 12, y - 5, { role: 'geometry', width: 2 });
      b.line(`${d.id}-b`, x - 12, y + 5, x + 12, y + 5, { role: 'geometry', width: 2 });
    }
    return;
  }
  if (d.kind === 'l') {
    if (horiz) b.path(d.id, `M ${x - 16} ${y} q 8 -8 16 0 q 8 8 16 0 q 8 -8 16 0`, { role: 'geometry', width: 1.8 });
    else b.path(d.id, `M ${x} ${y - 16} q 8 8 0 16 q -8 8 0 16 q 8 8 0 16`, { role: 'geometry', width: 1.8 });
    return;
  }
  if (d.kind === 'v') {
    b.circle(d.id, x, y, Math.min(12, half), { role: 'geometry' });
    if (/^ac(?:\s|$)/i.test(d.value ?? '')) {
      b.path(`${d.id}-ac`, `M ${x - 6} ${y} q 3 -7 6 0 q 3 7 6 0`, { role: 'geometry', width: 1.6 });
    } else {
      b.label(`${d.id}-polarity`, '±', x, y, { protected: true, priority: 'optional' });
    }
    return;
  }
  if (d.kind === 'i') {
    b.circle(`${d.id}-body`, x, y, Math.min(12, half), { role: 'geometry' });
    b.line(d.id, x, y + 6, x, y - 6, { color: 'accent', role: 'connector', markerEnd: true, width: 1.4 });
    return;
  }
  if (d.kind === 'm') {
    b.circle(d.id, x, y, Math.min(12, half), { role: 'geometry' });
    b.label(`${d.id}-meter`, 'M', x, y, { protected: true, priority: 'optional' });
    return;
  }
  if (d.kind === 's') {
    if (horiz) {
      b.line(d.id, x - half, y, x - 5, y, { role: 'geometry', width: 1.8 });
      b.line(`${d.id}-blade`, x - 5, y, x + 6, y - 7, { role: 'geometry', width: 1.8 });
      b.line(`${d.id}-right`, x + 6, y, x + half, y, { role: 'geometry', width: 1.8 });
    } else {
      b.line(d.id, x, y - half, x, y - 5, { role: 'geometry', width: 1.8 });
      b.line(`${d.id}-blade`, x, y - 5, x + 7, y + 6, { role: 'geometry', width: 1.8 });
      b.line(`${d.id}-right`, x, y + 6, x, y + half, { role: 'geometry', width: 1.8 });
    }
    return;
  }
  if (d.kind === 'd') {
    if (horiz) {
      b.polygon(d.id, [x - 8, y - 10, x - 8, y + 10, x + 8, y], { fill: 'none', role: 'geometry' });
      b.line(`${d.id}-bar`, x + 8, y - 10, x + 8, y + 10, { role: 'geometry', width: 2 });
    } else {
      b.polygon(d.id, [x - 10, y - 8, x + 10, y - 8, x, y + 8], { fill: 'none', role: 'geometry' });
      b.line(`${d.id}-bar`, x - 10, y + 8, x + 10, y + 8, { role: 'geometry', width: 2 });
    }
    return;
  }
  if (d.kind === 'a') {
    const left = direction === 'left';
    b.polygon(
      d.id,
      left ? [x + 17, y - 16, x + 17, y + 16, x - 18, y] : [x - 17, y - 16, x - 17, y + 16, x + 18, y],
      { fill: 'none', role: 'geometry', width: 1.8 },
    );
    b.label(`${d.id}-plus`, '+', x + (left ? 11 : -11), y - 7, { protected: true, priority: 'optional' });
    b.label(`${d.id}-minus`, '−', x + (left ? 11 : -11), y + 7, { protected: true, priority: 'optional' });
    return;
  }
  b.polygon(d.id, [x - 12, y - 14, x - 12, y + 14, x + 13, y], { fill: 'none', role: 'geometry', width: 1.8 });
}

function deviceHalf(d: Device, horiz: boolean): number {
  if (d.kind === 'v' || d.kind === 'i' || d.kind === 'm') return 12;
  if (d.kind === 'c') return 6;
  if (d.kind === 'd') return 8;
  return horiz ? 20 : 16;
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

export function compileCircuit(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const parsed = parseCircuit(spec);
  if (parsed.error) return { ok: false, code: 'malformed', reason: parsed.error };
  const devices = parsed.devices;
  if (!devices.length) return { ok: false, code: 'malformed', reason: 'circuit needs devices' };
  if (hasUnsupportedAmplifierFeedback(devices)) {
    return { ok: false, code: 'unsatisfiable', reason: 'feedback around a three-terminal amplifier needs a feedback-aware layout' };
  }
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
  const gnd = [...nodeSet].find(isGnd);
  const ranked = rankNodes(devices, parsed.ports);
  if (ranked.cyclic) return { ok: false, code: 'unsatisfiable', reason: 'cyclic netlist needs a cycle-aware circuit layout' };
  const ranks = ranked.ranks;
  const nonGround = [...nodeSet].filter((n) => n !== gnd).sort((a, c) => (ranks.get(a)! - ranks.get(c)!) || a.localeCompare(c));
  const maxRank = Math.max(1, ...[...nodeSet].map((n) => ranks.get(n) ?? 0));
  const xLeft = 40;
  const xRight = w - 40;
  const xOf = (node: string) => xLeft + ((ranks.get(node) ?? 0) * (xRight - xLeft)) / maxRank;
  const baseX = (d: Device) => (xOf(d.n1) + xOf(d.n2)) / 2;
  const xGroups = new Map<number, Device[]>();
  for (const d of devices) {
    const base = baseX(d);
    const group = xGroups.get(base) ?? [];
    group.push(d);
    xGroups.set(base, group);
  }
  const deviceX = new Map<string, number>();
  for (const group of xGroups.values()) {
    if (group.length === 1) {
      deviceX.set(group[0]!.id, baseX(group[0]!));
      continue;
    }
    group.forEach((d, index) => {
      deviceX.set(d.id, xLeft + ((index + 1) * (xRight - xLeft)) / (group.length + 1));
    });
  }
  const yGround = h - 22;
  const yTop = 32;
  const usable = Math.max(24, yGround - yTop);
  const yOf = new Map<string, number>();
  if (gnd) yOf.set(gnd, yGround);
  nonGround.forEach((node, index) => yOf.set(node, yTop + ((index + 0.5) * usable) / Math.max(1, nonGround.length)));
  const pins = new Map<string, Array<{ x: number; y: number }>>();
  const addPin = (node: string, x: number, y: number) => { const points = pins.get(node) ?? []; points.push({ x, y }); pins.set(node, points); };
  const addTerminal = (d: Device, terminal: 'n1' | 'n2' | 'n3', x: number, y: number, gx: number, gy: number) => {
    b.line(`${d.id}-${terminal}`, x, y, gx, gy, { role: 'connector', width: 1.2 });
    b.circle(`j:${d.id}:${d[terminal]!}`, x, y, 2.2, { fill: 'solid', role: 'connector' });
    b.node(`n:${d.id}:${d[terminal]!}`, x - 2, y - 2, 4, 4, 'junction');
    addPin(d[terminal]!, x, y);
  };
  const addRoutedTerminal = (d: Device, terminal: 'n1' | 'n2' | 'n3', x: number, y: number, gx: number, gy: number) => {
    const bendX = (x + gx) / 2;
    b.polyline(`${d.id}-${terminal}`, [x, y, bendX, y, bendX, gy, gx, gy], { role: 'connector', width: 1.2 });
    b.circle(`j:${d.id}:${d[terminal]!}`, x, y, 2.2, { fill: 'solid', role: 'connector' });
    b.node(`n:${d.id}:${d[terminal]!}`, x - 2, y - 2, 4, 4, 'junction');
    addPin(d[terminal]!, x, y);
  };
  for (const d of devices) {
    const n1y = yOf.get(d.n1)!;
    const n2y = yOf.get(d.n2)!;
    let horizontal = Math.abs(n1y - n2y) < 0.1;
    let centerX = deviceX.get(d.id) ?? baseX(d);
    if (horizontal && Math.abs(xOf(d.n1) - xOf(d.n2)) < 0.1) {
      const index = devices.findIndex((entry) => entry.id === d.id);
      centerX = xLeft + ((index + 1) * (xRight - xLeft)) / (devices.length + 1);
    }
    let centerY = horizontal ? n1y : (n1y + n2y) / 2;
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
      drawGlyph(b, d, centerX, centerY, horizontal, std, half);
      if (horizontal) {
        let x1 = xOf(d.n1); let x2 = xOf(d.n2);
        if (Math.abs(x1 - x2) < half * 2 + 12) { x1 = centerX - half - 12; x2 = centerX + half + 12; }
        addTerminal(d, 'n1', x1, centerY, centerX - half, centerY);
        addTerminal(d, 'n2', x2, centerY, centerX + half, centerY);
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
      b.labelPair(`pair:${d.id}`, { id: d.id, text: d.id }, { id: `${d.id}-val`, text: d.value }, centerX, centerY, { protected: true, priority: 'required', anchorId: d.id, slot: horizontal ? 'N' : 'E' });
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
    if (xMax - xMin > 4) b.line(`rail:${node}`, xMin, y, xMax, y, { role: 'connector', width: 1.2 });
    if (yMax - yMin > 4 && xMax - xMin <= 4) b.line(`rail:${node}`, xMin, yMin, xMin, yMax, { role: 'connector', width: 1.2 });
  }
  if (gnd) {
    b.line('gndrail', 24, yGround, w - 24, yGround, { color: 'muted', role: 'guide', width: 1.2 });
    b.label('gndl', 'GND', 28, yGround + 10, { protected: true, priority: 'required', slot: 'S', anchorId: gnd });
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
    b.circle(`wire:${index}:a`, a.x, a.y, 2.2, { fill: 'solid', role: 'connector' });
    b.circle(`wire:${index}:b`, c.x, c.y, 2.2, { fill: 'solid', role: 'connector' });
  }
  for (const port of parsed.ports) {
    const x = port.role === 'input' ? 24 : port.role === 'output' ? w - 24 : xOf(port.node);
    const y = yOf.get(port.node) ?? yTop;
    const target = pins.get(port.node)?.[0] ?? { x: xOf(port.node), y };
    const bendX = (x + target.x) / 2;
    b.polyline(`port:${port.node}:connection`, [x, y, bendX, y, bendX, target.y, target.x, target.y], { role: 'connector', width: 1.2 });
    b.node(`port:${port.node}`, x - 3, y - 3, 6, 6, 'port');
    b.circle(`port:${port.node}:dot`, x, y, 3, { color: 'accent', role: 'connector', fill: 'none' });
    b.label(`port:${port.node}:label`, port.node, x, y, { protected: true, priority: 'required', anchorId: `port:${port.node}`, slot: port.role === 'input' ? 'W' : 'E' });
  }
  for (const label of parsed.labels) {
    const device = devices.find((entry) => entry.id.toLowerCase() === label.target.toLowerCase());
    const node = [...nodeSet].find((entry) => entry.toLowerCase() === label.target.toLowerCase());
    const port = parsed.ports.find((entry) => entry.node.toLowerCase() === label.target.toLowerCase());
    if (!device && !node && !port) return { ok: false, code: 'malformed', reason: `label target not found: ${label.target}` };
    const targetNode = node ?? port?.node;
    const x = device ? (xOf(device.n1) + xOf(device.n2)) / 2 : xOf(targetNode!);
    const y = device ? (yOf.get(device.n1)! + yOf.get(device.n2)!) / 2 : yOf.get(targetNode!)!;
    b.label(label.id, label.text, x, y, { anchorId: device?.id ?? targetNode ?? `port:${port!.node}`, priority: 'preferred', slot: device ? 'NE' : 'W' });
  }
  const probe = specGet(spec, 'probe');
  if (probe) {
    const m = /^([A-Za-z0-9_-]+)\s*=\s*([A-Za-z0-9_+-]+)$/.exec(probe.trim());
    if (!m) return { ok: false, code: 'malformed', reason: 'probe needs name=node' };
    if (!nodeSet.has(m[2]!)) return { ok: false, code: 'malformed', reason: `probe node not found: ${m[2]}` };
    b.label(m[1]!, m[1]!, xOf(m[2]!), yOf.get(m[2]!)!, { slot: 'NE', anchorId: `n:${m[2]}` });
  }
  return compileCircuitScene(b);
}
