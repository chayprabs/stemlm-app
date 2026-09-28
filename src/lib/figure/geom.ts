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

function arcSegments(
  x1: number,
  y1: number,
  rxInput: number,
  ryInput: number,
  rotation: number,
  largeArc: number,
  sweep: number,
  x2: number,
  y2: number,
  curveSteps: number,
): Segment[] {
  let rx = Math.abs(rxInput);
  let ry = Math.abs(ryInput);
  if (Math.hypot(x2 - x1, y2 - y1) < 1e-9 || rx < 1e-9 || ry < 1e-9) {
    return [{ x1, y1, x2, y2 }];
  }

  const phi = (rotation * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;
  const rxSq = rx * rx;
  const rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;
  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
  }

  const scaledRxSq = rx * rx;
  const scaledRySq = ry * ry;
  const denominator = scaledRxSq * y1pSq + scaledRySq * x1pSq;
  const numerator = Math.max(0, scaledRxSq * scaledRySq - denominator);
  const factor = denominator < 1e-12 ? 0 : Math.sqrt(numerator / denominator) * (largeArc === sweep ? -1 : 1);
  const cxp = factor * ((rx * y1p) / ry);
  const cyp = factor * (-(ry * x1p) / rx);
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;
  const angle = (ax: number, ay: number, bx: number, by: number) => Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
  const start = angle(1, 0, ux, uy);
  let delta = angle(ux, uy, vx, vy);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const steps = Math.max(2, Math.ceil((Math.abs(delta) / (Math.PI / 2)) * curveSteps));
  const segments: Segment[] = [];
  let px = x1;
  let py = y1;
  for (let step = 1; step <= steps; step++) {
    const t = start + (delta * step) / steps;
    const x = cx + cosPhi * rx * Math.cos(t) - sinPhi * ry * Math.sin(t);
    const y = cy + sinPhi * rx * Math.cos(t) + cosPhi * ry * Math.sin(t);
    segments.push({ x1: px, y1: py, x2: x, y2: y });
    px = x;
    py = y;
  }
  return segments;
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
      if (cmd.toUpperCase() === 'Z') {
        segs.push({ x1: cx, y1: cy, x2: sx, y2: sy });
        cx = sx;
        cy = sy;
        cmd = '';
      }
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
      segs.push(...arcSegments(cx, cy, n[0]!, n[1]!, n[2]!, n[3]!, n[4]!, nx, ny, curveSteps));
      cx = nx;
      cy = ny;
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

export function ellipseSegments(cx: number, cy: number, rx: number, ry: number, n = 32): Segment[] {
  const segs: Segment[] = [];
  let px = cx + rx;
  let py = cy;
  for (let i = 1; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + rx * Math.cos(a);
    const y = cy + ry * Math.sin(a);
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

function glyphAdvance(ch: string): number {
  if (/\s/.test(ch)) return 0.32;
  if (/[ilI.,:;!'`|]/.test(ch)) return 0.28;
  if (/[MW@#%&]/.test(ch)) return 0.9;
  if (/[A-Z]/.test(ch)) return 0.66;
  if (/[0-9]/.test(ch)) return 0.56;
  if (/[-+=<>~]/.test(ch)) return 0.52;
  if (/[$\\/]/.test(ch)) return 0.5;
  if (/[^\x00-\x7F]/.test(ch)) return 0.7;
  return 0.54;
}

function lineWidth(text: string, katex: boolean): number {
  let width = 0;
  for (let i = 0; i < text.length;) {
    const ch = text[i]!;
    if (ch === '\\') {
      const match = /^\\([A-Za-z]+)/.exec(text.slice(i));
      if (!match) {
        width += 0.45;
        i++;
        continue;
      }
      const command = match[1]!.toLowerCase();
      width += command === 'frac' ? 0.9 : command === 'sqrt' ? 0.75 : command === 'alpha' || command === 'beta' || command === 'gamma' || command === 'theta' || command === 'omega' ? 0.72 : command === 'quad' || command === ',' ? 0.32 : 0;
      i += match[0].length;
      continue;
    }
    if (ch === '{' || ch === '}' || ch === '^' || ch === '_') {
      i++;
      continue;
    }
    width += glyphAdvance(ch) * (katex && (text[i - 1] === '^' || text[i - 1] === '_') ? 0.72 : 1);
    i++;
  }
  return width;
}

const TEX_RELATIONS = new Set(['le', 'leq', 'ge', 'geq', 'ne', 'neq', 'approx', 'to', 'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow', 'leftrightarrow', 'rightleftharpoons', 'propto', 'equiv', 'sim', 'simeq', 'longrightarrow', 'mapsto']);
const TEX_BINARY = new Set(['cdot', 'times', 'pm', 'mp', 'div', 'circ', 'cup', 'cap']);
const TEX_SPACE: Record<string, number> = { quad: 1, qquad: 2, ',': 0.17, ';': 0.28, ':': 0.22, '!': -0.17, ' ': 0.33 };
/** Named operators KaTeX sets as upright words followed by a thin space. */
const TEX_OPERATORS = /^(?:arc)?(?:sin|cos|tan|sec|csc|cot)h?$|^(?:log|lg|ln|exp|lim|liminf|limsup|max|min|sup|inf|det|dim|ker|deg|gcd|arg|Pr|hom|coth)$/;

/** The `{…}` group (or single character) starting at `start`, and the index after it. */
function texGroup(tex: string, start: number): { body: string; end: number } | null {
  let i = start;
  while (tex[i] === ' ') i++;
  if (i >= tex.length) return null;
  if (tex[i] !== '{') return { body: tex[i]!, end: i + 1 };
  let depth = 0;
  for (let k = i; k < tex.length; k++) {
    if (tex[k] === '{') depth++;
    else if (tex[k] === '}' && --depth === 0) return { body: tex.slice(i + 1, k), end: k + 1 };
  }
  return { body: tex.slice(i + 1), end: tex.length };
}

/**
 * Inline KaTeX width in em, measured against rendered figure overlays (live round 2): glyph advances plus
 * TeX's spacing around relations (≈0.56em) and binary operators (≈0.44em); fractions stack at script size.
 */
function texWidth(tex: string, scale = 1): number {
  let width = 0;
  let prevOrd = false;
  const ord = (advance: number) => { width += advance * scale; prevOrd = true; };
  for (let i = 0; i < tex.length;) {
    const ch = tex[i]!;
    if (ch === '\\') {
      const name = /^\\([A-Za-z]+|.)/.exec(tex.slice(i))?.[1] ?? '';
      let end = i + 1 + name.length;
      if (/^[dt]?frac$/.test(name)) {
        const num = texGroup(tex, end);
        const den = num && texGroup(tex, num.end);
        if (num && den) { ord(Math.max(texWidth(num.body, 0.7), texWidth(den.body, 0.7)) + 0.24); i = den.end; continue; }
      }
      if (/^(text|mathrm|textrm|textbf|mathbf|operatorname|ce|mathit|vec|hat|bar|overline|dot)$/.test(name)) {
        const group = texGroup(tex, end);
        if (group) {
          ord(/^(text|textrm|textbf|operatorname|ce)$/.test(name) ? [...group.body].reduce((sum, c) => sum + glyphAdvance(c), 0) * 0.92 : texWidth(group.body));
          i = group.end;
          continue;
        }
      }
      if (name === 'sqrt') { const group = texGroup(tex, end); if (group) { ord(texWidth(group.body) + 0.85); i = group.end; continue; } }
      if (TEX_OPERATORS.test(name)) ord([...name].reduce((sum, c) => sum + glyphAdvance(c), 0) * 0.92 + 0.17);
      else if (TEX_SPACE[name] !== undefined) width += TEX_SPACE[name]! * scale;
      else if (TEX_RELATIONS.has(name)) { width += 1.33 * scale; prevOrd = false; }
      else if (TEX_BINARY.has(name)) { width += (prevOrd ? 1.22 : 0.78) * scale; prevOrd = false; }
      else if (name !== 'left' && name !== 'right' && name !== 'displaystyle') ord(/^[A-Z]/.test(name) ? 0.75 : 0.6);
      i = end;
      continue;
    }
    if (ch === '^' || ch === '_') {
      const group = texGroup(tex, i + 1);
      if (group) { width += texWidth(group.body, scale * 0.7); i = group.end; prevOrd = true; continue; }
    }
    if (ch === '{' || ch === '}' || ch === ' ') { i++; continue; }
    if (/[=<>≈≤≥≠→⇌∝≡:]/.test(ch)) { width += 1.33 * scale; prevOrd = false; }
    else if (/[+\-−×·±*]/.test(ch)) { width += (prevOrd ? 1.22 : 0.78) * scale; prevOrd = false; }
    else if (/[,;]/.test(ch)) { width += 0.45 * scale; prevOrd = false; }
    else if (/[()]/.test(ch)) { width += 0.39 * scale; prevOrd = ch === ')'; }
    else if (/[[\]|.]/.test(ch)) ord(0.28);
    else if (/[0-9]/.test(ch)) ord(0.5);
    else if (/[A-Z]/.test(ch)) ord(0.72);
    else if (/[a-z]/.test(ch)) ord(0.52);
    else ord(0.6);
    i++;
  }
  return width;
}

export function measureText(text: string, fontSize: number, katex = false): { w: number; h: number } {
  const lines = text.split(/\r?\n/);
  if (katex) {
    const emWidth = Math.max(...lines.map((line) => texWidth(line)), 0.8);
    // An inline fraction stacks two script rows: about twice the height of a plain line.
    // 6% over the measured median plus a 0.4em side pad, so a label never renders wider than its placed box.
    return { w: emWidth * fontSize * 1.06 + 0.4 * fontSize, h: Math.max(1, lines.length) * fontSize * (/\\[dt]?frac/.test(text) ? 2 : 1.35) };
  }
  const emWidth = Math.max(...lines.map((line) => lineWidth(line, false)), 0.8);
  return { w: emWidth * fontSize, h: Math.max(1, lines.length) * fontSize * 1.15 };
}

export { LABEL_GAP };
