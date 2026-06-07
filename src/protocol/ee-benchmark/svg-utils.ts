/**
 * SVG diagram validation: collision detection, bounds, label checks.
 */
import { extractSvg, sanitizeSvg } from '@/src/lib/sanitize';
import { computeDisplaySize, parseViewBox } from '@/src/lib/diagram-bounds';
import type { DiagramAuditResult } from './types';

interface TextBBox {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
}

interface LineSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const MIN_LABEL_FONT = 9;
const MIN_LABEL_SPACING = 4;
const MIN_WIRE_LABEL_GAP = 6;

function parseNum(s: string | null | undefined, fallback = 0): number {
  if (s == null || s === '') return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function extractTextBoxes(svg: string): TextBBox[] {
  const boxes: TextBBox[] = [];
  const re = /<text\b([^>]*)>([^<]*)<\/text>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const attrs = m[1]!;
    const text = m[2]!.trim();
    if (!text) continue;
    const x = parseNum(/x="([^"]*)"/.exec(attrs)?.[1]);
    const y = parseNum(/y="([^"]*)"/.exec(attrs)?.[1]);
    const fs = parseNum(/font-size="([^"]*)"/.exec(attrs)?.[1], 12);
    const anchor = /text-anchor="middle"/.test(attrs) ? 'middle' : /text-anchor="end"/.test(attrs) ? 'end' : 'start';
    const w = text.length * fs * 0.55;
    const h = fs * 1.2;
    let bx = x;
    if (anchor === 'middle') bx = x - w / 2;
    else if (anchor === 'end') bx = x - w;
    boxes.push({ x: bx, y: y - h * 0.8, w, h, text });
  }
  return boxes;
}

function extractLines(svg: string): LineSeg[] {
  const segs: LineSeg[] = [];
  const lineRe = /<line\b([^/]*)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(svg))) {
    const a = m[1]!;
    segs.push({
      x1: parseNum(/x1="([^"]*)"/.exec(a)?.[1]),
      y1: parseNum(/y1="([^"]*)"/.exec(a)?.[1]),
      x2: parseNum(/x2="([^"]*)"/.exec(a)?.[1]),
      y2: parseNum(/y2="([^"]*)"/.exec(a)?.[1]),
    });
  }
  return segs;
}

function boxesOverlap(a: TextBBox, b: TextBBox, margin = MIN_LABEL_SPACING): boolean {
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w + margin > b.x &&
    a.y < b.y + b.h + margin &&
    a.y + a.h + margin > b.y
  );
}

function pointToSegmentDist(px: number, py: number, seg: LineSeg): number {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - seg.x1, py - seg.y1);
  let t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = seg.x1 + t * dx;
  const cy = seg.y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function textOverlapsWire(box: TextBBox, seg: LineSeg): boolean {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const corners = [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x, box.y + box.h],
    [box.x + box.w, box.y + box.h],
    [cx, cy],
  ];
  for (const corner of corners) {
    if (pointToSegmentDist(corner[0]!, corner[1]!, seg) < MIN_WIRE_LABEL_GAP) return true;
  }
  return false;
}

export function svgParses(svg: string): boolean {
  if (!svg?.trim()) return false;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  return !doc.querySelector('parsererror') && doc.documentElement.tagName.toLowerCase() === 'svg';
}

export function countSvgPrimitives(svg: string): number {
  const matches = svg.match(/<(line|path|polyline|polygon|rect|circle|ellipse)\b/gi);
  return matches?.length ?? 0;
}

export function countSvgLabels(svg: string): number {
  const matches = svg.match(/<text\b/gi);
  return matches?.length ?? 0;
}

export function auditSvgDiagram(svg: string, stepTitle = ''): DiagramAuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!svg?.trim()) {
    errors.push('empty SVG');
    return { ok: false, errors, warnings };
  }

  const clean = sanitizeSvg(extractSvg(svg));
  if (!svgParses(clean)) {
    errors.push('SVG fails XML parse after sanitization');
    return { ok: false, errors, warnings };
  }

  const primitives = countSvgPrimitives(clean);
  const labels = countSvgLabels(clean);
  if (primitives < 3) errors.push(`too few primitives (${primitives}, need ≥3)`);
  if (labels < 2) warnings.push(`few labels (${labels}, prefer ≥2)`);

  const vb = parseViewBox(/viewBox="([^"]*)"/.exec(clean)?.[1]);
  if (!vb) {
    warnings.push('missing or invalid viewBox');
  } else {
    const stepSize = computeDisplaySize(/viewBox="([^"]*)"/.exec(clean)?.[1], 'step');
    const printSize = computeDisplaySize(/viewBox="([^"]*)"/.exec(clean)?.[1], 'print');
    if (stepSize.width < 50 || stepSize.height < 30) {
      warnings.push(`diagram may be too small in panel (${stepSize.width}×${stepSize.height}px)`);
    }
    if (printSize.width > 500 || printSize.height > 300) {
      warnings.push(`diagram may overflow PDF bounds (${printSize.width}×${printSize.height}px)`);
    }
    // Check elements stay within viewBox
    const textBoxes = extractTextBoxes(clean);
    for (const box of textBoxes) {
      if (box.x < vb.x - 5 || box.y < vb.y - 5) {
        warnings.push(`label "${box.text}" near viewBox edge (top-left)`);
      }
      if (box.x + box.w > vb.x + vb.w + 5 || box.y + box.h > vb.y + vb.h + 5) {
        warnings.push(`label "${box.text}" may clip viewBox`);
      }
    }
  }

  const textBoxes = extractTextBoxes(clean);
  const lines = extractLines(clean);

  // Label-label collisions
  for (let i = 0; i < textBoxes.length; i++) {
    for (let j = i + 1; j < textBoxes.length; j++) {
      if (boxesOverlap(textBoxes[i]!, textBoxes[j]!)) {
        errors.push(
          `label collision: "${textBoxes[i]!.text}" overlaps "${textBoxes[j]!.text}"${stepTitle ? ` in step "${stepTitle}"` : ''}`,
        );
      }
    }
  }

  // Label-wire collisions (only for horizontal/vertical wires near label center)
  for (const box of textBoxes) {
    for (const seg of lines) {
      if (textOverlapsWire(box, seg)) {
        const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
        if (len > 20) {
          warnings.push(`label "${box.text}" may overlap wire segment`);
        }
      }
    }
  }

  // Font size check
  const fsRe = /font-size="(\d+)"/g;
  let fsMatch: RegExpExecArray | null;
  while ((fsMatch = fsRe.exec(clean))) {
    if (parseNum(fsMatch[1]) < MIN_LABEL_FONT) {
      warnings.push(`font-size ${fsMatch[1]}px below minimum ${MIN_LABEL_FONT}px`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
