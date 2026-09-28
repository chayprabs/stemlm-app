import { FONT_MIN, type CompileCtx, type CompileResult } from '../types';
import { measureText } from '../geom';
import { specGet, specGetAll, specHasEmptyDelimitedValue, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

function parsePieces(raw: string | undefined): { points: { x: number; y: number }[]; malformed: boolean } {
  if (!raw) return { points: [], malformed: false };
  const points: { x: number; y: number }[] = [];
  let malformed = false;
  raw.split(';').forEach((piece) => {
    const value = piece.trim();
    const nums = value ? value.split(/[\s,]+/).map(Number) : [];
    if (nums.length === 2 && nums.every((number) => Number.isFinite(number))) {
      points.push({ x: nums[0]!, y: nums[1]! });
    } else {
      malformed = true;
    }
  });
  return { points, malformed };
}

function fail(reason: string): CompileResult {
  return { ok: false, code: 'malformed', reason };
}

type Station = { kind: string; at: number; label: string };
type ParsedStations = { stations: Station[]; malformed: boolean };

function parseStations(raw: string | undefined, length: number): ParsedStations {
  if (!raw) return { stations: [], malformed: false };
  const rawItems: string[] = [];
  if (raw.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        parsed.forEach((entry) => {
          if (entry && typeof entry === 'object') {
            const record = entry as Record<string, unknown>;
            rawItems.push(`${String(record.type ?? record.name ?? 'point')}@${String(record.at ?? '')}`.replace(/@$/, ''));
          }
        });
      }
    } catch { /* use line syntax below */ }
  }
  if (!rawItems.length) rawItems.push(...raw.split(/[,;]+/));
  let malformed = false;
  const stations = rawItems.flatMap((item, index) => {
    const value = item.trim();
    if (!value) {
      malformed = true;
      return [];
    }
    const atMatch = /@\s*([^\s]+)$/.exec(value);
    const at = atMatch?.[1];
    const namedAt = /\b(?:left|inlet|start)\b/i.test(value) ? 0 : /\b(?:right|outlet|end)\b/i.test(value) ? length : undefined;
    const hasExplicitTarget = value.includes('@');
    const n = at === undefined
      ? (namedAt ?? (Number.isFinite(Number(value)) ? Number(value) : index === 0 ? 0 : length))
      : /^(?:-?\d+(?:\.\d+)?|-?\.\d+)$/.test(at)
        ? Number(at)
        : namedAt !== undefined && /^(?:left|inlet|start|right|outlet|end)$/i.test(at)
          ? namedAt
          : NaN;
    if (!Number.isFinite(n) || n < 0 || n > length || (hasExplicitTarget && at === undefined)) {
      malformed = true;
      return [];
    }
    const kind = value.replace(/@\s*-?\d+(?:\.\d+)?/, '').replace(/\b(?:left|right|inlet|outlet|start|end)\b/gi, '').trim().split(/\s+/)[0] || 'point';
    return [{ kind: kind.toLowerCase(), at: n, label: value }];
  });
  return { stations, malformed };
}

function drawSupport(b: SceneBuilder, id: string, kind: string, x: number, y: number): void {
  if (kind.includes('roller')) {
    b.circle(`${id}-roller`, x, y + 8, 4, { role: 'geometry' });
    b.line(`${id}-ground`, x - 9, y + 14, x + 9, y + 14, { role: 'boundary', color: 'muted' });
    return;
  }
  b.polygon(`${id}-pin`, [x - 8, y + 12, x + 8, y + 12, x, y], { role: 'geometry', fill: 'none' });
  b.line(`${id}-ground`, x - 10, y + 14, x + 10, y + 14, { role: 'boundary', color: 'muted' });
}

/** Physical admission is separate from preserving supplied ordinate geometry. */
export function validateSfdSemantics(spec: SpecDoc): string | null {
  const length = specNumber(spec, 'l', 8) ?? 8;
  const shear = parsePieces(specGetAll(spec, 'v').join(';')).points;
  const moment = parsePieces(specGetAll(spec, 'm').join(';')).points;
  const distanceTolerance = Math.max(1, length) * 1e-9;
  for (const [name, points] of [['V', shear], ['M', moment]] as const) {
    if (points.length < 2 || Math.abs(points[0]!.x) > distanceTolerance ||
      Math.abs(points[points.length - 1]!.x - length) > distanceTolerance) {
      return `${name} ordinates must cover the complete beam span`;
    }
    if (points.some((point, i) => point.x < 0 || point.x > length || (i > 0 && point.x < points[i - 1]!.x))) {
      return `${name} stations must be ordered and inside the beam span`;
    }
  }
  const supports = parseStations(specGetAll(spec, 'supports').join(','), length).stations;
  if (supports.some(support => support.kind !== 'pin' && support.kind !== 'roller')) {
    return 'sfd can depict pin and roller supports only';
  }
  const loads = parseStations(specGetAll(spec, 'loads').join(','), length).stations;
  if (loads.some(load => !/^(?:point\s+\S+(?:\s+down)?|[A-Za-z]\d*)\s*@/i.test(load.label))) {
    return 'sfd can depict downward point loads only; other loading must not be substituted';
  }
  // Allow ordinary rounded ordinates, without accepting a different moment curve.
  const scale = Math.max(1, ...moment.map(point => Math.abs(point.y)), ...shear.map(point => Math.abs(point.y) * length));
  const tolerance = scale * 1e-4;
  const numericLoads = new Map<number, number>();
  for (const load of loads) {
    const quantity = /^point\s+([+-]?\d+(?:\.\d+)?)(?:[A-Za-z]+)?(?:\s+down)?\s*@/i.exec(load.label);
    if (!quantity) continue;
    const magnitude = Number(quantity[1]);
    if (magnitude <= 0) return 'a downward point load must have a positive magnitude';
    numericLoads.set(load.at, (numericLoads.get(load.at) ?? 0) + magnitude);
  }
  for (const [at, magnitude] of numericLoads) {
    if (at === 0 || at === length || supports.some(support => support.at === at)) continue;
    const ordinates = shear.filter(point => Math.abs(point.x - at) <= distanceTolerance);
    const jump = ordinates.length > 1 ? ordinates[ordinates.length - 1]!.y - ordinates[0]!.y : 0;
    if (Math.abs(jump + magnitude) > Math.max(1, magnitude) * 1e-4) {
      return 'the shear jump must match the declared downward point load in consistent units';
    }
  }
  for (let i = 1; i < moment.length; i++) {
    const start = moment[i - 1]!;
    const end = moment[i]!;
    if (end.x === start.x && Math.abs(end.y - start.y) > tolerance) {
      return 'sfd cannot depict the concentrated couple required by a moment jump';
    }
    let integral = 0;
    for (let j = 1; j < shear.length; j++) {
      const left = shear[j - 1]!;
      const right = shear[j]!;
      const from = Math.max(start.x, left.x);
      const to = Math.min(end.x, right.x);
      if (to <= from) continue;
      const slope = (right.y - left.y) / (right.x - left.x);
      integral += (left.y + slope * ((from + to) / 2 - left.x)) * (to - from);
    }
    if (Math.abs(end.y - start.y - integral) > tolerance) {
      return 'supplied shear and moment ordinates contradict dM/dx = V';
    }
  }
  const endpointSupports = supports.length ? supports.filter(support => support.at === 0 || support.at === length) : [{ at: 0 }, { at: length }];
  if (endpointSupports.some(support => moment.some(point => point.x === support.at && Math.abs(point.y) > tolerance))) {
    return 'moment must be zero at a pin or roller beam end without an applied couple';
  }
  return null;
}

type Point = { x: number; y: number };

/** A load as a quantity: `point 12kN down` → `12 kN`, a force symbol stays as written. */
function loadText(label: string): string {
  const text = label.replace(/@.*$/, '').replace(/^\s*point\s+/i, '').replace(/\s+down\s*$/i, '').trim();
  return text.replace(/^([+-]?\d+(?:\.\d+)?)\s*([A-Za-z]+)$/, '$1 $2');
}

function compact(value: number): string {
  return String(Number(value.toFixed(3)));
}

/**
 * The ordinates a textbook writes on a V or M diagram: each plateau once, both sides of a jump, local extrema,
 * nonzero ends, and (`at`) the value at any other named station. Runs of equal value are one plateau.
 */
type Ordinate = { x: number; y: number; side: 'left' | 'right' | 'centre' };

function keyOrdinates(points: Point[], at: number[]): Ordinate[] {
  const runs: { x1: number; x2: number; y: number }[] = [];
  for (const p of points) {
    const last = runs.at(-1);
    if (last && last.y === p.y) last.x2 = p.x;
    else runs.push({ x1: p.x, x2: p.x, y: p.y });
  }
  const jump = (x: number) => points.filter((p) => p.x === x).length > 1;
  return runs.flatMap((run, i): Ordinate[] => {
    if (run.y === 0) return [];
    const before = runs[i - 1];
    const after = runs[i + 1];
    const extremum = !before || !after || (run.y - before.y) * (run.y - after.y) > 0;
    if (run.x2 > run.x1) return [{ x: (run.x1 + run.x2) / 2, y: run.y, side: 'centre' }];
    if (jump(run.x1)) return [{ x: run.x1, y: run.y, side: before?.x2 === run.x1 ? 'right' : 'left' }];
    return extremum || at.includes(run.x1) ? [{ x: run.x1, y: run.y, side: 'centre' }] : [];
  });
}

export function compileSfd(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const L = specNumber(spec, 'l', 8) ?? 8;
  const parsedV = parsePieces(specGetAll(spec, 'v').join(';'));
  const parsedM = parsePieces(specGetAll(spec, 'm').join(';'));
  const V = parsedV.points;
  const M = parsedM.points;
  const sign = specGet(spec, 'sign');
  if (!Number.isFinite(L) || L <= 0) return fail('length must be positive');
  if (parsedV.malformed) return fail('V series contains a malformed ordinate piece');
  if (parsedM.malformed) return fail('M series contains a malformed ordinate piece');
  if (!V.length || !M.length) return fail('sfd requires both V and M ordinate series');
  if (sign && sign.toLowerCase().replace(/[\s_-]+/g, '') !== 'sagging+' && sign.toLowerCase().replace(/[\s_-]+/g, '') !== 'saggingpositive') {
    return fail('sfd supports the sagging-positive sign convention only');
  }
  if (specHasEmptyDelimitedValue(spec, 'supports') || specHasEmptyDelimitedValue(spec, 'loads')) return fail('sfd contains an empty station declaration');
  const parsedSupports = parseStations(specGetAll(spec, 'supports').join(','), L);
  const parsedLoads = parseStations(specGetAll(spec, 'loads').join(','), L);
  if (parsedSupports.malformed || parsedLoads.malformed) return fail('sfd contains an unknown or malformed station target');
  const supports = parsedSupports.stations.length
    ? parsedSupports.stations
    : [{ kind: 'pin', at: 0, label: 'pin' }, { kind: 'roller', at: L, label: 'roller' }];
  const loads = parsedLoads.stations;

  // Everything is placed here, sized from the text at the minimum font; the frame grows to fit (presentation scales).
  const textH = measureText('0', FONT_MIN).h;
  const amplitude = 22;
  const { w } = frameSize(ctx.profile);
  const padL = 30;
  const padR = 14;
  const mapX = (x: number) => padL + (x / L) * (w - padL - padR);
  const beamY = (loads.length ? textH + 30 : 8) + 4;
  const dimY = beamY + 26;
  const beamBottom = dimY + textH + 6;
  const band = (pts: Point[]) => ({
    above: pts.some((p) => p.y > 0) ? amplitude + textH + 8 : 8,
    below: pts.some((p) => p.y < 0) ? amplitude + textH + 8 : 8,
  });
  const vBand = band(V);
  const mBand = band(M);
  const vTop = beamBottom + 6;
  const mTop = vTop + vBand.above + vBand.below + 6;
  const h = mTop + mBand.above + mBand.below + 4;
  const b = new SceneBuilder('sfd', w, h);
  b.hl(spec.highlight);
  b.panel('beam', 'loaded beam', 0, 0, w, beamBottom);

  b.line('beam', padL, beamY, w - padR, beamY, { role: 'geometry', width: 2.4 });
  supports.forEach((support, index) => drawSupport(b, `support-${support.kind}-${index}`, support.kind, mapX(support.at), beamY));
  loads.forEach((load, index) => {
    const x = mapX(load.at);
    b.line(`load-${index}`, x, beamY - 24, x, beamY - 1, { color: 'danger', role: 'annotation', markerEnd: true });
    b.label(`load-${index}-label`, loadText(load.label), x, beamY - 26 - textH / 2, { protected: true, anchorId: `load-${index}` });
  });
  const stations = [...new Set([0, L, ...supports.map((s) => s.at), ...loads.map((l) => l.at)])].sort((a, c) => a - c);
  b.line('span-line', mapX(0), dimY, mapX(L), dimY, { color: 'muted', role: 'guide', width: 1 });
  stations.forEach((x, index) => {
    b.line(`span-tick-${index}`, mapX(x), dimY - 4, mapX(x), dimY + 4, { color: 'muted', role: 'guide', width: 1 });
    const next = stations[index + 1];
    if (next === undefined) return;
    const text = compact(next - x);
    if (measureText(text, FONT_MIN).w + 4 > mapX(next) - mapX(x)) return;
    b.label(`span-${index}`, text, (mapX(x) + mapX(next)) / 2, dimY + 3 + textH / 2, { protected: true, anchorId: 'span-line' });
  });

  const drawPlot = (name: 'V' | 'M', pts: Point[], top: number, extent: { above: number; below: number }, at: number[]) => {
    const mid = top + extent.above;
    b.panel(`${name}-panel`, name === 'V' ? 'shear force' : 'bending moment', 0, top, w, extent.above + extent.below);
    b.line(`${name}-x`, padL, mid, w - padR, mid, { color: 'guide', role: 'axis', width: 1 });
    b.line(`${name}-y`, padL, top + 2, padL, top + extent.above + extent.below - 2, { color: 'muted', role: 'axis', width: 1 });
    b.label(`${name}-yl`, name, padL / 2, mid, { protected: true });
    const max = Math.max(...pts.map((p) => Math.abs(p.y)), 1e-9);
    const yOf = (value: number) => mid - (value / max) * amplitude;
    const poly = pts.flatMap((p) => [mapX(p.x), yOf(p.y)]);
    b.polygon(`${name}-area`, [mapX(pts[0]!.x), mid, ...poly, mapX(pts.at(-1)!.x), mid], { color: 'muted', role: 'geometry', fill: 'tint', width: 0 });
    b.polyline(name, poly, { color: spec.highlight.includes(name) ? 'accent' : 'neutral', role: 'geometry', width: 1.8, fill: 'none' });
    keyOrdinates(pts, at).forEach((o, i) => {
      const text = compact(o.y);
      const half = measureText(text, FONT_MIN).w / 2;
      const nudge = o.side === 'left' ? -half - 3 : o.side === 'right' ? half + 3 : 0;
      const x = Math.min(w - padR - half, Math.max(padL + half + 3, mapX(o.x) + nudge));
      const y = o.y > 0 ? yOf(o.y) - 4 - textH / 2 : yOf(o.y) + 4 + textH / 2;
      b.label(`${name}-o${i}`, text, x, y, { protected: true, anchorId: name });
    });
  };
  drawPlot('V', V, vTop, vBand, []);
  drawPlot('M', M, mTop, mBand, stations.filter((x) => V.filter((p) => p.x === x).length > 1));
  return layoutAndCompile(b.scene());
}
