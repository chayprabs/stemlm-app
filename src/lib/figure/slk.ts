/**
 * Shared Layout Kernel: cubic-aware strokes, Yoeli 4-position, leaders, seeded annealing.
 * Unsatisfiable layouts fail closed — never emit overlapping labels.
 */
import type { Overlay, Scene, SceneLabel, CompileFailure } from './types';
import { FONT_FLOOR, FONT_MIN, FRAME_PAD, LABEL_GAP } from './types';
import {
  type Box,
  type Segment,
  boxFrom,
  boxHitsAny,
  boxHitsSegment,
  boxesOverlap,
  circleSegments,
  ellipseSegments,
  hashString,
  measureText,
  mulberry32,
  polylineSegments,
  rectSegments,
  samplePathD,
} from './geom';

const SLOTS: Array<SceneLabel['slotHint']> = ['NE', 'NW', 'SE', 'SW', 'N', 'E', 'S', 'W'];

export interface PlacedLabel {
  label: SceneLabel;
  x: number;
  y: number;
  w: number;
  h: number;
  box: Box;
  overlay: boolean;
  leader?: { x1: number; y1: number; x2: number; y2: number };
}

export interface LayoutResult {
  ok: true;
  placed: PlacedLabel[];
  strokes: Segment[];
  fontSize: number;
  gap: number;
}

function strokeSegments(scene: Scene): Segment[] {
  const segs: Segment[] = [];
  for (const s of scene.strokes) {
    if (s.protected && s.role !== 'axis') continue;
    if (s.kind === 'line' && s.points.length >= 4) {
      segs.push({ x1: s.points[0]!, y1: s.points[1]!, x2: s.points[2]!, y2: s.points[3]! });
    } else if (s.kind === 'polyline' || s.kind === 'polygon') {
      segs.push(...polylineSegments(s.points));
      if (s.kind === 'polygon' && s.points.length >= 4) {
        segs.push({
          x1: s.points[s.points.length - 2]!,
          y1: s.points[s.points.length - 1]!,
          x2: s.points[0]!,
          y2: s.points[1]!,
        });
      }
    } else if ((s.kind === 'path' || s.kind === 'arc') && s.d) {
      segs.push(...samplePathD(s.d));
    } else if (s.kind === 'circle' && s.points.length >= 3) {
      segs.push(...circleSegments(s.points[0]!, s.points[1]!, s.points[2]!));
    } else if (s.kind === 'ellipse' && s.points.length >= 4) {
      segs.push(...ellipseSegments(s.points[0]!, s.points[1]!, s.points[2]!, s.points[3]!));
    } else if (s.kind === 'rect' && s.points.length >= 4) {
      segs.push(...rectSegments(s.points[0]!, s.points[1]!, s.points[2]!, s.points[3]!));
    }
  }
  return segs;
}

function slotOffset(slot: string, w: number, h: number, gap: number): { dx: number; dy: number } {
  const ox = w / 2 + gap + 4;
  const oy = h / 2 + gap + 4;
  switch (slot) {
    case 'N':
      return { dx: 0, dy: -oy };
    case 'S':
      return { dx: 0, dy: oy };
    case 'E':
      return { dx: ox, dy: 0 };
    case 'W':
      return { dx: -ox, dy: 0 };
    case 'NE':
      return { dx: ox, dy: -oy };
    case 'NW':
      return { dx: -ox, dy: -oy };
    case 'SE':
      return { dx: ox, dy: oy };
    case 'SW':
      return { dx: -ox, dy: oy };
    default:
      return { dx: ox, dy: -oy };
  }
}

function inFrame(box: Box, w: number, h: number, pad: number): boolean {
  return box.x1 >= pad && box.y1 >= pad && box.x2 <= w - pad && box.y2 <= h - pad;
}

function energy(placed: PlacedLabel[], segs: Segment[], gap: number, w: number, h: number): number {
  let e = 0;
  for (let i = 0; i < placed.length; i++) {
    const a = placed[i]!;
    if (!inFrame(a.box, w, h, 2)) e += 80;
    if (!a.label.protected && boxHitsAny(a.box, segs, gap)) e += 50;
    for (let j = i + 1; j < placed.length; j++) {
      const b = placed[j]!;
      if (boxesOverlap(a.box, b.box, 1)) e += 60;
    }
    if (a.leader) {
      const lead: Segment = a.leader;
      if (boxHitsAny(a.box, [lead], 1)) e += 5;
    }
  }
  return e;
}

function tryPlace(
  lab: SceneLabel,
  dim: { w: number; h: number },
  segs: Segment[],
  occupied: Box[],
  scene: Scene,
  gap: number,
): { x: number; y: number; box: Box; leader?: PlacedLabel['leader'] } | null {
  const order = [...SLOTS];
  if (lab.slotHint && lab.slotHint !== 'auto') {
    const i = order.indexOf(lab.slotHint);
    if (i > 0) {
      order.splice(i, 1);
      order.unshift(lab.slotHint);
    }
  }
  for (const scale of [1, 1.45, 1.9, 2.35, 2.8]) {
    for (const slot of order) {
      const offset = slotOffset(slot ?? 'NE', dim.w, dim.h, gap);
      const x = lab.x + offset.dx * scale;
      const y = lab.y + offset.dy * scale;
      const box = boxFrom(x, y, dim.w, dim.h);
      if (!inFrame(box, scene.width, scene.height, 4)) continue;
      if (occupied.some((o) => boxesOverlap(o, box, 2))) continue;
      if (boxHitsAny(box, segs, gap)) continue;
      return { x, y, box };
    }
  }
  // Crowded anchored labels sometimes need a small local move that is not one of the
  // eight canonical slots. Search a bounded square before escalating to a frame leader.
  for (let radius = 8; radius <= 72; radius += 4) {
    for (let dx = -radius; dx <= radius; dx += 4) {
      for (const dy of [-radius, radius]) {
        const x = lab.x + dx;
        const y = lab.y + dy;
        const box = boxFrom(x, y, dim.w, dim.h);
        if (!inFrame(box, scene.width, scene.height, 4)) continue;
        if (occupied.some((o) => boxesOverlap(o, box, 2))) continue;
        if (boxHitsAny(box, segs, gap)) continue;
        return { x, y, box };
      }
    }
    for (let dy = -radius + 4; dy <= radius - 4; dy += 4) {
      for (const dx of [-radius, radius]) {
        const x = lab.x + dx;
        const y = lab.y + dy;
        const box = boxFrom(x, y, dim.w, dim.h);
        if (!inFrame(box, scene.width, scene.height, 4)) continue;
        if (occupied.some((o) => boxesOverlap(o, box, 2))) continue;
        if (boxHitsAny(box, segs, gap)) continue;
        return { x, y, box };
      }
    }
  }
  // Leader to nearest free frame slot (straight, then orthogonal).
  const candidates = [
    { x: scene.width - FRAME_PAD - dim.w / 2, y: FRAME_PAD + dim.h / 2 },
    { x: FRAME_PAD + dim.w / 2, y: FRAME_PAD + dim.h / 2 },
    { x: scene.width - FRAME_PAD - dim.w / 2, y: scene.height - FRAME_PAD - dim.h / 2 },
    { x: FRAME_PAD + dim.w / 2, y: scene.height - FRAME_PAD - dim.h / 2 },
    { x: scene.width / 2, y: FRAME_PAD + dim.h / 2 },
    { x: scene.width / 2, y: scene.height - FRAME_PAD - dim.h / 2 },
    { x: FRAME_PAD + dim.w / 2, y: scene.height / 2 },
    { x: scene.width - FRAME_PAD - dim.w / 2, y: scene.height / 2 },
  ];
  for (const c of candidates) {
    const box = boxFrom(c.x, c.y, dim.w, dim.h);
    if (occupied.some((o) => boxesOverlap(o, box, 2))) continue;
    if (boxHitsAny(box, segs, gap)) continue;
    const leader = { x1: lab.x, y1: lab.y, x2: c.x, y2: c.y };
    const leadSeg: Segment = leader;
    if (occupied.some((occupiedBox) => boxHitsSegment(occupiedBox, leadSeg, 1))) continue;
    if (boxHitsAny(box, [leadSeg], 1)) continue;
    return { x: c.x, y: c.y, box, leader };
  }
  return null;
}

function tryPlaceProtected(
  lab: SceneLabel,
  dim: { w: number; h: number },
  occupied: Box[],
  scene: Scene,
  gap: number,
  axisSegments: Segment[],
): { x: number; y: number; box: Box; leader?: PlacedLabel['leader'] } | null {
  const acceptable = (x: number, y: number): { x: number; y: number; box: Box } | null => {
    const box = boxFrom(x, y, dim.w, dim.h, 'middle', 'middle');
    if (!inFrame(box, scene.width, scene.height, 4)) return null;
    if (occupied.some((other) => boxesOverlap(other, box, 0.5))) return null;
    if (axisSegments.some((segment) => boxHitsSegment(box, segment, 0.5))) return null;
    return { x, y, box };
  };

  const exact = acceptable(lab.x, lab.y);
  if (exact) return exact;

  // Required labels keep their asserted position whenever it is free. If another required
  // label owns that box, make only a bounded local adjustment; labels in tables may be inside
  // protected grid strokes, so this pass intentionally checks label boxes, not drawing strokes.
  for (let radius = 4; radius <= 32; radius += 4) {
    for (let dx = -radius; dx <= radius; dx += 4) {
      const dy = radius - Math.abs(dx);
      const offsets = dy ? [dy, -dy] : [0];
      for (const signedDy of offsets) {
        const candidate = acceptable(lab.x + dx, lab.y + signedDy);
        if (candidate) return candidate;
      }
    }
  }

  return tryPlace(lab, dim, axisSegments, occupied, scene, gap);
}

function labelPriority(label: SceneLabel): 'required' | 'preferred' | 'optional' {
  return label.priority ?? (label.protected ? 'required' : 'optional');
}

function layoutAtFontSize(scene: Scene, fontSize: number): LayoutResult | CompileFailure {
  const gap = LABEL_GAP(fontSize);
  const segs = strokeSegments(scene);
  const axisSegments = strokeSegments({ ...scene, strokes: scene.strokes.filter((stroke) => stroke.role === 'axis') });
  const placed: PlacedLabel[] = [];
  const occupied: Box[] = [];
  const priorityOrder = { required: 0, preferred: 1, optional: 2 } as const;
  const labels = [...scene.labels].sort((a, b) => {
    const priority = priorityOrder[labelPriority(a)] - priorityOrder[labelPriority(b)];
    return priority || (a.katex ? 1 : 0) - (b.katex ? 1 : 0);
  });

  const placeOne = (lab: SceneLabel): boolean => {
    const isKatex = Boolean(lab.katex);
    const source = lab.katex ?? lab.text ?? '';
    const dim = measureText(source, fontSize, isKatex);
    if (lab.protected) {
      const pos = tryPlaceProtected(lab, dim, occupied, scene, gap, axisSegments);
      if (pos) {
        placed.push({ label: lab, x: pos.x, y: pos.y, w: dim.w, h: dim.h, box: pos.box, overlay: isKatex, leader: pos.leader });
        occupied.push(pos.box);
        return true;
      }
      return false;
    }
    const pos = tryPlace(lab, dim, segs, occupied, scene, gap);
    if (!pos) return false;
    placed.push({ label: lab, x: pos.x, y: pos.y, w: dim.w, h: dim.h, box: pos.box, overlay: isKatex, leader: pos.leader });
    occupied.push(pos.box);
    return true;
  };

  for (const lab of labels) {
    if (placeOne(lab)) continue;
    if (labelPriority(lab) === 'required') {
      return { ok: false, code: 'unsatisfiable', reason: `no collision-free slot for label ${lab.id}` };
    }
  }

  const movable = placed.filter((p) => !p.label.protected);
  let bestE = energy(movable, segs, gap, scene.width, scene.height);
  if (bestE > 0 && movable.length) {
    const seed = hashString(`${scene.family}|${scene.labels.map((l) => l.id).sort().join(',')}`);
    const rnd = mulberry32(seed);
    for (let sweep = 0; sweep < 50; sweep++) {
      const p = movable[Math.floor(rnd() * movable.length)]!;
      const nx = p.x + (rnd() - 0.5) * 16;
      const ny = p.y + (rnd() - 0.5) * 12;
      const box = boxFrom(nx, ny, p.w, p.h);
      if (!inFrame(box, scene.width, scene.height, 2)) continue;
      const prev = { x: p.x, y: p.y, box: p.box };
      p.x = nx;
      p.y = ny;
      p.box = box;
      const e = energy(movable, segs, gap, scene.width, scene.height);
      if (e <= bestE) bestE = e;
      else {
        p.x = prev.x;
        p.y = prev.y;
        p.box = prev.box;
      }
      if (bestE === 0) break;
    }
  }

  const collide = movable.some((p, i) => {
    if (boxHitsAny(p.box, segs, gap)) return true;
    return movable.some((q, j) => i !== j && boxesOverlap(p.box, q.box, 0.5));
  });
  if (collide) return { ok: false, code: 'unsatisfiable', reason: 'label layout unsatisfiable' };
  return { ok: true, placed, strokes: segs, fontSize, gap };
}

export function layoutScene(scene: Scene): LayoutResult | CompileFailure {
  let lastFailure: CompileFailure = { ok: false, code: 'unsatisfiable', reason: 'label layout unsatisfiable' };
  for (const fontSize of [FONT_MIN, FONT_MIN - 1, FONT_MIN - 2, FONT_FLOOR]) {
    const result = layoutAtFontSize(scene, fontSize);
    if (result.ok) return result;
    lastFailure = result;
  }
  return lastFailure;
}

export function overlaysFromLayout(layout: LayoutResult): Overlay[] {
  return layout.placed
    .filter((p) => p.overlay && p.label.katex)
    .map((p) => ({
      id: p.label.id,
      kind: 'katex' as const,
      source: p.label.katex!,
      x: p.x,
      y: p.y,
      anchor: 'middle' as const,
      baseline: 'middle' as const,
      width: p.w,
      height: p.h,
    }));
}

export function labelHitsStrokes(layout: LayoutResult, id: string): boolean {
  const p = layout.placed.find((x) => x.label.id === id);
  if (!p) return false;
  return boxHitsAny(p.box, layout.strokes, layout.gap);
}

export { strokeSegments };
