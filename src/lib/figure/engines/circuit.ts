import type { CompileCtx, CompileResult } from '../types';
import { specGet, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

export interface Device {
  id: string;
  kind: string;
  n1: string;
  n2: string;
  n3?: string;
  value?: string;
}

const SKIP = new Set(['std', 'probe', 'highlight', 'caption', 'kind', 'title']);
const TWO_TERM = new Set(['r', 'c', 'l', 'v', 'i', 'd', 'e', 'h', 'f']);
const DEVICE_RE = /^([A-Za-z]{1,4}\d*|[A-Za-z]+)$/;

function isGnd(n: string): boolean {
  return /^(0|gnd|ground)$/i.test(n);
}

export function parseNetlist(spec: SpecDoc): Device[] {
  const devices: Device[] = [];
  for (const [key, vals] of spec.values) {
    if (SKIP.has(key)) continue;
    if (!DEVICE_RE.test(key) && !/^[vrilcqdguem]\w*/i.test(key)) continue;
    const raw = vals[0] ?? '';
    const parts = raw.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const letter = key[0]!.toLowerCase();
    const id = spec.originals.get(key) ?? key;
    if (TWO_TERM.has(letter)) {
      devices.push({
        id,
        kind: letter,
        n1: parts[0]!,
        n2: parts[1]!,
        value: parts.slice(2).join(' ') || undefined,
      });
    } else {
      devices.push({
        id,
        kind: letter,
        n1: parts[0]!,
        n2: parts[1]!,
        n3: parts[2],
        value: parts.slice(3).join(' ') || undefined,
      });
    }
  }
  return devices;
}

function ieeeZigzag(x: number, y: number, horiz: boolean, half: number): number[] {
  const h = Math.max(12, half);
  if (horiz) {
    return [
      x - h, y,
      x - h * 0.66, y - 6,
      x - h * 0.33, y + 6,
      x, y - 6,
      x + h * 0.33, y + 6,
      x + h * 0.66, y - 6,
      x + h, y,
    ];
  }
  return [
    x, y - h,
    x - 6, y - h * 0.66,
    x + 6, y - h * 0.33,
    x, y,
    x - 6, y + h * 0.33,
    x + 6, y + h * 0.66,
    x, y + h,
  ];
}

function glyphExtent(d: Device, half: number): number {
  if (d.kind === 'v' || d.kind === 'i') return Math.min(12, half);
  if (d.kind === 'c') return 6;
  if (d.kind === 'd') return 8;
  return half;
}

function drawGlyph(
  b: SceneBuilder,
  d: Device,
  x: number,
  y: number,
  horiz: boolean,
  std: string,
  half: number,
): void {
  const iec = std === 'iec';
  if (d.kind === 'r') {
    if (iec) {
      if (horiz) b.rect(d.id, x - half, y - 7, half * 2, 14, { fill: 'none', width: 1.8 });
      else b.rect(d.id, x - 7, y - half, 14, half * 2, { fill: 'none', width: 1.8 });
    } else {
      b.polyline(d.id, ieeeZigzag(x, y, horiz, half), { color: 'neutral', width: 1.8 });
    }
    return;
  }
  if (d.kind === 'c') {
    if (horiz) {
      b.line(d.id, x - 5, y - 12, x - 5, y + 12, { width: 2 });
      b.line(`${d.id}-b`, x + 5, y - 12, x + 5, y + 12, { width: 2 });
    } else {
      b.line(d.id, x - 12, y - 5, x + 12, y - 5, { width: 2 });
      b.line(`${d.id}-b`, x - 12, y + 5, x + 12, y + 5, { width: 2 });
    }
    return;
  }
  if (d.kind === 'l') {
    if (horiz) {
      b.path(d.id, `M ${x - 16} ${y} q 8 -8 16 0 q 8 8 16 0 q 8 -8 16 0`, { width: 1.8 });
    } else {
      b.path(d.id, `M ${x} ${y - 16} q 8 8 0 16 q -8 8 0 16 q 8 8 0 16`, { width: 1.8 });
    }
    return;
  }
  if (d.kind === 'v' || d.kind === 'i') {
    b.circle(d.id, x, y, Math.min(12, half), { color: 'neutral' });
    b.label(`${d.id}pm`, d.kind === 'v' ? '±' : '↑', x, y, { protected: true });
    return;
  }
  if (d.kind === 'd') {
    if (horiz) {
      b.polygon(d.id, [x - 8, y - 10, x - 8, y + 10, x + 8, y], { fill: 'none' });
      b.line(`${d.id}bar`, x + 8, y - 10, x + 8, y + 10, { width: 2 });
    } else {
      b.polygon(d.id, [x - 10, y - 8, x + 10, y - 8, x, y + 8], { fill: 'none' });
      b.line(`${d.id}bar`, x - 10, y + 8, x + 10, y + 8, { width: 2 });
    }
    return;
  }
  b.rect(d.id, x - 16, y - 10, 32, 20, { fill: 'solid' });
}

function closestPair(xs: number[], ys: number[]): { x1: number; x2: number } {
  let best = { x1: xs[0] ?? 0, x2: ys[0] ?? 0, d: Infinity };
  for (const a of xs) {
    for (const c of ys) {
      const dist = Math.abs(a - c);
      if (dist < best.d && dist > 8) best = { x1: a, x2: c, d: dist };
    }
  }
  if (best.d === Infinity) return { x1: xs[0] ?? 0, x2: ys[0] ?? (xs[0] ?? 0) + 40 };
  return { x1: best.x1, x2: best.x2 };
}

export function compileCircuit(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const devices = parseNetlist(spec);
  if (!devices.length) return { ok: false, code: 'malformed', reason: 'circuit needs devices' };
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('circuit', w, h);
  b.hl(spec.highlight);
  const std = (specGet(spec, 'std') ?? 'ieee').toLowerCase();

  const nodeSet = new Set<string>();
  for (const d of devices) {
    nodeSet.add(d.n1);
    nodeSet.add(d.n2);
    if (d.n3) nodeSet.add(d.n3);
  }
  const gnd = [...nodeSet].find(isGnd) ?? '0';
  nodeSet.add(gnd);

  const adj = new Map<string, string[]>();
  const link = (a: string, c: string) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(c);
  };
  for (const d of devices) {
    link(d.n1, d.n2);
    link(d.n2, d.n1);
    if (d.n3) {
      link(d.n2, d.n3);
      link(d.n3, d.n2);
    }
  }

  const rank = new Map<string, number>();
  rank.set(gnd, 0);
  const queue = [gnd];
  while (queue.length) {
    const n = queue.shift()!;
    for (const m of adj.get(n) ?? []) {
      if (!rank.has(m)) {
        rank.set(m, (rank.get(n) ?? 0) + 1);
        queue.push(m);
      }
    }
  }
  for (const n of nodeSet) if (!rank.has(n)) rank.set(n, 1);

  const maxRank = Math.max(1, ...rank.values());
  const yGnd = h - 22;
  const yTop = 28;
  const yOf = new Map<string, number>();
  for (const n of nodeSet) {
    const r = rank.get(n) ?? 1;
    yOf.set(n, r === 0 ? yGnd : yTop + ((maxRank - r) * (yGnd - yTop)) / maxRank);
  }

  const vertical: Device[] = [];
  const horizontal: Device[] = [];
  for (const d of devices) {
    if ((rank.get(d.n1) ?? 0) === (rank.get(d.n2) ?? 0)) horizontal.push(d);
    else vertical.push(d);
  }

  const colOf = new Map<string, number>();
  vertical.forEach((d, i) => colOf.set(d.id, i));
  const nVert = Math.max(1, vertical.length);
  const xLeft = 40;
  const xRight = w - 28;
  const xCol = (c: number) =>
    nVert <= 1 ? (xLeft + xRight) / 2 : xLeft + (c * (xRight - xLeft)) / Math.max(1, nVert - 1);

  const pins = new Map<string, number[]>();
  const addPin = (n: string, x: number) => {
    const list = pins.get(n) ?? [];
    list.push(x);
    pins.set(n, list);
  };

  const pinDevice = (d: Device, n: string, x: number, y: number, gx: number, gy: number) => {
    b.line(`${d.id}-${n === d.n1 ? 'n1' : n === d.n2 ? 'n2' : 'n3'}`, x, y, gx, gy, { width: 1.2 });
    b.circle(`j:${d.id}:${n}`, x, y, 2.2, { fill: 'solid' });
    b.node(`n:${d.id}:${n}`, x - 2, y - 2, 4, 4, 'junction');
    addPin(n, x);
  };

  for (const d of vertical) {
    const x = xCol(colOf.get(d.id)!);
    const y1 = yOf.get(d.n1)!;
    const y2 = yOf.get(d.n2)!;
    const mid = (y1 + y2) / 2;
    const half = Math.max(10, Math.min(18, Math.abs(y2 - y1) / 2 - 6));
    drawGlyph(b, d, x, mid, false, std, half);
    const ext = glyphExtent(d, half);
    pinDevice(d, d.n1, x, y1, x, y1 < y2 ? mid - ext : mid + ext);
    pinDevice(d, d.n2, x, y2, x, y2 < y1 ? mid - ext : mid + ext);
    b.label(d.id, d.id, x + 14, mid, { slot: 'E', protected: true });
    if (d.value) b.label(`${d.id}-val`, d.value, x + 14, mid + 12, { slot: 'SE', protected: true });
  }

  let extra = 0;
  for (const d of horizontal) {
    if (!pins.has(d.n1)) addPin(d.n1, xLeft + extra++ * 36);
    if (!pins.has(d.n2)) addPin(d.n2, xLeft + extra++ * 36);
    const pair = closestPair(pins.get(d.n1)!, pins.get(d.n2)!);
    const y = yOf.get(d.n1)!;
    const x = (pair.x1 + pair.x2) / 2;
    const half = Math.max(10, Math.min(18, Math.abs(pair.x2 - pair.x1) / 2 - 6));
    drawGlyph(b, d, x, y, true, std, half);
    const ext = glyphExtent(d, half);
    pinDevice(d, d.n1, pair.x1, y, pair.x1 < pair.x2 ? x - ext : x + ext, y);
    pinDevice(d, d.n2, pair.x2, y, pair.x2 < pair.x1 ? x - ext : x + ext, y);
    b.label(d.id, d.id, x, y - 16, { slot: 'N', protected: true });
    if (d.value) b.label(`${d.id}-val`, d.value, x, y + 16, { slot: 'S', protected: true });
  }

  for (const n of nodeSet) {
    const xs = pins.get(n);
    if (!xs || xs.length < 2) continue;
    const y = yOf.get(n)!;
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    if (xMax - xMin > 4) b.line(`rail:${n}`, xMin, y, xMax, y, { width: 1.2 });
  }

  b.line('gndrail', 24, yGnd, w - 24, yGnd, { color: 'muted', width: 1.2 });
  b.label('gndl', 'GND', 28, yGnd + 10, { protected: true });

  for (const d of devices) {
    if (!d.n3) continue;
    const already = b.strokes.some((s) => s.id === `j:${d.id}:${d.n3}`);
    if (already) continue;
    const x3 = (pins.get(d.n3) ?? [xLeft])[0]!;
    const y3 = yOf.get(d.n3)!;
    const host = b.strokes.find((s) => s.id === d.id);
    const hx = host?.kind === 'circle' ? host.points[0]! : x3;
    const hy = host?.kind === 'circle' ? host.points[1]! : y3;
    b.line(`${d.id}-n3a`, hx, hy, x3, hy, { width: 1.2 });
    b.line(`${d.id}-n3b`, x3, hy, x3, y3, { width: 1.2 });
    b.circle(`j:${d.id}:${d.n3}`, x3, y3, 2.2, { fill: 'solid' });
  }

  const probe = specGet(spec, 'probe');
  if (probe) {
    const m = /([A-Za-z0-9]+)\s*=\s*([A-Za-z0-9_]+)/.exec(probe);
    if (m) {
      const nx = (pins.get(m[2]!) ?? [w / 2])[0]!;
      const ny = yOf.get(m[2]!) ?? h / 2;
      b.label(m[1]!, m[1]!, nx + 10, ny - 10, { slot: 'NE' });
    }
  }

  return layoutAndCompile(b.scene());
}
