import type { CompileCtx, CompileResult, Scene } from '../types';
import { ExprError, compileExpr } from '../pratt';
import { specGet, specGetAll, specHas, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';
import { measureText } from '../geom';
import { FONT_MIN, LABEL_GAP } from '../types';

type Scale = 'linear' | 'log';
type Point = { x: number; y: number };
type Segment = { xs: number[]; ys: number[] };
type Series = { id: string; kind: 'function' | 'data'; xs: number[]; ys: number[]; segments: Segment[]; source?: string };
type PlotErrorCode = 'malformed';

class PlotSpecError extends Error {
  constructor(public code: PlotErrorCode, message: string) { super(message); }
}

function fail(code: PlotErrorCode, message: string): never { throw new PlotSpecError(code, message); }

function parseNumber(value: string): number | null {
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

function parseDomain(spec: SpecDoc): { min: number; max: number } {
  const raw = specGet(spec, 'domain') ?? '0 10';
  const parts = raw.replace(/\b[xy]\s*=/gi, ' ').split(/[,;\s]+/).filter(Boolean);
  if (parts.length !== 2) fail('malformed', 'plot domain needs exactly two finite bounds');
  const min = parseNumber(parts[0]!);
  const max = parseNumber(parts[1]!);
  if (min === null || max === null || !(max > min)) fail('malformed', 'plot domain must be increasing and finite');
  return { min, max };
}

function parseScale(spec: SpecDoc): { x: Scale; y: Scale } {
  let x: Scale = specHas(spec, 'logx') ? 'log' : 'linear';
  let y: Scale = specHas(spec, 'logy') ? 'log' : 'linear';
  for (const raw of specGetAll(spec, 'scale')) {
    for (const part of raw.split(/[,;\s]+/).filter(Boolean)) {
      const match = /^([xy])=(linear|log)$/i.exec(part);
      if (!match) {
        if (/^y2=/i.test(part)) fail('malformed', 'unsupported: plot second dependent axis is not yet representable');
        fail('malformed', `invalid plot scale ${part}`);
      }
      if (match[1]!.toLowerCase() === 'x') x = match[2]!.toLowerCase() as Scale;
      else y = match[2]!.toLowerCase() as Scale;
    }
  }
  return { x, y };
}

function strictPair(raw: string): Point | null {
  const match = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*[,;\s]\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*$/.exec(raw);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function parseData(raw: string): Point[] {
  const pairs = raw.split(';').map(strictPair);
  if (!pairs.length || pairs.some((point) => !point)) fail('malformed', 'data contains an invalid x,y sample');
  return pairs as Point[];
}

function sampleFn(fn: (vars: Record<string, number>) => number, variable: string, min: number, max: number, splitAt: number[] = [], n = 160): Segment[] {
  const values: Array<{ x: number; y: number }> = [];
  let previousX: number | undefined;
  for (let i = 0; i <= n; i++) {
    const x = min + ((max - min) * i) / n;
    if (splitAt.some((pole) => Math.abs(x - pole) < (max - min) / n / 3 || (previousX !== undefined && previousX < pole && pole < x))) {
      values.push({ x, y: Number.NaN });
      previousX = x;
      continue;
    }
    values.push({ x, y: fn({ [variable]: x }) });
    previousX = x;
  }
  const segments: Segment[] = [];
  let current: Segment = { xs: [], ys: [] };
  for (const value of values) {
    const previousY = current.ys[current.ys.length - 1];
    const finite = Number.isFinite(value.y);
    const jump = previousY !== undefined && Math.abs(value.y - previousY) > 1e6;
    if (!finite || jump) {
      if (current.xs.length > 1) segments.push(current);
      current = { xs: [], ys: [] };
      continue;
    }
    current.xs.push(value.x);
    current.ys.push(value.y);
  }
  if (current.xs.length > 1) segments.push(current);
  return segments;
}

function formatTick(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (Math.abs(n) < 1e-12) return '0';
  const abs = Math.abs(n);
  const rounded = abs >= 100 ? Math.round(n) : abs >= 10 ? Number(n.toPrecision(4)) : Number(n.toPrecision(3));
  return Math.abs(rounded) < 1e-12 ? '0' : String(rounded);
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / Math.max(1, count - 1);
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-12)));
  const nice = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= raw) ?? raw;
  const start = Math.ceil(min / nice) * nice;
  const ticks: number[] = [];
  for (let t = start; t <= max + nice * 1e-9; t += nice) ticks.push(Number(t.toPrecision(8)));
  return ticks.length >= 2 ? ticks.slice(0, 6) : [min, max];
}

function assignments(raw: string): { kind?: string; target?: string; value?: string } {
  const kind = /(?:^|\s)(curve|axis|region|panel|title)\s*=\s*([^\s]+)/i.exec(raw);
  const value = /(?:^|\s)value\s*=\s*(.*)$/i.exec(raw);
  const bare = /^(curve|axis|region|panel|title)\b/i.exec(raw.trim());
  return { kind: (kind?.[1] ?? bare?.[1])?.toLowerCase(), target: kind?.[2], value: value?.[1]?.trim() };
}

function targetSeries(series: Series[], id: string): Series | undefined {
  return series.find((candidate) => candidate.id.toLowerCase() === id.trim().toLowerCase());
}

function seriesPoint(series: Series, fraction: number): Point {
  const segment = series.segments[0] ?? { xs: series.xs, ys: series.ys };
  const index = Math.max(0, Math.min(segment.xs.length - 1, Math.floor(segment.xs.length * fraction)));
  return { x: segment.xs[index]!, y: segment.ys[index]! };
}

function stepPoints(series: Series): number[] {
  if (series.xs.length < 2 || series.xs.some((value, index) => index > 0 && value === series.xs[index - 1])) {
    return series.xs.flatMap((value, index) => [value, series.ys[index]!]);
  }
  const points: number[] = [series.xs[0]!, series.ys[0]!];
  for (let index = 1; index < series.xs.length; index++) {
    points.push(series.xs[index]!, series.ys[index - 1]!, series.xs[index]!, series.ys[index]!);
  }
  return points;
}

function parsePoleValues(spec: SpecDoc): number[] {
  const values = [...specGetAll(spec, 'poles'), ...specGetAll(spec, 'marker').filter((raw) => /^pole\s*=\s*/i.test(raw)).map((raw) => raw.replace(/^pole\s*=\s*/i, ''))];
  return values.map((value) => {
    const n = parseNumber(value);
    if (n === null) fail('malformed', 'pole marker needs a finite x value');
    return n;
  });
}

function ensureSupportedKind(spec: SpecDoc): string {
  const kind = (specGet(spec, 'kind') ?? 'function').trim().toLowerCase();
  if (['pie', 'graph', 'portrait', 'photograph', 'prose', 'construction', 'infographic'].includes(kind)) fail('malformed', `unsupported: plot does not represent ${kind}`);
  if (!['function', 'waveform', 'discrete', 'step', 'comparison', 'bode'].includes(kind)) fail('malformed', `unsupported: plot kind ${kind}`);
  return kind;
}

function parsePanels(spec: SpecDoc): Array<{ id: string; role: string }> {
  return specGetAll(spec, 'panel').map((raw, index) => ({
    id: /^\s*([A-Za-z][\w.-]*)/.exec(raw)?.[1]?.toLowerCase() ?? `panel${index + 1}`,
    role: /\brole\s*=\s*([^\s]+)/i.exec(raw)?.[1] ?? `panel${index + 1}`,
  }));
}

function panelSeries(panel: { role: string }, index: number, panels: Array<{ role: string }>, functions: Series[], data: Series[]): Series[] {
  const role = panel.role.toLowerCase();
  if (/step|discrete|sample|observation/.test(role)) return data;
  if (/continuous|function|wave/.test(role)) return functions;
  return [...functions, ...data].filter((_, itemIndex) => itemIndex % panels.length === index);
}

function drawPlotPanel(b: SceneBuilder, panel: { role: string; x: number; y: number; w: number; h: number; prefix: string }, series: Series[], allSeries: Series[], spec: SpecDoc, domain: { min: number; max: number }, scale: { x: Scale; y: Scale }, kind: string, referenceIds: Set<string>, panelTitle: boolean): void {
  const labels = !panel.prefix ? specGetAll(spec, 'label').map(assignments) : [];
  const xlabel = !panel.prefix ? specGet(spec, 'xlabel') ?? labels.find((entry) => entry.kind === 'axis' && entry.target?.toLowerCase() === 'x')?.value : undefined;
  const ylabel = !panel.prefix ? specGet(spec, 'ylabel') ?? labels.find((entry) => entry.kind === 'axis' && entry.target?.toLowerCase() === 'y')?.value : undefined;
  const xlabelSize = xlabel ? measureText(xlabel, FONT_MIN) : { w: 0, h: 0 };
  const ylabelSize = ylabel ? measureText(ylabel, FONT_MIN) : { w: 0, h: 0 };
  const padL = Math.max(38, ylabel ? ylabelSize.w + LABEL_GAP(FONT_MIN) + 4 : 38);
  const padB = Math.max(panelTitle ? 25 : 23, xlabel ? xlabelSize.h + LABEL_GAP(FONT_MIN) + 4 : 0);
  const padT = panelTitle ? 18 : 14;
  const padR = 11;
  const plotW = panel.w - padL - padR;
  const plotH = panel.h - padT - padB;
  if (!(plotW > 35 && plotH > 28)) fail('malformed', 'unsupported: plot panel cannot retain a readable plotting area');
  if (xlabel && xlabelSize.w > plotW - 8) fail('malformed', 'unsupported: plot x-axis label cannot remain in frame');
  const x0 = panel.x + padL;
  const y0 = panel.y + padT + plotH;
  const assertedPoints = [...specGetAll(spec, 'point'), ...specGetAll(spec, 'marker').filter((raw) => /^(?:open|closed|point)\s*=/i.test(raw)).map((raw) => raw.replace(/^(?:open|closed|point)\s*=\s*/i, ''))].map((raw) => strictPair(raw));
  if (assertedPoints.some((point) => !point)) fail('malformed', 'point marker needs x,y');
  const yValues = [...series.flatMap((entry) => entry.ys), ...(assertedPoints as Point[]).map((point) => point.y)].filter((value) => scale.y === 'linear' || value > 0);
  if (scale.y === 'log' && series.some((entry) => entry.ys.some((value) => !(value > 0)))) fail('malformed', 'log y scale needs positive samples');
  let dataYMin = yValues.length ? Math.min(...yValues) : scale.y === 'log' ? 1 : 0;
  let dataYMax = yValues.length ? Math.max(...yValues) : scale.y === 'log' ? 10 : 1;
  const crossesZero = scale.y === 'linear' && dataYMin < 0 && dataYMax > 0;
  if (scale.y === 'linear') { dataYMin = Math.min(dataYMin, 0); dataYMax = Math.max(dataYMax, 0); }
  if (dataYMax === dataYMin) dataYMax = dataYMin + 1;
  const yPad = scale.y === 'log' ? 0 : (dataYMax - dataYMin) * 0.08;
  const yMin = scale.y === 'log' ? Math.max(dataYMin / 1.08, 1e-12) : dataYMin - yPad;
  const yMax = scale.y === 'log' ? dataYMax * 1.08 : dataYMax + yPad;
  if (scale.x === 'log' && !(domain.min > 0)) fail('malformed', 'log x scale needs a positive domain');
  const mapX = (value: number) => x0 + (scale.x === 'log' ? (Math.log10(value) - Math.log10(domain.min)) / (Math.log10(domain.max) - Math.log10(domain.min) || 1) : (value - domain.min) / (domain.max - domain.min)) * plotW;
  const mapY = (value: number) => y0 - (scale.y === 'log' ? (Math.log10(value) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin) || 1) : (value - yMin) / (yMax - yMin || 1)) * plotH;
  const xAxisY = crossesZero ? mapY(0) : y0;
  const id = (name: string) => `${panel.prefix}${name}`;
  b.line(id('xaxis'), x0, xAxisY, x0 + plotW, xAxisY, { markerEnd: true, color: 'neutral', role: 'axis', protected: true });
  b.line(id('yaxis'), x0, y0, x0, panel.y + padT, { markerEnd: true, color: 'neutral', role: 'axis', protected: true });
  const xTicks = scale.x === 'log' ? [1, 10, 100].filter((value) => value >= domain.min && value <= domain.max) : niceTicks(domain.min, domain.max, 3);
  xTicks.forEach((tick, tickIndex) => { const x = mapX(tick); b.line(id(`xtick${tickIndex}`), x, xAxisY - 3, x, xAxisY + 3, { protected: true, width: 1, role: 'axis' }); b.label(id(`xtickl${tickIndex}`), formatTick(tick), x, xAxisY + 11, { protected: true, priority: 'required' }); });
  const yTicks = scale.y === 'log' ? [1, 2, 5, 10, 20, 50, 100].filter((value) => value >= yMin && value <= yMax) : niceTicks(dataYMin, dataYMax, 3);
  yTicks.forEach((tick, tickIndex) => { const y = mapY(tick); b.line(id(`ytick${tickIndex}`), x0 - 3, y, x0 + 3, y, { protected: true, width: 1, role: 'axis' }); b.label(id(`ytickl${tickIndex}`), formatTick(tick), x0 - 16, y, { protected: true, priority: 'required', slot: 'W' }); });
  if (panelTitle) b.label(id('panel-title'), panel.role, panel.x + panel.w / 2, panel.y + 8, { protected: true, priority: 'required' });
  if (!panel.prefix) {
    if (xlabel) b.label('xlabel', xlabel, x0 + plotW * (scale.x === 'log' ? 0.68 : 0.5), xAxisY + LABEL_GAP(FONT_MIN) + xlabelSize.h / 2, { protected: true, priority: 'required' });
    if (ylabel) b.label('ylabel', ylabel, x0 - LABEL_GAP(FONT_MIN) - ylabelSize.w / 2, panel.y + padT + plotH / 2, { protected: true, priority: 'required' });
  }
  const colors: Array<'accent' | 'muted' | 'danger'> = ['accent', 'muted', 'danger'];
  const panelKind = /step/.test(panel.role.toLowerCase()) ? 'step' : /discrete|sample/.test(panel.role.toLowerCase()) ? 'discrete' : kind;
  series.forEach((entry, seriesIndex) => {
    const dash = referenceIds.has(entry.id.toLowerCase());
    if (entry.kind === 'data' && (panelKind === 'discrete' || panelKind === 'comparison')) {
      entry.xs.forEach((value, pointIndex) => b.circle(id(`${entry.id}-point${pointIndex}`), mapX(value), mapY(entry.ys[pointIndex]!), 2.8, { color: colors[seriesIndex % colors.length], fill: 'solid', role: 'geometry' }));
    } else if (entry.kind === 'data' && panelKind === 'step') {
      const points = stepPoints(entry).flatMap((value, pointIndex) => pointIndex % 2 ? [mapY(value)] : [mapX(value)]);
      b.polyline(id(entry.id), points, { color: colors[seriesIndex % colors.length], width: 2, role: 'geometry', fill: 'none' });
    } else {
      entry.segments.forEach((segment, segmentIndex) => { const points: number[] = []; for (let i = 0; i < segment.xs.length; i++) points.push(mapX(segment.xs[i]!), mapY(segment.ys[i]!)); b.polyline(id(segmentIndex ? `${entry.id}-segment${segmentIndex}` : entry.id), points, { color: colors[seriesIndex % colors.length], width: 2, dash, role: 'geometry', fill: 'none' }); });
    }
    const label = specGetAll(spec, 'label').map(assignments).find((entryLabel) => entryLabel.kind === 'curve' && entryLabel.target?.toLowerCase() === entry.id.toLowerCase());
    if (label?.value) { const point = seriesPoint(entry, 0.72); const labelY = Math.max(panel.y + padT + 30, Math.min(y0 - 30, mapY(point.y))); b.label(id(`label-${entry.id}`), label.value, mapX(point.x), labelY, { slot: 'N', priority: 'required', anchorId: id(entry.id) }); }
    const equation = specGetAll(spec, 'eq')[seriesIndex];
    if (equation) { const slot = (specGet(spec, 'eq_slot') ?? 'NE') as 'N' | 'E' | 'S' | 'W' | 'NE' | 'NW' | 'SE' | 'SW' | 'auto'; const point = seriesPoint(entry, 0.28); b.label(id(`eq${seriesIndex || ''}`), equation, mapX(point.x), mapY(point.y), { katex: true, slot, anchorId: id(entry.id), priority: 'required' }); }
  });
  const addPointMarker = (markerKind: 'open' | 'closed' | 'point', raw: string, markerIndex: number) => { const point = strictPair(raw); if (!point) fail('malformed', `${markerKind} marker needs x,y`); if (point.x < domain.min || point.x > domain.max) fail('malformed', 'marker lies outside plot domain'); b.circle(id(`marker-${markerKind}${markerIndex}`), mapX(point.x), mapY(point.y), 3.5, { color: markerKind === 'open' ? 'muted' : 'accent', fill: markerKind === 'open' ? 'none' : markerKind === 'closed' ? 'accent' : 'solid', role: 'annotation' }); };
  const markerCounts = { open: 0, closed: 0, point: 0 };
  for (const raw of specGetAll(spec, 'marker')) { const match = /^(open|closed|point)\s*=\s*(.*)$/i.exec(raw); if (match) { const markerKind = match[1]!.toLowerCase() as 'open' | 'closed' | 'point'; addPointMarker(markerKind, match[2]!, markerCounts[markerKind]++); } }
  for (const raw of specGetAll(spec, 'point')) addPointMarker('point', raw, markerCounts.point++);
  specGetAll(spec, 'point').forEach((raw, pointIndex) => { const point = strictPair(raw); if (!point) fail('malformed', 'point marker needs x,y'); const pointLabel = specGetAll(spec, 'point_label')[pointIndex] ?? specGet(spec, 'point_label'); if (pointLabel) b.label(id(`pointl${pointIndex}`), pointLabel, mapX(point.x) - 12, mapY(point.y) - 12, { slot: 'NW', protected: true, priority: 'required' }); });
  const drop = specGet(spec, 'drop') ?? specGetAll(spec, 'guide').map((raw) => /drop\s*=\s*(.*)$/i.exec(raw)?.[1]).find(Boolean) ?? '';
  const markedPoints = [...specGetAll(spec, 'point'), ...specGetAll(spec, 'marker').filter((raw) => /^point\s*=/i.test(raw)).map((raw) => raw.replace(/^point\s*=\s*/i, ''))];
  markedPoints.forEach((raw, pointIndex) => { const point = strictPair(raw); if (!point) fail('malformed', 'point marker needs x,y'); const px = mapX(point.x); const py = mapY(point.y); if (drop.toLowerCase() === 'both' || drop.toLowerCase() === 'x') b.line(id(`dropx${pointIndex}`), px, py, px, xAxisY, { dash: true, color: 'guide', role: 'guide' }); if (drop.toLowerCase() === 'both' || drop.toLowerCase() === 'y') b.line(id(`dropy${pointIndex}`), px, py, x0, py, { dash: true, color: 'guide', role: 'guide' }); });
  const guideCounts = { vertical: 0, horizontal: 0 };
  specGetAll(spec, 'guide').forEach((raw) => { const vertical = /^vertical\s*=\s*(.*)$/i.exec(raw); const horizontal = /^horizontal\s*=\s*(.*)$/i.exec(raw); if (vertical) { const value = parseNumber(vertical[1]!); if (value === null || value < domain.min || value > domain.max) fail('malformed', 'vertical guide lies outside domain'); b.line(id(`guide-vertical${guideCounts.vertical++}`), mapX(value), panel.y + padT, mapX(value), y0, { dash: true, color: 'guide', role: 'guide' }); } else if (horizontal) { const value = parseNumber(horizontal[1]!); if (value === null || (scale.y === 'log' ? value <= 0 : value < yMin || value > yMax)) fail('malformed', 'horizontal guide lies outside plotted range'); b.line(id(`guide-horizontal${guideCounts.horizontal++}`), x0, mapY(value), x0 + plotW, mapY(value), { dash: true, color: 'guide', role: 'guide' }); } else if (!/^reference\s*=/i.test(raw) && !/^drop\s*=/i.test(raw)) fail('malformed', `invalid guide ${raw}`); });
  specGetAll(spec, 'asymptote').forEach((raw, asymptoteIndex) => { const vertical = /x\s*=\s*([-+\d.]+)/i.exec(raw); const horizontal = /y\s*=\s*([-+\d.]+)/i.exec(raw); if (vertical) b.line(id(`asymptote-x${asymptoteIndex}`), mapX(Number(vertical[1])), panel.y + padT, mapX(Number(vertical[1])), y0, { dash: true, color: 'guide', role: 'guide' }); else if (horizontal) b.line(id(`asymptote-y${asymptoteIndex}`), x0, mapY(Number(horizontal[1])), x0 + plotW, mapY(Number(horizontal[1])), { dash: true, color: 'guide', role: 'guide' }); else fail('malformed', 'invalid asymptote'); });
  const addSpecial = (raw: string, special: 'pole' | 'zero', specialIndex: number) => { const value = parseNumber(raw); if (value === null || value < domain.min || value > domain.max) fail('malformed', `${special} lies outside domain`); const x = mapX(value); if (special === 'pole') { const y = mapY(0); b.line(id(`marker-pole${specialIndex}`), x - 4, y - 4, x + 4, y + 4, { color: 'danger', width: 1.8, role: 'annotation' }); b.line(id(`marker-pole${specialIndex}-cross`), x - 4, y + 4, x + 4, y - 4, { color: 'danger', width: 1.8, role: 'annotation' }); } else b.circle(id(`marker-zero${specialIndex}`), x, mapY(0), 4, { color: 'muted', role: 'annotation' }); };
  specGetAll(spec, 'poles').forEach((raw, specialIndex) => addSpecial(raw, 'pole', specialIndex));
  specGetAll(spec, 'zeros').forEach((raw, specialIndex) => addSpecial(raw, 'zero', specialIndex));
  specGetAll(spec, 'marker').forEach((raw, markerSpecialIndex) => { const pole = /^pole\s*=\s*(.*)$/i.exec(raw); const zero = /^zero\s*=\s*(.*)$/i.exec(raw); if (pole) addSpecial(pole[1]!, 'pole', markerSpecialIndex); if (zero) addSpecial(zero[1]!, 'zero', markerSpecialIndex); });
  specGetAll(spec, 'peaks').forEach((raw, peakIndex) => { const value = parseNumber(raw.split(/[,\s]+/)[0]!); if (value === null || value < domain.min || value > domain.max) fail('malformed', 'peak lies outside domain'); const x = mapX(value); b.line(id(`peak${peakIndex}`), x, xAxisY, x, panel.y + padT + 6, { color: 'accent', width: 1.2, role: 'annotation' }); b.label(id(`peakn${peakIndex}`), String(peakIndex + 1), x, panel.y + padT + 5, { slot: 'N', priority: 'optional' }); });
  const regions = [...specGetAll(spec, 'region')]; const legacyShade = specGet(spec, 'shade'); if (legacyShade) regions.push(`between=fn from=${legacyShade.split(/\s+/)[0]} to=${legacyShade.split(/\s+/)[1]}`);
  regions.forEach((raw, regionIndex) => { const between = /between\s*=\s*([^\s]+)\s+from\s*=\s*([^\s]+)\s+to\s*=\s*([^\s]+)/i.exec(raw); if (!between) fail('malformed', 'region needs between, from, and to'); const from = parseNumber(between[2]!); const to = parseNumber(between[3]!); if (from === null || to === null || !(to > from) || from < domain.min || to > domain.max) fail('malformed', 'region bounds are invalid'); const first = targetSeries(allSeries, between[1]!.split(',')[0]!); if (!first) fail('malformed', `region target ${between[1]} is missing`); const secondName = between[1]!.split(',')[1]; const second = secondName ? targetSeries(allSeries, secondName) : undefined; const upper = first.xs.map((value, pointIndex) => ({ x: value, y: first.ys[pointIndex]! })).filter((point) => point.x >= from && point.x <= to); if (upper.length < 2) fail('malformed', 'region has too few samples'); const points = upper.map((point) => [mapX(point.x), mapY(point.y)]).flat(); if (second) points.push(...second.xs.map((value, pointIndex) => ({ x: value, y: second.ys[pointIndex]! })).filter((point) => point.x >= from && point.x <= to).reverse().map((point) => [mapX(point.x), mapY(point.y)]).flat()); else points.push(mapX(to), mapY(0), mapX(from), mapY(0)); const regionId = id(`region${regionIndex}`); b.polygon(regionId, points, { color: 'accent', fill: 'accent', role: 'geometry' }); const regionLabel = specGetAll(spec, 'label').map(assignments).find((label) => label.kind === 'region'); if (regionLabel?.value) { const center = upper[Math.floor(upper.length / 2)]!; b.label(id(`region-label${regionIndex}`), regionLabel.value, mapX(center.x), mapY(center.y), { slot: 'N', priority: 'required', anchorId: regionId }); } });
}

export function buildPlotScene(spec: SpecDoc, ctx: CompileCtx): Scene {
  const kind = ensureSupportedKind(spec);
  const domain = parseDomain(spec);
  const scale = parseScale(spec);
  const variable = (specGet(spec, 'var') ?? 'x').trim().toLowerCase();
  if (!/^[a-z_][a-z0-9_]*$/i.test(variable)) fail('malformed', 'plot variable must be an identifier');
  const poles = parsePoleValues(spec);
  const functions: Series[] = [];
  for (const [index, source] of [...specGetAll(spec, 'fn'), ...specGetAll(spec, 'fn2')].entries()) { const compiled = compileExpr(source); const segments = sampleFn(compiled, variable, domain.min, domain.max, poles); if (!segments.length) fail('malformed', `function ${index + 1} has no finite samples`); functions.push({ id: index ? `fn${index + 1}` : 'fn', kind: 'function', xs: segments.flatMap((segment) => segment.xs), ys: segments.flatMap((segment) => segment.ys), segments, source }); }
  const data: Series[] = [];
  for (const [index, raw] of specGetAll(spec, 'data').entries()) { const points = parseData(raw); if (points.some((point) => point.x < domain.min || point.x > domain.max)) fail('malformed', 'data sample lies outside domain'); if (scale.x === 'log' && points.some((point) => !(point.x > 0))) fail('malformed', 'log x scale needs positive samples'); const id = index ? `data${index + 1}` : 'data'; const segment = { xs: points.map((point) => point.x), ys: points.map((point) => point.y) }; data.push({ id, kind: 'data', xs: segment.xs, ys: segment.ys, segments: [segment] }); }
  if (!functions.length && !data.length && !specHas(spec, 'peaks') && !specHas(spec, 'poles')) fail('malformed', 'plot needs fn or data');
  if (scale.x === 'log' && functions.some((series) => series.xs.some((value) => !(value > 0)))) fail('malformed', 'log x scale needs a positive domain');
  const panels = parsePanels(spec); const { w, h } = frameSize(ctx.profile); const b = new SceneBuilder('plot', w, h); b.hl(spec.highlight); const panelGap = 8; const panelHeight = panels.length ? (h - panelGap * (panels.length - 1)) / panels.length : h; const allSeries = [...functions, ...data]; const referenceIds = new Set<string>();
  for (const raw of specGetAll(spec, 'guide')) { const reference = /^reference\s*=\s*(.*)$/i.exec(raw)?.[1]; if (reference) referenceIds.add(reference.trim().toLowerCase()); }
  panels.forEach((panelSpec, index) => { const y = index * (panelHeight + panelGap); const panel = { role: panelSpec.role, x: 0, y, w, h: panelHeight, prefix: `${panelSpec.id}-` }; b.panel(panelSpec.id, panelSpec.role, 0, y, w, panelHeight); drawPlotPanel(b, panel, panelSeries(panelSpec, index, panels, functions, data), allSeries, spec, domain, scale, kind, referenceIds, true); });
  if (!panels.length) drawPlotPanel(b, { role: kind, x: 0, y: 0, w, h, prefix: '' }, allSeries, allSeries, spec, domain, scale, kind, referenceIds, false);
  if (spec.caption && !panels.length) b.label('caption', spec.caption, w / 2, 9, { protected: true, priority: 'required' });
  return b.scene();
}

export function compilePlot(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  try { return layoutAndCompile(buildPlotScene(spec, ctx)); } catch (error) { if (error instanceof PlotSpecError) return { ok: false, code: error.code, reason: error.message }; if (error instanceof ExprError) return { ok: false, code: 'expr', reason: error.message }; return { ok: false, code: 'throw', reason: error instanceof Error ? error.message : 'plot failed' }; }
}

export function evaluatePlotFn(source: string, variable: string, value: number): number { return compileExpr(source)({ [variable]: value }); }

export { parseNumber as specNumber };
