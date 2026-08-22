import type { CompileCtx, CompileResult, Scene } from '../types';
import { ExprError, compileExpr } from '../pratt';
import { parseCsv, parsePair, specGet, specGetAll, specHas, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

function parseDomain(spec: SpecDoc): { min: number; max: number } {
  const raw = specGet(spec, 'domain') ?? '0 10';
  const parts = raw.split(/[,;\s]+/).map(Number).filter((n) => Number.isFinite(n));
  if (parts.length >= 2) return { min: parts[0]!, max: parts[1]! };
  return { min: 0, max: 10 };
}

function sampleFn(
  fn: (vars: Record<string, number>) => number,
  variable: string,
  min: number,
  max: number,
  n = 120,
): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  const base: number[] = [];
  for (let i = 0; i <= n; i++) base.push(min + ((max - min) * i) / n);
  // Extra samples near the right end.
  for (let i = 0; i < 8; i++) base.push(max - ((max - min) * i) / (n * 4));
  const uniq = [...new Set(base.map((x) => Number(x.toFixed(8))))].sort((a, b) => a - b);
  const vals = uniq.map((x) => ({ x, y: fn({ [variable]: x }) }));
  // Extra samples near |f'| spikes.
  for (let i = 1; i < vals.length - 1; i++) {
    const d1 = Math.abs(vals[i]!.y - vals[i - 1]!.y);
    const d2 = Math.abs(vals[i + 1]!.y - vals[i]!.y);
    if (d1 > 4 * (d2 + 1e-9) || d2 > 4 * (d1 + 1e-9)) {
      const mid = (vals[i]!.x + vals[i - 1]!.x) / 2;
      vals.push({ x: mid, y: fn({ [variable]: mid }) });
    }
  }
  vals.sort((a, b) => a.x - b.x);
  for (const v of vals) {
    if (!Number.isFinite(v.y)) continue;
    xs.push(v.x);
    ys.push(v.y);
  }
  return { xs, ys };
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (max === min) return [min];
  const span = max - min;
  const raw = span / Math.max(1, count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const nice = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= raw) ?? raw;
  const start = Math.ceil(min / nice) * nice;
  const ticks: number[] = [];
  for (let t = start; t <= max + nice * 1e-6; t += nice) ticks.push(Number(t.toPrecision(8)));
  if (!ticks.includes(min) && Math.abs(ticks[0]! - min) > nice * 0.2) ticks.unshift(min);
  if (Math.abs(ticks[ticks.length - 1]! - max) > nice * 0.15) ticks.push(max);
  return ticks.slice(0, 5);
}

export function buildPlotScene(spec: SpecDoc, ctx: CompileCtx): Scene {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('plot', w, h);
  b.hl(spec.highlight);
  const variable = (specGet(spec, 'var') ?? 'x').trim().toLowerCase();
  const domain = parseDomain(spec);
  const padL = 40;
  const padB = 28;
  const padT = 16;
  const padR = 16;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const x0 = padL;
  const y0 = padT + plotH;

  const series: { id: string; xs: number[]; ys: number[]; eq?: string }[] = [];
  const fnSources = [...specGetAll(spec, 'fn'), ...specGetAll(spec, 'fn2')];
  for (let i = 0; i < fnSources.length; i++) {
    const src = fnSources[i]!;
    const compiled = compileExpr(src);
    const sampled = sampleFn(compiled, variable, domain.min, domain.max);
    series.push({ id: i === 0 ? 'fn' : `fn${i + 1}`, ...sampled, eq: specGetAll(spec, 'eq')[i] });
  }
  for (const dataLine of specGetAll(spec, 'data')) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const pair of dataLine.split(';')) {
      const p = parsePair(pair.trim());
      if (p) {
        xs.push(p.x);
        ys.push(p.y);
      }
    }
    if (xs.length) series.push({ id: 'data', xs, ys });
  }

  let yMin = 0;
  let yMax = 1;
  const allY = series.flatMap((s) => s.ys);
  const allX = series.flatMap((s) => s.xs);
  if (allY.length) {
    yMin = Math.min(...allY, 0);
    yMax = Math.max(...allY, 0);
  }
  for (const pt of specGetAll(spec, 'point')) {
    const p = parsePair(pt);
    if (p) {
      yMin = Math.min(yMin, p.y);
      yMax = Math.max(yMax, p.y);
    }
  }
  if (yMax === yMin) yMax = yMin + 1;
  const yPad = (yMax - yMin) * 0.08;
  yMin -= yPad;
  yMax += yPad;
  const xMin = allX.length ? Math.min(...allX, domain.min) : domain.min;
  const xMax = allX.length ? Math.max(...allX, domain.max) : domain.max;

  const logx = specHas(spec, 'logx') || specGet(spec, 'kind') === 'bode';
  const logy = specHas(spec, 'logy');
  const mapX = (x: number) => {
    const t = logx
      ? (Math.log10(Math.max(x, 1e-12)) - Math.log10(Math.max(xMin, 1e-12))) /
        (Math.log10(Math.max(xMax, 1e-9)) - Math.log10(Math.max(xMin, 1e-12)) || 1)
      : (x - xMin) / (xMax - xMin || 1);
    return x0 + t * plotW;
  };
  const mapY = (y: number) => {
    const t = logy
      ? (Math.log10(Math.max(y, 1e-12)) - Math.log10(Math.max(yMin, 1e-12))) /
        (Math.log10(Math.max(yMax, 1e-9)) - Math.log10(Math.max(yMin, 1e-12)) || 1)
      : (y - yMin) / (yMax - yMin || 1);
    return y0 - t * plotH;
  };

  b.line('xaxis', x0, y0, x0 + plotW, y0, { markerEnd: true, color: 'neutral', protected: true });
  b.line('yaxis', x0, y0, x0, padT, { markerEnd: true, color: 'neutral', protected: true });

  const xticks = niceTicks(xMin, xMax, 3);
  const yticks = niceTicks(yMin, yMax, 3);
  xticks.forEach((t, i) => {
    const x = mapX(t);
    b.line(`xtick${i}`, x, y0 - 3, x, y0 + 3, { protected: true, width: 1 });
    b.label(`xtickl${i}`, String(t), x, y0 + 12, { protected: true });
  });
  yticks.forEach((t, i) => {
    const y = mapY(t);
    b.line(`ytick${i}`, x0 - 3, y, x0 + 3, y, { protected: true, width: 1 });
    b.label(`ytickl${i}`, String(t), x0 - 16, y, { protected: true, slot: 'W' });
  });

  const xlabel = specGet(spec, 'xlabel');
  const ylabel = specGet(spec, 'ylabel');
  if (xlabel) b.label('xlabel', xlabel, x0 + plotW / 2, h - 10, { protected: true });
  if (ylabel) b.label('ylabel', ylabel, 22, padT + 10, { protected: true });

  const colors: Array<'accent' | 'muted' | 'danger'> = ['accent', 'muted', 'danger'];
  series.forEach((s, si) => {
    const pts: number[] = [];
    for (let i = 0; i < s.xs.length; i++) {
      pts.push(mapX(s.xs[i]!), mapY(s.ys[i]!));
    }
    b.polyline(s.id, pts, { color: colors[si % colors.length], width: 2, fill: 'none' });
    if (s.eq) {
      const slot = (specGet(spec, 'eq_slot') ?? 'NE') as 'N' | 'E' | 'S' | 'W' | 'NE' | 'NW' | 'SE' | 'SW' | 'auto';
      // Park the equation in the quiet top-left of the frame, then let SLK 4-pos from there.
      b.label(`eq${si || ''}`, s.eq, x0 + plotW * 0.28, padT + 14, {
        katex: true,
        slot,
        anchorId: s.id,
      });
    }
  });

  const drop = (specGet(spec, 'drop') ?? '').toLowerCase();
  specGetAll(spec, 'point').forEach((raw, i) => {
    const p = parsePair(raw);
    if (!p) return;
    const x = mapX(p.x);
    const y = mapY(p.y);
    b.circle(`point${i}`, x, y, 3, { color: 'accent', fill: 'solid' });
    const pl = specGetAll(spec, 'point_label')[i] ?? specGet(spec, 'point_label');
    if (pl) b.label(`pointl${i}`, pl, x + 8, y - 8, { slot: 'NE' });
    if (drop === 'both' || drop === 'x') b.line(`dropx${i}`, x, y, x, y0, { dash: true, color: 'guide' });
    if (drop === 'both' || drop === 'y') b.line(`dropy${i}`, x, y, x0, y, { dash: true, color: 'guide' });
  });

  const shade = specGet(spec, 'shade');
  if (shade && series[0]) {
    const parts = shade.split(/\s+/).map(Number);
    const a = parts[0];
    const bb = parts[1];
    if (a !== undefined && bb !== undefined && Number.isFinite(a) && Number.isFinite(bb)) {
      const s0 = series[0];
      const pts: number[] = [mapX(a), y0];
      for (let i = 0; i < s0.xs.length; i++) {
        if (s0.xs[i]! >= a && s0.xs[i]! <= bb) pts.push(mapX(s0.xs[i]!), mapY(s0.ys[i]!));
      }
      pts.push(mapX(bb), y0);
      b.polygon('shade', pts, { color: 'accent', fill: 'none' });
    }
  }

  specGetAll(spec, 'asymptote').forEach((raw, i) => {
    const xm = /x\s*=\s*([-\d.]+)/i.exec(raw);
    const ym = /y\s*=\s*([-\d.]+)/i.exec(raw);
    if (xm) {
      const x = mapX(Number(xm[1]));
      b.line(`asx${i}`, x, padT, x, y0, { dash: true, color: 'guide' });
    } else if (ym) {
      const y = mapY(Number(ym[1]));
      b.line(`asy${i}`, x0, y, x0 + plotW, y, { dash: true, color: 'guide' });
    }
  });

  specGetAll(spec, 'peaks').forEach((raw, i) => {
    const parts = parseCsv(raw);
    const ppm = Number(parts[0]);
    if (!Number.isFinite(ppm)) return;
    const x = mapX(ppm);
    b.line(`peak${i}`, x, y0, x, padT + 20, { color: 'accent', width: 1.2 });
    b.label(`peakn${i}`, String(i + 1), x, padT + 10, { slot: 'N' });
  });

  specGetAll(spec, 'poles').forEach((raw, i) => {
    const x = Number(raw);
    if (!Number.isFinite(x)) return;
    b.label(`pole${i}`, '×', mapX(x), mapY(0), { protected: true });
  });
  specGetAll(spec, 'zeros').forEach((raw, i) => {
    const x = Number(raw);
    if (!Number.isFinite(x)) return;
    b.circle(`zero${i}`, mapX(x), mapY(0), 4, { color: 'muted' });
  });

  return b.scene();
}

export function compilePlot(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  try {
    if (!specHas(spec, 'fn') && !specHas(spec, 'data') && !specHas(spec, 'peaks') && !specHas(spec, 'poles')) {
      return { ok: false, code: 'malformed', reason: 'plot needs fn, data, peaks, or poles' };
    }
    const scene = buildPlotScene(spec, ctx);
    return layoutAndCompile(scene);
  } catch (e) {
    if (e instanceof ExprError) return { ok: false, code: 'expr', reason: e.message };
    return { ok: false, code: 'throw', reason: e instanceof Error ? e.message : 'plot failed' };
  }
}

export function evaluatePlotFn(source: string, variable: string, value: number): number {
  return compileExpr(source)({ [variable]: value });
}

export { specNumber };
