import type { CompileCtx, CompileResult } from '../types';
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

function symbolicCoefficient(value: string): { base: string; coefficient: number } | null {
  const match = /([A-Za-z]+)\s*(?:\/\s*(\d+(?:\.\d+)?))?/.exec(value);
  if (!match) return null;
  return { base: match[1]!.toLowerCase(), coefficient: match[2] ? 1 / Number(match[2]) : 1 };
}

function ordinate(points: { x: number; y: number }[], mapX: (x: number) => number, y0: number, height: number): number[] {
  const max = Math.max(...points.map((point) => Math.abs(point.y)), 1);
  return points.flatMap((point) => [mapX(point.x), y0 - (point.y / max) * height]);
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
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('sfd', w, h);
  b.hl(spec.highlight);
  const bands = 3;
  const bandH = (h - 12) / bands;
  const padL = 36;
  const padR = 12;
  const mapX = (x: number) => padL + (x / L) * (w - padL - padR);

  if (specHasEmptyDelimitedValue(spec, 'supports') || specHasEmptyDelimitedValue(spec, 'loads')) return fail('sfd contains an empty station declaration');
  const parsedSupports = parseStations(specGetAll(spec, 'supports').join(','), L);
  const parsedLoads = parseStations(specGetAll(spec, 'loads').join(','), L);
  if (parsedSupports.malformed || parsedLoads.malformed) return fail('sfd contains an unknown or malformed station target');
  const supports = parsedSupports.stations;
  supports.forEach((support, index) => {
    const id = `support-${support.kind}-${index}`;
    drawSupport(b, id, support.kind, mapX(support.at), 25);
    b.label(`${id}-label`, support.kind, mapX(support.at), 11, { slot: 'N', priority: 'optional' });
  });
  const loads = parsedLoads.stations;
  loads.forEach((load, index) => {
    const x = mapX(load.at);
    b.line(`load-${index}`, x, 28, x, 49, { color: 'danger', role: 'annotation', markerEnd: true });
    b.label(`load-${index}-label`, load.label.replace(/@.*$/, ''), x, 52, { slot: 'S', priority: 'optional' });
  });

  const drawPlot = (name: string, pts: { x: number; y: number }[], band: number, ylabel: string) => {
    const top = 6 + band * bandH;
    const mid = top + bandH * 0.55;
    b.line(`${name}-x`, padL, mid, w - padR, mid, { color: 'guide', role: 'axis', width: 1 });
    b.line(`${name}-y`, padL, top + 8, padL, top + bandH - 8, { color: 'muted', role: 'axis', width: 1 });
    b.label(`${name}-yl`, ylabel, 14, mid, { protected: true, priority: 'required' });
    if (!pts.length) return;
    const poly = ordinate(pts, mapX, mid, bandH * 0.35);
    b.polyline(name, poly, { color: spec.highlight.includes(name) ? 'accent' : 'neutral', role: 'geometry', width: 1.8, fill: 'none' });
    pts.forEach((p, i) => {
      if (i === 0 || i === pts.length - 1 || i === Math.floor(pts.length / 2)) {
        const yMax = Math.max(...pts.map((point) => Math.abs(point.y)), 1);
        b.label(`${name}-o${i}`, String(p.y), mapX(p.x), mid - (p.y / yMax) * (bandH * 0.35) - 8, { slot: 'N', priority: 'optional' });
      }
    });
  };

  // Load diagram (supports)
  const top = 6;
  const beamY = top + 18;
  b.line('beam', padL, beamY, w - padR, beamY, { role: 'geometry', width: 2.4 });
  if (!supports.length) {
    drawSupport(b, 'support-pin-0', 'pin', mapX(0), beamY);
    drawSupport(b, 'support-roller-1', 'roller', mapX(L), beamY);
  }
  b.label('L', `L=${L}`, w / 2, top + 8, { protected: true, priority: 'required' });
  drawPlot('V', V, 1, 'V');
  drawPlot('M', M, 2, 'M');
  b.label('sign', sign ?? 'sagging+', w - 40, h - 8, { priority: 'preferred', slot: 'SE' });
  return layoutAndCompile(b.scene());
}

export function compileBeam(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const allowed = new Set(['l', 'span', 'supports', 'loads', 'reactions', 'elastic_curve', 'caption', 'highlight']);
  const unknown = [...spec.values.keys(), ...spec.lists.keys()].filter((key) => !allowed.has(key));
  if (unknown.length) return fail(`unsupported beam key: ${unknown.join(', ')}`);
  if (specGetAll(spec, 'loads').some((line) => line.split(/[,;]+/).some((load) => !/^\s*(?:point\s+\S+\s+down|[A-Za-z]\d*)\s*@\s*\S+\s*$/.test(load)))) {
    return fail('beam loads must be point LABEL down@x or a point-force symbol@x');
  }
  const L = specNumber(spec, 'l', specNumber(spec, 'span', 8)) ?? 8;
  if (!Number.isFinite(L) || L <= 0) return fail('beam span must be positive');
  if (specHasEmptyDelimitedValue(spec, 'supports') || specHasEmptyDelimitedValue(spec, 'loads') || specHasEmptyDelimitedValue(spec, 'reactions')) return fail('beam contains an empty station declaration');
  const parsedSupports = parseStations(specGetAll(spec, 'supports').join(','), L);
  const parsedLoads = parseStations(specGetAll(spec, 'loads').join(','), L);
  const parsedReactions = parseStations(specGetAll(spec, 'reactions').join(','), L);
  if (parsedSupports.malformed || parsedLoads.malformed || parsedReactions.malformed) return fail('beam contains an unknown or malformed station target');
  const supports = parsedSupports.stations;
  const loads = parsedLoads.stations;
  const reactions = parsedReactions.stations;
  if (supports.length < 2) return fail('beam requires two supports');
  const tolerance = Math.max(1e-6, L * 1e-6);
  const endpointSupports = supports.length === 2
    && Math.abs(supports[0]!.at) <= tolerance
    && Math.abs(supports[1]!.at - L) <= tolerance;
  const centralPointLoad = loads.length === 1 && Math.abs(loads[0]!.at - L / 2) <= tolerance;
  if (loads.length && (!endpointSupports || !centralPointLoad)) {
    return fail('beam elastic curve currently supports one central load between endpoint supports');
  }
  if (reactions.length >= 2 && loads.length) {
    const load = symbolicCoefficient(loads[0]!.label);
    const left = symbolicCoefficient(reactions[0]!.label);
    const right = symbolicCoefficient(reactions[1]!.label);
    if (load && left && right && load.base === left.base && load.base === right.base) {
      const expected = load.coefficient / 2;
      if (Math.abs(left.coefficient - expected) > 1e-6 || Math.abs(right.coefficient - expected) > 1e-6) return fail('beam reactions do not balance the declared load');
    }
  }
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('beam', w, h);
  b.hl(spec.highlight);
  b.panel('deformed', 'deformed beam', 10, 8, w - 20, (h - 24) / 2);
  b.panel('freebody', 'free-body beam', 10, 16 + (h - 24) / 2, w - 20, (h - 24) / 2);
  const x0 = 28;
  const x1 = w - 28;
  const mapX = (x: number) => x0 + (x / L) * (x1 - x0);
  const upper = 8 + (h - 24) * 0.23;
  const lower = 16 + (h - 24) * 0.73;
  b.line('beam-reference', x0, upper, x1, upper, { color: 'muted', role: 'guide', dash: true, width: 1.2 });
  const curve: number[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    curve.push(x0 + t * (x1 - x0), upper + Math.sin(Math.PI * t) * 18);
  }
  b.polyline('elastic-curve', curve, { color: 'accent', role: 'geometry', width: 2, fill: 'none' });
  b.line('beam-freebody', x0, lower, x1, lower, { role: 'geometry', width: 2.4 });
  supports.forEach((support, index) => drawSupport(b, `support-${index}`, support.kind, mapX(support.at), lower));
  loads.forEach((load, index) => {
    const x = mapX(load.at);
    b.line(`load-${index}`, x, lower - 25, x, lower - 2, { color: 'danger', role: 'annotation', markerEnd: true });
    b.label(`load-${index}-label`, load.label.replace(/@.*$/, ''), x, lower - 30, { slot: 'N', priority: 'preferred' });
  });
  reactions.forEach((reaction, index) => {
    const x = mapX(reaction.at);
    b.line(`reaction-${index}`, x, lower + 25, x, lower + 2, { color: 'accent', role: 'annotation', markerEnd: true });
    b.label(`reaction-${index}-label`, reaction.label.replace(/@.*$/, ''), x, lower + 30, { slot: 'S', priority: 'optional' });
  });
  const elasticCurve = specGet(spec, 'elastic_curve');
  const landmark = elasticCurve?.match(/\blandmark\s*[:=]?\s*([^;]+)/i)?.[1]?.trim() ?? 'delta';
  b.label('elastic-landmark', landmark, mapX(L / 2), upper + 29, { slot: 'S', priority: 'preferred', panelId: 'deformed' });
  if (centralPointLoad) b.label('halfspan', 'L/2', mapX(L / 2), lower + 30, { slot: 'S', priority: 'preferred', panelId: 'freebody' });
  const firstSupport = supports[0]!;
  const lastSupport = supports.at(-1)!;
  b.dimension(
    'beam-span',
    `support-0-${firstSupport.kind.includes('roller') ? 'roller' : 'pin'}`,
    `support-${Math.max(0, supports.length - 1)}-${lastSupport.kind.includes('roller') ? 'roller' : 'pin'}`,
  );
  return layoutAndCompile(b.scene());
}
