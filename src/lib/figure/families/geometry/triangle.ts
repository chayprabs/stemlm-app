/**
 * A triangle solved from what the problem gives and drawn to scale.
 *
 *   sides:    a=3, b=4, c=5      any subset; side a is opposite vertex A (also `BC = 3`, or three bare values in a, b, c order)
 *   angles:   C=90, A=36.87      degrees (`π/6` and `0.52 rad` are radians); any subset
 *   vertices: P, Q, R            names (default A, B, C); a side is named by the lowercase of the opposite vertex
 *   show:     given | solved     given (default): the given values, and the bare name of each unknown side;
 *                                solved: also every computed side and angle
 *   altitude: C                  the altitude from that vertex, with its foot and right-angle mark
 *   unit:     cm                 printed after every length
 *   case:     acute | obtuse     picks one triangle when two sides and a non-included angle fit two
 *   highlight: c, C              a side (by name or by its ends) or an angle (by its vertex)
 *
 * The type alias `right-triangle` puts the right angle at the third vertex when the data names none.
 * Right triangles stand on a leg; any other triangle stands on its longest side.
 */
import type { CompileCtx, CompileResult } from '../../types';
import type { Box } from '../../geom';
import { specGet, specList, type SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { layoutAndCompile } from '../../pipeline';
import { Placer, beyond, canvasHeight, clip, fan, malformed, refused, rightAngleMark, ring, sweep, textSize, type Pt } from './canvas';
import { parseAngle, parseQuantity } from './expr';
import { angleLabel, asWritten, fmt, fmtDegrees, isExactAt } from './format';
import { solveTriangle, type Triple } from './triangle-solve';

const RAD = Math.PI / 180;
const PAD = 6;
/** A triangle drawn flatter than this cannot hold its angle marks. */
const MIN_HEIGHT = 24;
/** Element ids are positional: the names a problem gives its vertices are text, never markup. */
const VERTEX_ID = ['A', 'B', 'C'] as const;
const SIDE_ID = ['a', 'b', 'c'] as const;

interface Fact { name: string | null; value: string }

interface Model {
  vertices: Triple<string>;
  sideNames: Triple<string>;
  sides: Triple<number>;
  angles: Triple<number>;
  /** Label of each side and angle; undefined leaves it unmarked. */
  sideText: Triple<string>;
  angleText: Triple<string | undefined>;
  altitude: { from: number; text?: string } | null;
  accentSides: Set<number>;
  accentAngles: Set<number>;
}


/** `a=3, b = 4 c=5`, `a: 3`, `∠C 90`, or bare values, as name/value pairs. */
function facts(lines: string[]): Fact[] {
  return lines
    .map((line) => line.replace(/\b(?:sides?|angles?|lengths?)\b/gi, ' ').trim().replace(/\s+(?=[^\s=,;]+\s*=)/g, ', '))
    .flatMap((line) => line.split(/[,;]/))
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const named = /^([^=:≈]*?)\s*[=:≈]\s*(.+)$/.exec(item) ?? /^([^\d\s.+\-−√(π]\S*)\s+(.+)$/.exec(item);
      return named ? { name: named[1]!.trim(), value: named[2]!.trim() } : { name: null, value: item };
    });
}

/** `key` cut into exactly `count` vertex names (`PQ` → P, Q) as indices; null when it is not that. */
function vertexRun(key: string, vertices: Triple<string>, count: number): number[] | null {
  if (!count) return key ? null : [];
  for (let i = 0; i < 3; i++) {
    const name = vertices[i]!.toLowerCase();
    if (!key.toLowerCase().startsWith(name)) continue;
    const rest = vertexRun(key.slice(name.length), vertices, count - 1);
    if (rest && !rest.includes(i)) return [i, ...rest];
  }
  return null;
}

/** `a` is the side opposite A; `BC` names the same side by its ends. */
function sideIndex(name: string, vertices: Triple<string>): number {
  const key = name.replace(/[|\s‾¯_]/g, '');
  const opposite = vertexRun(key, vertices, 1);
  if (opposite) return opposite[0]!;
  const ends = vertexRun(key, vertices, 2);
  return ends ? 3 - ends[0]! - ends[1]! : -1;
}

/** `C`, `∠C`, `∠ACB` (the middle letter), or α, β, γ for the first, second and third vertex. */
function angleIndex(name: string, vertices: Triple<string>): number {
  const key = name.replace(/^m?\s*[∠∡]/, '').replace(/[\s_]/g, '');
  const greek = [/^(?:α|\\?alpha)$/i, /^(?:β|\\?beta)$/i, /^(?:γ|\\?gamma)$/i].findIndex((pattern) => pattern.test(key));
  if (greek >= 0) return greek;
  const at = vertexRun(key, vertices, 1) ?? vertexRun(key, vertices, 3)?.slice(1, 2);
  return at ? at[0]! : -1;
}

function assign(what: 'side' | 'angle', items: Fact[], names: Triple<string>, triangle: string, index: (name: string) => number): Triple<string | undefined> | string {
  const out: Triple<string | undefined> = [undefined, undefined, undefined];
  const positional = items.length === 3 && items.every((item) => item.name === null);
  for (const [at, item] of items.entries()) {
    const i = positional ? at : item.name === null ? -1 : index(item.name);
    if (i < 0) {
      return item.name === null
        ? `${what}s: name each ${what}, as in ${names[0]}=${clip(item.value)}`
        : `${what}s: ${clip(item.name)} is not ${what === 'side' ? 'a side' : 'an angle'} of triangle ${triangle}`;
    }
    if (out[i] !== undefined) return `${what} ${names[i]} is given twice`;
    out[i] = item.value;
  }
  return out;
}

function readTriangle(spec: SpecDoc, ctx: CompileCtx): Model | string {
  const sideFacts = facts(specList(spec, 'sides'));
  const angleFacts = facts(specList(spec, 'angles'));
  const vertexRaw = specGet(spec, 'vertices');
  const show = (specGet(spec, 'show') ?? 'given').trim().toLowerCase();
  const altitudeRaw = specGet(spec, 'altitude');
  const unitRaw = specGet(spec, 'unit');
  const caseRaw = specGet(spec, 'case')?.trim().toLowerCase();

  let vertices: Triple<string> = ['A', 'B', 'C'];
  if (vertexRaw !== undefined) {
    const split = vertexRaw.split(/[,;\s]+/).filter(Boolean);
    const named = split.length === 1 && split[0]!.length === 3 ? [...split[0]!] : split;
    const distinct = new Set(named.map((name) => name.toLowerCase())).size === 3;
    if (named.length !== 3 || !distinct || named.some((name) => name.length > 3)) return 'vertices needs three distinct short names, as in P, Q, R';
    vertices = named as Triple<string>;
  }
  const sideNames = vertices.map((name) => name.toLowerCase()) as Triple<string>;
  if (!/^(?:given|solved?|all|computed)$/.test(show)) return `show: ${clip(show)} is not given or solved`;
  const solvedMode = show !== 'given';
  if (caseRaw !== undefined && caseRaw !== 'acute' && caseRaw !== 'obtuse') return `case: ${clip(caseRaw)} is not acute or obtuse`;

  const sideSource = assign('side', sideFacts, sideNames, vertices.join(''), (name) => sideIndex(name, vertices));
  if (typeof sideSource === 'string') return sideSource;
  const angleSource = assign('angle', angleFacts, vertices, vertices.join(''), (name) => angleIndex(name, vertices));
  if (typeof angleSource === 'string') return angleSource;

  const sides: Triple<number | undefined> = [undefined, undefined, undefined];
  const angles: Triple<number | undefined> = [undefined, undefined, undefined];
  const sideText: Triple<string | undefined> = [undefined, undefined, undefined];
  const angleText: Triple<string | undefined> = [undefined, undefined, undefined];
  const units = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const sideRaw = sideSource[i];
    if (sideRaw !== undefined) {
      const quantity = parseQuantity(sideRaw);
      if (!quantity) return `side ${sideNames[i]}: ${clip(sideRaw)} is not a length`;
      sides[i] = quantity.value;
      sideText[i] = asWritten(quantity.text, quantity.value);
      if (quantity.unit) units.add(quantity.unit);
    }
    const angleRaw = angleSource[i];
    if (angleRaw !== undefined) {
      const angle = parseAngle(angleRaw);
      if (!angle) return `angle ${vertices[i]}: ${clip(angleRaw)} is not an angle`;
      angles[i] = angle.degrees;
      angleText[i] = angleLabel(angle);
    }
  }
  if (units.size > 1) return `sides use different units (${[...units].map(clip).join(', ')})`;
  const unit = (unitRaw ?? [...units][0] ?? '').trim().slice(0, 12);

  // `type=right-triangle` states a right angle the keys may not repeat; by convention it is the third vertex.
  const facts3 = [...sides, ...angles].filter((value) => value !== undefined).length;
  if (/right/.test(ctx.alias ?? '') && facts3 < 3 && !angles.some((angle) => angle !== undefined && Math.abs(angle - 90) < 1e-9)) {
    if (angles[2] !== undefined) return `a right triangle needs its right angle named, as in angles: ${vertices[0]}=90`;
    angles[2] = 90;
    angleText[2] = '90°';
  }

  const solved = solveTriangle({ sides, angles, ssaCase: caseRaw, names: { sides: sideNames, angles: vertices } });
  if (!solved.ok) return solved.reason;

  const length = (value: number) => `${fmt(value)}${unit ? ` ${unit}` : ''}`;
  const computed = (name: string, value: number) => `${name} ${isExactAt(value, fmt(value)) ? '=' : '≈'} ${length(value)}`;
  const model: Model = {
    vertices,
    sideNames,
    sides: solved.sides,
    angles: solved.angles,
    sideText: sideNames.map((name, i) => {
      if (sideText[i] !== undefined) return `${name} = ${sideText[i]}${unit ? ` ${unit}` : ''}`;
      return solvedMode && !solved.scaleFree ? computed(name, solved.sides[i]!) : name;
    }) as Triple<string>,
    angleText: vertices.map((_, i) => angleText[i] ?? (solvedMode ? fmtDegrees(solved.angles[i]!) : undefined)) as Triple<string | undefined>,
    altitude: null,
    accentSides: new Set(),
    accentAngles: new Set(),
  };

  if (altitudeRaw !== undefined) {
    const from = altitudeRaw.split(/[^\p{L}\p{N}]+/u).map((word) => vertices.findIndex((name) => name.toLowerCase() === word.toLowerCase())).find((i) => i >= 0);
    if (from === undefined) return `altitude: ${clip(altitudeRaw)} names no vertex of triangle ${vertices.join('')}`;
    const height = solved.sides[(from + 1) % 3]! * Math.sin(solved.angles[(from + 2) % 3]! * RAD);
    model.altitude = { from, ...(solvedMode && !solved.scaleFree ? { text: computed('h', height) } : {}) };
  }
  for (const token of spec.highlight) {
    const angle = vertices.indexOf(token);
    if (angle >= 0) model.accentAngles.add(angle);
    else if (sideIndex(token, vertices) >= 0) model.accentSides.add(sideIndex(token, vertices));
  }
  return model;
}

/** Vertex positions in the triangle's own units, y up, anticlockwise in vertex order. */
function triangleVertices(sides: Triple<number>, angles: Triple<number>): Triple<Pt> {
  const points: Pt[] = [];
  const right = angles.findIndex((angle) => Math.abs(angle - 90) < 0.05);
  if (right >= 0) {
    // Legs along the axes, the longer one horizontal.
    const [i, j] = [(right + 1) % 3, (right + 2) % 3];
    if (sides[j]! >= sides[i]!) {
      points[right] = { x: 0, y: 0 };
      points[i] = { x: sides[j]!, y: 0 };
      points[j] = { x: 0, y: sides[i]! };
    } else {
      points[j] = { x: 0, y: 0 };
      points[right] = { x: sides[i]!, y: 0 };
      points[i] = { x: sides[i]!, y: sides[j]! };
    }
  } else {
    const apex = sides.indexOf(Math.max(...sides));
    const [i, j] = [(apex + 1) % 3, (apex + 2) % 3];
    points[i] = { x: 0, y: 0 };
    points[j] = { x: sides[apex]!, y: 0 };
    points[apex] = { x: sides[j]! * Math.cos(angles[i]! * RAD), y: sides[j]! * Math.sin(angles[i]! * RAD) };
  }
  return points as Triple<Pt>;
}

const toward = (p: Pt, q: Pt): Pt => {
  const d = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  return { x: (q.x - p.x) / d, y: (q.y - p.y) / d };
};

/** Screen angle of the normal to direction `u` that points away from direction `from`. */
const normalAway = (u: Pt, from: Pt): number => {
  const side = from.x * -u.y + from.y * u.x > 0 ? -1 : 1;
  return Math.atan2(u.x * side, -u.y * side);
};

/** The scene at `scale` with the first vertex's world origin at the canvas origin, and the box it occupies. */
function build(model: Model, world: Triple<Pt>, scale: number, size: { w: number; h: number }): { b: SceneBuilder; bounds: Box } | string {
  const b = new SceneBuilder('triangle', size.w, size.h);
  const placer = new Placer();
  const V = world.map((p) => ({ x: p.x * scale, y: -p.y * scale })) as Triple<Pt>;
  const label = (id: string, text: string, candidates: Iterable<Pt>): boolean => {
    const spot = placer.claim(textSize(text), candidates);
    if (spot) b.label(id, text, spot.x, spot.y, { protected: true });
    return spot !== null;
  };

  for (let i = 0; i < 3; i++) {
    const [p, q] = [V[(i + 1) % 3]!, V[(i + 2) % 3]!];
    b.line(`side-${SIDE_ID[i]}`, p.x, p.y, q.x, q.y, { role: 'geometry', color: model.accentSides.has(i) ? 'accent' : 'neutral' });
    placer.line(p.x, p.y, q.x, q.y);
  }

  if (model.altitude) {
    const { from } = model.altitude;
    const [p, q] = [V[(from + 1) % 3]!, V[(from + 2) % 3]!];
    const along = toward(p, q);
    const base = Math.hypot(q.x - p.x, q.y - p.y);
    const t = (V[from]!.x - p.x) * along.x + (V[from]!.y - p.y) * along.y;
    const foot = { x: p.x + along.x * t, y: p.y + along.y * t };
    // The altitude from an acute vertex of a right triangle is a leg: there is nothing more to draw.
    if (Math.min(Math.abs(t), Math.abs(t - base)) > 0.5) {
      b.line('altitude', V[from]!.x, V[from]!.y, foot.x, foot.y, { color: 'guide', width: 1.2, role: 'guide' });
      placer.line(V[from]!.x, V[from]!.y, foot.x, foot.y);
      if (t < 0 || t > base) {
        const near = t < 0 ? p : q;
        b.line('altitude-base', near.x, near.y, foot.x, foot.y, { color: 'guide', width: 1.2, role: 'guide' });
        placer.line(near.x, near.y, foot.x, foot.y);
      }
      const inward = t > base / 2 ? { x: -along.x, y: -along.y } : along;
      placer.path(rightAngleMark(b, 'altitude-foot', foot, inward, toward(foot, V[from]!), 6));
    }
  }

  const bisectors = V.map((v, i) => {
    const u1 = toward(v, V[(i + 1) % 3]!);
    const u2 = toward(v, V[(i + 2) % 3]!);
    return { u1, u2, inward: toward({ x: 0, y: 0 }, { x: u1.x + u2.x, y: u1.y + u2.y }) };
  });

  // Angle marks before any text, so no label is set across an arc.
  const arcs = bisectors.map(({ u1, u2 }, i) => {
    const text = model.angleText[i];
    if (text === undefined) return null;
    const v = V[i]!;
    const reach = Math.min(Math.hypot(V[(i + 1) % 3]!.x - v.x, V[(i + 1) % 3]!.y - v.y), Math.hypot(V[(i + 2) % 3]!.x - v.x, V[(i + 2) % 3]!.y - v.y));
    if (Math.abs(model.angles[i]! - 90) < 0.05) {
      placer.path(rightAngleMark(b, `angle-${VERTEX_ID[i]}`, v, u1, u2, Math.min(8, reach * 0.3)));
      return null;
    }
    const theta = model.angles[i]!;
    const radius = Math.min(theta < 35 ? 24 : theta > 110 ? 12 : 16, reach * 0.4);
    const start = Math.atan2(u1.y, u1.x);
    const turn = sweep(start, Math.atan2(u2.y, u2.x));
    const steps = Math.max(6, Math.ceil(Math.abs(turn) / (8 * RAD)));
    const points: number[] = [];
    for (let k = 0; k <= steps; k++) points.push(v.x + radius * Math.cos(start + (turn * k) / steps), v.y + radius * Math.sin(start + (turn * k) / steps));
    b.polyline(`angle-${VERTEX_ID[i]}`, points, { width: 1.1, role: 'annotation', color: model.accentAngles.has(i) ? 'accent' : 'neutral' });
    placer.path(points);
    return { text, radius, start, turn };
  });

  for (let i = 0; i < 3; i++) {
    const { inward } = bisectors[i]!;
    const name = model.vertices[i]!;
    if (!label(`vertex-${VERTEX_ID[i]}`, name, ring(V[i]!, textSize(name), fan(Math.atan2(-inward.y, -inward.x)), [2, 5, 9]))) return `no room to label vertex ${name}`;
  }

  for (let i = 0; i < 3; i++) {
    const arc = arcs[i];
    if (!arc) continue;
    const v = V[i]!;
    const { u1, u2, inward } = bisectors[i]!;
    const size = textSize(arc.text);
    const spots = function* (): Generator<Pt> {
      // Inside the angle, on the bisector or beside it when an altitude runs down the middle.
      const rays = [0.5, 0.3, 0.7].map((part) => arc.start + arc.turn * part);
      const inside = (ray: number, step: number): Pt => {
        const d = arc.radius + 3 + (Math.abs(Math.cos(ray)) * size.w + Math.abs(Math.sin(ray)) * size.h) / 2 + 2 * step;
        return { x: v.x + Math.cos(ray) * d, y: v.y + Math.sin(ray) * d };
      };
      for (let step = 0; step < 12; step++) for (const ray of rays) yield inside(ray, step);
      // A narrow angle has no room near its vertex: its value sits just outside, against the flatter side.
      for (const u of Math.abs(u1.y) <= Math.abs(u2.y) ? [u1, u2] : [u2, u1]) {
        for (const reach of [arc.radius + 6, arc.radius + 16, arc.radius - 4]) {
          yield beyond({ x: v.x + u.x * reach, y: v.y + u.y * reach }, normalAway(u, inward), 2, size);
        }
      }
      for (let step = 12; step < 60; step++) yield inside(rays[0]!, step);
    };
    if (!label(`angle-${VERTEX_ID[i]}-value`, arc.text, spots())) return `angle ${model.vertices[i]} is too narrow to label legibly`;
  }

  for (let i = 0; i < 3; i++) {
    const [p, q] = [V[(i + 1) % 3]!, V[(i + 2) % 3]!];
    const text = model.sideText[i]!;
    const size = textSize(text);
    const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const along = toward(p, q);
    const normal = normalAway(along, toward(mid, V[i]!));
    const length = Math.hypot(q.x - p.x, q.y - p.y);
    const spots = function* (): Generator<Pt> {
      for (const slide of [0, 0.15, -0.15, 0.3, -0.3]) {
        yield* ring({ x: mid.x + along.x * slide * length, y: mid.y + along.y * slide * length }, size, [normal], [3, 6]);
      }
    };
    if (!label(`side-${SIDE_ID[i]}-value`, text, spots())) return `no room to label side ${model.sideNames[i]}`;
  }

  if (model.altitude?.text) {
    const altitude = b.strokes.find((stroke) => stroke.id === 'altitude');
    if (altitude) {
      const [x1, y1, x2, y2] = altitude.points as [number, number, number, number];
      const size = textSize(model.altitude.text);
      const normal = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
      const spots = function* (): Generator<Pt> {
        for (const at of [0.5, 0.35, 0.65]) yield* ring({ x: x1 + (x2 - x1) * at, y: y1 + (y2 - y1) * at }, size, [normal, normal + Math.PI], [3, 7]);
      };
      if (!label('altitude-value', model.altitude.text, spots())) return 'no room to label the altitude';
    }
  }
  return { b, bounds: placer.bounds() };
}

/** The triangle at the largest scale at which it and its labels fit the canvas, centred; or why it cannot be drawn. */
function fit(model: Model, world: Triple<Pt>, size: { w: number; h: number }): SceneBuilder | string {
  const spanX = Math.max(...world.map((p) => p.x)) - Math.min(...world.map((p) => p.x));
  const spanY = Math.max(...world.map((p) => p.y));
  const room = { w: size.w - 2 * PAD, h: size.h - 2 * PAD };
  let scale = Math.min(room.w / spanX, room.h / spanY);
  // Labels do not shrink with the triangle, so the scale is settled by drawing and measuring.
  for (let pass = 0; pass < 6; pass++) {
    if (spanY * scale < MIN_HEIGHT) return 'too flat to draw legibly';
    const drawn = build(model, world, scale, size);
    if (typeof drawn === 'string') return drawn;
    const { b, bounds } = drawn;
    const shrink = Math.min(room.w / (bounds.x2 - bounds.x1), room.h / (bounds.y2 - bounds.y1));
    if (shrink >= 1) {
      const dx = (size.w - bounds.x1 - bounds.x2) / 2;
      const dy = (size.h - bounds.y1 - bounds.y2) / 2;
      for (const stroke of b.strokes) stroke.points = stroke.points.map((value, at) => value + (at % 2 ? dy : dx));
      for (const placed of b.labels) {
        placed.x += dx;
        placed.y += dy;
      }
      return b;
    }
    scale *= shrink * 0.98;
  }
  return 'the labels do not fit';
}

export function compileTriangle(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const model = readTriangle(spec, ctx);
  if (typeof model === 'string') return malformed(`triangle: ${model}`);
  const nominal = frameSize(ctx.profile);
  const world = triangleVertices(model.sides, model.angles);
  let reason = '';
  // The nominal canvas first; a triangle too cramped there (a squat one with an altitude) gets the tall one.
  for (const h of [nominal.h, canvasHeight(nominal.h + 1, nominal.h)]) {
    const fitted = fit(model, world, { w: nominal.w, h });
    if (typeof fitted !== 'string') return layoutAndCompile(fitted.scene());
    reason = fitted;
  }
  return refused(`triangle: ${reason}`);
}
