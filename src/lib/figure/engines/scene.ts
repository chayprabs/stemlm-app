import type { CompileCtx, CompileResult, Scene } from '../types';
import { specGet, specGetAll, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';
import { SCENE_VARIANTS } from '../catalog';
import { type Box, type Segment as LineSegment, boxFrom, boxHitsAny, boxesOverlap, distPointSeg, measureText } from '../geom';
import { strokeSegments } from '../slk';
import { FONT_MIN, LABEL_GAP, type LabelPriority, type SlotHint } from '../types';
import { dropped, formatTicks, niceTicks, raised } from './plot';

type Point = { x: number; y: number };
type Failure = Extract<CompileResult, { ok: false }>;

const failure = (reason: string, code: Failure['code'] = 'malformed'): Failure => ({ ok: false, code, reason });

function idPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function uniqueId(base: string, used: Set<string>): string {
  const clean = idPart(base);
  let id = clean;
  let n = 2;
  while (used.has(id)) id = `${clean}-${n++}`;
  used.add(id);
  return id;
}

function words(raw: string): string[] {
  return raw.trim().split(/\s+/).filter(Boolean);
}

function keysAreKnown(spec: SpecDoc, allowed: readonly string[]): Failure | null {
  const permitted = new Set([...allowed, 'kind', 'highlight', 'caption']);
  for (const key of spec.values.keys()) {
    if (!permitted.has(key)) return failure(`unsupported scene key: ${key}`);
  }
  for (const key of spec.lists.keys()) {
    if (!permitted.has(key)) return failure(`unsupported scene key: ${key}`);
  }
  return null;
}

function drawPanels(b: SceneBuilder, spec: SpecDoc, w: number, h: number): Map<string, { x: number; y: number; w: number; h: number }> {
  const panels = new Map<string, { x: number; y: number; w: number; h: number }>();
  const entries = specGetAll(spec, 'panel');
  if (!entries.length) return panels;
  const gap = 8;
  const panelW = (w - gap * (entries.length + 1)) / entries.length;
  entries.forEach((raw, i) => {
    const parts = words(raw);
    const id = parts[0] ?? `panel-${i + 1}`;
    const role = parts.slice(1).join(' ') || 'scene panel';
    const box = { x: gap + i * (panelW + gap), y: 18, w: panelW, h: h - 28 };
    panels.set(id.toLowerCase(), box);
    b.panel(idPart(id), role, box.x, box.y, box.w, box.h);
    b.rect(`panel-${idPart(id)}`, box.x, box.y, box.w, box.h, { role: 'boundary', color: 'guide', width: 1 });
    b.label(`panel-label-${idPart(id)}`, role, box.x + box.w / 2, box.y + 7, { slot: 'N', priority: 'optional', panelId: idPart(id) });
  });
  return panels;
}

function parseAngle(raw: string): { degrees: number; reference: string } | null {
  const m = /(?:at\s+)?(-?\d+(?:\.\d+)?)\s*(?:deg|°)\s+(?:from|relative\s+to)\s+([a-z][a-z0-9_.-]*)/i.exec(raw);
  if (!m) return null;
  return { degrees: Number(m[1]), reference: m[2]!.toLowerCase() };
}

type ParsedForce = {
  name: string;
  owner?: string;
  direction: string;
  magnitude?: number;
  magnitudeText?: string;
  unit?: string;
};

const FORCE_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const FORCE_ATTACHED_QUANTITY = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)([a-zµμΩ%][a-z0-9µμΩ%/^._-]*)$/i;
const FORCE_UNIT = /^[a-zµμΩ%][a-z0-9µμΩ%/^._-]*$/i;
const FORCE_DIRECTION_START = /^(?:up|down|left|right|up[-_]left|up[-_]right|down[-_]left|down[-_]right|up[-_]incline|down[-_]incline|normal\+|weight|at)$/i;

function parseForce(raw: string): ParsedForce | Failure {
  const parts = words(raw);
  const name = parts.shift();
  if (!name) return failure('force needs a name');

  let owner: string | undefined;
  const onIndexes = parts.reduce<number[]>((indexes, part, index) => {
    if (part.toLowerCase() === 'on') indexes.push(index);
    return indexes;
  }, []);
  if (onIndexes.length > 1) return failure(`force ${name} has more than one owner clause`);
  if (onIndexes.length === 1) {
    const onIndex = onIndexes[0]!;
    owner = parts[onIndex + 1];
    if (!owner || !/^[a-z][a-z0-9_.-]*$/i.test(owner)) return failure(`force ${name} needs a body after on`);
    parts.splice(onIndex, 2);
  }

  let magnitude: number | undefined;
  let magnitudeText: string | undefined;
  let unit: string | undefined;
  const first = parts[0];
  if (first) {
    const attached = FORCE_ATTACHED_QUANTITY.exec(first);
    if (attached) {
      magnitude = Number(attached[1]);
      unit = attached[2];
      magnitudeText = `${attached[1]} ${attached[2]}`;
      parts.shift();
    } else if (FORCE_NUMBER.test(first)) {
      const rawUnit = parts[1];
      if (!rawUnit || !FORCE_UNIT.test(rawUnit)) return failure(`force ${name} magnitude needs a unit`);
      magnitude = Number(first);
      unit = rawUnit;
      magnitudeText = `${first} ${rawUnit}`;
      parts.splice(0, 2);
    } else if (!FORCE_DIRECTION_START.test(first)) {
      return failure(`force ${name} has an unsupported magnitude or direction`);
    }
    if (magnitude !== undefined && (!Number.isFinite(magnitude) || magnitude <= 0)) {
      return failure(`force ${name} magnitude must be positive and finite`);
    }
  }
  if (!parts.length) return failure(`force ${name} needs a direction`);
  return { name, owner, direction: parts.join(' '), magnitude, magnitudeText, unit };
}

function vectorForForce(raw: string, inclineDeg: number, knownAngles: Map<string, number>): { dx: number; dy: number } | null {
  const angle = parseAngle(raw);
  let visualDeg: number;
  if (angle) {
    const base = angle.reference === 'horizontal' || angle.reference === 'x'
      ? 0
      : angle.reference === 'vertical' || angle.reference === 'y'
        ? -90
        : angle.reference === 'incline' || angle.reference === 'surface'
          ? -inclineDeg
          : knownAngles.get(angle.reference);
    if (base === undefined) return null;
    visualDeg = base - angle.degrees;
  } else {
    const token = words(raw).find((part) => /^(up|down|left|right|up[-_]left|up[-_]right|down[-_]left|down[-_]right|up[-_]incline|down[-_]incline|normal\+|weight)$/i.test(part));
    if (!token) return null;
    const directions: Record<string, number> = {
      up: -90, down: 90, left: 180, right: 0, 'up-left': -135, up_left: -135,
      'up-right': -45, up_right: -45, 'down-left': 135, down_left: 135,
      'down-right': 45, down_right: 45, 'up-incline': -inclineDeg, up_incline: -inclineDeg,
      'down-incline': 180 - inclineDeg, down_incline: 180 - inclineDeg,
      'normal+': -90 - inclineDeg, weight: 90,
    };
    const direction = directions[token.toLowerCase()];
    if (direction === undefined) return null;
    visualDeg = direction;
  }
  const rad = (visualDeg * Math.PI) / 180;
  return { dx: Math.cos(rad), dy: Math.sin(rad) };
}

function namedBodies(spec: SpecDoc): string[] {
  const ids: string[] = [];
  for (const raw of specGetAll(spec, 'body')) {
    const id = words(raw)[0];
    if (id && !ids.some((existing) => existing.toLowerCase() === id.toLowerCase())) ids.push(id);
  }
  return ids.length ? ids : ['body'];
}

function bodyPositions(ids: string[], w: number, h: number): Map<string, Point> {
  const positions = new Map<string, Point>();
  ids.forEach((id, i) => {
    // Leave a full arrow and its label beside the outermost bodies.
    const x = ids.length === 1 ? w * 0.45 : 70 + (i * (w - 140)) / Math.max(1, ids.length - 1);
    positions.set(id.toLowerCase(), { x, y: h * 0.56 });
  });
  return positions;
}

type BodyPose = {
  center: Point;
  tangent: Point;
  normal: Point;
  halfWidth: number;
  halfHeight: number;
};

function orientedBasis(degrees: number): { tangent: Point; normal: Point } {
  const radians = (degrees * Math.PI) / 180;
  const tangent = { x: Math.cos(radians), y: -Math.sin(radians) };
  return { tangent, normal: { x: -Math.sin(radians), y: -Math.cos(radians) } };
}

function bodyPolygon(pose: BodyPose): number[] {
  const { center, tangent, normal, halfWidth, halfHeight } = pose;
  const corners = [
    { x: center.x - tangent.x * halfWidth + normal.x * halfHeight, y: center.y - tangent.y * halfWidth + normal.y * halfHeight },
    { x: center.x + tangent.x * halfWidth + normal.x * halfHeight, y: center.y + tangent.y * halfWidth + normal.y * halfHeight },
    { x: center.x + tangent.x * halfWidth - normal.x * halfHeight, y: center.y + tangent.y * halfWidth - normal.y * halfHeight },
    { x: center.x - tangent.x * halfWidth - normal.x * halfHeight, y: center.y - tangent.y * halfWidth - normal.y * halfHeight },
  ];
  return corners.flatMap(({ x, y }) => [x, y]);
}

function bodyContactEdge(pose: BodyPose): [Point, Point] {
  const contact = {
    x: pose.center.x - pose.normal.x * pose.halfHeight,
    y: pose.center.y - pose.normal.y * pose.halfHeight,
  };
  return [
    { x: contact.x - pose.tangent.x * pose.halfWidth, y: contact.y - pose.tangent.y * pose.halfWidth },
    { x: contact.x + pose.tangent.x * pose.halfWidth, y: contact.y + pose.tangent.y * pose.halfWidth },
  ];
}

function bodyBoundaryPoint(pose: BodyPose, direction: Point): Point {
  const length = Math.hypot(direction.x, direction.y);
  if (length <= 1e-9) return pose.center;
  const unit = { x: direction.x / length, y: direction.y / length };
  const tangentReach = Math.abs(unit.x * pose.tangent.x + unit.y * pose.tangent.y) / pose.halfWidth;
  const normalReach = Math.abs(unit.x * pose.normal.x + unit.y * pose.normal.y) / pose.halfHeight;
  const reach = 1 / Math.max(tangentReach, normalReach, 1e-9);
  return { x: pose.center.x + unit.x * reach, y: pose.center.y + unit.y * reach };
}

function bodyBoundingBox(pose: BodyPose): { x: number; y: number; w: number; h: number } {
  const points = bodyPolygon(pose);
  const xs = points.filter((_, index) => index % 2 === 0);
  const ys = points.filter((_, index) => index % 2 === 1);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function pointForBodyContact(pose: BodyPose): Point {
  return {
    x: pose.center.x - pose.normal.x * pose.halfHeight,
    y: pose.center.y - pose.normal.y * pose.halfHeight,
  };
}

function lookupPoint(points: Map<string, Point>, raw: string): Point | undefined {
  return points.get(raw.toLowerCase()) ?? points.get(idPart(raw));
}

type Segment = { from: Point; to: Point };

const NORMAL_RELATION_KINDS = new Set(['perpendicular', 'perpendicular-to', 'normal', 'normal-to']);

function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

function segmentRelationMarker(first: Segment, second: Segment, kind: string): number[] | Failure {
  const firstVector = { x: first.to.x - first.from.x, y: first.to.y - first.from.y };
  const secondVector = { x: second.to.x - second.from.x, y: second.to.y - second.from.y };
  const firstLength = Math.hypot(firstVector.x, firstVector.y);
  const secondLength = Math.hypot(secondVector.x, secondVector.y);
  if (firstLength <= 1e-6 || secondLength <= 1e-6) return failure(`${kind} relation needs two non-zero segments`);
  const firstUnit = { x: firstVector.x / firstLength, y: firstVector.y / firstLength };
  const secondUnit = { x: secondVector.x / secondLength, y: secondVector.y / secondLength };
  if (Math.abs(firstUnit.x * secondUnit.x + firstUnit.y * secondUnit.y) > 0.02) {
    return failure(`${kind} relation requires orthogonal segment geometry`);
  }

  const denominator = cross(firstVector, secondVector);
  const between = (value: number) => value >= -1e-6 && value <= 1 + 1e-6;
  let anchor: Point | null = null;
  if (Math.abs(denominator) > 1e-6) {
    const offset = { x: second.from.x - first.from.x, y: second.from.y - first.from.y };
    const firstT = cross(offset, secondVector) / denominator;
    const secondT = cross(offset, firstVector) / denominator;
    if (between(firstT) && between(secondT)) {
      anchor = { x: first.from.x + firstVector.x * firstT, y: first.from.y + firstVector.y * firstT };
    }
  }
  if (!anchor) {
    const midpoint = { x: (first.from.x + first.to.x) / 2, y: (first.from.y + first.to.y) / 2 };
    const offset = { x: midpoint.x - second.from.x, y: midpoint.y - second.from.y };
    const projection = (offset.x * secondVector.x + offset.y * secondVector.y) / (secondLength * secondLength);
    const clamped = Math.max(0, Math.min(1, projection));
    anchor = { x: second.from.x + secondVector.x * clamped, y: second.from.y + secondVector.y * clamped };
  }

  const size = Math.max(6, Math.min(12, Math.min(firstLength, secondLength) * 0.2));
  const firstCorner = { x: anchor.x + firstUnit.x * size, y: anchor.y + firstUnit.y * size };
  const secondCorner = { x: firstCorner.x + secondUnit.x * size, y: firstCorner.y + secondUnit.y * size };
  const end = { x: anchor.x + secondUnit.x * size, y: anchor.y + secondUnit.y * size };
  return [firstCorner.x, firstCorner.y, secondCorner.x, secondCorner.y, end.x, end.y];
}

/** Environment anchors sit beside the body they hold: a ceiling above it, a floor below it, a wall on its near side. */
function lookupFbdPoint(
  points: Map<string, Point>,
  raw: string,
  b: SceneBuilder,
  w: number,
  h: number,
  used: Set<string>,
  partner?: Point,
): Point | undefined {
  const existing = lookupPoint(points, raw);
  if (existing) return existing;
  const name = raw.trim();
  if (!/^(wall|ceiling|ground|floor|support|anchor)$/i.test(name)) return undefined;
  const anchorId = uniqueId(`anchor-${idPart(name)}`, used);
  const x = partner?.x ?? w * 0.5;
  let p: Point;
  if (/wall/i.test(name)) {
    const left = x < w / 2;
    p = { x: left ? 14 : w - 14, y: partner?.y ?? h * 0.5 };
    b.rect(anchorId, left ? 6 : w - 14, p.y - 24, 8, 48, { color: 'neutral', role: 'boundary', pattern: 'hatch' });
  } else if (/ground|floor/i.test(name)) {
    p = { x, y: h - 18 };
    b.rect(anchorId, x - 24, p.y, 48, 8, { color: 'neutral', role: 'boundary', pattern: 'hatch' });
  } else {
    p = { x, y: 22 };
    b.rect(anchorId, x - 24, p.y - 8, 48, 8, { color: 'neutral', role: 'boundary', pattern: 'hatch' });
  }
  points.set(name.toLowerCase(), p);
  return p;
}

const FBD_ARROW = 43;

/** The label continues its arrow: the slot on the side the arrow points to. */
function slotForDirection(dx: number, dy: number): SlotHint {
  const octants = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'] as const;
  return octants[Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) / 45) % 8]!;
}

/** Body half-size that holds its name inside, even when tilted; bodies whose name cannot fit keep it below. */
function bodyExtent(name: string, degrees: number): { halfWidth: number; halfHeight: number; inside: boolean } {
  const text = measureText(name, FONT_MIN);
  const a = text.w / 2 + 3;
  const b = text.h / 2 + 1;
  const c = Math.abs(Math.cos((degrees * Math.PI) / 180));
  const s = Math.abs(Math.sin((degrees * Math.PI) / 180));
  const halfWidth = Math.max(18, a * c + b * s);
  const halfHeight = Math.max(16, a * s + b * c);
  return halfWidth <= 32 && halfHeight <= 22 ? { halfWidth, halfHeight, inside: true } : { halfWidth: 18, halfHeight: 16, inside: false };
}

function segmentGap(a1: Point, a2: Point, b1: Point, b2: Point): number {
  const d1 = cross({ x: a2.x - a1.x, y: a2.y - a1.y }, { x: b1.x - a1.x, y: b1.y - a1.y });
  const d2 = cross({ x: a2.x - a1.x, y: a2.y - a1.y }, { x: b2.x - a1.x, y: b2.y - a1.y });
  const d3 = cross({ x: b2.x - b1.x, y: b2.y - b1.y }, { x: a1.x - b1.x, y: a1.y - b1.y });
  const d4 = cross({ x: b2.x - b1.x, y: b2.y - b1.y }, { x: a2.x - b1.x, y: a2.y - b1.y });
  if (d1 * d2 < 0 && d3 * d4 < 0) return 0;
  const seg = (p: Point, s: Point, e: Point) => distPointSeg(p.x, p.y, { x1: s.x, y1: s.y, x2: e.x, y2: e.y });
  return Math.min(seg(a1, b1, b2), seg(a2, b1, b2), seg(b1, a1, a2), seg(b2, a1, a2));
}

type ForcePlan = {
  force: ParsedForce;
  vec: { dx: number; dy: number };
  owner: string;
  fraction: number;
  text: string;
  slot: SlotHint;
  size: { w: number; h: number };
};

/** The layout kernel's box for a label placed in `slot` beside `at`. */
function labelBoxAt(at: Point, slot: SlotHint, size: { w: number; h: number }): Box {
  const gap = LABEL_GAP(FONT_MIN) + 4;
  const dx = slot.includes('E') ? size.w / 2 + gap : slot.includes('W') ? -(size.w / 2 + gap) : 0;
  const dy = slot.includes('N') ? -(size.h / 2 + gap) : slot.includes('S') ? size.h / 2 + gap : 0;
  return { x1: at.x + dx - size.w / 2, y1: at.y + dy - size.h / 2, x2: at.x + dx + size.w / 2, y2: at.y + dy + size.h / 2 };
}

function drawFbd(b: SceneBuilder, spec: SpecDoc, w: number, h: number): CompileResult | null {
  const invalid = keysAreKnown(spec, SCENE_VARIANTS.fbd!.allowed);
  if (invalid) return invalid;
  const panels = drawPanels(b, spec, w, h);
  const bodies = namedBodies(spec);
  const keys = bodies.map((body) => body.toLowerCase());
  const positions = bodyPositions(bodies, w, h);
  const used = new Set<string>();
  const inclineRaw = specGet(spec, 'incline_deg');
  const incline = inclineRaw === undefined ? 0 : specNumber(spec, 'incline_deg');
  if (incline === undefined) return failure('incline_deg needs a finite numeric degree value');
  const { tangent, normal } = orientedBasis(incline);
  const extents = new Map(bodies.map((body) => [body.toLowerCase(), bodyExtent(body, incline)]));
  const widest = Math.max(...[...extents.values()].map((extent) => extent.halfWidth));
  const tallest = Math.max(...[...extents.values()].map((extent) => extent.halfHeight));
  const poseAt = (key: string, center: Point): BodyPose => ({ center, tangent, normal, halfWidth: extents.get(key)!.halfWidth, halfHeight: extents.get(key)!.halfHeight });
  const bodyPanel = new Map<string, string>();
  for (const raw of specGetAll(spec, 'body')) {
    const body = words(raw)[0];
    const panel = /\bpanel=([^\s]+)/i.exec(raw)?.[1];
    if (body && panel) {
      if (!panels.has(panel.toLowerCase())) return failure(`body ${body} references unknown panel ${panel}`);
      bodyPanel.set(body.toLowerCase(), idPart(panel));
      const box = panels.get(panel.toLowerCase())!;
      positions.set(body.toLowerCase(), { x: box.x + box.w / 2, y: box.y + box.h * 0.55 });
    }
  }
  const halfSpan = Math.min(96, Math.max(44, Math.min(
    (w - widest * 2 - 20) / Math.max(Math.abs(tangent.x), 1e-6),
    (h - tallest * 2 - 36) / Math.max(Math.abs(tangent.y), 1e-6),
  ) / 2));
  // The wedge stands on the frame bottom so the weight arrow has depth to drop into.
  const planeCenter = { x: w / 2, y: Math.max(h * 0.58, h - 10 - halfSpan * Math.abs(tangent.y)) };
  if (incline !== 0) {
    const freeBodies = bodies.filter((body) => !bodyPanel.has(body.toLowerCase()));
    freeBodies.forEach((body, index) => {
      // A lone body sits a little up-slope, leaving the foot of the wedge to the angle mark.
      const offset = freeBodies.length <= 1 ? halfSpan * 0.45 * Math.sign(-tangent.y || 1) : -halfSpan + (2 * halfSpan * index) / (freeBodies.length - 1);
      const contact = { x: planeCenter.x + tangent.x * offset, y: planeCenter.y + tangent.y * offset };
      const lift = extents.get(body.toLowerCase())!.halfHeight;
      positions.set(body.toLowerCase(), { x: contact.x + normal.x * lift, y: contact.y + normal.y * lift });
    });
  }

  // Forces resolve before anything is drawn: their directions and labels decide how much room each body needs.
  const parsedForces: ParsedForce[] = [];
  for (const raw of specGetAll(spec, 'force')) {
    const parsed = parseForce(raw);
    if ('ok' in parsed) return parsed;
    parsedForces.push(parsed);
  }
  const declaredUnits = parsedForces.filter((force) => force.magnitude !== undefined && force.unit);
  const comparableUnit = declaredUnits.length > 0 && declaredUnits.length === parsedForces.length
    && declaredUnits.every((force) => force.unit === declaredUnits[0]!.unit);
  const maxMagnitude = comparableUnit
    ? Math.max(...declaredUnits.map((force) => force.magnitude!))
    : 0;
  const minMagnitude = comparableUnit
    ? Math.min(...declaredUnits.map((force) => force.magnitude!))
    : 0;
  const rangeRequiresSchematic = comparableUnit && maxMagnitude / minMagnitude > 2;
  const knownAngles = new Map<string, number>();
  const plans: ForcePlan[] = [];
  for (const force of parsedForces) {
    const vec = vectorForForce(force.direction, incline, knownAngles);
    if (!vec) return failure(`force ${force.name} has an unsupported or ambiguous direction`);
    const owner = force.owner ?? bodies[0]!;
    if (!lookupPoint(positions, owner)) return failure(`force ${force.name} references unknown body ${owner}`);
    const text = `${force.name}${force.magnitudeText ? ` ${force.magnitudeText}` : ''}`;
    plans.push({
      force,
      vec,
      owner: owner.toLowerCase(),
      fraction: comparableUnit && !rangeRequiresSchematic && force.magnitude !== undefined ? force.magnitude / maxMagnitude : 1,
      text,
      // A horizontal force is labelled above its arrowhead; any other continues past its tip.
      slot: Math.abs(vec.dx) >= 0.92 ? 'N' : slotForDirection(vec.dx, vec.dy),
      size: measureText(text, FONT_MIN),
    });
    knownAngles.set(idPart(force.name), Math.atan2(vec.dy, vec.dx) * 180 / Math.PI);
  }

  // Arrow length: the longest (up to 43) at which every arrow and its label stay in the frame,
  // clear of the ceiling or floor band a member anchors to. Free bodies are packed side by side.
  const anchorNames = specGetAll(spec, 'member').flatMap((raw) => words(raw).slice(1, 3));
  const limits = {
    x1: 4, x2: w - 4,
    y1: anchorNames.some((name) => /^(ceiling|support|anchor)$/i.test(name)) ? 30 : 4,
    y2: anchorNames.some((name) => /^(ground|floor)$/i.test(name)) ? h - 30 : h - 4,
  };
  // An incline's wedge (slope, base, rise) is fixed before the arrows; labels must clear it too.
  const wedgeEnds = [
    { x: planeCenter.x - tangent.x * halfSpan, y: planeCenter.y - tangent.y * halfSpan },
    { x: planeCenter.x + tangent.x * halfSpan, y: planeCenter.y + tangent.y * halfSpan },
  ].sort((a, c) => c.y - a.y);
  const wedge = incline === 0 ? [] : [
    { x1: wedgeEnds[0]!.x, y1: wedgeEnds[0]!.y, x2: wedgeEnds[1]!.x, y2: wedgeEnds[1]!.y },
    { x1: wedgeEnds[0]!.x, y1: wedgeEnds[0]!.y, x2: wedgeEnds[1]!.x, y2: wedgeEnds[0]!.y },
    { x1: wedgeEnds[1]!.x, y1: wedgeEnds[0]!.y, x2: wedgeEnds[1]!.x, y2: wedgeEnds[1]!.y },
  ];
  /** Everything one body draws at this arrow length (body, arrows, labels), and whether its labels clear the wedge. */
  const reach = (key: string, center: Point, length: number) => {
    const pose = poseAt(key, center);
    const bbox = bodyBoundingBox(pose);
    const box = { x1: bbox.x, y1: bbox.y, x2: bbox.x + bbox.w, y2: bbox.y + bbox.h, clearOfWedge: true };
    for (const plan of plans.filter((candidate) => candidate.owner === key)) {
      const start = bodyBoundaryPoint(pose, { x: plan.vec.dx, y: plan.vec.dy });
      const tip = { x: start.x + plan.vec.dx * length * plan.fraction, y: start.y + plan.vec.dy * length * plan.fraction };
      const label = labelBoxAt(tip, plan.slot, plan.size);
      box.x1 = Math.min(box.x1, tip.x, label.x1);
      box.y1 = Math.min(box.y1, tip.y, label.y1);
      box.x2 = Math.max(box.x2, tip.x, label.x2);
      box.y2 = Math.max(box.y2, tip.y, label.y2);
      box.clearOfWedge &&= !boxHitsAny(label, wedge, LABEL_GAP(FONT_MIN));
    }
    return box;
  };
  const packed = incline === 0 && bodyPanel.size === 0;
  let arrow = FBD_ARROW;
  for (const length of [FBD_ARROW, 38, 33, 28, 24, 20]) {
    arrow = length;
    if (packed) {
      const boxes = keys.map((key) => reach(key, { x: 0, y: 0 }, length));
      const width = boxes.reduce((sum, box) => sum + box.x2 - box.x1, 0) + 12 * (boxes.length - 1);
      const top = Math.min(...boxes.map((box) => box.y1));
      const height = Math.max(...boxes.map((box) => box.y2)) - top;
      let x = limits.x1 + (limits.x2 - limits.x1 - width) / 2;
      const y = limits.y1 + (limits.y2 - limits.y1 - height) / 2 - top;
      boxes.forEach((box, index) => {
        positions.set(keys[index]!, { x: x - box.x1, y });
        x += box.x2 - box.x1 + 12;
      });
      if (width <= limits.x2 - limits.x1 && height <= limits.y2 - limits.y1) break;
    } else if (keys.every((key) => {
      const box = reach(key, positions.get(key)!, length);
      return box.x1 >= limits.x1 && box.y1 >= limits.y1 && box.x2 <= limits.x2 && box.y2 <= limits.y2 && box.clearOfWedge;
    })) break;
  }

  const bodyPoses = new Map<string, BodyPose>();
  bodies.forEach((body) => {
    const key = body.toLowerCase();
    const p = positions.get(key)!;
    const extent = extents.get(key)!;
    const id = `body-${idPart(body)}`;
    const pose = poseAt(key, p);
    bodyPoses.set(key, pose);
    used.add(id);
    const bbox = bodyBoundingBox(pose);
    b.node(id, bbox.x, bbox.y, bbox.w, bbox.h, 'body');
    if (incline === 0) b.rect(id, p.x - extent.halfWidth, p.y - extent.halfHeight, extent.halfWidth * 2, extent.halfHeight * 2, { fill: 'paper', color: 'neutral', role: 'geometry' });
    else b.polygon(id, bodyPolygon(pose), { fill: 'paper', color: 'neutral', role: 'geometry' });
    if (incline !== 0) {
      const [contactStart, contactEnd] = bodyContactEdge(pose);
      b.line(`contact-${idPart(body)}`, contactStart.x, contactStart.y, contactEnd.x, contactEnd.y, { color: 'neutral', role: 'boundary', width: 1.2 });
    }
    const panelId = bodyPanel.get(key);
    if (extent.inside) b.label(`body-label-${idPart(body)}`, body, p.x, p.y, { protected: true, priority: 'required', anchorId: id, panelId });
    else b.label(`body-label-${idPart(body)}`, body, p.x, p.y + 25, { slot: 'S', priority: 'required', anchorId: id, panelId });
  });
  let angleMark: { text: string; size: { w: number; h: number }; corner: Point; spots: Point[] } | undefined;
  if (incline !== 0) {
    const start = { x: planeCenter.x - tangent.x * halfSpan, y: planeCenter.y - tangent.y * halfSpan };
    const end = { x: planeCenter.x + tangent.x * halfSpan, y: planeCenter.y + tangent.y * halfSpan };
    b.line('incline', start.x, start.y, end.x, end.y, { width: 2, role: 'boundary' });
    // The incline is a wedge: horizontal base, vertical rise, and its angle marked at the foot.
    const [low, high] = start.y >= end.y ? [start, end] : [end, start];
    b.line('incline-base', low.x, low.y, high.x, low.y, { width: 1.4, role: 'boundary' });
    b.line('incline-rise', high.x, low.y, high.x, high.y, { width: 1.4, role: 'boundary' });
    const baseDeg = high.x >= low.x ? 0 : 180;
    const slopeDeg = (Math.atan2(high.y - low.y, high.x - low.x) * 180) / Math.PI;
    const sweep = ((slopeDeg - baseDeg + 540) % 360) - 180;
    b.arc('incline-angle', low.x, low.y, 18, 18, baseDeg, baseDeg + sweep, { color: 'muted', role: 'annotation', width: 1.2 });
    const text = `${Number(Math.abs(incline).toFixed(2))}°`;
    const size = measureText(text, FONT_MIN);
    const bisector = ((baseDeg + sweep / 2) * Math.PI) / 180;
    // Placed once the arrows exist: the first spot along the angle's bisector that clears every stroke.
    const outward = high.x >= low.x ? -1 : 1;
    angleMark = {
      text,
      size,
      corner: low,
      // Along the bisector first; when a label already fills the foot of the wedge, just outside the corner.
      spots: [
        ...Array.from({ length: 19 }, (_, i) => 24 + i * 2).map((r) => ({ x: low.x + r * Math.cos(bisector), y: low.y + r * Math.sin(bisector) })),
        { x: low.x + outward * (size.w / 2 + 6), y: low.y - size.h / 2 - 3 },
      ],
    };
  }
  const forceNames = new Map<string, number>();
  const forceLines: Array<{ owner: string; from: Point; to: Point; plan: ForcePlan; strokeId: string }> = [];
  for (const plan of plans) {
    const anchor = bodyPoses.get(plan.owner);
    const forceStart = anchor ? bodyBoundaryPoint(anchor, { x: plan.vec.dx, y: plan.vec.dy }) : lookupPoint(positions, plan.force.owner ?? bodies[0]!)!;
    const baseName = idPart(plan.force.name);
    const count = forceNames.get(baseName) ?? 0;
    forceNames.set(baseName, count + 1);
    const strokeId = `force-${baseName}${count ? `-${count + 1}` : ''}`;
    const length = arrow * plan.fraction;
    const end = { x: forceStart.x + plan.vec.dx * length, y: forceStart.y + plan.vec.dy * length };
    b.line(strokeId, forceStart.x, forceStart.y, end.x, end.y, { markerEnd: true, color: 'accent', role: 'connector', width: 1.8 });
    forceLines.push({ owner: plan.owner, from: forceStart, to: end, plan, strokeId });
  }
  // Each label takes the first free slot at its own tip: past the tip, else beside it.
  const drawn = strokeSegments({ strokes: b.strokes } as Scene);
  const taken: Array<Box> = [];
  const clear = (box: Box) => box.x1 >= 4 && box.y1 >= 4 && box.x2 <= w - 4 && box.y2 <= h - 4
    && !boxHitsAny(box, drawn, LABEL_GAP(FONT_MIN)) && !taken.some((other) => boxesOverlap(box, other, 2));
  // Each force label takes the first free slot at its own tip: past the tip, else beside it.
  for (const { plan, to: end, strokeId } of forceLines) {
    const sides = plan.slot === 'N' ? ['S' as const, slotForDirection(plan.vec.dx, 0)] : [slotForDirection(-plan.vec.dy, plan.vec.dx), slotForDirection(plan.vec.dy, -plan.vec.dx)];
    const slot = [plan.slot, ...sides].find((candidate) => clear(labelBoxAt(end, candidate, plan.size))) ?? plan.slot;
    taken.push(labelBoxAt(end, slot, plan.size));
    b.label(`force-label-${strokeId.slice('force-'.length)}`, plan.text, end.x, end.y, { slot, priority: plan.force.magnitudeText ? 'required' : 'preferred', anchorId: strokeId });
  }
  if (angleMark) {
    // The angle mark sits inside its angle, just beyond the arc: the first bisector spot clear of every
    // stroke (a tight 2 px gap — it belongs to those lines) and every force label.
    const mark = angleMark;
    const at = mark.spots.find((spot) => {
      const box = { x1: spot.x - mark.size.w / 2, y1: spot.y - mark.size.h / 2, x2: spot.x + mark.size.w / 2, y2: spot.y + mark.size.h / 2 };
      const nearest = Math.hypot(Math.max(box.x1 - mark.corner.x, 0, mark.corner.x - box.x2), Math.max(box.y1 - mark.corner.y, 0, mark.corner.y - box.y2));
      return (nearest > 21 || spot === mark.spots.at(-1)) && box.y1 >= 4 && box.y2 <= h - 4 && !boxHitsAny(box, drawn, 3.5) && !taken.some((other) => boxesOverlap(box, other, 2));
    }) ?? mark.spots.at(-1)!;
    b.label('incline-angle-label', mark.text, at.x, at.y, { protected: true, priority: 'required', anchorId: 'incline-angle' });
  }
  if (specGet(spec, 'axes')) {
    const pose = bodyPoses.get(bodies[0]!.toLowerCase())!;
    const bodyOutlines = [...bodyPoses.values()].map((candidate) => bodyPolygon(candidate));
    const keepsClear = (origin: Point): boolean => {
      const ends = [
        { x: origin.x + pose.tangent.x * 33, y: origin.y + pose.tangent.y * 33 },
        { x: origin.x + pose.normal.x * 33, y: origin.y + pose.normal.y * 33 },
      ];
      if (![origin, ...ends].every((p) => p.x >= 16 && p.x <= w - 16 && p.y >= 16 && p.y <= h - 16)) return false;
      return ends.every((axisEnd) => forceLines.every((line) => segmentGap(origin, axisEnd, line.from, line.to) > 8)
        && bodyOutlines.every((outline) => outline.every((_, index) => index % 2 === 1 || segmentGap(origin, axisEnd,
          { x: outline[index]!, y: outline[index + 1]! },
          { x: outline[(index + 2) % outline.length]!, y: outline[(index + 3) % outline.length]! }) > 8)));
    };
    // The nearest clear spot to the body, preferring its right-hand side.
    const preferred = { x: pose.center.x + pose.tangent.x * 42, y: pose.center.y + pose.tangent.y * 42 };
    const origins: Point[] = [preferred];
    for (let gx = 16; gx <= w - 16; gx += 8) for (let gy = 16; gy <= h - 16; gy += 8) origins.push({ x: gx, y: gy });
    const origin = origins.filter(keepsClear).sort((a, c) => Math.hypot(a.x - preferred.x, a.y - preferred.y) - Math.hypot(c.x - preferred.x, c.y - preferred.y))[0] ?? preferred;
    const xEnd = { x: origin.x + pose.tangent.x * 33, y: origin.y + pose.tangent.y * 33 };
    const yEnd = { x: origin.x + pose.normal.x * 33, y: origin.y + pose.normal.y * 33 };
    b.line('axis-x', origin.x, origin.y, xEnd.x, xEnd.y, { markerEnd: true, color: 'muted', role: 'axis' });
    b.line('axis-y', origin.x, origin.y, yEnd.x, yEnd.y, { markerEnd: true, color: 'muted', role: 'axis' });
    b.label('axis-x-label', 'x', xEnd.x, xEnd.y, { slot: slotForDirection(pose.tangent.x, pose.tangent.y), priority: 'required', anchorId: 'axis-x' });
    b.label('axis-y-label', 'y', yEnd.x, yEnd.y, { slot: slotForDirection(pose.normal.x, pose.normal.y), priority: 'required', anchorId: 'axis-y' });
  }
  for (const [i, raw] of specGetAll(spec, 'member').entries()) {
    const parts = words(raw);
    const type = parts[0];
    const fromPose = bodyPoses.get((parts[1] ?? '').toLowerCase());
    const toPose = bodyPoses.get((parts[2] ?? '').toLowerCase());
    const from = lookupFbdPoint(positions, parts[1] ?? '', b, w, h, used, toPose?.center);
    const to = lookupFbdPoint(positions, parts[2] ?? '', b, w, h, used, fromPose?.center);
    if (!type || !from || !to) return failure(`member ${type ?? i} needs two known body endpoints`);
    // Members end at body outlines.
    let memberFrom = fromPose ? bodyBoundaryPoint(fromPose, { x: to.x - from.x, y: to.y - from.y }) : from;
    let memberTo = toPose ? bodyBoundaryPoint(toPose, { x: from.x - to.x, y: from.y - to.y }) : to;
    // A member along a force on the same body (a rope and its tension) runs beside the arrow, not on it.
    const length = Math.hypot(memberTo.x - memberFrom.x, memberTo.y - memberFrom.y) || 1;
    const along = { x: (memberTo.x - memberFrom.x) / length, y: (memberTo.y - memberFrom.y) / length };
    const owners = new Set([(parts[1] ?? '').toLowerCase(), (parts[2] ?? '').toLowerCase()]);
    const collinear = forceLines.some((line) => {
      if (!owners.has(line.owner)) return false;
      const forceLength = Math.hypot(line.to.x - line.from.x, line.to.y - line.from.y) || 1;
      const direction = { x: (line.to.x - line.from.x) / forceLength, y: (line.to.y - line.from.y) / forceLength };
      return Math.abs(cross(along, direction)) < 0.2 && Math.abs(cross(along, { x: line.from.x - memberFrom.x, y: line.from.y - memberFrom.y })) < 3;
    });
    if (collinear) {
      const shift = { x: -along.y * 9, y: along.x * 9 };
      memberFrom = { x: memberFrom.x + shift.x, y: memberFrom.y + shift.y };
      memberTo = { x: memberTo.x + shift.x, y: memberTo.y + shift.y };
    }
    const id = uniqueId(`member-${type}`, used);
    if (/^spring$/i.test(type)) {
      const dx = memberTo.x - memberFrom.x;
      const dy = memberTo.y - memberFrom.y;
      const nx = -dy / length;
      const ny = dx / length;
      const points = [memberFrom.x, memberFrom.y];
      for (let k = 1; k < 8; k++) {
        const t = k / 8;
        const wiggle = k % 2 ? 5 : -5;
        points.push(memberFrom.x + dx * t + nx * wiggle, memberFrom.y + dy * t + ny * wiggle);
      }
      points.push(memberTo.x, memberTo.y);
      b.polyline(id, points, { color: 'accent', role: 'connector', width: 1.4 });
    } else if (/^pulley$/i.test(type)) {
      b.line(id, memberFrom.x, memberFrom.y, memberTo.x, memberTo.y, { color: 'neutral', role: 'connector', dash: true });
      b.circle(`${id}-wheel`, (memberFrom.x + memberTo.x) / 2, (memberFrom.y + memberTo.y) / 2, 10, { color: 'neutral', role: 'geometry' });
    } else {
      b.line(id, memberFrom.x, memberFrom.y, memberTo.x, memberTo.y, { color: 'neutral', role: 'connector', dash: /^rope|cable$/i.test(type) });
    }
    b.label(`${id}-label`, type, (memberFrom.x + memberTo.x) / 2, (memberFrom.y + memberTo.y) / 2, { priority: 'optional', anchorId: id });
  }
  for (const [i, raw] of specGetAll(spec, 'support').entries()) {
    const parts = words(raw);
    const type = parts[0];
    const target = lookupFbdPoint(positions, parts[1] ?? '', b, w, h, used);
    if (!type || !target) return failure(`support ${type ?? i} needs a target`);
    const id = uniqueId(`support-${type}`, used);
    const targetPose = bodyPoses.get((parts[1] ?? '').toLowerCase());
    if (targetPose && incline !== 0) {
      const contact = pointForBodyContact(targetPose);
      const below = { x: -targetPose.normal.x, y: -targetPose.normal.y };
      const base = { x: contact.x + below.x * 18, y: contact.y + below.y * 18 };
      if (/^pin$/i.test(type)) {
        b.polygon(id, [
          base.x - targetPose.tangent.x * 12, base.y - targetPose.tangent.y * 12,
          base.x + targetPose.tangent.x * 12, base.y + targetPose.tangent.y * 12,
          contact.x + below.x * 3, contact.y + below.y * 3,
        ], { color: 'neutral', role: 'geometry' });
      } else if (/^roller$/i.test(type)) {
        b.line(id, base.x - targetPose.tangent.x * 14, base.y - targetPose.tangent.y * 14, base.x + targetPose.tangent.x * 14, base.y + targetPose.tangent.y * 14, { color: 'neutral', role: 'geometry' });
        const left = { x: base.x - targetPose.tangent.x * 7 + below.x * 6, y: base.y - targetPose.tangent.y * 7 + below.y * 6 };
        const right = { x: base.x + targetPose.tangent.x * 7 + below.x * 6, y: base.y + targetPose.tangent.y * 7 + below.y * 6 };
        b.circle(`${id}-left`, left.x, left.y, 3, { color: 'neutral', role: 'geometry' });
        b.circle(`${id}-right`, right.x, right.y, 3, { color: 'neutral', role: 'geometry' });
      } else if (/^fixed$/i.test(type)) {
        b.line(id, base.x - targetPose.tangent.x * 15, base.y - targetPose.tangent.y * 15, base.x + targetPose.tangent.x * 15, base.y + targetPose.tangent.y * 15, { color: 'neutral', role: 'boundary', width: 2 });
      } else return failure(`unsupported support type ${type}`);
      b.label(`${id}-label`, type, base.x, base.y + below.y * 17, { priority: 'optional', anchorId: id });
      continue;
    }
    const baseY = target.y + (targetPose?.halfHeight ?? 16) + 12;
    if (/^pin$/i.test(type)) {
      b.polygon(id, [target.x - 12, baseY, target.x + 12, baseY, target.x, baseY - 14], { color: 'neutral', role: 'geometry' });
    } else if (/^roller$/i.test(type)) {
      b.line(id, target.x - 14, baseY, target.x + 14, baseY, { color: 'neutral', role: 'geometry' });
      b.circle(`${id}-left`, target.x - 7, baseY + 6, 3, { color: 'neutral', role: 'geometry' });
      b.circle(`${id}-right`, target.x + 7, baseY + 6, 3, { color: 'neutral', role: 'geometry' });
    } else if (/^fixed$/i.test(type)) {
      b.rect(id, target.x - 15, baseY, 30, 8, { color: 'neutral', role: 'boundary', pattern: 'hatch' });
    } else return failure(`unsupported support type ${type}`);
    b.label(`${id}-label`, type, target.x, baseY + 17, { priority: 'optional', anchorId: id });
  }
  for (const [i, raw] of specGetAll(spec, 'surface').entries()) {
    const parts = words(raw);
    const id = uniqueId(`surface-${parts[0] ?? i}`, used);
    const p = parts[1]
      ? lookupFbdPoint(positions, parts[1], b, w, h, used)
      : { x: w * 0.5, y: h - 20 };
    if (!p) return failure(`surface ${parts[0] ?? i} references an unknown anchor`);
    const pose = bodyPoses.get((parts[1] ?? '').toLowerCase());
    if (incline !== 0) {
      const contact = pose ? pointForBodyContact(pose) : { x: w * 0.5, y: h * 0.58 };
      const halfLength = 50;
      b.line(id, contact.x - tangent.x * halfLength, contact.y - tangent.y * halfLength, contact.x + tangent.x * halfLength, contact.y + tangent.y * halfLength, { color: 'neutral', role: 'boundary', width: 2 });
      b.label(`${id}-label`, parts[0] ?? 'surface', contact.x, contact.y - normal.y * 13, { priority: 'optional', anchorId: id });
    } else {
      b.rect(id, p.x - 50, p.y, 100, 8, { color: 'neutral', role: 'boundary', pattern: 'hatch' });
      b.label(`${id}-label`, parts[0] ?? 'surface', p.x, p.y + 18, { priority: 'optional', anchorId: id });
    }
  }
  // Arrow lengths are proportional only for same-unit magnitudes within 2:1; say so once, not per force.
  if (declaredUnits.length && (!comparableUnit || rangeRequiresSchematic)) {
    b.label('scale-note', 'arrows not to scale', 4, h - 4, { slot: 'NE', priority: 'required' });
  }
  const extras = drawDimensionsAndAngles(b, spec, positions, w, h, used);
  if (extras) return extras;
  return null;
}

/** Centre offset along `dir` that leaves a label box `margin` clear of the point it names. */
function clearance(dir: Point, size: { w: number; h: number }, margin: number): number {
  return Math.min(Math.abs(dir.x) > 1e-6 ? (size.w / 2 + margin) / Math.abs(dir.x) : Infinity, Math.abs(dir.y) > 1e-6 ? (size.h / 2 + margin) / Math.abs(dir.y) : Infinity);
}

/** Centre offset along a line's normal `dir` that keeps a label box `margin` clear of the line itself. */
function lineClearance(dir: Point, size: { w: number; h: number }, margin: number): number {
  return (size.w / 2) * Math.abs(dir.x) + (size.h / 2) * Math.abs(dir.y) + margin;
}

/** The first candidate centre whose label box stays in the frame, off every stroke and off earlier labels. */
function freeSpot(candidates: Point[], size: { w: number; h: number }, strokes: ReturnType<typeof strokeSegments>, taken: Box[], gap: number, w: number, h: number, accept: (box: Box) => boolean = () => true): Point | undefined {
  return candidates.find((c) => {
    const box = { x1: c.x - size.w / 2, y1: c.y - size.h / 2, x2: c.x + size.w / 2, y2: c.y + size.h / 2 };
    return box.x1 >= 4 && box.y1 >= 4 && box.x2 <= w - 4 && box.y2 <= h - 4 && !boxHitsAny(box, strokes, gap)
      && !taken.some((other) => boxesOverlap(box, other, 2)) && accept(box);
  });
}

const screenAngle = (from: Point, to: Point) => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
const signedTurn = (from: number, to: number) => ((to - from + 540) % 360) - 180;

/**
 * Dimensions sit outside the figure (away from its centroid) with extension lines; an angle is drawn
 * between its two rays — a three-point name X-V-Y, else the only two segments meeting at the vertex —
 * as an arc labelled with its value, or a square for a right angle. `explicit` names points whose
 * coordinates were given: an angle among them must match its declared value, or the figure is refused.
 */
function drawDimensionsAndAngles(
  b: SceneBuilder,
  spec: SpecDoc,
  points: Map<string, Point>,
  w: number,
  h: number,
  used: Set<string>,
  segments: ReadonlyMap<string, Segment> = new Map(),
  explicit: ReadonlySet<string> = new Set(),
  taken: Box[] = [],
): Failure | null {
  // Labels are placed after every stroke here exists, each at the nearest free spot it prefers.
  const pending: Array<{ id: string; text: string; anchorId: string; spots: Point[]; slot: SlotHint; accept?: (box: Box) => boolean }> = [];
  const all = [...points.values()];
  const centroid = all.length
    ? { x: all.reduce((sum, p) => sum + p.x, 0) / all.length, y: all.reduce((sum, p) => sum + p.y, 0) / all.length }
    : { x: w / 2, y: h / 2 };
  for (const [i, raw] of specGetAll(spec, 'dimension').entries()) {
    const parts = words(raw);
    const [idToken, fromToken, toToken] = parts;
    const from = lookupPoint(points, fromToken ?? '');
    const to = lookupPoint(points, toToken ?? '');
    if (!idToken || !from || !to) return failure(`dimension ${idToken ?? i} needs two known endpoints`);
    const id = uniqueId(`dimension-${idToken}`, used);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    if (((from.x + to.x) / 2 - centroid.x) * nx + ((from.y + to.y) / 2 - centroid.y) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    const offset = 14;
    const a = { x: from.x + nx * offset, y: from.y + ny * offset };
    const c = { x: to.x + nx * offset, y: to.y + ny * offset };
    // A textbook dimension: thin solid line, heads pointing out to the extension lines.
    b.line(id, a.x, a.y, c.x, c.y, { color: 'muted', role: 'dimension', width: 1, markerStart: true, markerEnd: true });
    b.line(`${id}-ext1`, from.x + nx * 3, from.y + ny * 3, from.x + nx * (offset + 3), from.y + ny * (offset + 3), { color: 'muted', role: 'dimension', width: 0.8 });
    b.line(`${id}-ext2`, to.x + nx * 3, to.y + ny * 3, to.x + nx * (offset + 3), to.y + ny * (offset + 3), { color: 'muted', role: 'dimension', width: 0.8 });
    const label = parts.slice(3).join(' ') || idToken;
    const size = measureText(label, FONT_MIN);
    const mid = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
    const reach = lineClearance({ x: nx, y: ny }, size, 4);
    pending.push({ id: `${id}-label`, text: label, anchorId: id, slot: slotForDirection(nx, ny), spots: [0, 4, 8].map((extra) => ({ x: mid.x + nx * (reach + extra), y: mid.y + ny * (reach + extra) })) });
    b.dimension(id, fromToken!, toToken!, `${id}-label`, 'aligned');
  }
  for (const [i, raw] of specGetAll(spec, 'angle').entries()) {
    const parts = words(raw);
    const idToken = parts[0];
    const vertexName = parts[1] ?? '';
    const at = lookupPoint(points, vertexName) ?? { x: w / 2, y: h / 2 };
    const amount = /(-?\d+(?:\.\d+)?)\s*(?:deg|°)/i.exec(raw)?.[1];
    if (!idToken || amount === undefined) return failure(`angle ${idToken ?? i} needs a degree value`);
    const id = uniqueId(`angle-${idToken}`, used);
    const degrees = Math.abs(Number(amount));
    const letters = [...idToken];
    const named = letters.length === 3 && letters[1]!.toLowerCase() === vertexName.toLowerCase();
    let rayNames = named ? [letters[0]!, letters[2]!] : [];
    if (!named) {
      // The two segments that meet at the vertex, when there are exactly two.
      const vertexKey = vertexName.toLowerCase();
      const ends = [...segments.values()].flatMap((segment) => {
        const other = segment.from === at ? segment.to : segment.to === at ? segment.from : undefined;
        return other ? [other] : [];
      });
      if (ends.length === 2) rayNames = ends.map((end) => [...points.entries()].find(([, p]) => p === end)?.[0] ?? '').filter((name) => name !== vertexKey);
    }
    const rays = rayNames.map((name) => lookupPoint(points, name)).filter((p): p is Point => Boolean(p));
    const startDeg = rays[0] ? screenAngle(at, rays[0]) : 0;
    let sweep = degrees;
    if (rays.length === 2) {
      const turn = signedTurn(startDeg, screenAngle(at, rays[1]!));
      sweep = (degrees > 180 ? -1 : 1) * Math.sign(turn || 1) * degrees;
      const actual = degrees > 180 ? 360 - Math.abs(turn) : Math.abs(turn);
      const allExplicit = [vertexName, ...rayNames].every((name) => explicit.has(name.toLowerCase()));
      if (allExplicit && Math.abs(actual - degrees) > 2) {
        return failure(`angle ${idToken} is declared ${degrees}° but its points make ${Number(actual.toFixed(1))}°`);
      }
    }
    if (rays.length === 2 && Math.abs(degrees - 90) < 0.5) {
      // A right angle is a square in the corner, sized to the shorter ray; its value needs no label.
      const size = Math.min(10, 0.3 * Math.min(...rays.map((ray) => Math.hypot(ray.x - at.x, ray.y - at.y))));
      const first = { x: Math.cos((startDeg * Math.PI) / 180), y: Math.sin((startDeg * Math.PI) / 180) };
      const second = { x: Math.cos(((startDeg + sweep) * Math.PI) / 180), y: Math.sin(((startDeg + sweep) * Math.PI) / 180) };
      b.polyline(id, [
        at.x + first.x * size, at.y + first.y * size,
        at.x + (first.x + second.x) * size, at.y + (first.y + second.y) * size,
        at.x + second.x * size, at.y + second.y * size,
      ], { color: 'muted', role: 'annotation', width: 1.2 });
      continue;
    }
    b.arc(id, at.x, at.y, 22, 22, startDeg, startDeg + sweep, { color: 'muted', role: 'annotation', width: 1.2 });
    const middle = ((startDeg + sweep / 2) * Math.PI) / 180;
    const dir = { x: Math.cos(middle), y: Math.sin(middle) };
    const vertex = at;
    // Inside the angle, just beyond its arc.
    pending.push({
      id: `${id}-label`,
      text: `${Number(amount.replace(/^-/, ''))}°`,
      anchorId: id,
      slot: slotForDirection(dir.x, dir.y),
      spots: Array.from({ length: 14 }, (_, k) => 26 + k * 3).map((r) => ({ x: vertex.x + dir.x * r, y: vertex.y + dir.y * r })),
      accept: (box) => Math.hypot(Math.max(box.x1 - vertex.x, 0, vertex.x - box.x2), Math.max(box.y1 - vertex.y, 0, vertex.y - box.y2)) > 24,
    });
  }
  const drawn = strokeSegments({ strokes: b.strokes } as Scene);
  for (const item of pending) {
    const size = measureText(item.text, FONT_MIN);
    const spot = freeSpot(item.spots, size, drawn, taken, 3, w, h, item.accept);
    if (spot) {
      taken.push(boxFrom(spot.x, spot.y, size.w, size.h));
      b.label(item.id, item.text, spot.x, spot.y, { protected: true, priority: 'required', anchorId: item.anchorId });
    } else {
      b.label(item.id, item.text, item.spots[0]!.x, item.spots[0]!.y, { slot: item.slot, priority: 'required', anchorId: item.anchorId });
    }
  }
  return null;
}

function drawGeom(b: SceneBuilder, spec: SpecDoc, w: number, h: number): CompileResult | null {
  const invalid = keysAreKnown(spec, SCENE_VARIANTS.geom!.allowed);
  if (invalid) return invalid;
  drawPanels(b, spec, w, h);
  const pointValues = specGetAll(spec, 'point');
  const pointNames = pointValues.length ? pointValues.map((raw) => words(raw)[0]).filter((x): x is string => Boolean(x)) : ['A', 'B', 'C'];
  const parsedPoints = pointNames.map((name, i) => {
    const raw = pointValues[i] ?? '';
    const nums = raw.slice(words(raw)[0]?.length ?? 0).match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g)?.map(Number) ?? [];
    const explicit = nums.length >= 2 && Number.isFinite(nums[0]) && Number.isFinite(nums[1]);
    const fallback = { x: pointNames.length === 1 ? w / 2 : 36 + (i * (w - 72)) / Math.max(1, pointNames.length - 1), y: i % 2 ? h * 0.68 : h * 0.35 };
    return { name, explicit, point: explicit ? { x: nums[0]!, y: nums[1]! } : fallback };
  });
  const declared = parsedPoints.filter((entry) => entry.explicit).map((entry) => entry.point);
  if (declared.length) {
    // Math convention (D19): one uniform scale, larger y drawn higher, the figure centred in the frame.
    // Coordinates are normalised by their largest magnitude first so huge values cannot overflow.
    const inset = specGetAll(spec, 'dimension').length ? 38 : 26;
    const norm = Math.max(...declared.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]), Number.MIN_VALUE);
    const xs = declared.map((point) => point.x / norm);
    const ys = declared.map((point) => point.y / norm);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    const scale = Math.min(spanX > 0 ? (w - inset * 2) / spanX : Infinity, spanY > 0 ? (h - inset * 2) / spanY : Infinity);
    const k = Number.isFinite(scale) ? scale : 1;
    const midX = (Math.max(...xs) + Math.min(...xs)) / 2;
    const midY = (Math.max(...ys) + Math.min(...ys)) / 2;
    parsedPoints.forEach((entry) => {
      if (entry.explicit) {
        entry.point = { x: w / 2 + (entry.point.x / norm - midX) * k, y: h / 2 - (entry.point.y / norm - midY) * k };
      }
    });
  }
  const points = new Map<string, Point>();
  const centroid = {
    x: parsedPoints.reduce((sum, entry) => sum + entry.point.x, 0) / Math.max(1, parsedPoints.length),
    y: parsedPoints.reduce((sum, entry) => sum + entry.point.y, 0) / Math.max(1, parsedPoints.length),
  };
  parsedPoints.forEach(({ name, point: p }) => {
    points.set(name.toLowerCase(), p);
    const id = `point-${idPart(name)}`;
    b.circle(id, p.x, p.y, 3, { color: 'accent', fill: 'ink', role: 'geometry' });
  });
  const used = new Set<string>();
  const segments = new Map<string, Segment>();
  for (const [i, raw] of specGetAll(spec, 'segment').entries()) {
    const parts = words(raw);
    const idToken = parts[0];
    const from = lookupPoint(points, parts[1] ?? '');
    const to = lookupPoint(points, parts[2] ?? '');
    if (!idToken || !from || !to) return failure(`segment ${idToken ?? i} needs two known points`);
    const id = uniqueId(`segment-${idToken}`, used);
    segments.set(idToken.toLowerCase(), { from, to });
    b.line(id, from.x, from.y, to.x, to.y, { color: 'neutral', role: 'geometry', width: 1.6 });
  }
  for (const [i, raw] of specGetAll(spec, 'relation').entries()) {
    const parts = words(raw);
    const normalKindIndex = parts.findIndex((part) => NORMAL_RELATION_KINDS.has(part.toLowerCase()));
    if (normalKindIndex >= 0) {
      const kind = parts[normalKindIndex]!.toLowerCase();
      const endpointTokens = parts.filter((_, index) => index !== normalKindIndex);
      const first = segments.get(endpointTokens[0]?.toLowerCase() ?? '');
      const second = segments.get(endpointTokens[1]?.toLowerCase() ?? '');
      if (endpointTokens.length !== 2 || !first || !second) {
        return failure(`relation ${kind} needs two known named segments`);
      }
      const marker = segmentRelationMarker(first, second, kind);
      if (!Array.isArray(marker)) return marker;
      const id = uniqueId(`relation-${kind}`, used);
      b.polyline(id, marker, { color: 'guide', role: 'annotation', width: 1.3 });
      continue;
    }
    const kind = parts[0];
    const firstSegment = segments.get((parts[1] ?? '').toLowerCase());
    const firstPoint = lookupPoint(points, parts[1] ?? '');
    const a = firstSegment ?? (firstPoint ? { from: firstPoint, to: firstPoint } : undefined);
    const targetSegment = segments.get((parts[2] ?? '').toLowerCase());
    const target = lookupPoint(points, parts[2] ?? '') ?? targetSegment?.from;
    if (!kind || !a || !target) return failure(`relation ${kind ?? i} references unknown geometry`);
    const id = uniqueId(`relation-${kind}`, used);
    if (/^tangent$/i.test(kind) || /^projects?$/i.test(kind)) {
      b.line(id, a.from.x, a.from.y, target.x, target.y, { color: 'muted', role: 'annotation', dash: true, markerEnd: true });
    } else if (/^joins?$|^lies-on$/i.test(kind)) {
      b.line(id, a.from.x, a.from.y, target.x, target.y, { color: 'guide', role: 'annotation' });
    } else return failure(`unsupported geometry relation ${kind}`);
  }
  const explicit = new Set(parsedPoints.filter((entry) => entry.explicit).map((entry) => entry.name.toLowerCase()));
  const taken: Box[] = [];
  const extras = drawDimensionsAndAngles(b, spec, points, w, h, used, segments, explicit, taken);
  if (extras) return extras;
  // Vertex names sit just outside the figure, away from its centre, turning aside only to dodge a line.
  const drawn = strokeSegments({ strokes: b.strokes } as Scene);
  for (const { name, point: p } of parsedPoints) {
    const id = `point-${idPart(name)}`;
    const size = measureText(name, FONT_MIN);
    const away = Math.atan2(p.y - centroid.y, p.x - centroid.x);
    const spots = [0, 25, -25, 50, -50, 75, -75, 100, -100, 140, -140, 180].map((turn) => {
      const dir = { x: Math.cos(away + (turn * Math.PI) / 180), y: Math.sin(away + (turn * Math.PI) / 180) };
      const reach = Math.max(8, clearance(dir, size, 6));
      return { x: p.x + dir.x * reach, y: p.y + dir.y * reach };
    });
    const spot = freeSpot(spots, size, drawn, taken, 1.5, w, h);
    if (spot) {
      taken.push(boxFrom(spot.x, spot.y, size.w, size.h));
      b.label(`${id}-label`, name, spot.x, spot.y, { protected: true, priority: 'required', anchorId: id });
    } else {
      b.label(`${id}-label`, name, p.x, p.y, { slot: slotForDirection(Math.cos(away), Math.sin(away)), priority: 'required', anchorId: id });
    }
  }
  return null;
}

const RELATION_KINDS = new Set([
  'sends-to', 'transitions', 'contributes-to', 'acquires-before', 'waits-for', 'indicates', 'part-of',
  'moves-toward', 'moves-away', 'flows-to', 'current-to', 'transfers-to', 'loads', 'supports',
  'deforms', 'deforms-under', 'connects', 'constrains', 'attaches-to', 'feeds', 'circulates',
  'activates', 'inhibits', 'suppresses', 'represses', 'stimulates', 'promotes', 'increases', 'decreases',
]);

const DIRECTED_PHYSICAL_RELATIONS = new Set([
  'sends-to', 'transitions', 'contributes-to', 'acquires-before', 'waits-for', 'indicates',
  'moves-toward', 'moves-away', 'flows-to', 'flow-right', 'flow-left', 'current-to', 'transfers-to',
  'loads', 'supports', 'deforms', 'deforms-under', 'constrains', 'attaches-to', 'feeds', 'circulates',
  'activates', 'stimulates', 'promotes', 'increases',
]);

const DIRECTED_FEEDBACK_RELATIONS = new Set([
  'inhibits', 'suppresses', 'represses', 'decreases',
]);

function isDirectedRelation(tokens: readonly string[]): boolean {
  return tokens.some((token) => DIRECTED_PHYSICAL_RELATIONS.has(token) || DIRECTED_FEEDBACK_RELATIONS.has(token));
}

function isFeedbackRelation(tokens: readonly string[]): boolean {
  return tokens.some((token) => DIRECTED_FEEDBACK_RELATIONS.has(token));
}

type PhysicalPartKind = 'magnet' | 'coil' | 'vessel' | 'support' | 'member' | 'load' | 'region' | 'component';

function physicalPartKind(name: string, role: string): PhysicalPartKind {
  const text = `${name} ${role}`.toLowerCase();
  if (/magnet|magnetic[-_ ]?(?:source|bar)?/.test(text)) return 'magnet';
  if (/coil|loop|solenoid|inductor/.test(text)) return 'coil';
  if (/vessel|pipe|tube|channel|reservoir|chamber|drain|scupper|fluid|stream/.test(text)) return 'vessel';
  if (/support|anchor|pin|roller|fixed|wall|foundation/.test(text)) return 'support';
  if (/spring|elastic|member|beam|wire|string|cable|rod|bar|link/.test(text)) return 'member';
  if (/load|force|weight|mass|pressure|water|flow/.test(text)) return 'load';
  if (/region|surface|soil|area|slab|roof|plate|wedge/.test(text)) return 'region';
  return 'component';
}

type VesselProfile = 'wide' | 'narrow' | 'variable';

function vesselProfile(name: string, role: string): VesselProfile {
  const text = `${name} ${role}`.toLowerCase().replace(/_/g, '-');
  if (/(?:^|-)narrow(?:-|$)|(?:^|-)throat(?:-|$)|constrict|reduced|minimum/.test(text)) return 'narrow';
  if (/(?:^|-)wide(?:-|$)|broad|expanded|large|maximum|inlet|outlet|upstream|downstream/.test(text)) return 'wide';
  if (/variable|taper|nozzle|funnel/.test(text)) return 'variable';
  return 'variable';
}

function drawPhysicalPartGlyph(b: SceneBuilder, id: string, kind: PhysicalPartKind, name: string, role: string, x: number, y: number): void {
  if (kind === 'magnet') {
    b.rect(id, x - 30, y - 14, 60, 28, { color: 'danger', fill: 'ink', role: 'geometry', width: 1.5 });
    b.line(`${id}-pole-seam`, x, y - 14, x, y + 14, { color: 'neutral', role: 'geometry', width: 1.2 });
    return;
  }
  if (kind === 'coil') {
    b.ellipse(id, x, y, 25, 15, { color: 'accent', role: 'geometry' });
    b.ellipse(`${id}-turn-2`, x, y, 18, 12, { color: 'accent', role: 'geometry' });
    b.ellipse(`${id}-turn-3`, x, y, 11, 8, { color: 'accent', role: 'geometry' });
    return;
  }
  if (kind === 'vessel') {
    const profile = vesselProfile(name, role);
    const halfHeight = profile === 'wide' ? 15 : profile === 'narrow' ? 7 : 11;
    const leftHeight = profile === 'variable' ? 15 : halfHeight;
    const rightHeight = profile === 'variable' ? 7 : halfHeight;
    b.polygon(id, [x - 30, y - leftHeight, x + 30, y - rightHeight, x + 30, y + rightHeight, x - 30, y + leftHeight], { color: 'muted', fill: 'muted', role: 'geometry', width: 1.4 });
    b.line(`${id}-flow-axis`, x - 26, y, x + 26, y, { color: 'accent', role: 'connector', markerEnd: true, width: 1.2 });
    return;
  }
  if (kind === 'support') {
    b.polygon(id, [x - 16, y + 12, x + 16, y + 12, x, y - 12], { color: 'neutral', role: 'geometry', width: 1.4 });
    b.line(`${id}-base`, x - 22, y + 15, x + 22, y + 15, { color: 'neutral', role: 'boundary', width: 1.4 });
    return;
  }
  if (kind === 'member') {
    if (/deform|deflect|sag|curve|bent/.test(role.toLowerCase())) {
      b.polyline(id, [x - 30, y - 2, x - 18, y + 4, x - 6, y + 10, x + 8, y + 10, x + 20, y + 4, x + 30, y - 2], { color: 'accent', role: 'connector', width: 1.8 });
    } else {
      b.line(id, x - 30, y, x + 30, y, { color: 'accent', role: 'connector', width: 1.8 });
    }
    return;
  }
  if (kind === 'load') {
    b.circle(`${id}-load-head`, x, y + 5, 5, { color: 'danger', fill: 'ink', role: 'geometry' });
    b.line(id, x, y - 14, x, y + 1, { color: 'danger', role: 'connector', markerEnd: true, width: 1.7 });
    return;
  }
  if (kind === 'region') {
    b.polygon(id, [x - 30, y - 12, x + 30, y - 12, x + 22, y + 12, x - 22, y + 12], { color: 'muted', fill: 'muted', pattern: 'dots', role: 'geometry', width: 1.3 });
    return;
  }
  b.rect(id, x - 30, y - 14, 60, 28, { color: 'neutral', role: 'geometry' });
}

function relationTokens(kind: string): string[] {
  return kind.toLowerCase().replace(/_/g, '-').split(/\s+/).filter(Boolean);
}

type NamedPhysicalRelation = { kind: string; from: string; to: string };

function relationEndpointNames(raw: string, names: Map<string, string>): NamedPhysicalRelation | null {
  const endpoints: string[] = [];
  const remainder: string[] = [];
  for (const token of words(raw)) {
    const direct = names.get(token.toLowerCase()) ?? names.get(idPart(token));
    if (direct) {
      endpoints.push(direct);
      continue;
    }
    const pieces = token.split('-');
    const knownPieces = pieces
      .map((piece) => names.get(piece.toLowerCase()) ?? names.get(idPart(piece)))
      .filter((name): name is string => Boolean(name));
    if (knownPieces.length) {
      endpoints.push(...knownPieces);
      pieces.filter((piece) => !names.has(piece.toLowerCase()) && !names.has(idPart(piece))).forEach((piece) => remainder.push(piece));
    } else {
      remainder.push(token);
    }
  }
  if (endpoints.length !== 2 || !remainder.length) return null;
  return { kind: remainder.join(' '), from: endpoints[0]!, to: endpoints[1]! };
}

function relationAwarePartOrder(names: readonly string[], relations: readonly NamedPhysicalRelation[]): string[] {
  const index = new Map(names.map((name, i) => [name.toLowerCase(), i]));
  const edges = new Map(names.map((name) => [name.toLowerCase(), new Set<string>()]));
  const indegree = new Map(names.map((name) => [name.toLowerCase(), 0]));
  for (const relation of relations) {
    const tokens = relationTokens(relation.kind);
    if (!tokens.some((token) => DIRECTED_PHYSICAL_RELATIONS.has(token))) continue;
    const from = relation.from.toLowerCase();
    const to = relation.to.toLowerCase();
    if (from === to || !edges.has(from) || !edges.has(to) || edges.get(from)!.has(to)) continue;
    edges.get(from)!.add(to);
    indegree.set(to, indegree.get(to)! + 1);
  }
  const ready = names.filter((name) => indegree.get(name.toLowerCase()) === 0);
  const ordered: string[] = [];
  while (ready.length) {
    ready.sort((a, b) => index.get(a.toLowerCase())! - index.get(b.toLowerCase())!);
    const name = ready.shift()!;
    ordered.push(name);
    for (const target of edges.get(name.toLowerCase())!) {
      const next = indegree.get(target)! - 1;
      indegree.set(target, next);
      if (next === 0) {
        const targetName = names[index.get(target)!];
        if (targetName) ready.push(targetName);
      }
    }
  }
  return ordered.length === names.length ? ordered : [...names];
}

/** Half-extent of each part glyph as drawn, so a relation line ends on the glyph itself. */
const PART_HALF: Record<PhysicalPartKind, Point> = {
  magnet: { x: 30, y: 14 }, coil: { x: 25, y: 15 }, vessel: { x: 30, y: 15 }, support: { x: 22, y: 15 },
  member: { x: 30, y: 6 }, load: { x: 6, y: 14 }, region: { x: 30, y: 12 }, component: { x: 30, y: 14 },
};
const PANEL_HALF: Point = { x: 30, y: 18 };

function boundaryPoint(from: Point, to: Point, half: Point = PANEL_HALF): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return { x: from.x + (dx >= 0 ? half.x : -half.x), y: from.y };
  return { x: from.x, y: from.y + (dy >= 0 ? half.y : -half.y) };
}

function routedRelation(
  from: Point,
  to: Point,
  directed: boolean,
  feedback: boolean,
  feedbackIndex: number,
  w: number,
  h: number,
  fromHalf: Point = PANEL_HALF,
  toHalf: Point = PANEL_HALF,
  exit: 'vertical' | 'toward' | 'away' = 'vertical',
): number[] {
  if (!directed || !feedback) {
    const start = boundaryPoint(from, to, fromHalf);
    const end = boundaryPoint(to, from, toHalf);
    if (Math.abs(start.y - end.y) < 0.5 || Math.abs(start.x - end.x) < 0.5) {
      return [start.x, start.y, end.x, end.y];
    }
    const midX = (start.x + end.x) / 2;
    return [start.x, start.y, midX, start.y, midX, end.y, end.x, end.y];
  }

  // Back-edges use alternating outer lanes, so they never cut through the node grid: out of the glyph
  // (straight down/up, or from a side 6 units into the column gap when a part is in the way), along the
  // lane, and into the target from outside the grid.
  const useBottom = feedbackIndex % 2 === 0;
  const laneIndex = Math.floor(feedbackIndex / 2);
  const laneY = useBottom
    ? Math.max(8, h - 7 - laneIndex * 9)
    : Math.min(h - 8, 31 + laneIndex * 9);
  const target = { x: to.x, y: to.y + (useBottom ? toHalf.y : -toHalf.y) };
  if (exit === 'vertical') {
    return [from.x, from.y + (useBottom ? fromHalf.y : -fromHalf.y), from.x, laneY, target.x, laneY, target.x, target.y];
  }
  const side = (Math.sign(to.x - from.x) || 1) * (exit === 'toward' ? 1 : -1);
  const exitX = from.x + side * fromHalf.x;
  const gapX = exitX + side * 6;
  return [
    exitX, from.y,
    gapX, from.y,
    gapX, laneY,
    target.x, laneY,
    target.x, target.y,
  ];
}

function relationEndpoints(raw: string, centers: Map<string, Point>): { kind: string; from: Point; to: Point } | Failure {
  const tokens = words(raw);
  const endpoints: Point[] = [];
  const remainder: string[] = [];
  for (const token of tokens) {
    const direct = centers.get(token.toLowerCase()) ?? centers.get(idPart(token));
    if (direct) {
      endpoints.push(direct);
      continue;
    }
    const pieces = token.split('-');
    const knownPieces = pieces.map((piece) => centers.get(piece.toLowerCase()) ?? centers.get(idPart(piece))).filter((point): point is Point => Boolean(point));
    if (knownPieces.length) {
      endpoints.push(...knownPieces);
      pieces.filter((piece) => !centers.has(piece.toLowerCase()) && !centers.has(idPart(piece))).forEach((piece) => remainder.push(piece));
    } else remainder.push(token);
  }

  if (endpoints.length === 2 && remainder.length) {
    return { kind: remainder.join(' '), from: endpoints[0]!, to: endpoints[1]! };
  }
  if (endpoints.length !== 2 || !remainder.length) {
    const unresolvedText = remainder.length ? `; unresolved token(s): ${remainder.join(', ')}` : '';
    return failure(`relation needs two known endpoints and one kind${unresolvedText}`);
  }
  return failure('relation needs a non-empty kind');
}

function drawParts(b: SceneBuilder, spec: SpecDoc, w: number, h: number, kind: string): CompileResult | null {
  const invalid = keysAreKnown(spec, SCENE_VARIANTS.apparatus!.allowed);
  if (invalid) return invalid;
  const panels = drawPanels(b, spec, w, h);
  const values = [...specGetAll(spec, 'part'), ...specGetAll(spec, 'element')];
  if (!values.length) return failure(`${kind} needs at least one part`);
  const nonVectorTokens = values.flatMap((raw) => words(raw).join(' ').match(/\b(?:photo|photograph|photographic|portrait|raster|bitmap|pixels?|image|texture|ornamental?|decorative|watermark|gradient|shadow|photorealistic|illustration|painting|artwork|caption|page[- ]?number|background)\b/gi) ?? []);
  if (nonVectorTokens.length) return failure(`${kind} cannot render non-vector artwork token(s): ${nonVectorTokens.join(', ')}`);
  const centers = new Map<string, Point>();
  panels.forEach((box, id) => centers.set(id, { x: box.x + box.w / 2, y: box.y + box.h / 2 }));
  const used = new Set<string>();
  const declarations = values.map((raw, i) => {
    const parts = words(raw);
    const name = parts[0] ?? `part-${i + 1}`;
    const role = parts.slice(1).join(' ') || 'part';
    const id = uniqueId(`part-${name}`, used);
    const partKind = physicalPartKind(name, role);
    return { name, role, id, partKind };
  });
  const relationValues = specGetAll(spec, 'relation');
  if (kind === 'cycle' && !relationValues.length) return failure('cycle needs explicit relation lines');
  const names = new Map<string, string>();
  declarations.forEach(({ name }) => {
    names.set(name.toLowerCase(), name);
    names.set(idPart(name), name);
  });
  const namedRelations = relationValues
    .map((raw) => relationEndpointNames(raw, names))
    .filter((relation): relation is NamedPhysicalRelation => Boolean(relation));
  const orderedNames = relationAwarePartOrder(declarations.map(({ name }) => name), namedRelations);
  const directedLayout = namedRelations.some((relation) => isDirectedRelation(relationTokens(relation.kind)));
  const cols = directedLayout ? Math.min(4, Math.max(1, orderedNames.length)) : Math.min(3, Math.max(1, orderedNames.length));
  const rowCount = Math.ceil(orderedNames.length / cols);
  const orderIndex = new Map(orderedNames.map((name, i) => [name.toLowerCase(), i]));
  const hasFeedbackEdge = namedRelations.some((relation) => {
    const from = orderIndex.get(relation.from.toLowerCase());
    const to = orderIndex.get(relation.to.toLowerCase());
    return isDirectedRelation(relationTokens(relation.kind)) && from !== undefined && to !== undefined && from > to;
  });
  const fixedDirectedLabels = directedLayout && !hasFeedbackEdge;
  const declarationByName = new Map(declarations.map((declaration) => [declaration.name.toLowerCase(), declaration]));
  orderedNames.forEach((name, i) => {
    const declaration = declarationByName.get(name.toLowerCase())!;
    const row = Math.floor(i / cols);
    const localCol = i % cols;
    const col = directedLayout && row % 2 === 1 ? cols - 1 - localCol : localCol;
    const x = cols === 1 ? w / 2 : 42 + col * ((w - 84) / Math.max(1, cols - 1));
    const y = directedLayout
      ? rowCount === 1 ? h * 0.55 : h * 0.3 + row * ((h * 0.4) / Math.max(1, rowCount - 1))
      : cols === 1 ? 48 : 48 + row * ((h - 54) / Math.max(1, rowCount));
    centers.set(name.toLowerCase(), { x, y });
    centers.set(idPart(name), { x, y });
    const half = PART_HALF[declaration.partKind];
    b.node(declaration.id, x - half.x, y - half.y, half.x * 2, half.y * 2, declaration.partKind);
    drawPhysicalPartGlyph(b, declaration.id, declaration.partKind, declaration.name, declaration.role, x, y);
    const slot = directedLayout ? row % 2 === 0 ? 'N' : 'S' : 'auto';
    const labelY = fixedDirectedLabels ? slot === 'S' ? y + 28 : y - 28 : y;
    b.label(`${declaration.id}-label`, declaration.name, x, labelY, { slot, protected: fixedDirectedLabels, priority: 'preferred', anchorId: declaration.id });
  });
  // Every relation must read unambiguously: its line may not pass through a part it does not join or run
  // along another relation's line. The planned route is tried first, then a vertical-first elbow, then a
  // lane below or above the parts; a relation with no such route refuses the figure.
  // Obstacles: each glyph with a 6-unit margin, so no line grazes a part it does not join.
  const partBoxes = [...declarationByName.entries()].map(([name, declaration]) => {
    const c = centers.get(name)!;
    const half = PART_HALF[declaration.partKind];
    return { name, box: { x1: c.x - half.x - 6, y1: c.y - half.y - 6, x2: c.x + half.x + 6, y2: c.y + half.y + 6 } };
  });
  const halfOf = (name: string | undefined) => (name && declarationByName.get(name.toLowerCase()) ? PART_HALF[declarationByName.get(name.toLowerCase())!.partKind] : PANEL_HALF);
  const routeSegments = (route: number[]) => {
    const out: LineSegment[] = [];
    for (let k = 0; k + 3 < route.length; k += 2) out.push({ x1: route[k]!, y1: route[k + 1]!, x2: route[k + 2]!, y2: route[k + 3]! });
    return out;
  };
  const enters = (seg: LineSegment, box: Box) => [0.1, 0.3, 0.5, 0.7, 0.9].some((t) => {
    const x = seg.x1 + (seg.x2 - seg.x1) * t;
    const y = seg.y1 + (seg.y2 - seg.y1) * t;
    return x > box.x1 + 1 && x < box.x2 - 1 && y > box.y1 + 1 && y < box.y2 - 1;
  });
  const runsAlong = (a: LineSegment, c: LineSegment) => {
    const flat = (seg: LineSegment) => Math.abs(seg.y1 - seg.y2) < 0.5;
    const upright = (seg: LineSegment) => Math.abs(seg.x1 - seg.x2) < 0.5;
    const overlap = (a1: number, a2: number, c1: number, c2: number) => Math.min(Math.max(a1, a2), Math.max(c1, c2)) - Math.max(Math.min(a1, a2), Math.min(c1, c2)) > 2;
    if (flat(a) && flat(c) && Math.abs(a.y1 - c.y1) < 2) return overlap(a.x1, a.x2, c.x1, c.x2);
    if (upright(a) && upright(c) && Math.abs(a.x1 - c.x1) < 2) return overlap(a.y1, a.y2, c.y1, c.y2);
    return false;
  };
  const drawnRoutes: LineSegment[] = [];
  // Part names pinned above/below their parts are obstacles too: no relation line runs through a name.
  const pinnedNames = b.labels.filter((label) => label.protected).map((label) => {
    const size = measureText(label.text ?? '', FONT_MIN);
    return { x1: label.x - size.w / 2 - 1, y1: label.y - size.h / 2 - 1, x2: label.x + size.w / 2 + 1, y2: label.y + size.h / 2 + 1 };
  });
  const clearRoute = (route: number[], joins: readonly string[]) => route.every((v, k) => (k % 2 === 0 ? v >= 4 && v <= w - 4 : v >= 4 && v <= h - 4)) &&
    routeSegments(route).every((seg) => !partBoxes.some((part) => !joins.includes(part.name) && enters(seg, part.box)) &&
      !pinnedNames.some((box) => enters(seg, box)) && !drawnRoutes.some((other) => runsAlong(seg, other)));
  const alternatives = (from: Point, to: Point, fromHalf: Point, toHalf: Point): number[][] => {
    const out: number[][] = [];
    // The planned elbow moved beside an earlier relation: its vertical run into a parallel channel, and
    // its ends a few units along the parts' sides, so two relations cross once instead of sharing a run.
    const start = boundaryPoint(from, to, fromHalf);
    const end = boundaryPoint(to, from, toHalf);
    if (Math.abs(start.x - end.x) > 0.5 && Math.abs(start.y - end.y) > 0.5 && Math.abs(start.x - from.x) > 1) {
      const midX = (start.x + end.x) / 2;
      for (const side of [0, -6, 6]) {
        for (const offset of [0, 7, -7, 14, -14]) {
          if (side || offset) out.push([start.x, start.y + side, midX + offset, start.y + side, midX + offset, end.y + side, end.x, end.y + side]);
        }
      }
    }
    const dx = Math.sign(to.x - from.x) || 1;
    const dy = Math.sign(to.y - from.y);
    if (dy && Math.abs(to.y - from.y) > fromHalf.y + toHalf.y) {
      out.push(Math.abs(to.x - from.x) < 0.5
        ? [from.x, from.y + dy * fromHalf.y, to.x, to.y - dy * toHalf.y]
        : [from.x, from.y + dy * fromHalf.y, from.x, to.y, to.x - dx * toHalf.x, to.y]);
    }
    for (const lane of [0, 1, 2]) {
      for (const side of [1, -1]) {
        const laneY = side > 0 ? Math.max(from.y, to.y) + 28 + lane * 9 : Math.min(from.y, to.y) - 28 - lane * 9;
        out.push([from.x, from.y + side * fromHalf.y, from.x, laneY, to.x, laneY, to.x, to.y + side * toHalf.y]);
      }
    }
    return out;
  };
  // Flow and regulation kinds read from the arrow itself; any other kind is written on its line.
  const selfEvident = new Set(['sends-to', 'flows-to', 'flow-right', 'flow-left', 'current-to', 'transfers-to', 'feeds', 'circulates', 'moves-toward', 'moves-away',
    'activates', 'stimulates', 'promotes', 'increases', 'inhibits', 'suppresses', 'represses', 'decreases']);
  const toLabel: Array<{ id: string; text: string; route: number[] }> = [];
  let feedbackIndex = 0;
  for (const [i, raw] of relationValues.entries()) {
    const relation = relationEndpoints(raw, centers);
    if ('ok' in relation && !relation.ok) return relation;
    if (!('kind' in relation)) return failure(`relation ${i} is malformed`);
    const id = uniqueId(`relation-${relation.kind}`, used);
    const tokens = relationTokens(relation.kind);
    const directed = isDirectedRelation(tokens);
    const namedRelation = relationEndpointNames(raw, names);
    const joins = namedRelation ? [namedRelation.from.toLowerCase(), namedRelation.to.toLowerCase()] : [];
    const fromHalf = halfOf(namedRelation?.from);
    const toHalf = halfOf(namedRelation?.to);
    const feedback = directed && namedRelation !== null &&
      (orderIndex.get(namedRelation.from.toLowerCase()) ?? 0) > (orderIndex.get(namedRelation.to.toLowerCase()) ?? 0);
    const normalizedKind = relation.kind.toLowerCase().replace(/_/g, '-');
    const knownKind = RELATION_KINDS.has(normalizedKind) || tokens.some((token) => RELATION_KINDS.has(token));
    const feedbackStroke = isFeedbackRelation(tokens);
    let route: number[] | undefined;
    if (tokens.some((token) => /^deform|^deflect/.test(token))) {
      const mid = { x: (relation.from.x + relation.to.x) / 2, y: (relation.from.y + relation.to.y) / 2 - 8 };
      route = [relation.from.x, relation.from.y, mid.x, mid.y, relation.to.x, relation.to.y];
      if (!clearRoute(route, joins)) return failure(`relation ${raw} would cross another part or relation`);
      b.polyline(id, route, { color: directed ? 'accent' : 'muted', role: knownKind ? 'connector' : 'annotation', markerEnd: directed, width: 1.4 });
    } else {
      const planned = feedback
        ? [0, 2, 4, 1, 3, 5].flatMap((step) => (['vertical', 'toward', 'away'] as const).map((exit) => routedRelation(relation.from, relation.to, true, true, feedbackIndex + step, w, h, fromHalf, toHalf, exit)))
        : [routedRelation(relation.from, relation.to, directedLayout && directed, false, 0, w, h, fromHalf, toHalf), ...alternatives(relation.from, relation.to, fromHalf, toHalf)];
      route = planned.find((candidate) => clearRoute(candidate, joins));
      if (!route) return failure(`relation ${raw} has no route clear of the other parts and relations`);
      b.polyline(id, route, { color: feedbackStroke ? 'danger' : directed ? 'accent' : 'muted', role: knownKind ? 'connector' : 'annotation', markerEnd: directed, dash: feedbackStroke || /^part-of$/i.test(normalizedKind) });
    }
    if (feedback) feedbackIndex += 1;
    drawnRoutes.push(...routeSegments(route));
    if (!tokens.some((token) => selfEvident.has(token))) toLabel.push({ id, text: relation.kind.replace(/[-_]/g, ' '), route });
  }
  // Relation words go beside their own line, at the first spot clear of every stroke and label.
  const strokes = strokeSegments(b.scene());
  const taken: Box[] = b.labels.filter((label) => label.protected).map((label) => {
    const size = measureText(label.text ?? '', FONT_MIN);
    return boxFrom(label.x, label.y, size.w, size.h);
  });
  for (const { id, text, route } of toLabel) {
    const size = measureText(text, FONT_MIN);
    const candidates = routeSegments(route)
      .sort((a, c) => Math.hypot(c.x2 - c.x1, c.y2 - c.y1) - Math.hypot(a.x2 - a.x1, a.y2 - a.y1))
      .flatMap((seg) => [0.5, 0.3, 0.7].flatMap((t) => {
        const x = seg.x1 + (seg.x2 - seg.x1) * t;
        const y = seg.y1 + (seg.y2 - seg.y1) * t;
        return Math.abs(seg.y2 - seg.y1) < Math.abs(seg.x2 - seg.x1)
          ? [{ x, y: y - size.h / 2 - 4 }, { x, y: y + size.h / 2 + 4 }]
          : [{ x: x + size.w / 2 + 5, y }, { x: x - size.w / 2 - 5, y }];
      }));
    const spot = freeSpot(candidates, size, strokes, taken, 1.5, w, h);
    if (!spot) return failure(`relation "${text}" has no clear place beside its line`);
    b.label(`${id}-label`, text, spot.x, spot.y, { protected: true, priority: 'required', anchorId: id });
    taken.push(boxFrom(spot.x, spot.y, size.w, size.h));
  }
  return null;
}

type MolecularOrientation = '5to3' | '3to5';
type MolecularPoint = { x: number; y: number };

type MolecularStrand = {
  id: string;
  material: string;
  orientation: MolecularOrientation;
};

type MolecularAttachment = {
  id: string;
  strand: string;
  orientation: MolecularOrientation;
};

type MolecularFork = { id: string; strands: [string, string] };
type MolecularBubble = { id: string; strands: [string, string]; actor: string };
type MolecularProduct = { id: string; material: string; source: string; orientation: MolecularOrientation };
type MolecularActor = { id: string; type: string };
type MolecularRelation = { from: string; kind: string; to: string };

function molecularOrientation(raw: string | undefined): MolecularOrientation | null {
  if (!raw) return null;
  const value = raw.toLowerCase().replace(/[′'\s_\-→>]/g, '');
  if (value === '5to3' || value === '53' || value === '5prime3prime') return '5to3';
  if (value === '3to5' || value === '35' || value === '3prime5prime') return '3to5';
  return null;
}

function molecularMaterial(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (value === 'dna' || value === 'rna' || value === 'mrna' || value === 'nucleicacid') return value;
  return null;
}

function molecularProductMaterial(raw: string | undefined): string | null {
  const value = molecularMaterial(raw);
  if (value) return value;
  const product = raw?.toLowerCase().replace(/[^a-z]/g, '');
  return product === 'peptide' || product === 'polypeptide' || product === 'protein' || product === 'nascentrna'
    ? product
    : null;
}

function molecularTokens(raw: string): string[] {
  return raw.trim().split(/\s+/).filter(Boolean);
}

function molecularId(raw: string | undefined): string | null {
  if (!raw || !/^[a-z][a-z0-9_.-]*$/i.test(raw)) return null;
  return raw.toLowerCase();
}

function parseMolecularStrands(spec: SpecDoc): MolecularStrand[] | Failure {
  const strands: MolecularStrand[] = [];
  for (const [i, raw] of specGetAll(spec, 'strand').entries()) {
    const parts = molecularTokens(raw);
    const id = molecularId(parts[0]);
    const material = molecularMaterial(parts[1]);
    const orientation = molecularOrientation(parts[2]);
    if (!id || !material || !orientation || parts.length !== 3) {
      return failure(`strand ${parts[0] ?? i} needs id, DNA/RNA material, and 5to3 or 3to5 orientation`);
    }
    if (strands.some((strand) => strand.id === id)) return failure(`duplicate molecular id: ${parts[0]}`);
    strands.push({ id, material, orientation });
  }
  if (!strands.length) return failure('molecular needs at least one strand');
  return strands;
}

function parseMolecularAttachments(spec: SpecDoc, key: 'primer' | 'fragment', strandIds: Set<string>): MolecularAttachment[] | Failure {
  const attachments: MolecularAttachment[] = [];
  for (const [i, raw] of specGetAll(spec, key).entries()) {
    const parts = molecularTokens(raw);
    const id = molecularId(parts[0]);
    const strand = molecularId(parts[2]);
    const orientation = molecularOrientation(parts[3]);
    if (!id || parts[1]?.toLowerCase() !== 'on' || !strand || !strandIds.has(strand) || !orientation || parts.length !== 4) {
      return failure(`${key} ${parts[0] ?? i} needs id, on <strand>, and a synthesis orientation`);
    }
    if (attachments.some((attachment) => attachment.id === id)) return failure(`duplicate molecular id: ${parts[0]}`);
    attachments.push({ id, strand, orientation });
  }
  return attachments;
}

function parseMolecularForks(spec: SpecDoc, strandIds: Set<string>): MolecularFork[] | Failure {
  const forks: MolecularFork[] = [];
  for (const [i, raw] of specGetAll(spec, 'fork').entries()) {
    const parts = molecularTokens(raw);
    const id = molecularId(parts[0]);
    const first = molecularId(parts[1]);
    const second = molecularId(parts[2]);
    if (!id || !first || !second || first === second || !strandIds.has(first) || !strandIds.has(second) || parts.length !== 3) {
      return failure(`fork ${parts[0] ?? i} needs two different declared strands`);
    }
    if (forks.some((fork) => fork.id === id)) return failure(`duplicate molecular id: ${parts[0]}`);
    forks.push({ id, strands: [first, second] });
  }
  return forks;
}

function parseMolecularBubbles(spec: SpecDoc, strandIds: Set<string>, actorIds: Set<string>): MolecularBubble[] | Failure {
  const bubbles: MolecularBubble[] = [];
  for (const [i, raw] of specGetAll(spec, 'bubble').entries()) {
    const parts = molecularTokens(raw);
    const id = molecularId(parts[0]);
    const first = molecularId(parts[1]);
    const second = molecularId(parts[2]);
    const actor = molecularId(parts[3]);
    if (!id || !first || !second || !actor || first === second || !strandIds.has(first) || !strandIds.has(second) || !actorIds.has(actor) || parts.length !== 4) {
      return failure(`bubble ${parts[0] ?? i} needs two declared strands and one declared actor`);
    }
    if (bubbles.some((bubble) => bubble.id === id)) return failure(`duplicate molecular id: ${parts[0]}`);
    bubbles.push({ id, strands: [first, second], actor });
  }
  return bubbles;
}

function parseMolecularProducts(spec: SpecDoc, knownIds: Set<string>): MolecularProduct[] | Failure {
  const products: MolecularProduct[] = [];
  for (const [i, raw] of specGetAll(spec, 'product').entries()) {
    const parts = molecularTokens(raw);
    const id = molecularId(parts[0]);
    const material = molecularProductMaterial(parts[1]);
    const source = molecularId(parts[3]);
    const orientation = molecularOrientation(parts[4]);
    if (!id || !material || parts[2]?.toLowerCase() !== 'from' || !source || !knownIds.has(source) || !orientation || parts.length !== 5) {
      return failure(`product ${parts[0] ?? i} needs id, material, from <declared id>, and a synthesis orientation`);
    }
    if (products.some((product) => product.id === id)) return failure(`duplicate molecular id: ${parts[0]}`);
    products.push({ id, material, source, orientation });
  }
  return products;
}

function parseMolecularActors(spec: SpecDoc): MolecularActor[] | Failure {
  const actors: MolecularActor[] = [];
  for (const [i, raw] of specGetAll(spec, 'actor').entries()) {
    const parts = molecularTokens(raw);
    const id = molecularId(parts[0]);
    const type = parts[1]?.toLowerCase();
    if (!id || !type || parts.length !== 2) return failure(`actor ${parts[0] ?? i} needs id and a molecular role`);
    if (actors.some((actor) => actor.id === id)) return failure(`duplicate molecular id: ${parts[0]}`);
    actors.push({ id, type });
  }
  return actors;
}

function parseMolecularRelations(spec: SpecDoc, knownIds: Set<string>): MolecularRelation[] | Failure {
  const relations: MolecularRelation[] = [];
  const relationKinds = new Set(['synthesizes', 'opens', 'binds', 'reads', 'delivers', 'extends', 'joins', 'copies', 'supports', 'moves', 'attaches', 'separates']);
  for (const [i, raw] of specGetAll(spec, 'relation').entries()) {
    const parts = molecularTokens(raw);
    const from = molecularId(parts[0]);
    const kind = parts[1]?.toLowerCase();
    const to = molecularId(parts[2]);
    if (!from || !to || !knownIds.has(from) || !knownIds.has(to) || !kind || !relationKinds.has(kind) || parts.length !== 3) {
      return failure(`relation ${parts[0] ?? i} needs known from, supported relation kind, and known to`);
    }
    relations.push({ from, kind, to });
  }
  return relations;
}

function drawMolecular(b: SceneBuilder, spec: SpecDoc, w: number, h: number): CompileResult | null {
  const invalid = keysAreKnown(spec, SCENE_VARIANTS.molecular!.allowed);
  if (invalid) return invalid;
  const strandsResult = parseMolecularStrands(spec);
  if (!Array.isArray(strandsResult)) return strandsResult;
  const strands = strandsResult;
  const strandIds = new Set(strands.map((strand) => strand.id));
  const actorsResult = parseMolecularActors(spec);
  if (!Array.isArray(actorsResult)) return actorsResult;
  const actors = actorsResult;
  const actorIds = new Set(actors.map((actor) => actor.id));
  const primersResult = parseMolecularAttachments(spec, 'primer', strandIds);
  if (!Array.isArray(primersResult)) return primersResult;
  const fragmentsResult = parseMolecularAttachments(spec, 'fragment', strandIds);
  if (!Array.isArray(fragmentsResult)) return fragmentsResult;
  const forksResult = parseMolecularForks(spec, strandIds);
  if (!Array.isArray(forksResult)) return forksResult;
  const bubblesResult = parseMolecularBubbles(spec, strandIds, actorIds);
  if (!Array.isArray(bubblesResult)) return bubblesResult;
  const forks = forksResult;
  const bubbles = bubblesResult;
  if (forks.length > 1 || bubbles.length > 1 || (forks.length > 0 && bubbles.length > 0)) {
    return failure('molecular supports one fork or one transcription bubble per scene');
  }
  const declarationIds = [
    ...strands.map((item) => item.id),
    ...actors.map((item) => item.id),
    ...primersResult.map((item) => item.id),
    ...fragmentsResult.map((item) => item.id),
    ...forks.map((item) => item.id),
    ...bubbles.map((item) => item.id),
  ];
  if (new Set(declarationIds).size !== declarationIds.length) return failure('duplicate molecular id across declarations');
  const knownBeforeProducts = new Set([...strandIds, ...actorIds, ...primersResult.map((item) => item.id), ...fragmentsResult.map((item) => item.id), ...forks.map((item) => item.id), ...bubbles.map((item) => item.id)]);
  const productsResult = parseMolecularProducts(spec, knownBeforeProducts);
  if (!Array.isArray(productsResult)) return productsResult;
  const products = productsResult;
  if (products.some((product) => declarationIds.includes(product.id))) return failure('duplicate molecular id across declarations');
  const knownIds = new Set([...knownBeforeProducts, ...products.map((product) => product.id)]);
  const relationsResult = parseMolecularRelations(spec, knownIds);
  if (!Array.isArray(relationsResult)) return relationsResult;
  const relations = relationsResult;
  const declarationCount = primersResult.length + fragmentsResult.length + forks.length + bubbles.length + products.length + actors.length;
  if (!declarationCount) return failure('molecular needs a primer, fragment, fork, bubble, product, or actor');
  const centers = new Map<string, MolecularPoint>();
  const strandY = new Map<string, number>();
  const strandStart = 30;
  const strandEnd = w - 30;
  const strandGap = Math.min(31, (h - 72) / Math.max(1, strands.length));
  const firstStrandY = Math.max(42, h * 0.38);
  strands.forEach((strand, index) => strandY.set(strand.id, firstStrandY + index * strandGap));
  const pair = forks[0]?.strands ?? bubbles[0]?.strands ?? (strands.length >= 2 ? [strands[0]!.id, strands[1]!.id] as [string, string] : undefined);
  const pairedIds = pair ? new Set(pair) : new Set<string>();
  const strandStroke = (strand: MolecularStrand) => {
    const y = strandY.get(strand.id)!;
    const color = strand.material === 'rna' || strand.material === 'mrna' ? 'accent' : 'neutral';
    const markerEnd = strand.orientation === '5to3';
    b.line(`strand-${strand.id}`, strandStart, y, strandEnd, y, { color, role: 'geometry', width: 2, markerEnd, markerStart: !markerEnd });
    centers.set(strand.id, { x: (strandStart + strandEnd) / 2, y });
    b.label(`strand-${strand.id}-label`, strand.id, w / 2, y - 8, { priority: 'preferred', anchorId: `strand-${strand.id}` });
    const left = strand.orientation === '5to3' ? '5′' : '3′';
    const right = strand.orientation === '5to3' ? '3′' : '5′';
    b.label(`strand-${strand.id}-left`, left, strandStart, y + 10, { priority: 'optional', anchorId: `strand-${strand.id}` });
    b.label(`strand-${strand.id}-right`, right, strandEnd, y + 10, { priority: 'optional', anchorId: `strand-${strand.id}` });
  };
  if (pair) {
    const first = strands.find((strand) => strand.id === pair[0]);
    const second = strands.find((strand) => strand.id === pair[1]);
    if (!first || !second) return failure('molecular pair references an unknown strand');
    const y1 = strandY.get(first.id)!;
    const y2 = strandY.get(second.id)!;
    const centerX = w * 0.52;
    if (forks.length) {
      b.line(`strand-${first.id}`, strandStart, y1, centerX, y1, { color: 'neutral', role: 'geometry', width: 2, markerStart: first.orientation === '3to5', markerEnd: first.orientation === '5to3' });
      b.line(`strand-${second.id}`, strandStart, y2, centerX, y2, { color: 'neutral', role: 'geometry', width: 2, markerStart: second.orientation === '3to5', markerEnd: second.orientation === '5to3' });
      b.path(`fork-${forks[0]!.id}`, first.orientation === '5to3'
        ? `M ${centerX} ${y1} Q ${centerX + 35} ${y1 - 22} ${strandEnd} ${y1 - 8}`
        : `M ${strandEnd} ${y1 - 8} Q ${centerX + 35} ${y1 - 22} ${centerX} ${y1}`, { color: 'neutral', role: 'connector', width: 2, markerEnd: true });
      b.path(`fork-${forks[0]!.id}-lower`, second.orientation === '5to3'
        ? `M ${centerX} ${y2} Q ${centerX + 35} ${y2 + 22} ${strandEnd} ${y2 + 8}`
        : `M ${strandEnd} ${y2 + 8} Q ${centerX + 35} ${y2 + 22} ${centerX} ${y2}`, { color: 'neutral', role: 'connector', width: 2, markerEnd: true });
      centers.set(forks[0]!.id, { x: centerX, y: (y1 + y2) / 2 });
      b.label(`fork-${forks[0]!.id}-label`, forks[0]!.id, centerX, (y1 + y2) / 2 - 16, { priority: 'preferred', anchorId: `fork-${forks[0]!.id}` });
    } else if (bubbles.length) {
      b.ellipse(`bubble-${bubbles[0]!.id}`, centerX, (y1 + y2) / 2, 47, Math.abs(y2 - y1) / 2 + 14, { color: 'guide', fill: 'muted', role: 'boundary' });
      b.path(`strand-${first.id}`, first.orientation === '5to3'
        ? `M ${strandStart} ${y1} L ${centerX - 47} ${y1} Q ${centerX} ${y1 - 23} ${centerX + 47} ${y1} L ${strandEnd} ${y1}`
        : `M ${strandEnd} ${y1} L ${centerX + 47} ${y1} Q ${centerX} ${y1 - 23} ${centerX - 47} ${y1} L ${strandStart} ${y1}`, { color: 'neutral', role: 'geometry', width: 2, markerEnd: true });
      b.path(`strand-${second.id}`, second.orientation === '5to3'
        ? `M ${strandStart} ${y2} L ${centerX - 47} ${y2} Q ${centerX} ${y2 + 23} ${centerX + 47} ${y2} L ${strandEnd} ${y2}`
        : `M ${strandEnd} ${y2} L ${centerX + 47} ${y2} Q ${centerX} ${y2 + 23} ${centerX - 47} ${y2} L ${strandStart} ${y2}`, { color: 'neutral', role: 'geometry', width: 2, markerEnd: true });
      centers.set(bubbles[0]!.id, { x: centerX, y: (y1 + y2) / 2 });
      b.label(`bubble-${bubbles[0]!.id}-label`, bubbles[0]!.id, centerX, (y1 + y2) / 2 - 16, { priority: 'preferred', anchorId: `bubble-${bubbles[0]!.id}` });
    } else {
      b.line(`strand-${first.id}`, strandStart, y1, strandEnd, y1, { color: 'neutral', role: 'geometry', width: 2, markerEnd: first.orientation === '5to3', markerStart: first.orientation === '3to5' });
      b.line(`strand-${second.id}`, strandStart, y2, strandEnd, y2, { color: 'neutral', role: 'geometry', width: 2, markerEnd: second.orientation === '5to3', markerStart: second.orientation === '3to5' });
    }
    for (let i = 0; i < 6; i++) {
      const x = strandStart + 16 + i * ((centerX - strandStart - 30) / 5);
      b.line(`pairing-${i + 1}`, x, y1 + 2, x, y2 - 2, { color: 'muted', role: 'connector', width: 0.8 });
    }
  }
  strands.forEach((strand) => {
    if (!pairedIds.has(strand.id)) strandStroke(strand);
    else if (!centers.has(strand.id)) {
      const y = strandY.get(strand.id)!;
      centers.set(strand.id, { x: (strandStart + strandEnd) / 2, y });
      const left = strand.orientation === '5to3' ? '5′' : '3′';
      const right = strand.orientation === '5to3' ? '3′' : '5′';
      b.label(`strand-${strand.id}-label`, strand.id, w / 2, y - 8, { priority: 'preferred' });
      b.label(`strand-${strand.id}-left`, left, strandStart, y + 10, { priority: 'optional' });
      b.label(`strand-${strand.id}-right`, right, strandEnd, y + 10, { priority: 'optional' });
    }
  });
  const pointForStrand = (strand: string): MolecularPoint | undefined => {
    const y = strandY.get(strand);
    return y === undefined ? undefined : { x: w * 0.66, y };
  };
  const centerX = w * 0.52;
  const sourceYAt = (strand: string, x: number): number | undefined => {
    const base = strandY.get(strand);
    if (base === undefined) return undefined;
    if (!forks.length || !pair) return base;
    const arm = pair.indexOf(strand);
    if (arm < 0 || x <= centerX) return base;
    const t = Math.max(0, Math.min(1, (x - centerX) / (strandEnd - centerX)));
    return base + (arm === 0 ? -8 : 8) * t;
  };
  const sourceOffset = (strand: string): number => {
    if (forks.length && pair) {
      const arm = pair.indexOf(strand);
      if (arm === 0) return 10;
      if (arm === 1) return -10;
    }
    return 10;
  };
  // The 3' end where each product/fragment grows (the arrowhead), and which way it grows.
  const growingEnd = new Map<string, { x: number; y: number; dx: number }>();
  primersResult.forEach((primer) => {
    const point = pointForStrand(primer.strand);
    if (!point) return;
    const id = `primer-${primer.id}`;
    b.rect(id, point.x - 18, point.y - 4, 36, 8, { color: 'accent', fill: 'ink', role: 'connector' });
    b.label(`${id}-label`, primer.id, point.x, point.y - 12, { priority: 'preferred', anchorId: id });
    centers.set(primer.id, point);
    const dx = primer.orientation === '5to3' ? 25 : -25;
    b.line(`${id}-direction`, point.x, point.y + 8, point.x + dx, point.y + 8, { color: 'accent', role: 'connector', markerEnd: primer.orientation === '5to3', markerStart: primer.orientation === '3to5' });
  });
  fragmentsResult.forEach((fragment, index) => {
    const point = pointForStrand(fragment.strand);
    const xCenter = forks.length ? Math.min(strandEnd - 34, centerX + 35 + index * 42) : Math.min(strandEnd - 34, 150 + index * 42);
    const y = Math.max(20, Math.min(h - 25, (sourceYAt(fragment.strand, xCenter) ?? point?.y ?? h * 0.6) + sourceOffset(fragment.strand)));
    const x1 = fragment.orientation === '5to3' ? xCenter - 34 : xCenter + 34;
    const x2 = fragment.orientation === '5to3' ? xCenter + 34 : xCenter - 34;
    const id = `fragment-${fragment.id}`;
    b.line(id, x1, y, x2, y, { color: 'accent', role: 'connector', width: 2, markerEnd: fragment.orientation === '5to3', markerStart: fragment.orientation === '3to5' });
    growingEnd.set(fragment.id, { x: fragment.orientation === '5to3' ? x2 : x1, y, dx: Math.sign((fragment.orientation === '5to3' ? x2 - x1 : x1 - x2)) });
    b.label(`${id}-label`, fragment.id, (x1 + x2) / 2, y - 7, { priority: 'preferred', anchorId: id });
    centers.set(fragment.id, { x: (x1 + x2) / 2, y });
  });
  products.forEach((product, index) => {
    const template = bubbles.length && pair?.includes(product.source) ? strands.find((strand) => strand.id === product.source) : undefined;
    if (template && pair) {
      // A transcript leaves the bubble behind the polymerase, which moves toward the template's 5' end;
      // its 3' end stays at the polymerase.
      const moves = template.orientation === '3to5' ? 1 : -1;
      const bubbleY = (strandY.get(pair[0])! + strandY.get(pair[1])!) / 2;
      const tail = { x: centerX - moves * 80, y: Math.min(strandY.get(pair[0])!, strandY.get(pair[1])!) - 26 };
      const head = { x: centerX - moves * 12, y: bubbleY - 3 };
      const id = `product-${product.id}`;
      b.line(id, tail.x, tail.y, head.x, head.y, { color: 'accent', role: 'connector', width: 2.2, markerEnd: product.orientation === '5to3', markerStart: product.orientation === '3to5' });
      growingEnd.set(product.id, { x: head.x, y: head.y, dx: 0 });
      b.label(`${id}-label`, product.id, tail.x, tail.y - 8, { priority: 'preferred', anchorId: id });
      centers.set(product.id, { x: (tail.x + head.x) / 2, y: (tail.y + head.y) / 2 });
      return;
    }
    const source = strandIds.has(product.source) ? product.source : undefined;
    const xCenter = forks.length ? Math.min(strandEnd - 48, centerX + 42 + index * 34) : source ? Math.min(strandEnd - 45, 150 + index * 34) : w / 2;
    const y = Math.max(20, Math.min(h - 18, (sourceYAt(product.source, xCenter) ?? h * 0.64) + (source ? sourceOffset(product.source) : 0)));
    const x1 = product.orientation === '5to3' ? xCenter - 42 : xCenter + 42;
    const x2 = product.orientation === '5to3' ? xCenter + 42 : xCenter - 42;
    const id = `product-${product.id}`;
    b.line(id, x1, y, x2, y, { color: 'accent', role: 'connector', width: 2.2, markerEnd: product.orientation === '5to3', markerStart: product.orientation === '3to5' });
    growingEnd.set(product.id, { x: product.orientation === '5to3' ? x2 : x1, y, dx: Math.sign(product.orientation === '5to3' ? x2 - x1 : x1 - x2) });
    b.label(`${id}-label`, product.id, (x1 + x2) / 2, y - 8, { priority: 'preferred', anchorId: id });
    centers.set(product.id, { x: (x1 + x2) / 2, y });
  });
  actors.forEach((actor, index) => {
    const bubble = bubbles.find((item) => item.actor === actor.id);
    const fork = forks[0];
    const linkedStrand = primersResult.find((item) => item.id === actor.id)?.strand;
    // An enzyme that synthesizes, extends or copies a drawn product sits on its growing 3' end.
    const grows = relations.find((relation) => relation.from === actor.id && /^(synthesizes|extends|copies)$/i.test(relation.kind) && growingEnd.has(relation.to));
    const end = !bubble && !(fork && /helicase/i.test(actor.type)) && grows ? growingEnd.get(grows.to) : undefined;
    const base = bubble ? centers.get(bubble.id) : fork && /helicase/i.test(actor.type) ? centers.get(fork.id) : end ? { x: Math.max(22, Math.min(w - 22, end.x + end.dx * 14)), y: end.y } : linkedStrand ? pointForStrand(linkedStrand) : undefined;
    const x = base?.x ?? (50 + (index * (w - 100)) / Math.max(1, actors.length - 1));
    const y = bubble ? base!.y + 2 : (fork && /helicase/i.test(actor.type)) || end ? base!.y : 28 + (index % 2) * 18;
    const id = `actor-${actor.id}`;
    b.node(id, x - 18, y - 11, 36, 22, actor.type);
    if (/polymerase|enzyme|primase|ligase|factor/i.test(actor.type)) b.ellipse(`${id}-glyph`, x, y, 18, 11, { color: 'accent', fill: 'ink', role: 'geometry' });
    else if (/helicase/i.test(actor.type)) b.circle(`${id}-glyph`, x, y, 12, { color: 'accent', fill: 'ink', role: 'geometry' });
    else if (/ribosome/i.test(actor.type)) b.ellipse(`${id}-glyph`, x, y, 23, 14, { color: 'neutral', fill: 'ink', role: 'geometry' });
    else b.rect(`${id}-glyph`, x - 18, y - 11, 36, 22, { color: 'neutral', fill: 'ink', role: 'geometry' });
    b.label(`${id}-label`, actor.id, x, y - 17, { priority: 'preferred', anchorId: id });
    centers.set(actor.id, { x, y });
  });
  relations.forEach((relation, index) => {
    const targetIsAttached = products.some((product) => product.id === relation.to) || fragmentsResult.some((fragment) => fragment.id === relation.to) || primersResult.some((primer) => primer.id === relation.to);
    if (targetIsAttached && /^(belongs-to|extends|joins|synthesizes|templates)$/i.test(relation.kind)) return;
    const from = centers.get(relation.from);
    const to = centers.get(relation.to);
    if (!from || !to) return;
    if (from.x === to.x && from.y === to.y) return;
    b.line(`relation-${index + 1}`, from.x, from.y, to.x, to.y, { color: 'muted', role: 'annotation', markerEnd: true, dash: /binds|supports/i.test(relation.kind) });
  });
  // Object labels go beside their own glyph: the first free spot around it from which that glyph is the
  // nearest labelled object, so no name sits closer to a neighbour. Without such a spot the layout
  // kernel places the label as before.
  const objectLabels = b.labels.filter((label) => /^(strand|primer|fragment|product|actor|fork|bubble)-.+-label$/.test(label.id) && label.anchorId);
  const glyphOf = (anchor: string) => strokeSegments({ ...b.scene(), strokes: b.strokes.filter((stroke) => stroke.id === anchor || stroke.id === `${anchor}-glyph`) });
  const glyphs = new Map(objectLabels.map((label) => [label.anchorId!, glyphOf(label.anchorId!)]));
  const reach = (segments: ReturnType<typeof glyphOf>, x: number, y: number) => Math.min(Infinity, ...segments.map((seg) => distPointSeg(x, y, seg)));
  const allStrokes = strokeSegments(b.scene());
  const claimed: Box[] = [];
  for (const label of objectLabels) {
    const own = glyphs.get(label.anchorId!)!;
    if (!own.length) continue;
    const size = measureText(label.text ?? '', FONT_MIN);
    const xs = own.flatMap((seg) => [seg.x1, seg.x2]);
    const ys = own.flatMap((seg) => [seg.y1, seg.y2]);
    const [x1, x2, y1, y2] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const candidates: Point[] = [];
    for (const d of [4, 9, 15]) {
      for (const t of x2 - x1 > 40 ? [0.5, 0.3, 0.7, 0.15, 0.85] : [0.5]) {
        const x = x1 + (x2 - x1) * t;
        candidates.push({ x, y: y1 - d - size.h / 2 }, { x, y: y2 + d + size.h / 2 });
      }
      candidates.push({ x: x2 + d + size.w / 2, y: (y1 + y2) / 2 }, { x: x1 - d - size.w / 2, y: (y1 + y2) / 2 });
    }
    const owns = (box: Box) => {
      const cx = (box.x1 + box.x2) / 2;
      const cy = (box.y1 + box.y2) / 2;
      const mine = reach(own, cx, cy);
      // Names keep a word space between them, so two adjacent names never read as one.
      return mine < 22 && !claimed.some((other) => boxesOverlap(box, other, 6)) &&
        [...glyphs].every(([anchor, segments]) => anchor === label.anchorId || mine + 1 <= reach(segments, cx, cy));
    };
    const spot = freeSpot(candidates, size, allStrokes, claimed, 2, w, h, owns);
    if (!spot) continue;
    label.x = spot.x;
    label.y = spot.y;
    label.protected = true;
    claimed.push(boxFrom(spot.x, spot.y, size.w, size.h));
  }
  return null;
}

type GasBox = { id: string; role: string; x: number; y: number; w: number; h: number };
type GasBoundary = { container: string; mode: 'wall' | 'charged' | 'constrained'; sides: string[]; sign?: string };
type GasParticle = { id: string; container: string; x: number; y: number; direction?: Point; collision?: string };

const GAS_SIDES = ['left', 'right', 'top', 'bottom'] as const;

function declarationId(raw: string | undefined): string | null {
  if (!raw || !/^[a-z0-9][a-z0-9_.-]*$/i.test(raw)) return null;
  return raw.toLowerCase();
}

function strictNumber(raw: string | undefined): number | null {
  if (raw === undefined || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function gasKind(raw: string): 'gas' | 'thermodynamic' | null {
  const value = raw.toLowerCase().replace(/_/g, '-');
  if (value === 'gas' || value === 'gas-state' || value === 'gas-scene') return 'gas';
  if (value === 'thermo' || value === 'thermodynamic' || value === 'thermodynamic-graph' || value === 'state-graph') return 'thermodynamic';
  return null;
}

function drawGasState(b: SceneBuilder, spec: SpecDoc, w: number, h: number): CompileResult | null {
  const invalid = keysAreKnown(spec, SCENE_VARIANTS.gas!.allowed);
  if (invalid) return invalid;

  const containerValues = [...specGetAll(spec, 'container'), ...specGetAll(spec, 'part'), ...specGetAll(spec, 'element')];
  const containers: GasBox[] = [];
  const byId = new Map<string, GasBox>();
  for (const [index, raw] of containerValues.entries()) {
    const parts = words(raw);
    const id = declarationId(parts[0]);
    if (!id) return failure(`container ${parts[0] ?? index} needs a valid id`);
    if (byId.has(id)) continue;
    const box: GasBox = { id, role: parts.slice(1).join(' ') || 'gas container', x: 0, y: 0, w: 0, h: 0 };
    containers.push(box);
    byId.set(id, box);
  }
  if (!containers.length) return failure('gas needs at least one container declaration');

  const gap = 12;
  const boxW = Math.min(118, (w - 24 - gap * (containers.length - 1)) / containers.length);
  if (boxW < 58) return failure('gas containers do not fit the scene frame', 'unsatisfiable');
  const boxH = Math.min(104, h - 48);
  containers.forEach((box, index) => {
    box.x = (w - (boxW * containers.length + gap * (containers.length - 1))) / 2 + index * (boxW + gap);
    box.y = 28 + (h - 28 - boxH) / 2;
    const nodeId = `container-${box.id}`;
    b.node(nodeId, box.x, box.y, box.w = boxW, box.h = boxH, 'gas-container');
    b.rect(nodeId, box.x, box.y, box.w, box.h, { color: 'neutral', role: 'boundary', width: 1.5 });
    b.label(`${nodeId}-label`, box.id, box.x + box.w / 2, box.y - 7, { slot: 'N', priority: 'preferred', anchorId: nodeId });
  });

  const boundaries: GasBoundary[] = [];
  for (const [index, raw] of specGetAll(spec, 'boundary').entries()) {
    const parts = words(raw);
    const container = declarationId(parts[0]);
    if (!container || !byId.has(container)) return failure(`boundary ${parts[0] ?? index} references an unknown container`);
    const tokens = parts.slice(1).map((part) => part.toLowerCase().replace(/_/g, '-'));
    const modeToken = tokens.find((token) => ['wall', 'walls', 'surface', 'charged', 'constrained', 'partition'].includes(token));
    const mode: GasBoundary['mode'] = modeToken === 'charged' ? 'charged' : modeToken === 'constrained' || modeToken === 'partition' ? 'constrained' : 'wall';
    const sides = tokens.filter((token): token is (typeof GAS_SIDES)[number] => (GAS_SIDES as readonly string[]).includes(token));
    const unknown = tokens.filter((token) => token !== modeToken && token !== 'wall' && token !== 'walls' && token !== 'surface' && token !== 'partition' && !(GAS_SIDES as readonly string[]).includes(token) && token !== 'positive' && token !== 'negative' && token !== '+');
    if (unknown.length) return failure(`boundary ${container} has unsupported token(s): ${unknown.join(', ')}`);
    const sign = tokens.includes('positive') || tokens.includes('+') ? '+' : tokens.includes('negative') ? '−' : undefined;
    boundaries.push({ container, mode, sides: sides.length ? sides : [...GAS_SIDES], sign });
  }
  if (!boundaries.length) return failure('gas needs explicit boundary declarations');
  const boundedContainers = new Set(boundaries.map((boundary) => boundary.container));
  for (const box of containers) if (!boundedContainers.has(box.id)) return failure(`container ${box.id} has no boundary declaration`);

  const sideLine = (box: GasBox, side: string): [Point, Point] => {
    if (side === 'left') return [{ x: box.x, y: box.y }, { x: box.x, y: box.y + box.h }];
    if (side === 'right') return [{ x: box.x + box.w, y: box.y }, { x: box.x + box.w, y: box.y + box.h }];
    if (side === 'top') return [{ x: box.x, y: box.y }, { x: box.x + box.w, y: box.y }];
    return [{ x: box.x, y: box.y + box.h }, { x: box.x + box.w, y: box.y + box.h }];
  };
  const boundaryIds = new Set<string>();
  for (const boundary of boundaries) {
    const box = byId.get(boundary.container)!;
    for (const side of boundary.sides) {
      const [from, to] = sideLine(box, side);
      const id = `boundary-${boundary.container}-${side}`;
      if (boundaryIds.has(id)) continue;
      boundaryIds.add(id);
      b.line(id, from.x, from.y, to.x, to.y, {
        color: boundary.mode === 'charged' ? 'danger' : boundary.mode === 'constrained' ? 'guide' : 'neutral',
        role: 'boundary',
        width: boundary.mode === 'charged' ? 2 : 1.5,
      });
      if (boundary.sign && side === 'top') b.label(`boundary-${boundary.container}-sign`, boundary.sign, box.x + box.w / 2, box.y + 6, { slot: 'N', priority: 'preferred', anchorId: id });
    }
  }

  const particles: GasParticle[] = [];
  const particleIds = new Set<string>();
  for (const [index, raw] of specGetAll(spec, 'particle').entries()) {
    const parts = words(raw);
    const id = declarationId(parts[0]);
    const container = declarationId(parts[1]);
    const x = strictNumber(parts[2]);
    const y = strictNumber(parts[3]);
    if (!id || !container || !byId.has(container) || x === null || y === null || x < 0 || x > 1 || y < 0 || y > 1) {
      return failure(`particle ${parts[0] ?? index} needs id, known container, and normalized x y coordinates`);
    }
    if (particleIds.has(id)) return failure(`duplicate particle id: ${id}`);
    particleIds.add(id);
    let direction: Point | undefined;
    let collision: string | undefined;
    const rest = parts.slice(4);
    const directionWords: Record<string, Point> = {
      up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
    };
    const numericDirection = rest.filter((token) => strictNumber(token) !== null);
    if (numericDirection.length) {
      if (numericDirection.length !== 2) return failure(`particle ${id} needs two direction components`);
      direction = { x: strictNumber(numericDirection[0])!, y: strictNumber(numericDirection[1])! };
      if (Math.hypot(direction.x, direction.y) <= 1e-9) return failure(`particle ${id} needs a non-zero direction`);
    }
    for (const token of rest) {
      const normalized = token.toLowerCase();
      if (directionWords[normalized]) direction = directionWords[normalized];
      else if (normalized.startsWith('collision=')) collision = declarationId(normalized.slice('collision='.length)) ?? normalized.slice('collision='.length);
      else if (strictNumber(token) !== null) continue;
      else return failure(`particle ${id} has unsupported token: ${token}`);
    }
    if (collision && !direction) return failure(`particle ${id} collision needs a direction`);
    particles.push({ id, container, x, y, direction, collision });
  }
  if (!particles.length) return failure('gas needs at least one particle declaration');
  for (const particle of particles) {
    const box = byId.get(particle.container)!;
    const x = box.x + 8 + particle.x * Math.max(1, box.w - 16);
    const y = box.y + 8 + particle.y * Math.max(1, box.h - 16);
    const id = `particle-${particle.id}`;
    b.node(id, x - 3, y - 3, 6, 6, 'particle');
    b.circle(id, x, y, 3, { color: 'accent', fill: 'ink', role: 'geometry' });
    if (particle.direction) {
      const length = Math.hypot(particle.direction.x, particle.direction.y) || 1;
      const dx = (particle.direction.x / length) * 13;
      const dy = (particle.direction.y / length) * 13;
      b.line(`${id}-velocity`, x, y, x + dx, y + dy, { color: particle.collision ? 'danger' : 'accent', role: 'connector', markerEnd: true, width: 1.2 });
    }
  }

  for (const [index, raw] of specGetAll(spec, 'piston').entries()) {
    const parts = words(raw);
    const container = declarationId(parts[0]);
    const position = strictNumber(parts[1]);
    if (!container || !byId.has(container) || position === null || position < 0 || position > 1) return failure(`piston ${parts[0] ?? index} needs a known container and normalized position`);
    const box = byId.get(container)!;
    const y = box.y + position * box.h;
    const id = `piston-${container}`;
    b.node(id, box.x + 2, y - 4, box.w - 4, 8, 'piston');
    b.rect(id, box.x + 2, y - 4, box.w - 4, 8, { color: 'neutral', fill: 'ink', role: 'geometry', width: 1.2 });
    b.line(`${id}-rod`, box.x + box.w / 2, y - 4, box.x + box.w / 2, Math.max(14, y - 25), { color: 'neutral', role: 'connector', width: 2 });
    b.label(`${id}-label`, parts.slice(2).join(' ') || 'piston', box.x + box.w / 2, Math.max(12, y - 29), { slot: 'N', priority: 'preferred', anchorId: id });
  }

  for (const [index, raw] of specGetAll(spec, 'state').entries()) {
    const parts = words(raw);
    const container = declarationId(parts[0]);
    if (!container || !byId.has(container) || parts.length < 2) return failure(`state ${parts[0] ?? index} needs a known container and state text`);
    const text = parts.slice(1).join(' ');
    if (!text) return failure(`state ${container} needs non-empty state text`);
    const box = byId.get(container)!;
    b.label(`state-${container}`, text, box.x + box.w / 2, box.y + box.h * 0.52, { priority: 'preferred', anchorId: `container-${container}` });
  }
  return null;
}

type ThermoAxis = { direction: 'x' | 'y'; label: string };
type ThermoState = { id: string; x: number; y: number; label: string };
type ThermoPath = { from: string; to: string; kind: string };

function parseThermoPath(raw: string, known: Set<string>, index: number): ThermoPath | Failure {
  const endpoints: string[] = [];
  const remainder: string[] = [];
  for (const token of words(raw)) {
    if (token === '->' || token === '→') continue;
    const pieces = token.split(/->|→/).filter(Boolean);
    const unknownPieces: string[] = [];
    for (const piece of pieces) {
      const id = declarationId(piece);
      if (id && known.has(id)) {
        endpoints.push(id);
      } else if (piece) unknownPieces.push(piece);
    }
    remainder.push(...unknownPieces);
  }
  const kind = remainder.filter((token) => !/^(?:direction|sense)=/i.test(token)).join(' ').replace(/^process=/i, '').trim();
  if (endpoints.length !== 2 || !kind) return failure(`path ${index} needs two known states and a process kind`);
  if (endpoints[0] === endpoints[1]) return failure(`path ${index} cannot connect a state to itself`);
  return { from: endpoints[0]!, to: endpoints[1]!, kind };
}

function drawThermodynamicGraph(b: SceneBuilder, spec: SpecDoc, w: number, h: number): CompileResult | null {
  const invalid = keysAreKnown(spec, SCENE_VARIANTS.thermodynamic!.allowed);
  if (invalid) return invalid;
  const axes: ThermoAxis[] = [];
  for (const [index, raw] of specGetAll(spec, 'axis').entries()) {
    const parts = words(raw);
    const direction = parts[0]?.toLowerCase();
    const label = parts.slice(1).join(' ').trim();
    if ((direction !== 'x' && direction !== 'y') || !label) return failure(`axis ${index} needs x or y and a label`);
    if (axes.some((axis) => axis.direction === direction)) return failure(`duplicate ${direction}-axis declaration`);
    axes.push({ direction, label });
  }
  if (axes.length !== 2 || !axes.some((axis) => axis.direction === 'x') || !axes.some((axis) => axis.direction === 'y')) return failure('thermodynamic graph needs one labeled x-axis and one labeled y-axis');

  const states: ThermoState[] = [];
  const stateIds = new Set<string>();
  for (const [index, raw] of [...specGetAll(spec, 'state'), ...specGetAll(spec, 'point')].entries()) {
    const parts = words(raw);
    const id = declarationId(parts[0]);
    const x = strictNumber(parts[1]);
    const y = strictNumber(parts[2]);
    if (!id || x === null || y === null) return failure(`state ${parts[0] ?? index} needs id and finite x y values`);
    if (stateIds.has(id)) return failure(`duplicate thermodynamic state id: ${id}`);
    stateIds.add(id);
    states.push({ id, x, y, label: parts.slice(3).join(' ') || parts[0]! });
  }
  if (!states.length) return failure('thermodynamic graph needs at least one state or point declaration');

  const paths: ThermoPath[] = [];
  for (const [index, raw] of specGetAll(spec, 'path').entries()) {
    const path = parseThermoPath(raw, stateIds, index);
    if ('ok' in path && !path.ok) return path;
    if (!('kind' in path)) return failure(`path ${index} is malformed`);
    paths.push(path);
  }
  const cycle = specGet(spec, 'cycle');
  if (cycle !== undefined) {
    const sense = cycle.trim().toLowerCase().replace(/[-_]/g, ' ');
    if (!['clockwise', 'counterclockwise', 'counter clockwise', 'cw', 'ccw'].includes(sense)) return failure('cycle needs clockwise or counterclockwise sense');
    if (paths.length < 3) return failure('cycle needs at least three directed path segments');
    for (let i = 1; i < paths.length; i++) if (paths[i - 1]!.to !== paths[i]!.from) return failure('cycle path segments must form an ordered topology');
    if (paths[paths.length - 1]!.to !== paths[0]!.from) return failure('cycle path segments must close at the initial state');
  }

  // A drawn cycle must run the way its declaration says (y up: negative shoelace area = clockwise).
  if (cycle !== undefined) {
    const loop = paths.map((path) => states.find((state) => state.id === path.from)!);
    const area = loop.reduce((sum, p, i) => { const q = loop[(i + 1) % loop.length]!; return sum + p.x * q.y - q.x * p.y; }, 0);
    const clockwise = /^(clockwise|cw)$/.test(cycle.trim().toLowerCase().replace(/[-_]/g, ' '));
    if (Math.abs(area) < 1e-12) return failure('cycle encloses no area');
    if ((area < 0) !== clockwise) return failure(`cycle is declared ${clockwise ? 'clockwise' : 'counterclockwise'} but its paths run ${area < 0 ? 'clockwise' : 'counterclockwise'}`);
  }

  // A real graph: axes from the origin (state variables are rarely negative) with nice ticks, the y title
  // above the top tick, the x title under the tick row — the plot engine's layout.
  const xTitle = axes.find((axis) => axis.direction === 'x')!.label;
  const yTitle = axes.find((axis) => axis.direction === 'y')!.label;
  const tickH = measureText('0', FONT_MIN).h;
  const xTitleSize = measureText(xTitle, FONT_MIN);
  const yTitleSize = measureText(yTitle, FONT_MIN);
  // Headroom past the outermost states leaves space for labels outside the loop.
  const span = (values: number[]): [number, number] => {
    const lo = Math.min(0, ...values);
    const hi = Math.max(0, ...values);
    if (!(hi > lo)) return [lo, lo + 1];
    const room = (hi - lo) * 0.12;
    return [lo < 0 ? lo - room : lo, hi > 0 ? hi + room : hi];
  };
  const [yLo, yHi] = span(states.map((state) => state.y));
  const [xLo, xHi] = span(states.map((state) => state.x));
  // Superscripted ticks (2.5×10^5) and titles (m^3) reserve the height their raised glyphs need.
  const yTicksFor = (plotHeight: number) => niceTicks(yLo, yHi, true, (ticks) => plotHeight / (ticks.length - 1) >= tickH + 2.5);
  const raiseTop = Math.max(...formatTicks(yTicksFor(h - 60).ticks).map(raised));
  const raiseBottom = Math.max(...formatTicks(niceTicks(xLo, xHi, true, () => true).ticks).map(raised));
  const padT = Math.ceil(yTitleSize.h + tickH / 2 + 5 + raiseTop + dropped(yTitle));
  const plotH = h - padT - (tickH + 4 + raiseBottom + xTitleSize.h + 7 + raised(xTitle));
  const yScale = yTicksFor(plotH);
  const yTickText = formatTicks(yScale.ticks);
  const padL = Math.max(30, ...yTickText.map((text) => measureText(text, FONT_MIN).w + 10), yTitleSize.w + 10);
  const plotW = w - padL - 16;
  const xScale = niceTicks(xLo, xHi, true, (ticks, range) => plotW * (ticks[1]! - ticks[0]!) / range >= Math.max(...formatTicks(ticks).map((text) => measureText(text, FONT_MIN).w)) + 10);
  const xTickText = formatTicks(xScale.ticks);
  const x0 = padL;
  const y0 = padT + plotH;
  const mapX = (value: number) => x0 + ((value - xScale.lo) / (xScale.hi - xScale.lo)) * plotW;
  const mapY = (value: number) => y0 - ((value - yScale.lo) / (yScale.hi - yScale.lo)) * plotH;
  const at = new Map<string, Point>();
  for (const state of states) at.set(state.id, { x: mapX(state.x), y: mapY(state.y) });
  b.line('axis-x', x0, y0, x0 + plotW + 8, y0, { color: 'neutral', role: 'axis', markerEnd: true, width: 1.2 });
  b.line('axis-y', x0, y0, x0, padT - 8, { color: 'neutral', role: 'axis', markerEnd: true, width: 1.2 });
  const sharedOrigin = xScale.lo === 0 && yScale.lo === 0;
  xScale.ticks.forEach((tick, index) => {
    const x = mapX(tick);
    b.line(`axis-x-tick-mark-${index}`, x, y0 - 3, x, y0 + 3, { protected: true, width: 1, role: 'axis' });
    if (!(sharedOrigin && tick === 0)) b.label(`axis-x-tick-${index}`, xTickText[index]!, x, y0 + 4 + tickH / 2 + raised(xTickText[index]!), { protected: true, priority: 'required' });
  });
  yScale.ticks.forEach((tick, index) => {
    const y = mapY(tick);
    b.line(`axis-y-tick-mark-${index}`, x0 - 3, y, x0 + 3, y, { protected: true, width: 1, role: 'axis' });
    b.label(`axis-y-tick-${index}`, yTickText[index]!, x0 - 6 - measureText(yTickText[index]!, FONT_MIN).w / 2, y, { protected: true, priority: 'required' });
  });
  b.label('axis-x-label', xTitle, x0 + plotW / 2, y0 + 4 + tickH + raiseBottom + 2 + raised(xTitle) + xTitleSize.h / 2, { protected: true, priority: 'required', anchorId: 'axis-x' });
  b.label('axis-y-label', yTitle, x0 - 6 - yTitleSize.w / 2, padT - tickH / 2 - raiseTop - 1 - dropped(yTitle) - yTitleSize.h / 2, { protected: true, priority: 'required', anchorId: 'axis-y' });

  for (const state of states) {
    const point = at.get(state.id)!;
    const id = `state-${state.id}`;
    b.node(id, point.x - 4, point.y - 4, 8, 8, 'state');
    b.circle(id, point.x, point.y, 3.5, { color: 'accent', fill: 'ink', role: 'geometry', width: 1.2 });
  }
  const used = new Set<string>();
  const pathIds: string[] = [];
  for (const path of paths) {
    const from = at.get(path.from)!;
    const to = at.get(path.to)!;
    const id = uniqueId(`path-${path.from}-${path.to}`, used);
    pathIds.push(id);
    // Arrows stop short of the state dots so every state stays visible.
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const u = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
    b.line(id, from.x + u.x * 5, from.y + u.y * 5, to.x - u.x * 5.5, to.y - u.y * 5.5, { color: 'accent', role: 'connector', markerEnd: true, width: 1.6 });
  }

  // Labels go last, each at the nearest spot clear of every stroke: process names (long, so first) beside
  // their own path on its outer side, state names away from the centre of the states, the cycle sense inside.
  const centre = { x: [...at.values()].reduce((sum, p) => sum + p.x, 0) / at.size, y: [...at.values()].reduce((sum, p) => sum + p.y, 0) / at.size };
  const drawn = strokeSegments({ strokes: b.strokes } as Scene);
  // Tick labels and axis titles are already fixed in place; nothing may land on them.
  const taken: Box[] = b.labels.filter((label) => label.protected && label.text).map((label) => { const size = measureText(label.text!, FONT_MIN); return boxFrom(label.x, label.y, size.w, size.h); });
  // A process name with no room beside its own path is left out: next to another path it would mislabel it.
  const place = (id: string, text: string, spots: Point[], anchorId: string, fallback?: { at: Point; slot: SlotHint; priority: LabelPriority }) => {
    const size = measureText(text, FONT_MIN);
    const spot = freeSpot(spots, size, drawn, taken, 3, w, h);
    if (spot) {
      taken.push(boxFrom(spot.x, spot.y, size.w, size.h));
      b.label(id, text, spot.x, spot.y, { protected: true, priority: fallback?.priority ?? 'optional', anchorId });
    } else if (fallback) b.label(id, text, fallback.at.x, fallback.at.y, { slot: fallback.slot, priority: fallback.priority, anchorId });
  };
  paths.forEach((path, index) => {
    const id = pathIds[index]!;
    const from = at.get(path.from)!;
    const to = at.get(path.to)!;
    const size = measureText(path.kind, FONT_MIN);
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    let n = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    if ((mid.x - centre.x) * n.x + (mid.y - centre.y) * n.y < 0 || (Math.abs((mid.x - centre.x) * n.x + (mid.y - centre.y) * n.y) < 1e-6 && n.y > 0)) n = { x: -n.x, y: -n.y };
    // Outside the loop first; on the inner side of its own path only when the outside has no room.
    const spots = [n, { x: -n.x, y: -n.y }].flatMap((side) => {
      const reach = lineClearance(side, size, 5);
      return [0, -0.2, 0.2, -0.35, 0.35].flatMap((along) => [0, 4, 8].map((extra) => ({
        x: mid.x + (to.x - from.x) * along + side.x * (reach + extra),
        y: mid.y + (to.y - from.y) * along + side.y * (reach + extra),
      })));
    });
    place(`${id}-label`, path.kind, spots, id);
  });
  for (const state of states) {
    const point = at.get(state.id)!;
    const size = measureText(state.label, FONT_MIN);
    const away = Math.atan2(point.y - centre.y, point.x - centre.x);
    const spots = [0, 25, -25, 50, -50, 75, -75, 100, -100, 140, -140, 180].map((turn) => {
      const dir = { x: Math.cos(away + (turn * Math.PI) / 180), y: Math.sin(away + (turn * Math.PI) / 180) };
      const reach = Math.max(8, clearance(dir, size, 6.5));
      return { x: point.x + dir.x * reach, y: point.y + dir.y * reach };
    });
    place(`state-${state.id}-label`, state.label, spots, `state-${state.id}`, { at: point, slot: slotForDirection(Math.cos(away), Math.sin(away)), priority: 'preferred' });
  }
  if (cycle !== undefined) place('cycle-sense-label', cycle.trim(), [centre], pathIds.at(-1)!);
  return null;
}

export function compileScene(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (spec.emptyDeclarations.size || spec.lists.size) {
    return failure('scene declarations need inline values; repeat keys for multiple records');
  }
  const kind = (specGet(spec, 'kind') ?? 'fbd').toLowerCase();
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('scene', w, h);
  b.hl(spec.highlight);
  let extra: CompileResult | null = null;
  if (kind === 'fbd') extra = drawFbd(b, spec, w, h);
  else if (kind === 'geom' || kind === 'geometry') extra = drawGeom(b, spec, w, h);
  else if (kind === 'molecular') {
    // Several named objects share two strands: a roomier frame keeps each name beside its own glyph
    // (presentation scales it back to the figure box).
    const roomy = new SceneBuilder('scene', Math.max(w, 360), Math.max(h, 200));
    roomy.hl(spec.highlight);
    return drawMolecular(roomy, spec, roomy.width, roomy.height) ?? layoutAndCompile(roomy.scene());
  }
  else if (gasKind(kind) === 'gas') extra = drawGasState(b, spec, w, h);
  else if (gasKind(kind) === 'thermodynamic') extra = drawThermodynamicGraph(b, spec, w, h);
  else if (kind === 'apparatus' || kind === 'cycle' || kind === 'map' || kind === 'network' || kind === 'structure') {
    // A crowded part scene gets more room (wider columns, lanes for detours, space for relation words)
    // before it is refused; presentation scales the larger frame back to the figure box.
    for (const [sw, sh] of [[1, 1], [1.4, 1], [1.4, 1.5], [1.8, 1.7]] as const) {
      const attempt = new SceneBuilder('scene', Math.round(w * sw), Math.round(h * sh));
      attempt.hl(spec.highlight);
      extra = drawParts(attempt, spec, attempt.width, attempt.height, kind) ?? layoutAndCompile(attempt.scene());
      if (extra.ok || !/no route clear|no clear place|unsatisfiable/.test(`${extra.code} ${extra.reason}`)) return extra;
    }
    return extra!;
  }
  else if (kind === 'ray' || kind === 'optics') extra = drawRay(b, spec, w, h);
  else if (kind === 'field') extra = drawField(b, spec, w, h);
  else return failure(`unsupported scene kind ${kind}`);
  if (extra) return extra;
  return layoutAndCompile(b.scene());
}

function drawRay(b: SceneBuilder, spec: SpecDoc, w: number, h: number): CompileResult | null {
  const invalid = keysAreKnown(spec, SCENE_VARIANTS.ray!.allowed);
  if (invalid) return invalid;
  const f = specNumber(spec, 'f');
  const do_ = specNumber(spec, 'do');
  const ho = specNumber(spec, 'ho');
  if (f === undefined || do_ === undefined || ho === undefined || f <= 0 || do_ <= 0 || ho <= 0) return failure('ray needs positive f, do, and ho');
  const di = do_ === f ? Number.POSITIVE_INFINITY : (f * do_) / (do_ - f);
  const finiteImage = Number.isFinite(di);
  const hi = finiteImage ? -ho * (di / do_) : 0;
  const rayEnd = finiteImage && di > 0 ? di : f;
  const left = Math.min(-do_, -f, finiteImage ? di : 0);
  const right = Math.max(f, rayEnd);
  const maxHeight = Math.max(ho, Math.abs(hi), rayEnd * ho / do_);
  const scale = Math.min((w - 72) / (right - left), (h / 2 - 30) / maxHeight);
  if (!Number.isFinite(scale) || scale <= 0) return failure('ray distances exceed finite drawing bounds');
  const axisY = h / 2;
  const lensX = (w - (right + left) * scale) / 2;
  const objX = lensX - do_ * scale;
  const objectY = axisY - ho * scale;
  b.line('axis', 16, axisY, w - 16, axisY, { color: 'guide', role: 'axis', dash: true });
  // A converging thin lens: the lens line with outward arrowheads at both ends.
  b.line('lens', lensX, 24, lensX, h - 24, { color: 'neutral', role: 'geometry', width: 2, markerStart: true, markerEnd: true });
  // Match the text emitter's tenth-unit coordinates so focal ticks and labels align.
  b.circle('focus-right', Number((lensX + f * scale).toFixed(1)), axisY, 2, { fill: 'ink', role: 'annotation' });
  b.circle('focus-left', Number((lensX - f * scale).toFixed(1)), axisY, 2, { fill: 'ink', role: 'annotation' });
  b.line('object', objX, axisY, objX, objectY, { markerEnd: true, color: 'accent', role: 'connector' });
  b.line('ray-parallel', objX, objectY, lensX, objectY, { color: 'accent', role: 'connector' });
  b.line('ray-through-focus', lensX, objectY, lensX + rayEnd * scale, objectY + rayEnd * ho / f * scale, { color: 'accent', role: 'connector', markerEnd: true });
  b.line('ray-center-in', objX, objectY, lensX, axisY, { color: 'muted', role: 'connector' });
  b.line('ray-center-out', lensX, axisY, lensX + rayEnd * scale, axisY + rayEnd * ho / do_ * scale, { color: 'muted', role: 'connector', markerEnd: true });
  if (finiteImage) {
    const imgX = lensX + di * scale;
    const imageY = axisY - hi * scale;
    b.line('image', imgX, axisY, imgX, imageY, { markerEnd: true, color: 'muted', role: 'connector', dash: di < 0 });
    if (di < 0) {
      b.line('ray-virtual-extension', lensX, objectY, imgX, imageY, { color: 'guide', role: 'guide', dash: true });
      b.line('ray-center-extension', lensX, axisY, imgX, imageY, { color: 'guide', role: 'guide', dash: true });
    }
  }
  // Labels go last, each at the first spot beside its own mark that clears every ray and earlier label:
  // F over its focal point (below the axis, else above), object/image over their arrow (past the tip,
  // else beyond the base).
  const strokes = strokeSegments(b.scene());
  const taken: Box[] = [];
  const place = (id: string, text: string, anchorId: string, candidates: Point[]): boolean => {
    const size = measureText(text, 12);
    const spot = freeSpot(candidates, size, strokes, taken, 1.5, w, h);
    if (!spot) return false;
    b.label(id, text, spot.x, spot.y, { protected: true, priority: 'required', anchorId });
    taken.push(boxFrom(spot.x, spot.y, size.w, size.h));
    return true;
  };
  const alongArrow = (x: number, base: number, tip: number) => {
    const up = tip < base ? -1 : 1;
    return [tip + up * 12, tip + up * 24, base - up * 14, base - up * 26, base - up * 38].map((y) => ({ x, y }));
  };
  for (const [id, x] of [['F-right', Number((lensX + f * scale).toFixed(1))], ['F-left', Number((lensX - f * scale).toFixed(1))]] as const) {
    if (!place(id, 'F', id === 'F-right' ? 'focus-right' : 'focus-left', [14, -14, 26, -26].map((dy) => ({ x, y: axisY + dy })))) return failure(`ray label ${id} has no clear place`);
  }
  if (!place('object-label', 'object', 'object', alongArrow(objX, axisY, objectY))) return failure('ray label object has no clear place');
  if (finiteImage && !place('image-label', 'image', 'image', alongArrow(lensX + di * scale, axisY, axisY - hi * scale))) return failure('ray label image has no clear place');
  return null;
}

type FieldCatalog = 'dipole' | 'parallel-plate' | 'wire' | 'solenoid' | 'te10';

export function normalizeFieldCatalog(raw: string | undefined): FieldCatalog | null {
  if (!raw) return null;
  const t = raw.trim().split(/[\s,;]/)[0]!.toLowerCase().replace(/_/g, '-');
  if (t === 'dipole' || t === 'electric-dipole') return 'dipole';
  if (t === 'parallel-plate' || t === 'parallelplate' || t === 'plates') return 'parallel-plate';
  if (t === 'wire' || t === 'long-wire' || t === 'infinite-wire') return 'wire';
  if (t === 'solenoid' || t === 'coil') return 'solenoid';
  if (t === 'te10' || t === 'te-10' || t === 'waveguide') return 'te10';
  return null;
}

function drawField(b: SceneBuilder, spec: SpecDoc, w: number, h: number): CompileResult | null {
  const invalid = keysAreKnown(spec, SCENE_VARIANTS.field!.allowed);
  if (invalid) return invalid;
  const catalogRaw = specGet(spec, 'catalog');
  const coreRaw = specGet(spec, 'core');
  const cat = normalizeFieldCatalog(catalogRaw ?? (coreRaw ? 'solenoid' : undefined));
  if (!cat) return failure('field needs catalog: dipole|parallel-plate|wire|solenoid|TE10');
  if (cat === 'parallel-plate') {
    const declaration = [catalogRaw, coreRaw].filter((value): value is string => Boolean(value)).join(' ');
    if (coreRaw || /\b(?:equipotential|potential[- ]?planes?|multiple\s+(?:equipotential\s+)?planes?)\b/i.test(declaration)) {
      return failure(`field parallel-plate cannot render declared non-equivalent semantic: ${declaration}`);
    }
  }
  if (cat === 'dipole') {
    b.circle('plus', w * 0.32, h / 2, 8, { color: 'danger', role: 'geometry' });
    b.circle('minus', w * 0.68, h / 2, 8, { color: 'accent', role: 'geometry' });
    b.label('plus-label', '+', w * 0.32, h / 2, { priority: 'required', protected: true, anchorId: 'plus' });
    b.label('minus-label', '−', w * 0.68, h / 2, { priority: 'required', protected: true, anchorId: 'minus' });
    for (let i = 0; i < 5; i++) {
      const y = 28 + i * ((h - 48) / 4);
      b.path(`field-line-${i + 1}`, `M ${w * 0.36} ${h / 2} Q ${w * 0.5} ${y} ${w * 0.64} ${h / 2}`, { color: 'muted', role: 'connector', markerEnd: true });
    }
    return null;
  }
  if (cat === 'parallel-plate') {
    b.rect('plate-left', 70, 28, 10, h - 52, { fill: 'muted', role: 'boundary', width: 1.4 });
    b.rect('plate-right', w - 80, 28, 10, h - 52, { fill: 'muted', role: 'boundary', width: 1.4 });
    for (let i = 0; i < 5; i++) {
      const y = 40 + i * ((h - 70) / 4);
      b.line(`field-line-${i + 1}`, 88, y, w - 88, y, { markerEnd: true, color: 'accent', role: 'connector', width: 1.4 });
    }
    b.label('plate-left-label', '+', 75, 18, { priority: 'required', protected: true, anchorId: 'plate-left' });
    b.label('plate-right-label', '−', w - 75, 18, { priority: 'required', protected: true, anchorId: 'plate-right' });
    return null;
  }
  if (cat === 'wire') {
    const cx = w / 2;
    const cy = h / 2;
    b.circle('wire', cx, cy, 8, { fill: 'muted', role: 'geometry', width: 1.6 });
    b.line('wire-cross-a', cx - 4, cy - 4, cx + 4, cy + 4, { role: 'geometry', width: 1.4 });
    b.line('wire-cross-b', cx - 4, cy + 4, cx + 4, cy - 4, { role: 'geometry', width: 1.4 });
    for (let i = 0; i < 4; i++) b.circle(`field-ring-${i + 1}`, cx, cy, 18 + i * 12, { color: 'guide', role: 'geometry', width: 1 });
    b.arc('field-direction', cx, cy, 30, 30, -12, 72, { color: 'accent', role: 'connector', markerEnd: true, width: 1.4 });
    b.label('current-label', 'I', cx, cy - 16, { priority: 'required', protected: true, anchorId: 'wire' });
    return null;
  }
  if (cat === 'te10') {
    const x0 = 36;
    const y0 = 28;
    const bw = w - 72;
    const bh = h - 52;
    b.rect('waveguide', x0, y0, bw, bh, { role: 'boundary', width: 1.6 });
    for (let i = 1; i <= 7; i++) {
      const x = x0 + (i * bw) / 8;
      const half = Math.max(8, Math.sin((Math.PI * i) / 8) * (bh * 0.38));
      b.line(`field-line-${i}`, x, y0 + bh / 2 + half, x, y0 + bh / 2 - half, { markerEnd: true, color: 'accent', role: 'connector', width: 1.4 });
    }
    b.label('te10-label', 'TE10', w / 2, 16, { priority: 'required', protected: true, anchorId: 'waveguide' });
    return null;
  }
  const coreX = 48;
  const coreY = 46;
  const coreW = w - 88;
  const coreH = h - 78;
  b.rect('core', coreX, coreY, coreW, coreH, { fill: 'muted', color: 'neutral', role: 'boundary', width: 1.4 });
  for (let i = 0; i < 8; i++) {
    const x0 = coreX + 6 + (i * (coreW - 20)) / 7;
    b.line(`core-hatch-${i + 1}`, x0, coreY + 4, x0 + 16, coreY + coreH - 4, { color: 'neutral', role: 'hatch', width: 0.7 });
  }
  for (let i = 0; i < 6; i++) {
    const cx = coreX + 18 + (i * (coreW - 36)) / 5;
    b.ellipse(`coil-wrap-${i + 1}`, cx, coreY + coreH / 2, 8, coreH / 2 + 12, { color: 'neutral', role: 'geometry' });
  }
  const bYs = [coreY + coreH * 0.28, coreY + coreH * 0.45, coreY + coreH * 0.62];
  bYs.forEach((y, i) => b.line(i === 1 ? 'B' : `B-${i + 1}`, coreX + 14, y, coreX + coreW - 14, y, { markerEnd: true, color: 'accent', role: 'connector', width: 1.6 }));
  const hy = coreY + coreH * 0.82;
  b.line('H', coreX + 14, hy, coreX + coreW - 28, hy, { markerEnd: true, color: 'danger', role: 'connector', width: 1.8 });
  const mur = /mu_r\s*=\s*(\S+)/i.exec(specGet(spec, 'core') ?? '')?.[1] ?? specGet(spec, 'core') ?? '400';
  b.label('mu-r-label', `μ_r=${mur}`, coreX + coreW / 2, 18, { priority: 'required', protected: true, anchorId: 'core' });
  b.label('b-label', `B=${specGet(spec, 'b') ?? '1.0 T'}`, coreX + coreW - 30, 18, { priority: 'required', protected: true, anchorId: 'B' });
  b.label('h-label', `H=${specGet(spec, 'h') ?? '?'}`, coreX + coreW - 30, h - 10, { priority: 'required', protected: true, anchorId: 'H' });
  return null;
}
