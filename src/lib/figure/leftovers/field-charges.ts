import { FONT_MIN, type CompileCtx, type CompileResult } from '../types';
import { measureText, type Box } from '../geom';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

type Charge = { name: string; q: number; label: string; x: number; y: number };
type P = { x: number; y: number };

const MAX_CHARGES = 4;
const CHARGE_R = 7;
const failure = (reason: string): CompileResult => ({ ok: false, code: 'malformed', reason });
const num = (raw: string) => Number(raw.replace(/[−–]/g, '-'));

/** `charge: <name> <signed value>[ unit] at <x>,<y>` — positions in one consistent length unit. */
export function parseCharge(raw: string): Charge | null {
  const match = /^\s*(\p{L}[\p{L}\p{N}_'′]*)\s+([+\-−–]?\d*\.?\d+(?:e[+\-−–]?\d+)?)\s*(.*?)\s+at\s+([+\-−–]?\d*\.?\d+)\s*,\s*([+\-−–]?\d*\.?\d+)\s*$/iu.exec(raw);
  if (!match) return null;
  const q = num(match[2]!);
  const unit = match[3]!.trim();
  if (!Number.isFinite(q) || q === 0 || /\bat\b/i.test(unit)) return null;
  const magnitude = match[2]!.replace(/^[+\-−–]/, '');
  return { name: match[1]!, q, label: `${match[1]} = ${q > 0 ? '+' : '−'}${magnitude}${unit ? ` ${unit}` : ''}`, x: num(match[4]!), y: num(match[5]!) };
}

/** Lines per charge in proportion to |q|: an exact small-integer ratio when there is one, 24 lines at most. */
export function lineCounts(qs: number[]): number[] {
  const mags = qs.map(Math.abs);
  const ratios = mags.map((m) => m / Math.min(...mags));
  for (let s = 1; s <= 12; s++) {
    if (!ratios.every((r) => Math.abs(r * s - Math.round(r * s)) < 0.02)) continue;
    const base = ratios.map((r) => Math.round(r * s));
    if (Math.max(...base) > 12) break;
    const sum = base.reduce((a, b) => a + b, 0);
    const t = Math.max(1, Math.min(Math.floor(12 / Math.max(...base)), Math.ceil(8 / Math.min(...base)), Math.floor(24 / sum)));
    return base.map((b) => b * t);
  }
  return mags.map((m) => Math.max(1, Math.round((12 * m) / Math.max(...mags))));
}

function fieldAt(charges: Array<{ q: number; x: number; y: number }>, p: P): { x: number; y: number; ratio: number } {
  let ex = 0;
  let ey = 0;
  let sum = 0;
  for (const c of charges) {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const r2 = dx * dx + dy * dy;
    if (r2 === 0) return { x: 0, y: 0, ratio: Infinity };
    ex += (c.q * dx) / (r2 * Math.sqrt(r2));
    ey += (c.q * dy) / (r2 * Math.sqrt(r2));
    sum += Math.abs(c.q) / r2;
  }
  return { x: ex, y: ey, ratio: Math.hypot(ex, ey) / sum };
}

/** Points where the field vanishes (saddle points), found on a grid and refined by Newton's method. */
function nullPoints(charges: Charge[], span: number): P[] {
  const cx = charges.reduce((s, c) => s + c.x, 0) / charges.length;
  const cy = charges.reduce((s, c) => s + c.y, 0) / charges.length;
  const reach = 6 * span;
  const n = 90;
  const found: P[] = [];
  for (let i = 1; i < n; i++) {
    for (let j = 1; j < n; j++) {
      let p = { x: cx - reach + (2 * reach * i) / n, y: cy - reach + (2 * reach * j) / n };
      if (fieldAt(charges, p).ratio > 0.08) continue;
      const h = span * 1e-5;
      for (let k = 0; k < 40; k++) {
        const e = fieldAt(charges, p);
        const ex = fieldAt(charges, { x: p.x + h, y: p.y });
        const ey = fieldAt(charges, { x: p.x, y: p.y + h });
        const [a, b, c, d] = [(ex.x - e.x) / h, (ey.x - e.x) / h, (ex.y - e.y) / h, (ey.y - e.y) / h];
        const det = a * d - b * c;
        if (!Number.isFinite(det) || det === 0) break;
        p = { x: p.x - (d * e.x - b * e.y) / det, y: p.y - (-c * e.x + a * e.y) / det };
      }
      const refined = fieldAt(charges, p);
      const nearCharge = charges.some((c) => Math.hypot(p.x - c.x, p.y - c.y) < span * 0.05);
      if (refined.ratio < 1e-7 && !nearCharge && Math.abs(p.x - cx) <= reach && Math.abs(p.y - cy) <= reach &&
        !found.some((f) => Math.hypot(f.x - p.x, f.y - p.y) < span * 1e-3)) found.push(p);
    }
  }
  return found;
}

/** Douglas–Peucker simplification of a dense polyline. */
function simplify(points: P[], epsilon: number): P[] {
  if (points.length < 3) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    const a = points[s]!;
    const b = points[e]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let worst = -1;
    let at = -1;
    for (let i = s + 1; i < e; i++) {
      const p = points[i]!;
      const d = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / len;
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > epsilon) { keep[at] = true; stack.push([s, at], [at, e]); }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Field lines of stated point charges, traced from the Coulomb field (no schematic stand-in): lines per charge
 * in proportion to |q|, leaving positive charges and ending on negative ones or leaving the frame; lines that
 * reach a negative charge from outside are traced back from it. A neutral point in view is marked.
 */
export function compileChargeField(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const records = specGetAll(spec, 'charge');
  const catalog = specGet(spec, 'catalog')?.trim().toLowerCase();
  if (catalog && !/^(charges|point-charges|point_charges)$/.test(catalog)) return failure(`field catalog ${catalog} does not take charge records`);
  for (const key of [...spec.values.keys(), ...spec.lists.keys()]) {
    if (!['catalog', 'charge', 'caption', 'highlight'].includes(key)) return failure(`field charges does not support key ${key}`);
  }
  if (spec.invalidDeclarations.length) return failure(`field charges cannot read: ${spec.invalidDeclarations[0]}`);
  if (!records.length || records.length > MAX_CHARGES) return failure(`field charges needs 1 to ${MAX_CHARGES} charge records`);
  const charges = records.map(parseCharge);
  if (charges.some((c) => !c)) return failure('every charge must read <name> <signed value> [unit] at <x>,<y>');
  const list = charges as Charge[];
  if (new Set(list.map((c) => c.name)).size !== list.length) return failure('charge names must be distinct');
  const mags = list.map((c) => Math.abs(c.q));
  if (Math.max(...mags) / Math.min(...mags) > 12) return failure('charge magnitudes differ by more than 12x; line counts cannot stay proportional');
  const pairSpan = Math.max(0, ...list.flatMap((a) => list.map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
  if (list.length > 1 && list.some((a, i) => list.some((b, j) => i < j && Math.hypot(a.x - b.x, a.y - b.y) < pairSpan * 1e-3))) {
    return failure('two charges share one position');
  }

  const { w, h } = frameSize(ctx.profile);
  const pad = 14;
  const room = { w: w - 2 * pad, h: h - 2 * pad };
  const span = pairSpan || 1;
  // Fit the charges (and a neutral point when it stays readable) into ~70% of the frame, centred.
  const fit = (points: P[]) => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const bw = Math.max(...xs) - Math.min(...xs);
    const bh = Math.max(...ys) - Math.min(...ys);
    const scale = Math.min(bw > 0 ? (room.w * 0.7) / bw : Infinity, bh > 0 ? (room.h * 0.7) / bh : Infinity, (room.h * 0.7) / span);
    const mx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const my = (Math.max(...ys) + Math.min(...ys)) / 2;
    return (p: P): P => ({ x: w / 2 + (p.x - mx) * scale, y: h / 2 - (p.y - my) * scale });
  };
  const minSeparation = (map: (p: P) => P) => Math.min(Infinity, ...list.flatMap((a, i) => list.slice(i + 1).map((b) => Math.hypot(map(a).x - map(b).x, map(a).y - map(b).y))));
  const nulls = list.length > 1 ? nullPoints(list, span) : [];
  let map = fit([...list, ...nulls]);
  if (nulls.length && minSeparation(map) < 36) map = fit(list);
  const screen = list.map((c) => ({ ...c, ...map(c), q: c.q / Math.max(...mags) }));
  if (minSeparation(map) < 2 * CHARGE_R + 12) return failure('charges are too close together to draw');
  const shownNulls = nulls.map(map).filter((p) => p.x > pad && p.x < w - pad && p.y > pad && p.y < h - pad);

  const inside = (p: P) => p.x >= 3 && p.x <= w - 3 && p.y >= 3 && p.y <= h - 3;
  /** Follows the field (sign 1) or against it (sign -1) from `first`; `from` is the charge it leaves, or -1. */
  const traceFrom = (from: number, first: P, sign: 1 | -1): { points: P[]; toCharge: boolean } => {
    let p = first;
    const points = [p];
    const direction = (at: P) => {
      const e = fieldAt(screen, at);
      const m = Math.hypot(e.x, e.y);
      return { x: (sign * e.x) / m, y: (sign * e.y) / m, ratio: e.ratio };
    };
    for (let step = 0; step < 3000; step++) {
      const d1 = direction(p);
      if (!(d1.ratio > 1e-3) && (from >= 0 || step > 8)) return { points, toCharge: false };
      const d2 = direction({ x: p.x + d1.x * 0.5, y: p.y + d1.y * 0.5 });
      p = { x: p.x + d2.x, y: p.y + d2.y };
      if (!inside(p)) return { points, toCharge: false };
      const hit = screen.findIndex((c, i) => (i !== from || step > 20) && Math.hypot(p.x - c.x, p.y - c.y) <= CHARGE_R + 1);
      if (hit >= 0) {
        const c = screen[hit]!;
        const r = Math.hypot(p.x - c.x, p.y - c.y) || 1;
        points.push({ x: c.x + ((p.x - c.x) * (CHARGE_R + 1)) / r, y: c.y + ((p.y - c.y) * (CHARGE_R + 1)) / r });
        return { points, toCharge: true };
      }
      points.push(p);
    }
    return { points, toCharge: false };
  };
  const trace = (from: number, angle: number, sign: 1 | -1) => {
    const c = screen[from]!;
    return traceFrom(from, { x: c.x + Math.cos(angle) * (CHARGE_R + 2), y: c.y + Math.sin(angle) * (CHARGE_R + 2) }, sign);
  };

  const counts = lineCounts(list.map((c) => c.q));
  // The drawing is a plane through the charges, so each line stands for an equal share of 3D flux: about the
  // axis to the nearest charge, (1 - cos θ)/2 steps evenly. Then the lines one charge sends to another match
  // the flux between them (+3 and -5: 6 connect, 4 arrive from outside). A lone charge is seeded evenly.
  const seedAngle = (k: number, n: number, phase: number, lone: boolean) => {
    if (lone) return phase + (2 * Math.PI * k) / n;
    const u = (k + 0.5) / n;
    const share = u < 0.5 ? 2 * u : 2 * (1 - u);
    return phase + (u < 0.5 ? 1 : -1) * Math.acos(1 - 2 * share);
  };
  const lines: P[][] = [];
  screen.forEach((c, i) => {
    const others = screen.filter((_, j) => j !== i);
    const nearest = others.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
    const phase = nearest ? Math.atan2(nearest.y - c.y, nearest.x - c.x) : 0;
    for (let k = 0; k < counts[i]!; k++) {
      const angle = seedAngle(k, counts[i]!, phase, !nearest);
      if (c.q > 0) {
        lines.push(trace(i, angle, 1).points);
      } else {
        // Lines from another charge are drawn from that charge; only those arriving from outside start here.
        const back = trace(i, angle, -1);
        if (!back.toCharge) lines.push(back.points.reverse());
      }
    }
  });

  // At a neutral point two lines come in and two go out, along the saddle's eigen-directions. These
  // separatrices bound the line families (the "teardrop" around a weaker charge); they are drawn dashed and
  // are not counted with the charge lines.
  const separatrices: P[][] = [];
  for (const p0 of shownNulls) {
    const e = fieldAt(screen, p0);
    const ex = fieldAt(screen, { x: p0.x + 0.5, y: p0.y });
    const ey = fieldAt(screen, { x: p0.x, y: p0.y + 0.5 });
    const [a, d] = [(ex.x - e.x) / 0.5, (ey.y - e.y) / 0.5];
    const off = ((ey.x - e.x) / 0.5 + (ex.y - e.y) / 0.5) / 2;
    const mean = (a + d) / 2;
    const half = Math.hypot((a - d) / 2, off);
    for (const lambda of [mean + half, mean - half]) {
      const raw = Math.abs(off) > 1e-12 ? { x: off, y: lambda - a } : Math.abs(a - lambda) < Math.abs(d - lambda) ? { x: 1, y: 0 } : { x: 0, y: 1 };
      const v = { x: raw.x / Math.hypot(raw.x, raw.y), y: raw.y / Math.hypot(raw.x, raw.y) };
      for (const s of [1, -1]) {
        const branch = traceFrom(-1, { x: p0.x + s * v.x * 3, y: p0.y + s * v.y * 3 }, lambda > 0 ? 1 : -1);
        const points = [p0, ...branch.points];
        separatrices.push(lambda > 0 ? points : points.reverse());
      }
    }
  }

  const b = new SceneBuilder('field', w, h);
  b.hl(spec.highlight);
  const taken: Box[] = [];
  const cuts: Box[] = [];
  const size = (text: string) => measureText(text, FONT_MIN);
  const crossings = (box: Box) => [...lines, ...separatrices].reduce((n, line) => n + line.filter((p) => p.x > box.x1 && p.x < box.x2 && p.y > box.y1 && p.y < box.y2).length, 0);
  const clear = (box: Box) => box.x1 >= 4 && box.y1 >= 4 && box.x2 <= w - 4 && box.y2 <= h - 4 &&
    !taken.some((o) => box.x1 < o.x2 + 2 && box.x2 > o.x1 - 2 && box.y1 < o.y2 + 2 && box.y2 > o.y1 - 2) &&
    !screen.some((c) => c.x + CHARGE_R + 1 > box.x1 && c.x - CHARGE_R - 1 < box.x2 && c.y + CHARGE_R + 1 > box.y1 && c.y - CHARGE_R - 1 < box.y2);
  // A name/value label beside its mark, on the side the fewest lines cross; the lines break around it.
  const labelNear = (id: string, text: string, at: P, gap: number): boolean => {
    const s = size(text);
    const spots = [gap, gap + 10].flatMap((g) => [
      { x: at.x, y: at.y - g - s.h / 2 }, { x: at.x, y: at.y + g + s.h / 2 },
      { x: at.x + g + s.w / 2, y: at.y }, { x: at.x - g - s.w / 2, y: at.y },
      { x: at.x + 0.7 * g + s.w / 2, y: at.y - 0.7 * g - s.h / 2 }, { x: at.x - 0.7 * g - s.w / 2, y: at.y - 0.7 * g - s.h / 2 },
      { x: at.x + 0.7 * g + s.w / 2, y: at.y + 0.7 * g + s.h / 2 }, { x: at.x - 0.7 * g - s.w / 2, y: at.y + 0.7 * g + s.h / 2 },
    ]).map((spot) => ({ spot, box: { x1: spot.x - s.w / 2, y1: spot.y - s.h / 2, x2: spot.x + s.w / 2, y2: spot.y + s.h / 2 } }))
      // A label reads as belonging to the nearest mark, so it must sit nearer its own than any other charge.
      .filter(({ spot }) => screen.every((c) => (c.x === at.x && c.y === at.y) || Math.hypot(spot.x - c.x, spot.y - c.y) > Math.hypot(spot.x - at.x, spot.y - at.y) + 4))
      .filter(({ box }) => clear(box))
      .sort((a, c) => crossings(a.box) - crossings(c.box));
    const best = spots[0];
    if (!best) return false;
    b.label(id, text, best.spot.x, best.spot.y, { protected: true, priority: 'required' });
    taken.push(best.box);
    cuts.push({ x1: best.box.x1 - 2, y1: best.box.y1 - 2, x2: best.box.x2 + 2, y2: best.box.y2 + 2 });
    return true;
  };
  // Neutral points first: they are the feature most easily crowded out, and each charge has four spots.
  shownNulls.forEach((p, i) => {
    if (labelNear(`null-${i}-label`, 'E = 0', p, 6)) b.circle(`null-${i}`, p.x, p.y, 2.5, { color: 'danger', fill: 'none', role: 'annotation' });
  });
  for (const [i, c] of screen.entries()) {
    if (!labelNear(`charge-${i}-label`, c.label, c, CHARGE_R + 4)) return { ok: false, code: 'unsatisfiable', reason: `no clear place for the ${c.name} label` };
  }

  // Each line: an arrow at its middle, then broken around the labels.
  const inCut = (p: P) => cuts.some((box) => p.x > box.x1 && p.x < box.x2 && p.y > box.y1 && p.y < box.y2);
  let piece = 0;
  const emit = (line: P[], id: string, dashed: boolean) => {
    if (line.length < 4) return;
    const mid = Math.floor(line.length / 2);
    [line.slice(0, mid + 1), line.slice(mid)].forEach((half, hi) => {
      const runs: P[][] = [[]];
      for (const p of half) {
        if (inCut(p)) { if (runs.at(-1)!.length) runs.push([]); } else runs.at(-1)!.push(p);
      }
      runs.filter((run) => run.length >= 3).forEach((run, ri, all) => {
        const pts = simplify(run, 0.3).flatMap((p) => [Number(p.x.toFixed(2)), Number(p.y.toFixed(2))]);
        b.polyline(`${id}-${piece++}`, pts, { color: dashed ? 'guide' : 'muted', dash: dashed, width: 1.1, role: dashed ? 'guide' : 'connector', fill: 'none', markerEnd: hi === 0 && ri === all.length - 1 });
      });
    });
  };
  lines.forEach((line, li) => emit(line, `field-line-${li}`, false));
  separatrices.forEach((line, si) => emit(line, `separatrix-${si}`, true));
  screen.forEach((c, i) => {
    b.circle(`charge-${i}`, c.x, c.y, CHARGE_R, { color: c.q > 0 ? 'danger' : 'accent', fill: 'none', role: 'geometry', width: 1.6 });
    b.label(`charge-${i}-sign`, c.q > 0 ? '+' : '−', c.x, c.y, { protected: true, priority: 'optional' });
  });
  return layoutAndCompile(b.scene());
}
