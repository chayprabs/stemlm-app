/** Geometry helpers: cubic-aware path sampling, boxes, distances. */
import { LABEL_GAP } from './types';

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function boxFrom(x: number, y: number, w: number, h: number, anchor: 'start' | 'middle' | 'end' = 'middle', baseline: 'hanging' | 'middle' | 'alphabetic' = 'middle'): Box {
  const x1 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const y1 = baseline === 'middle' ? y - h / 2 : baseline === 'hanging' ? y : y - h;
  return { x1, y1, x2: x1 + w, y2: y1 + h };
}

export function boxesOverlap(a: Box, b: Box, pad = 0): boolean {
  return a.x1 < b.x2 + pad && a.x2 > b.x1 - pad && a.y1 < b.y2 + pad && a.y2 > b.y1 - pad;
}

export function boxCenter(b: Box): { x: number; y: number } {
  return { x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 };
}

export function distPointSeg(px: number, py: number, s: Segment): number {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return Math.hypot(px - s.x1, py - s.y1);
  const t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / lenSq));
  return Math.hypot(px - (s.x1 + t * dx), py - (s.y1 + t * dy));
}

export function boxHitsSegment(box: Box, seg: Segment, gap: number): boolean {
  if (distPointSeg((box.x1 + box.x2) / 2, (box.y1 + box.y2) / 2, seg) < gap) return true;
  const corners: [number, number][] = [
    [box.x1, box.y1],
    [box.x2, box.y1],
    [box.x1, box.y2],
    [box.x2, box.y2],
  ];
  for (const [x, y] of corners) {
    if (distPointSeg(x, y, seg) < gap) return true;
  }
  const samples = 4;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = seg.x1 + (seg.x2 - seg.x1) * t;
    const y = seg.y1 + (seg.y2 - seg.y1) * t;
    if (x >= box.x1 - gap && x <= box.x2 + gap && y >= box.y1 - gap && y <= box.y2 + gap) return true;
  }
  return false;
}

export function boxHitsAny(box: Box, segs: Segment[], gap: number): boolean {
  return segs.some((s) => boxHitsSegment(box, s, gap));
}

function cubicPoint(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number,
): [number, number] {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

function quadPoint(p0: [number, number], p1: [number, number], p2: [number, number], t: number): [number, number] {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
}

function pushSamples(
  segs: Segment[],
  from: [number, number],
  toFn: (t: number) => [number, number],
  n: number,
): [number, number] {
  let prev = from;
  for (let i = 1; i <= n; i++) {
    const p = toFn(i / n);
    segs.push({ x1: prev[0], y1: prev[1], x2: p[0], y2: p[1] });
    prev = p;
  }
  return prev;
}

function nextNums(src: string, i: number, count: number): { nums: number[]; i: number } {
  const nums: number[] = [];
  while (nums.length < count && i < src.length) {
    const m = /[+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
    if (!m || m.index === undefined) break;
    const abs = src.slice(i).search(/[+-]?(?:\d*\.\d+|\d+)/);
    if (abs < 0) break;
    i += abs + m[0].length;
    nums.push(Number(m[0]));
    while (src[i] === ',' || src[i] === ' ' || src[i] === '\t') i++;
  }
  return { nums, i };
}

/** Sample SVG path `d` including C/Q/S/A/M/L into polyline segments. */
export function samplePathD(d: string, curveSteps = 10): Segment[] {
  const segs: Segment[] = [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let lastC: [number, number] | null = null;
  let lastQ: [number, number] | null = null;
  let cmd = '';
  const src = d.trim();

  const read = (n: number) => {
    const r = nextNums(src, i, n);
    i = r.i;
    return r.nums;
  };

  while (i < src.length) {
    const ch = src[i]!;
    if (/[A-Za-z]/.test(ch)) {
      cmd = ch;
      i++;
      lastC = cmd === 'C' || cmd === 'c' || cmd === 'S' || cmd === 's' ? lastC : null;
      lastQ = cmd === 'Q' || cmd === 'q' || cmd === 'T' || cmd === 't' ? lastQ : null;
      continue;
    }
    if (ch === ' ' || ch === ',' || ch === '\n' || ch === '\t') {
      i++;
      continue;
    }
    if (!cmd) {
      i++;
      continue;
    }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'M') {
      const n = read(2);
      if (n.length < 2) break;
      cx = rel ? cx + n[0]! : n[0]!;
      cy = rel ? cy + n[1]! : n[1]!;
      sx = cx;
      sy = cy;
      cmd = rel ? 'l' : 'L';
      continue;
    }
    if (C === 'L') {
      const n = read(2);
      if (n.length < 2) break;
      const nx = rel ? cx + n[0]! : n[0]!;
      const ny = rel ? cy + n[1]! : n[1]!;
      segs.push({ x1: cx, y1: cy, x2: nx, y2: ny });
      cx = nx;
      cy = ny;
      continue;
    }
    if (C === 'H') {
      const n = read(1);
      if (n.length < 1) break;
      const nx = rel ? cx + n[0]! : n[0]!;
      segs.push({ x1: cx, y1: cy, x2: nx, y2: cy });
      cx = nx;
      continue;
    }
    if (C === 'V') {
      const n = read(1);
      if (n.length < 1) break;
      const ny = rel ? cy + n[0]! : n[0]!;
      segs.push({ x1: cx, y1: cy, x2: cx, y2: ny });
      cy = ny;
      continue;
    }
    if (C === 'C') {
      const n = read(6);
      if (n.length < 6) break;
      const p0: [number, number] = [cx, cy];
      const p1: [number, number] = [rel ? cx + n[0]! : n[0]!, rel ? cy + n[1]! : n[1]!];
      const p2: [number, number] = [rel ? cx + n[2]! : n[2]!, rel ? cy + n[3]! : n[3]!];
      const p3: [number, number] = [rel ? cx + n[4]! : n[4]!, rel ? cy + n[5]! : n[5]!];
      const end = pushSamples(segs, p0, (t) => cubicPoint(p0, p1, p2, p3, t), curveSteps);
      lastC = p2;
      cx = end[0];
      cy = end[1];
      continue;
    }
    if (C === 'S') {
      const n = read(4);
      if (n.length < 4) break;
      const p0: [number, number] = [cx, cy];
      const p1: [number, number] = lastC ? [2 * cx - lastC[0], 2 * cy - lastC[1]] : [cx, cy];
      const p2: [number, number] = [rel ? cx + n[0]! : n[0]!, rel ? cy + n[1]! : n[1]!];
      const p3: [number, number] = [rel ? cx + n[2]! : n[2]!, rel ? cy + n[3]! : n[3]!];
      const end = pushSamples(segs, p0, (t) => cubicPoint(p0, p1, p2, p3, t), curveSteps);
      lastC = p2;
      cx = end[0];
      cy = end[1];
      continue;
    }
    if (C === 'Q') {
      const n = read(4);
      if (n.length < 4) break;
      const p0: [number, number] = [cx, cy];
      const p1: [number, number] = [rel ? cx + n[0]! : n[0]!, rel ? cy + n[1]! : n[1]!];
      const p2: [number, number] = [rel ? cx + n[2]! : n[2]!, rel ? cy + n[3]! : n[3]!];
      const end = pushSamples(segs, p0, (t) => quadPoint(p0, p1, p2, t), curveSteps);
      lastQ = p1;
      cx = end[0];
      cy = end[1];
      continue;
    }
    if (C === 'T') {
      const n = read(2);
      if (n.length < 2) break;
      const p0: [number, number] = [cx, cy];
      const p1: [number, number] = lastQ ? [2 * cx - lastQ[0], 2 * cy - lastQ[1]] : [cx, cy];
      const p2: [number, number] = [rel ? cx + n[0]! : n[0]!, rel ? cy + n[1]! : n[1]!];
      const end = pushSamples(segs, p0, (t) => quadPoint(p0, p1, p2, t), curveSteps);
      lastQ = p1;
      cx = end[0];
      cy = end[1];
      continue;
    }
    if (C === 'A') {
      const n = read(7);
      if (n.length < 7) break;
      const nx = rel ? cx + n[5]! : n[5]!;
      const ny = rel ? cy + n[6]! : n[6]!;
      const p0: [number, number] = [cx, cy];
      const p3: [number, number] = [nx, ny];
      const end = pushSamples(segs, p0, (t) => [p0[0] + (p3[0] - p0[0]) * t, p0[1] + (p3[1] - p0[1]) * t], curveSteps);
      cx = end[0];
      cy = end[1];
      continue;
    }
    if (C === 'Z') {
      segs.push({ x1: cx, y1: cy, x2: sx, y2: sy });
      cx = sx;
      cy = sy;
      continue;
    }
    i++;
  }
  return segs;
}

export function polylineSegments(pts: number[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i + 3 < pts.length; i += 2) {
    segs.push({ x1: pts[i]!, y1: pts[i + 1]!, x2: pts[i + 2]!, y2: pts[i + 3]! });
  }
  return segs;
}

export function circleSegments(cx: number, cy: number, r: number, n = 24): Segment[] {
  const segs: Segment[] = [];
  let px = cx + r;
  let py = cy;
  for (let i = 1; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    segs.push({ x1: px, y1: py, x2: x, y2: y });
    px = x;
    py = y;
  }
  return segs;
}

export function rectSegments(x: number, y: number, w: number, h: number): Segment[] {
  return [
    { x1: x, y1: y, x2: x + w, y2: y },
    { x1: x + w, y1: y, x2: x + w, y2: y + h },
    { x1: x + w, y1: y + h, x2: x, y2: y + h },
    { x1: x, y1: y + h, x2: x, y2: y },
  ];
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function measureText(text: string, fontSize: number, katex = false): { w: number; h: number } {
  const len = text.replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}^_]/g, '').length;
  const w = Math.max(fontSize * 0.8, len * fontSize * (katex ? 0.48 : 0.58));
  const h = fontSize * (katex ? 1.35 : 1.15);
  return { w, h };
}

export { LABEL_GAP };
