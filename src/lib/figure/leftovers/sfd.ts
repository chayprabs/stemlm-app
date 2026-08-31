import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, specHas, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

function parsePieces(raw: string | undefined): { x: number; y: number }[] {
  if (!raw) return [];
  return raw.split(';').flatMap((p) => {
    const nums = p.trim().split(/[\s,]+/).map(Number);
    if (nums.length >= 2 && Number.isFinite(nums[0]) && Number.isFinite(nums[1])) {
      return [{ x: nums[0]!, y: nums[1]! }];
    }
    return [];
  });
}

function fail(reason: string): CompileResult {
  return { ok: false, code: 'malformed', reason };
}

type Station = { kind: string; at: number; label: string };

function parseStations(raw: string | undefined, length: number): Station[] {
  if (!raw) return [];
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
  return rawItems.flatMap((item, index) => {
    const value = item.trim();
    if (!value) return [];
    const at = /@\s*(-?\d+(?:\.\d+)?)/.exec(value)?.[1];
    const namedAt = /\b(?:left|inlet|start)\b/i.test(value) ? 0 : /\b(?:right|outlet|end)\b/i.test(value) ? length : undefined;
    const n = at === undefined ? (namedAt ?? (Number.isFinite(Number(value)) ? Number(value) : index === 0 ? 0 : length)) : Number(at);
    if (!Number.isFinite(n) || n < 0 || n > length) return [];
    const kind = value.replace(/@\s*-?\d+(?:\.\d+)?/, '').replace(/\b(?:left|right|inlet|outlet|start|end)\b/gi, '').trim().split(/\s+/)[0] || 'point';
    return [{ kind: kind.toLowerCase(), at: n, label: value }];
  });
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

export function compileSfd(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const L = specNumber(spec, 'l', 8) ?? 8;
  const V = parsePieces(specGet(spec, 'v'));
  const M = parsePieces(specGet(spec, 'm'));
  const sign = specGet(spec, 'sign');
  if (!Number.isFinite(L) || L <= 0) return fail('length must be positive');
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

  const supports = parseStations(specGet(spec, 'supports'), L);
  supports.forEach((support, index) => {
    const id = `support-${support.kind}-${index}`;
    drawSupport(b, id, support.kind, mapX(support.at), 25);
    b.label(`${id}-label`, support.kind, mapX(support.at), 11, { slot: 'N', priority: 'optional' });
  });
  const loads = parseStations(specGet(spec, 'loads'), L);
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
  const L = specNumber(spec, 'l', specNumber(spec, 'span', 8)) ?? 8;
  if (!Number.isFinite(L) || L <= 0) return fail('beam span must be positive');
  const supports = parseStations(specGet(spec, 'supports'), L);
  const loads = parseStations(specGet(spec, 'loads'), L);
  const reactions = parseStations(specGet(spec, 'reactions'), L);
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
