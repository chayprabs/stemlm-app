import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

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
    const x = ids.length === 1 ? w * 0.45 : 48 + (i * (w - 96)) / Math.max(1, ids.length - 1);
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

function lookupFbdPoint(
  points: Map<string, Point>,
  raw: string,
  b: SceneBuilder,
  w: number,
  h: number,
  used: Set<string>,
): Point | undefined {
  const existing = lookupPoint(points, raw);
  if (existing) return existing;
  const name = raw.trim();
  if (!/^(wall|ceiling|ground|floor|support|anchor)$/i.test(name)) return undefined;
  const id = idPart(name);
  const p = /ceiling|wall/i.test(name) ? { x: w * 0.5, y: 22 } : { x: w * 0.5, y: h - 18 };
  points.set(name.toLowerCase(), p);
  const anchorId = uniqueId(`anchor-${id}`, used);
  b.rect(anchorId, p.x - 24, p.y - 4, 48, 8, { color: 'neutral', role: 'boundary', pattern: 'hatch' });
  return p;
}

function drawFbd(b: SceneBuilder, spec: SpecDoc, w: number, h: number): CompileResult | null {
  const invalid = keysAreKnown(spec, ['body', 'incline_deg', 'force', 'axes', 'member', 'support', 'surface', 'dimension', 'angle', 'panel']);
  if (invalid) return invalid;
  const panels = drawPanels(b, spec, w, h);
  const bodies = namedBodies(spec);
  const positions = bodyPositions(bodies, w, h);
  const used = new Set<string>();
  const inclineRaw = specGet(spec, 'incline_deg');
  const incline = inclineRaw === undefined ? 0 : specNumber(spec, 'incline_deg');
  if (incline === undefined) return failure('incline_deg needs a finite numeric degree value');
  const { tangent, normal } = orientedBasis(incline);
  const bodyHalfWidth = 18;
  const bodyHalfHeight = 16;
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
  if (incline !== 0) {
    const freeBodies = bodies.filter((body) => !bodyPanel.has(body.toLowerCase()));
    const halfSpan = Math.min(64, Math.max(44, Math.min(
      (w - bodyHalfWidth * 2 - 20) / Math.max(Math.abs(tangent.x), 1e-6),
      (h - bodyHalfHeight * 2 - 36) / Math.max(Math.abs(tangent.y), 1e-6),
    ) / 2));
    const planeCenter = { x: w / 2, y: h * 0.58 };
    freeBodies.forEach((body, index) => {
      const offset = freeBodies.length <= 1 ? 0 : -halfSpan + (2 * halfSpan * index) / (freeBodies.length - 1);
      const contact = { x: planeCenter.x + tangent.x * offset, y: planeCenter.y + tangent.y * offset };
      positions.set(body.toLowerCase(), {
        x: contact.x + normal.x * bodyHalfHeight,
        y: contact.y + normal.y * bodyHalfHeight,
      });
    });
  }
  const bodyPoses = new Map<string, BodyPose>();
  bodies.forEach((body) => {
    const p = positions.get(body.toLowerCase())!;
    const id = `body-${idPart(body)}`;
    const pose: BodyPose = {
      center: p,
      tangent,
      normal,
      halfWidth: bodyHalfWidth,
      halfHeight: bodyHalfHeight,
    };
    bodyPoses.set(body.toLowerCase(), pose);
    used.add(id);
    const bbox = bodyBoundingBox(pose);
    b.node(id, bbox.x, bbox.y, bbox.w, bbox.h, 'body');
    if (incline === 0) b.rect(id, p.x - bodyHalfWidth, p.y - bodyHalfHeight, bodyHalfWidth * 2, bodyHalfHeight * 2, { fill: 'solid', color: 'neutral', role: 'geometry' });
    else b.polygon(id, bodyPolygon(pose), { fill: 'solid', color: 'neutral', role: 'geometry' });
    if (incline !== 0) {
      const [contactStart, contactEnd] = bodyContactEdge(pose);
      b.line(`contact-${idPart(body)}`, contactStart.x, contactStart.y, contactEnd.x, contactEnd.y, { color: 'neutral', role: 'boundary', width: 1.2 });
    }
    b.label(`body-label-${idPart(body)}`, body, p.x, p.y + 25, { slot: 'S', priority: 'required', anchorId: id, panelId: bodyPanel.get(body.toLowerCase()) });
  });
  if (incline !== 0) {
    const planeCenter = { x: w / 2, y: h * 0.58 };
    const halfSpan = Math.min(64, Math.max(44, Math.min(
      (w - bodyHalfWidth * 2 - 20) / Math.max(Math.abs(tangent.x), 1e-6),
      (h - bodyHalfHeight * 2 - 36) / Math.max(Math.abs(tangent.y), 1e-6),
    ) / 2));
    const start = { x: planeCenter.x - tangent.x * halfSpan, y: planeCenter.y - tangent.y * halfSpan };
    const end = { x: planeCenter.x + tangent.x * halfSpan, y: planeCenter.y + tangent.y * halfSpan };
    b.line('incline', start.x, start.y, end.x, end.y, { width: 2, role: 'boundary' });
  }
  const knownAngles = new Map<string, number>();
  const forceNames = new Map<string, number>();
  for (const raw of specGetAll(spec, 'force')) {
    const parts = words(raw);
    const name = parts[0];
    if (!name) return failure('force needs a name');
    const vec = vectorForForce(raw, incline, knownAngles);
    if (!vec) return failure(`force ${name} has an unsupported or ambiguous direction`);
    const owner = /\bon\s+([a-z][a-z0-9_.-]*)/i.exec(raw)?.[1] ?? bodies[0]!;
    const start = lookupPoint(positions, owner);
    if (!start) return failure(`force ${name} references unknown body ${owner}`);
    const anchor = bodyPoses.get(owner.toLowerCase());
    const forceStart = anchor ? bodyBoundaryPoint(anchor, { x: vec.dx, y: vec.dy }) : start;
    const baseName = idPart(name);
    const count = forceNames.get(baseName) ?? 0;
    forceNames.set(baseName, count + 1);
    const strokeId = `force-${baseName}${count ? `-${count + 1}` : ''}`;
    const end = { x: forceStart.x + vec.dx * 43, y: forceStart.y + vec.dy * 43 };
    b.line(strokeId, forceStart.x, forceStart.y, end.x, end.y, { markerEnd: true, color: 'accent', role: 'connector', width: 1.8 });
    b.label(`force-label-${strokeId.slice('force-'.length)}`, name, end.x, end.y, { slot: 'NE', priority: 'preferred', anchorId: strokeId });
    knownAngles.set(baseName, Math.atan2(vec.dy, vec.dx) * 180 / Math.PI);
  }
  if (specGet(spec, 'axes')) {
    const p = positions.get(bodies[0]!.toLowerCase())!;
    const pose = bodyPoses.get(bodies[0]!.toLowerCase());
    const origin = pose
      ? { x: p.x + pose.tangent.x * 42, y: p.y + pose.tangent.y * 42 }
      : { x: p.x + 42, y: p.y + 5 };
    const xEnd = pose
      ? { x: origin.x + pose.tangent.x * 33, y: origin.y + pose.tangent.y * 33 }
      : { x: p.x + 75, y: p.y + 5 };
    const yEnd = pose
      ? { x: origin.x + pose.normal.x * 33, y: origin.y + pose.normal.y * 33 }
      : { x: p.x + 42, y: p.y - 28 };
    b.line('axis-x', origin.x, origin.y, xEnd.x, xEnd.y, { markerEnd: true, color: 'muted', role: 'axis' });
    b.line('axis-y', origin.x, origin.y, yEnd.x, yEnd.y, { markerEnd: true, color: 'muted', role: 'axis' });
    b.label('axis-x-label', 'x', xEnd.x, xEnd.y, { slot: 'E', priority: 'required', anchorId: 'axis-x' });
    b.label('axis-y-label', 'y', yEnd.x, yEnd.y, { slot: 'N', priority: 'required', anchorId: 'axis-y' });
  }
  for (const [i, raw] of specGetAll(spec, 'member').entries()) {
    const parts = words(raw);
    const type = parts[0];
    const from = lookupFbdPoint(positions, parts[1] ?? '', b, w, h, used);
    const to = lookupFbdPoint(positions, parts[2] ?? '', b, w, h, used);
    if (!type || !from || !to) return failure(`member ${type ?? i} needs two known body endpoints`);
    const fromPose = bodyPoses.get((parts[1] ?? '').toLowerCase());
    const toPose = bodyPoses.get((parts[2] ?? '').toLowerCase());
    const memberFrom = fromPose && toPose
      ? bodyBoundaryPoint(fromPose, { x: toPose.center.x - fromPose.center.x, y: toPose.center.y - fromPose.center.y })
      : from;
    const memberTo = fromPose && toPose
      ? bodyBoundaryPoint(toPose, { x: fromPose.center.x - toPose.center.x, y: fromPose.center.y - toPose.center.y })
      : to;
    const id = uniqueId(`member-${type}`, used);
    if (/^spring$/i.test(type)) {
      const dx = memberTo.x - memberFrom.x;
      const dy = memberTo.y - memberFrom.y;
      const length = Math.hypot(dx, dy) || 1;
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
    const baseY = target.y + 28;
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
  const extras = drawDimensionsAndAngles(b, spec, positions, w, h, used);
  if (extras) return extras;
  return null;
}

function drawDimensionsAndAngles(b: SceneBuilder, spec: SpecDoc, points: Map<string, Point>, w: number, h: number, used: Set<string>): Failure | null {
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
    const nx = -dy / len;
    const ny = dx / len;
    const a = { x: from.x + nx * 13, y: from.y + ny * 13 };
    const c = { x: to.x + nx * 13, y: to.y + ny * 13 };
    b.line(id, a.x, a.y, c.x, c.y, { color: 'guide', role: 'dimension', markerStart: true, markerEnd: true });
    const label = parts.slice(3).join(' ') || idToken;
    b.label(`${id}-label`, label, (a.x + c.x) / 2, (a.y + c.y) / 2, { priority: 'preferred', anchorId: id });
    b.dimension(id, fromToken!, toToken!, `${id}-label`, 'aligned');
  }
  for (const [i, raw] of specGetAll(spec, 'angle').entries()) {
    const parts = words(raw);
    const idToken = parts[0];
    const at = lookupPoint(points, parts[1] ?? '') ?? { x: w / 2, y: h / 2 };
    const amount = /(-?\d+(?:\.\d+)?)\s*(?:deg|°)/i.exec(raw)?.[1];
    if (!idToken || amount === undefined) return failure(`angle ${idToken ?? i} needs a degree value`);
    const id = uniqueId(`angle-${idToken}`, used);
    const anglePoints = [...idToken];
    const vertex = parts[1]?.toLowerCase();
    const firstRay = anglePoints.length === 3 && anglePoints[1]?.toLowerCase() === vertex
      ? lookupPoint(points, anglePoints[0] ?? '')
      : undefined;
    const startDeg = firstRay
      ? (Math.atan2(firstRay.y - at.y, firstRay.x - at.x) * 180) / Math.PI
      : 0;
    const endDeg = startDeg + Number(amount);
    b.arc(id, at.x, at.y, 22, 22, startDeg, endDeg, { color: 'guide', role: 'annotation' });
    const labelAngle = ((startDeg + endDeg) * Math.PI) / 360;
    b.label(`${id}-label`, idToken, at.x + 27 * Math.cos(labelAngle), at.y + 27 * Math.sin(labelAngle), { priority: 'preferred', anchorId: id });
  }
  return null;
}

function drawGeom(b: SceneBuilder, spec: SpecDoc, w: number, h: number): CompileResult | null {
  const invalid = keysAreKnown(spec, ['point', 'segment', 'relation', 'angle', 'dimension', 'panel']);
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
    const inset = 18;
    const xMin = Math.min(...declared.map((point) => point.x));
    const xMax = Math.max(...declared.map((point) => point.x));
    const yMin = Math.min(...declared.map((point) => point.y));
    const yMax = Math.max(...declared.map((point) => point.y));
    const fit = (value: number, min: number, max: number, size: number): number => {
      if (max === min) return size / 2;
      const scale = Math.max(Math.abs(min), Math.abs(max), Number.MIN_VALUE);
      const ratio = (value / scale - min / scale) / (max / scale - min / scale);
      return inset + ratio * (size - inset * 2);
    };
    parsedPoints.forEach((entry) => {
      if (entry.explicit) {
        entry.point = { x: fit(entry.point.x, xMin, xMax, w), y: fit(entry.point.y, yMin, yMax, h) };
      }
    });
  }
  const points = new Map<string, Point>();
  parsedPoints.forEach(({ name, point: p }) => {
    points.set(name.toLowerCase(), p);
    const id = `point-${idPart(name)}`;
    b.circle(id, p.x, p.y, 3, { color: 'accent', fill: 'solid', role: 'geometry' });
    b.label(`${id}-label`, name, p.x, p.y, { priority: 'required', anchorId: id });
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
  const extras = drawDimensionsAndAngles(b, spec, points, w, h, used);
  if (extras) return extras;
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
    b.rect(id, x - 30, y - 14, 60, 28, { color: 'danger', fill: 'solid', role: 'geometry', width: 1.5 });
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
    b.circle(`${id}-load-head`, x, y + 5, 5, { color: 'danger', fill: 'solid', role: 'geometry' });
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

function boundaryPoint(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return { x: from.x + (dx >= 0 ? 30 : -30), y: from.y };
  return { x: from.x, y: from.y + (dy >= 0 ? 18 : -18) };
}

function routedRelation(
  from: Point,
  to: Point,
  directed: boolean,
  feedback: boolean,
  feedbackIndex: number,
  w: number,
  h: number,
): number[] {
  if (!directed || !feedback) {
    const start = boundaryPoint(from, to);
    const end = boundaryPoint(to, from);
    if (Math.abs(start.y - end.y) < 0.5 || Math.abs(start.x - end.x) < 0.5) {
      return [start.x, start.y, end.x, end.y];
    }
    const midX = (start.x + end.x) / 2;
    return [start.x, start.y, midX, start.y, midX, end.y, end.x, end.y];
  }

  // Back-edges use alternating outer channels. They never cut through the node grid, and
  // the side corridor keeps a feedback loop legible when its endpoints are far apart.
  const useBottom = feedbackIndex % 2 === 0;
  const laneIndex = Math.floor(feedbackIndex / 2);
  const laneY = useBottom
    ? Math.max(8, h - 7 - laneIndex * 9)
    : Math.min(h - 8, 31 + laneIndex * 9);
  const targetSide = to.x <= w / 2 ? -1 : 1;
  const source = { x: from.x + targetSide * 30, y: from.y };
  const corridorX = targetSide < 0 ? 6 : w - 6;
  const target = { x: to.x, y: to.y + (useBottom ? 18 : -18) };
  return [
    source.x, source.y,
    source.x, laneY,
    corridorX, laneY,
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
  const invalid = keysAreKnown(spec, ['part', 'element', 'relation', 'panel']);
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
    b.node(declaration.id, x - 30, y - 18, 60, 36, declaration.partKind);
    drawPhysicalPartGlyph(b, declaration.id, declaration.partKind, declaration.name, declaration.role, x, y);
    const slot = directedLayout ? row % 2 === 0 ? 'N' : 'S' : 'auto';
    const labelY = fixedDirectedLabels ? slot === 'S' ? y + 28 : y - 28 : y;
    b.label(`${declaration.id}-label`, declaration.name, x, labelY, { slot, protected: fixedDirectedLabels, priority: 'preferred', anchorId: declaration.id });
  });
  let feedbackIndex = 0;
  for (const [i, raw] of relationValues.entries()) {
    const relation = relationEndpoints(raw, centers);
    if ('ok' in relation && !relation.ok) return relation;
    if (!('kind' in relation)) return failure(`relation ${i} is malformed`);
    const id = uniqueId(`relation-${relation.kind}`, used);
    const tokens = relationTokens(relation.kind);
    const directed = isDirectedRelation(tokens);
    const namedRelation = relationEndpointNames(raw, names);
    const feedback = directed && namedRelation !== null &&
      (orderIndex.get(namedRelation.from.toLowerCase()) ?? 0) > (orderIndex.get(namedRelation.to.toLowerCase()) ?? 0);
    const normalizedKind = relation.kind.toLowerCase().replace(/_/g, '-');
    const knownKind = RELATION_KINDS.has(normalizedKind) || tokens.some((token) => RELATION_KINDS.has(token));
    const route = routedRelation(relation.from, relation.to, directedLayout && directed, feedback, feedbackIndex, w, h);
    if (feedback) feedbackIndex += 1;
    const feedbackStroke = isFeedbackRelation(tokens);
    if (tokens.some((token) => /^deform|^deflect/.test(token))) {
      const mid = { x: (relation.from.x + relation.to.x) / 2, y: (relation.from.y + relation.to.y) / 2 - 8 };
      b.polyline(id, [relation.from.x, relation.from.y, mid.x, mid.y, relation.to.x, relation.to.y], { color: directed ? 'accent' : 'muted', role: knownKind ? 'connector' : 'annotation', markerEnd: directed, width: 1.4 });
    } else {
      b.polyline(id, route, { color: feedbackStroke ? 'danger' : directed ? 'accent' : 'muted', role: knownKind ? 'connector' : 'annotation', markerEnd: directed, dash: feedbackStroke || /^part-of$/i.test(normalizedKind) });
    }
    if (!directed && /^(transitions|contributes-to|indicates|acquires-before)$/i.test(normalizedKind)) {
      b.label(`${id}-label`, relation.kind, (relation.from.x + relation.to.x) / 2, (relation.from.y + relation.to.y) / 2, { priority: 'optional', anchorId: id });
    }
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
  const invalid = keysAreKnown(spec, ['strand', 'primer', 'fork', 'fragment', 'bubble', 'product', 'actor', 'relation']);
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
  strands.forEach((strand, index) => strandY.set(strand.id, 42 + index * strandGap));
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
  primersResult.forEach((primer) => {
    const point = pointForStrand(primer.strand);
    if (!point) return;
    const id = `primer-${primer.id}`;
    b.rect(id, point.x - 18, point.y - 4, 36, 8, { color: 'accent', fill: 'solid', role: 'connector' });
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
    b.label(`${id}-label`, fragment.id, (x1 + x2) / 2, y - 7, { priority: 'preferred', anchorId: id });
    centers.set(fragment.id, { x: (x1 + x2) / 2, y });
  });
  products.forEach((product, index) => {
    const source = strandIds.has(product.source) ? product.source : undefined;
    const xCenter = forks.length ? Math.min(strandEnd - 48, centerX + 42 + index * 34) : source ? Math.min(strandEnd - 45, 150 + index * 34) : w / 2;
    const y = Math.max(20, Math.min(h - 18, (sourceYAt(product.source, xCenter) ?? h * 0.64) + (source ? sourceOffset(product.source) : 0)));
    const x1 = product.orientation === '5to3' ? xCenter - 42 : xCenter + 42;
    const x2 = product.orientation === '5to3' ? xCenter + 42 : xCenter - 42;
    const id = `product-${product.id}`;
    b.line(id, x1, y, x2, y, { color: 'accent', role: 'connector', width: 2.2, markerEnd: product.orientation === '5to3', markerStart: product.orientation === '3to5' });
    b.label(`${id}-label`, product.id, (x1 + x2) / 2, y - 8, { priority: 'preferred', anchorId: id });
    centers.set(product.id, { x: (x1 + x2) / 2, y });
  });
  actors.forEach((actor, index) => {
    const bubble = bubbles.find((item) => item.actor === actor.id);
    const fork = forks[0];
    const linkedStrand = primersResult.find((item) => item.id === actor.id)?.strand;
    const base = bubble ? centers.get(bubble.id) : fork && /helicase/i.test(actor.type) ? centers.get(fork.id) : linkedStrand ? pointForStrand(linkedStrand) : undefined;
    const x = base?.x ?? (50 + (index * (w - 100)) / Math.max(1, actors.length - 1));
    const y = bubble ? base!.y + 2 : fork && /helicase/i.test(actor.type) ? base!.y : 28 + (index % 2) * 18;
    const id = `actor-${actor.id}`;
    b.node(id, x - 18, y - 11, 36, 22, actor.type);
    if (/polymerase|enzyme|primase|ligase|factor/i.test(actor.type)) b.ellipse(`${id}-glyph`, x, y, 18, 11, { color: 'accent', fill: 'solid', role: 'geometry' });
    else if (/helicase/i.test(actor.type)) b.circle(`${id}-glyph`, x, y, 12, { color: 'accent', fill: 'solid', role: 'geometry' });
    else if (/ribosome/i.test(actor.type)) b.ellipse(`${id}-glyph`, x, y, 23, 14, { color: 'neutral', fill: 'solid', role: 'geometry' });
    else b.rect(`${id}-glyph`, x - 18, y - 11, 36, 22, { color: 'neutral', fill: 'solid', role: 'geometry' });
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
  const invalid = keysAreKnown(spec, ['container', 'boundary', 'particle', 'piston', 'state', 'part', 'element', 'panel']);
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
    b.circle(id, x, y, 3, { color: 'accent', fill: 'solid', role: 'geometry' });
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
    b.rect(id, box.x + 2, y - 4, box.w - 4, 8, { color: 'neutral', fill: 'solid', role: 'geometry', width: 1.2 });
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
  const invalid = keysAreKnown(spec, ['axis', 'state', 'point', 'path', 'cycle']);
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
    states.push({ id, x, y, label: parts.slice(3).join(' ') || id });
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

  const plot = { left: 34, right: w - 18, top: 17, bottom: h - 30 };
  const xValues = states.map((state) => state.x);
  const yValues = states.map((state) => state.y);
  const range = (values: number[]): [number, number] => {
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (Math.abs(max - min) < 1e-9) {
      const pad = Math.max(1, Math.abs(min) * 0.1);
      min -= pad;
      max += pad;
    }
    return [min, max];
  };
  const [xMin, xMax] = range(xValues);
  const [yMin, yMax] = range(yValues);
  const at = new Map<string, Point>();
  for (const state of states) at.set(state.id, {
    x: plot.left + ((state.x - xMin) / (xMax - xMin)) * (plot.right - plot.left),
    y: plot.bottom - ((state.y - yMin) / (yMax - yMin)) * (plot.bottom - plot.top),
  });
  b.line('axis-x', plot.left - 8, plot.bottom, plot.right + 6, plot.bottom, { color: 'neutral', role: 'axis', markerEnd: true, width: 1.2 });
  b.line('axis-y', plot.left, plot.bottom + 6, plot.left, plot.top - 4, { color: 'neutral', role: 'axis', markerEnd: true, width: 1.2 });
  b.label('axis-x-label', axes.find((axis) => axis.direction === 'x')!.label, plot.right - 4, plot.bottom - 10, { slot: 'E', priority: 'required', anchorId: 'axis-x' });
  b.label('axis-y-label', axes.find((axis) => axis.direction === 'y')!.label, plot.left + 8, plot.top + 2, { slot: 'N', priority: 'required', anchorId: 'axis-y' });
  for (const state of states) {
    const point = at.get(state.id)!;
    const id = `state-${state.id}`;
    b.node(id, point.x - 4, point.y - 4, 8, 8, 'state');
    b.circle(id, point.x, point.y, 3.5, { color: 'accent', fill: 'solid', role: 'geometry', width: 1.2 });
    b.label(`${id}-label`, state.label, point.x, point.y, { slot: point.y < h / 2 ? 'S' : 'N', priority: 'preferred', anchorId: id });
  }
  const used = new Set<string>();
  for (const [index, path] of paths.entries()) {
    const from = at.get(path.from)!;
    const to = at.get(path.to)!;
    const id = uniqueId(`path-${path.from}-${path.to}`, used);
    b.line(id, from.x, from.y, to.x, to.y, { color: 'accent', role: 'connector', markerEnd: true, width: 1.6 });
    b.label(`${id}-label`, path.kind, (from.x + to.x) / 2, (from.y + to.y) / 2, { priority: 'optional', anchorId: id });
    if (index === paths.length - 1 && cycle !== undefined) b.label(`${id}-cycle-label`, cycle.trim(), (from.x + to.x) / 2, (from.y + to.y) / 2 + 12, { priority: 'optional', anchorId: id });
  }
  return null;
}

export function compileScene(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const kind = (specGet(spec, 'kind') ?? 'fbd').toLowerCase();
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('scene', w, h);
  b.hl(spec.highlight);
  let extra: CompileResult | null = null;
  if (kind === 'fbd') extra = drawFbd(b, spec, w, h);
  else if (kind === 'geom' || kind === 'geometry') extra = drawGeom(b, spec, w, h);
  else if (kind === 'molecular') extra = drawMolecular(b, spec, w, h);
  else if (gasKind(kind) === 'gas') extra = drawGasState(b, spec, w, h);
  else if (gasKind(kind) === 'thermodynamic') extra = drawThermodynamicGraph(b, spec, w, h);
  else if (kind === 'apparatus' || kind === 'cycle' || kind === 'map' || kind === 'network' || kind === 'structure') extra = drawParts(b, spec, w, h, kind);
  else if (kind === 'ray' || kind === 'optics') extra = drawRay(b, spec, w, h);
  else if (kind === 'field') extra = drawField(b, spec, w, h);
  else return failure(`unsupported scene kind ${kind}`);
  if (extra) return extra;
  return layoutAndCompile(b.scene());
}

function drawRay(b: SceneBuilder, spec: SpecDoc, w: number, h: number): CompileResult | null {
  const invalid = keysAreKnown(spec, ['f', 'do', 'ho']);
  if (invalid) return invalid;
  const f = specNumber(spec, 'f');
  const do_ = specNumber(spec, 'do');
  const ho = specNumber(spec, 'ho');
  if (f === undefined || do_ === undefined || ho === undefined || f <= 0 || do_ <= 0 || ho <= 0) return failure('ray needs positive f, do, and ho');
  const di = do_ === f ? Number.POSITIVE_INFINITY : (f * do_) / (do_ - f);
  const axisY = h / 2;
  const lensX = w * 0.5;
  const objX = Math.max(24, lensX - Math.min(do_, lensX - 25));
  b.line('axis', 16, axisY, w - 16, axisY, { color: 'guide', role: 'axis', dash: true });
  b.line('lens', lensX, 24, lensX, h - 24, { color: 'neutral', role: 'geometry', width: 2 });
  b.label('F-right', 'F', lensX + f, axisY + 14, { priority: 'required', anchorId: 'axis' });
  b.label('F-left', 'F', lensX - f, axisY + 14, { priority: 'required', anchorId: 'axis' });
  b.line('object', objX, axisY, objX, axisY - ho, { markerEnd: true, color: 'accent', role: 'connector' });
  b.label('object-label', 'object', objX, axisY - ho - 8, { priority: 'required', anchorId: 'object' });
  if (Number.isFinite(di)) {
    const imgX = lensX + Math.max(-w * 0.35, Math.min(w * 0.35, di));
    const hi = -ho * (di / do_);
    b.line('image', imgX, axisY, imgX, axisY - hi, { markerEnd: true, color: 'muted', role: 'connector', dash: di < 0 });
    b.label('image-label', 'image', imgX, axisY - hi - 8, { priority: 'preferred', anchorId: 'image' });
    b.line('ray-parallel', objX, axisY - ho, lensX, axisY - ho, { color: 'accent', role: 'connector' });
    b.line('ray-through-focus', lensX, axisY - ho, imgX, axisY - hi, { color: 'accent', role: 'connector', markerEnd: true });
  }
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
  const invalid = keysAreKnown(spec, ['catalog', 'core', 'b', 'h']);
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
