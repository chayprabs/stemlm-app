import { FONT_MIN, type CompileCtx, type CompileResult, type SemanticColor } from '../types';
import { measureText } from '../geom';
import { parseCsv, specGet, specGetAll, specHasEmptyDeclaration, specHasEmptyDelimitedValue, specList, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

interface Relation {
  from: string;
  to: string;
  role: string;
}

function frame(family: string, ctx: CompileCtx, spec: SpecDoc): SceneBuilder {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder(family, w, h);
  b.hl(spec.highlight);
  return b;
}

function fail(reason: string, code: 'malformed' | 'refused' = 'malformed'): CompileResult {
  return { ok: false, code, reason };
}

function values(spec: SpecDoc, ...keys: string[]): string[] {
  for (const key of keys) {
    const list = specList(spec, key);
    if (list.length) return list;
  }
  return [];
}

function hasDuplicateNames(names: string[]): boolean {
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function hasEmptyItems(spec: SpecDoc, ...keys: string[]): boolean {
  return keys.some((key) => specHasEmptyDelimitedValue(spec, key));
}

function rows(spec: SpecDoc, ...keys: string[]): string[][] {
  const source = values(spec, ...keys);
  if (!source.length) return [];
  return source.flatMap((value) => value.split(';').map((row) => {
    if (!row.trim()) return [];
    return row.split(',').map((cell) => cell.trim());
  }));
}

function relationParts(raw: string): Relation | null {
  const arrow = /^(.+?)\s*->\s*(\S+)(?:\s+(.+))?$/.exec(raw.trim());
  if (arrow) {
    const role = arrow[3]?.trim() || 'connects';
    return { from: arrow[1]!.trim(), to: arrow[2]!.trim(), role };
  }
  const words = raw.trim().split(/\s+/);
  if (words.length >= 3 && words[0] && words[1] && words.slice(2).join(' ')) {
    return { from: words[0], to: words[1], role: words.slice(2).join(' ') };
  }
  return null;
}

function relations(spec: SpecDoc): { items: Relation[]; invalid: boolean } {
  if (specHasEmptyDeclaration(spec, 'relations') || specHasEmptyDeclaration(spec, 'relation')) return { items: [], invalid: true };
  const raw = [...specGetAll(spec, 'relations'), ...specGetAll(spec, 'relation')];
  if (!raw.length) raw.push(...specList(spec, 'relations'));
  const items: Relation[] = [];
  const seen = new Set<string>();
  for (const value of raw.flatMap((entry) => entry.split(';'))) {
    if (!value.trim()) return { items, invalid: true };
    const parsed = relationParts(value);
    if (!parsed) return { items, invalid: true };
    const key = `${parsed.from.toLowerCase()}\u0000${parsed.to.toLowerCase()}\u0000${parsed.role.toLowerCase()}`;
    if (seen.has(key)) return { items, invalid: true };
    seen.add(key);
    items.push(parsed);
  }
  return { items, invalid: false };
}

function normalizedOrder(spec: SpecDoc): 'forward' | 'reverse' {
  return /reverse|backward|right-to-left/i.test(specGet(spec, 'order') ?? '') ? 'reverse' : 'forward';
}

function addSemanticCaption(b: SceneBuilder, spec: SpecDoc, id: string, y = 12): void {
  const caption = specGet(spec, 'label') ?? spec.caption ?? specGet(spec, 'kind');
  if (caption) b.label(id, caption, b.width / 2, y, { priority: 'preferred' });
}

function itemNames(spec: SpecDoc, ...keys: string[]): string[] {
  return values(spec, ...keys).flatMap((value) => parseCsv(value)).map((value) => value.trim()).filter(Boolean);
}

function relationDirection(role: string): 'end' | 'start' | 'none' {
  if (/cross(?:es)?[- ]without[- ]connection|undirected|adjacent/i.test(role)) return 'none';
  if (/radiates[- ]from/i.test(role)) return 'end';
  if (/from$|reverse|backward|source/i.test(role)) return 'start';
  return 'end';
}

function supportedSchematicKind(kind: string | undefined): boolean {
  return !kind || /^(?:graph|network|schematic|pourbaix)$/i.test(kind.trim());
}

type RelationFamily = 'list' | 'schematic' | 'pipeline' | 'datapath' | 'ring' | 'sphere';

const SUPPORTED_RELATION_ROLES: Readonly<Record<RelationFamily, ReadonlySet<string>>> = {
  list: new Set(['connect', 'connects', 'feeds', 'next', 'directed', 'undirected', 'adjacent', 'from', 'reverse', 'backward', 'source']),
  schematic: new Set(['connect', 'connects', 'feeds', 'next', 'directed', 'undirected', 'adjacent', 'crosses-without-connection', 'cross without connection', 'radiates-from', 'from', 'reverse', 'backward', 'source']),
  pipeline: new Set(['connect', 'connects', 'feeds', 'next', 'directed', 'undirected', 'from', 'reverse', 'backward', 'source']),
  datapath: new Set(['connect', 'connects', 'feeds', 'next', 'directed', 'undirected', 'from', 'reverse', 'backward', 'source']),
  ring: new Set(['connect', 'connects', 'feeds', 'next', 'directed', 'undirected', 'from', 'reverse', 'backward', 'source']),
  sphere: new Set(['connect', 'connects', 'feeds', 'next', 'directed', 'undirected', 'adjacent', 'radiates-from', 'from', 'reverse', 'backward', 'source']),
};

function unsupportedRelation(family: RelationFamily, items: Relation[]): string | null {
  const unsupported = items.find((relation) => !SUPPORTED_RELATION_ROLES[family].has(relation.role.trim().toLowerCase()));
  return unsupported ? `${family} relation role is not represented: ${unsupported.role}` : null;
}

function link(
  b: SceneBuilder,
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  role: string,
  color: SemanticColor = 'muted',
): void {
  const direction = relationDirection(role);
  b.line(id, x1, y1, x2, y2, {
    color,
    role: 'connector',
    markerEnd: direction === 'end',
    markerStart: direction === 'start',
  });
}

function gridPosition(index: number, count: number, width: number, left = 20): number {
  if (count <= 1) return width / 2;
  return left + (index * (width - left * 2)) / (count - 1);
}

export function compileArray(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const layout = specGet(spec, 'layout') ?? 'centered';
  if (layout !== 'centered') return fail('array supports centered row layout');
  const order = specGet(spec, 'order') ?? 'row-major';
  if (order !== 'row-major') return fail('array requires row-major order');
  const data = rows(spec, 'cells', 'arr', 'items');
  if (hasEmptyItems(spec, 'cells', 'arr', 'items') || !data.length || data.some((row) => row.length === 0 || row.some((cell) => !cell)) || data.length > 8 || Math.max(...data.map((r) => r.length)) > 12) {
    return fail('array requires one or more bounded ordered rows');
  }
  const b = frame('array', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'array-caption');
  const maxCols = Math.max(...data.map((row) => row.length));
  const cellW = Math.min(48, (w - 24) / maxCols);
  const cellH = Math.min(28, (h - 44) / data.length);
  data.forEach((row, ri) => {
    const rowWidth = row.length * cellW;
    const left = (w - rowWidth) / 2;
    row.forEach((value, ci) => {
      const id = `cell-row-${ri}-item-${ci}`;
      const x = left + ci * cellW;
      const y = 18 + ri * cellH;
      b.rect(id, x, y, cellW - 2, cellH - 2, { fill: 'none', role: 'boundary' });
      b.label(`cell-label-${ri}-${ci}`, value, x + (cellW - 2) / 2, y + (cellH - 2) / 2, { protected: true, anchorId: id });
    });
  });
  if (specGet(spec, 'order')) b.label('array-order', specGet(spec, 'order')!, w / 2, h - 12, { priority: 'optional' });
  return layoutAndCompile(b.scene());
}

export function compileList(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (hasEmptyItems(spec, 'nodes', 'head', 'items')) return fail('list requires bounded nodes in order');
  const source = itemNames(spec, 'nodes', 'head', 'items');
  if (!source.length || source.length > 10) return fail('list requires bounded nodes in order');
  if (hasDuplicateNames(source)) return fail('list node names must be unique');
  const parsed = relations(spec);
  if (parsed.invalid) return fail('list relation is missing an explicit endpoint');
  const unsupported = unsupportedRelation('list', parsed.items);
  if (unsupported) return fail(unsupported);
  const byName = new Map(source.map((name, index) => [name, index]));
  const edgeList = parsed.items.length ? parsed.items : source.slice(0, -1).map((from, index) => ({ from, to: source[index + 1]!, role: 'next' }));
  if (edgeList.some((edge) => !byName.has(edge.from) || !byName.has(edge.to))) return fail('list relation endpoint is not a declared node');
  if (edgeList.some((edge) => Math.abs(byName.get(edge.from)! - byName.get(edge.to)!) !== 1)) return fail('list relation is not adjacent in the declared linear order', 'refused');
  const b = frame('list', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'list-caption');
  const positions = source.map((_, index) => ({ x: gridPosition(index, source.length, w, 26), y: h / 2 }));
  source.forEach((name, index) => {
    const pos = positions[index]!;
    const id = `node-${index}`;
    b.node(id, pos.x - 20, pos.y - 16, 40, 32, 'list-node');
    b.rect(id, pos.x - 20, pos.y - 16, 40, 32, { fill: 'none', role: 'boundary' });
    b.label(`node-label-${index}`, name, pos.x, pos.y, { protected: true, anchorId: id });
  });
  edgeList.forEach((edge, index) => {
    const from = positions[byName.get(edge.from)!]!;
    const to = positions[byName.get(edge.to)!]!;
    link(b, `relation-${index}`, from.x + (to.x >= from.x ? 20 : -20), from.y, to.x - (to.x >= from.x ? 20 : -20), to.y, edge.role);
  });
  return layoutAndCompile(b.scene());
}

interface BucketEntry { bucket: number; value: string }

function bucketEntries(spec: SpecDoc): { entries: BucketEntry[]; invalid: boolean } {
  const entries: BucketEntry[] = [];
  let invalid = false;
  for (const part of values(spec, 'buckets', 'items').flatMap((value) => value.split(';'))) {
    if (!part.trim()) {
      invalid = true;
      continue;
    }
    const m = /^\s*(\d+)\s*[:=]\s*(.+?)\s*$/.exec(part);
    if (!m) {
      invalid = true;
      continue;
    }
    const bucket = Number(m[1]);
    const bucketValues = m[2]!.split(',').map((entry) => entry.trim());
    if (!Number.isSafeInteger(bucket) || bucketValues.some((entry) => !entry)) {
      invalid = true;
      continue;
    }
    entries.push(...bucketValues.map((value) => ({ bucket, value })));
  }
  return { entries, invalid };
}

export function compileHash(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (hasEmptyItems(spec, 'buckets', 'items')) return fail('hash bucket entries must state a bucket and one or more values');
  const m = specNumber(spec, 'm') ?? parseCsv(specGet(spec, 'buckets') ?? '').length;
  if (!Number.isInteger(m) || m < 1 || m > 10) return fail('hash requires a bucket count from 1 to 10');
  const parsedEntries = bucketEntries(spec);
  if (parsedEntries.invalid) return fail('hash bucket entries must state a bucket and one or more values');
  const entries = parsedEntries.entries;
  if (entries.some((entry) => entry.bucket < 0 || entry.bucket >= m)) return fail('hash entry references an undeclared bucket');
  // Rows and boxes are sized from the text at the minimum font so every value fits inside its own box; the frame
  // grows to the table (presentation scales it) and a chain too long to read at that scale is refused.
  const chains = Array.from({ length: m }, (_, i) => entries.filter((entry) => entry.bucket === i).map((entry) => entry.value));
  const pad = 8;
  const gap = 18;
  const margin = 12;
  const boxW = (texts: string[]) => Math.max(28, ...texts.map((text) => measureText(text, FONT_MIN).w + 2 * pad));
  const bucketW = boxW(chains.map((_, i) => String(i)));
  const entryW = boxW(entries.map((entry) => entry.value));
  const boxH = measureText('0', FONT_MIN).h + pad;
  const pitch = boxH + 4;
  const top = (specGet(spec, 'label') ?? spec.caption ?? specGet(spec, 'kind')) ? 30 : margin;
  const contentW = 2 * margin + bucketW + Math.max(0, ...chains.map((chain) => chain.length)) * (gap + entryW);
  const nominal = frameSize(ctx.profile);
  if (contentW > 2 * nominal.w) return fail('hash chain is too long to draw legibly', 'refused');
  const contentH = top + m * pitch - 4 + margin;
  const b = new SceneBuilder('hash', Math.max(nominal.w, contentW), Math.max(nominal.h, contentH));
  b.hl(spec.highlight);
  addSemanticCaption(b, spec, 'hash-caption');
  const left = (b.width - contentW) / 2 + margin;
  const first = top + (b.height - contentH) / 2;
  chains.forEach((chain, i) => {
    const y = first + i * pitch;
    const mid = y + boxH / 2;
    const id = `bucket-${i}`;
    b.rect(id, left, y, bucketW, boxH, { fill: 'none', role: 'boundary' });
    b.label(`bucket-label-${i}`, String(i), left + bucketW / 2, mid, { protected: true, anchorId: id });
    let previousRight = left + bucketW;
    chain.forEach((value, ei) => {
      const x = previousRight + gap;
      const entryId = `entry-${i}-${ei}`;
      b.rect(entryId, x, y, entryW, boxH, { fill: 'none', role: 'boundary' });
      b.label(`entry-label-${i}-${ei}`, value, x + entryW / 2, mid, { protected: true, anchorId: entryId });
      link(b, `bucket-link-${i}-${ei}`, previousRight, mid, x, mid, 'next');
      previousRight = x + entryW;
    });
  });
  return layoutAndCompile(b.scene());
}

interface TimedJob { name: string; start: number; duration: number }

function timedJobs(spec: SpecDoc): { jobs: TimedJob[]; invalid: boolean } {
  const jobs: TimedJob[] = [];
  let invalid = false;
  for (const part of values(spec, 'jobs').flatMap((value) => value.split(';'))) {
    const text = part.trim();
    if (!text || /^[,|]|[,|]$|[,|]\s*[,|]/.test(text)) {
      invalid = true;
      continue;
    }
    const bits = text.split(/[|,\s]+/);
    const start = Number(bits[1]);
    const duration = Number(bits[2]);
    if (bits.length !== 3 || !bits[0] || !Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0) {
      invalid = true;
      continue;
    }
    jobs.push({ name: bits[0], start, duration });
  }
  return { jobs, invalid };
}

function compactTime(value: number): string {
  return String(Number(value.toFixed(3)));
}

/**
 * One lane when no two slices overlap (CPU scheduling: a process may run in several slices; idle gaps stay empty and
 * dashed), else one row per task. The time scale is chosen so each slice holds its name and the times at its ends.
 */
export function compileGantt(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (specHasEmptyDeclaration(spec, 'jobs')) return fail('gantt jobs must state exactly name, start, and positive duration');
  const tnowRaw = specGet(spec, 'tnow');
  if (specHasEmptyDeclaration(spec, 'tnow') || (tnowRaw !== undefined && !Number.isFinite(Number(tnowRaw.trim())))) return fail('gantt tnow must be a finite number');
  const parsedJobs = timedJobs(spec);
  if (parsedJobs.invalid) return fail('gantt jobs must state exactly name, start, and positive duration');
  const jobs = parsedJobs.jobs;
  if (!jobs.length) return fail('gantt jobs must state name, start, and positive duration');
  const clash = (a: TimedJob, b: TimedJob) => a.start < b.start + b.duration && b.start < a.start + a.duration;
  if (jobs.some((a, i) => jobs.slice(i + 1).some((b) => a.name.toLowerCase() === b.name.toLowerCase() && clash(a, b)))) {
    return fail('a gantt job cannot run twice at the same time');
  }
  const lane = !jobs.some((a, i) => jobs.slice(i + 1).some((b) => clash(a, b)));
  const now = specNumber(spec, 'tnow');
  const min = Math.min(...jobs.map((job) => job.start), now ?? Infinity);
  const max = Math.max(...jobs.map((job) => job.start + job.duration), now ?? -Infinity);
  const textW = (text: string) => measureText(text, FONT_MIN).w;
  const textH = measureText('0', FONT_MIN).h;
  const nominal = frameSize(ctx.profile);
  const rows = lane ? [''] : [...new Map(jobs.map((job) => [job.name.toLowerCase(), job.name])).values()];
  const nameW = lane ? 0 : Math.max(...rows.map(textW)) + 10;
  const margin = 14;
  // Lane: every slice (and gap) holds its name and the times written at both of its ends.
  const pieces = lane
    ? [...jobs.map((job) => ({ from: job.start, to: job.start + job.duration, text: job.name })),
      ...[...jobs].sort((a, b) => a.start - b.start).flatMap((job, i, sorted) => {
        const next = sorted[i + 1];
        return next && next.start > job.start + job.duration ? [{ from: job.start + job.duration, to: next.start, text: '' }] : [];
      })]
    : jobs.map((job) => ({ from: job.start, to: job.start + job.duration, text: job.name }));
  const needed = Math.max(...pieces.map((piece) => (Math.max(textW(piece.text), (textW(compactTime(piece.from)) + textW(compactTime(piece.to))) / 2) + 8) / (piece.to - piece.from)));
  const scale = Math.max((nominal.w - 2 * margin - nameW) / (max - min), needed);
  const width = 2 * margin + nameW + (max - min) * scale;
  if (width > 2 * nominal.w) return { ok: false, code: 'refused', reason: 'gantt slices are too many or too short to label legibly' };
  const barH = textH + 12;
  const rowPitch = barH + 6;
  const caption = specGet(spec, 'label') ?? spec.caption ?? specGet(spec, 'kind');
  const top = (caption ? 26 : 8) + (now !== undefined ? textH + 6 : 0);
  const lanesH = rows.length * rowPitch - 6;
  const height = top + lanesH + 10 + textH + margin;
  // A single lane is a wide strip: its frame is only as tall as the lane and its times.
  const b = new SceneBuilder('gantt', Math.max(nominal.w, width), lane ? height : Math.max(nominal.h, height));
  b.hl(spec.highlight);
  addSemanticCaption(b, spec, 'gantt-caption');
  const left = (b.width - width) / 2 + margin + nameW;
  const y0 = (b.height - height) / 2 + top;
  const xOf = (t: number) => left + (t - min) * scale;
  const rowOf = (name: string) => (lane ? 0 : rows.findIndex((row) => row.toLowerCase() === name.toLowerCase()));
  jobs.forEach((job, index) => {
    const y = y0 + rowOf(job.name) * rowPitch;
    const id = `job-bar-${index}`;
    b.rect(id, xOf(job.start), y, job.duration * scale, barH, { fill: 'none', color: 'accent', role: 'boundary' });
    if (lane) b.label(`job-label-${index}`, job.name, xOf(job.start + job.duration / 2), y + barH / 2, { protected: true, anchorId: id });
  });
  const axis = y0 + lanesH;
  if (lane) {
    pieces.filter((piece) => !piece.text).forEach((gap, index) => {
      b.path(`idle-${index}`, `M ${xOf(gap.from)} ${y0} h ${(gap.to - gap.from) * scale} v ${barH} h ${-(gap.to - gap.from) * scale} Z`, { fill: 'none', color: 'muted', role: 'guide', dash: true });
    });
    const times = [...new Set(pieces.flatMap((piece) => [piece.from, piece.to]))].sort((a, c) => a - c);
    times.forEach((t, index) => b.label(`time-${index}`, compactTime(t), xOf(t), axis + 4 + textH / 2, { protected: true }));
  } else {
    rows.forEach((row, index) => b.label(`row-label-${index}`, row, left - 6 - textW(row) / 2, y0 + index * rowPitch + barH / 2, { protected: true }));
    b.line('gantt-axis', left, axis, xOf(max), axis, { role: 'axis', markerEnd: true });
    const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000].find((s) => (max - min) / s <= 8 && s * scale >= textW(compactTime(max)) + 8) ?? max - min;
    for (let t = Math.ceil(min / step) * step, index = 0; t <= max + 1e-9; t += step, index++) {
      b.line(`time-tick-${index}`, xOf(t), axis, xOf(t), axis + 3, { role: 'axis', width: 1 });
      b.label(`time-${index}`, compactTime(t), xOf(t), axis + 5 + textH / 2, { protected: true });
    }
  }
  if (now !== undefined) {
    b.line('gantt-now', xOf(now), y0 - 4, xOf(now), axis, { color: 'danger', dash: true, role: 'guide' });
    b.label('gantt-now-label', `now = ${compactTime(now)}`, Math.min(b.width - margin - textW(`now = ${compactTime(now)}`) / 2, Math.max(margin + textW(`now = ${compactTime(now)}`) / 2, xOf(now))), y0 - 8 - textH / 2, { protected: true, anchorId: 'gantt-now' });
  }
  return layoutAndCompile(b.scene());
}

export function compileStack(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (hasEmptyItems(spec, 'layers')) return fail('stack requires bounded ordered layers');
  const layers = itemNames(spec, 'layers');
  if (!layers.length || layers.length > 8) return fail('stack requires bounded ordered layers');
  const b = frame('stack', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'stack-caption');
  const layerH = Math.min(24, (h - 24) / layers.length);
  layers.forEach((layer, index) => {
    const y = 12 + index * layerH;
    const id = `layer-${index}`;
    b.rect(id, 24, y, w - 48, layerH - 3, { fill: 'none', role: 'boundary' });
    b.label(`layer-label-${index}`, layer, w / 2, y + (layerH - 3) / 2, { protected: true, anchorId: id });
  });
  return layoutAndCompile(b.scene());
}

export function compileCd(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const data = rows(spec, 'cells', 'grid');
  if (hasEmptyItems(spec, 'cells', 'grid') || !data.length || data.some((row) => !row.length || row.some((cell) => !cell)) || data.length > 6 || Math.max(...data.map((r) => r.length)) > 8) return fail('cd requires a bounded non-empty grid');
  const b = frame('cd', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'cd-caption');
  const cols = Math.max(...data.map((row) => row.length));
  const cellW = Math.min(44, (w - 36) / cols);
  const cellH = Math.min(30, (h - 30) / data.length);
  data.forEach((row, ri) => row.forEach((cell, ci) => {
    const x = 18 + ci * cellW;
    const y = 16 + ri * cellH;
    const id = `cd-cell-${ri}-${ci}`;
    b.rect(id, x, y, cellW - 2, cellH - 2, { fill: 'none', role: 'boundary' });
    b.label(`cd-label-${ri}-${ci}`, cell, x + (cellW - 2) / 2, y + (cellH - 2) / 2, { protected: true, anchorId: id, katex: true });
  }));
  return layoutAndCompile(b.scene());
}

function drawRelationGraph(
  b: SceneBuilder,
  names: string[],
  edgeList: Relation[],
  y = 88,
): CompileResult | null {
  const { width: w } = b;
  if (!names.length || names.length > 10) return fail('diagram requires bounded named nodes');
  const byName = new Map(names.map((name, index) => [name, index]));
  if (edgeList.some((edge) => !byName.has(edge.from) || !byName.has(edge.to))) return fail('relation endpoint is not a declared node');
  const positions = names.map((_, index) => ({ x: gridPosition(index, names.length, w, 24), y }));
  names.forEach((name, index) => {
    const pos = positions[index]!;
    const id = `graph-node-${index}`;
    b.node(id, pos.x - 22, pos.y - 14, 44, 28, 'named-node');
    b.rect(id, pos.x - 22, pos.y - 14, 44, 28, { fill: 'none', role: 'boundary' });
    b.label(`graph-node-label-${index}`, name, pos.x, pos.y, { protected: true, anchorId: id });
  });
  edgeList.forEach((edge, index) => {
    const from = positions[byName.get(edge.from)!]!;
    const to = positions[byName.get(edge.to)!]!;
    link(b, `graph-relation-${index}`, from.x + (to.x >= from.x ? 22 : -22), from.y, to.x - (to.x >= from.x ? 22 : -22), to.y, edge.role);
  });
  return null;
}

export function compileSchematicPlot(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (hasEmptyItems(spec, 'nodes')) return fail('schematic requires named nodes without empty entries');
  const names = itemNames(spec, 'nodes');
  if (hasDuplicateNames(names)) return fail('schematic node names must be unique');
  const kind = specGet(spec, 'kind');
  if (!supportedSchematicKind(kind)) return fail(`schematic kind is not represented: ${kind}`);
  const panelNames = itemNames(spec, 'panel');
  const parsed = relations(spec);
  if (parsed.invalid) return fail('schematic relation is missing an explicit endpoint');
  const unsupported = unsupportedRelation('schematic', parsed.items);
  if (unsupported) return fail(unsupported);
  if (panelNames.length > 1) return fail('multi-panel schematic requires explicit panel-scoped content', 'refused');
  if (specGet(spec, 'crossing') && /unspecified|unknown|ambiguous/i.test(specGet(spec, 'crossing')!)) return fail('schematic crossing connectivity must be explicit');
  const b = frame('schematic', ctx, spec);
  const { width: w, height: h } = b;
  panelNames.forEach((panel, index) => {
    b.label(`schematic-panel-${index}`, panel, index === 0 ? 24 : w - 24, 14, { priority: 'preferred', slot: index === 0 ? 'W' : 'E' });
  });
  const caption = specGet(spec, 'label') ?? spec.caption;
  if (caption) b.label('schematic-caption', caption, w / 2, h - 12, { priority: 'preferred' });
  if (names.length) {
    const graphResult = drawRelationGraph(b, names, parsed.items, h / 2);
    if (graphResult) return graphResult;
    return layoutAndCompile(b.scene());
  }
  const vertices = specGet(spec, 'vertices');
  if (vertices) {
    const pts: number[] = [];
    for (const point of vertices.split(';')) {
      const nums = point.trim().split(/[\s,]+/).map(Number);
      if (nums.length !== 2 || nums.some((num) => !Number.isFinite(num))) return fail('schematic vertices must be numeric pairs');
      pts.push(40 + nums[0]! * 8, h - 30 - nums[1]! * 8);
    }
    if (pts.length < 4) return fail('schematic curve needs at least two points');
    b.polyline('curve', pts, { color: 'accent', width: 1.8, fill: 'none', role: 'geometry' });
  } else {
    return fail('schematic requires nodes and relations or explicit vertices');
  }
  b.line('x-axis', 30, h - 24, w - 16, h - 24, { role: 'axis', markerEnd: true });
  b.line('y-axis', 30, h - 24, 30, 16, { role: 'axis', markerEnd: true });
  b.label('schematic-kind', specGet(spec, 'kind') ?? 'schematic', w / 2, 12, { protected: true });
  return layoutAndCompile(b.scene());
}

/**
 * K-map variables, first = most significant. `AB,CD` or `AB/C` name the row and column groups; a list (`A,B,C`,
 * `x1,x2`) or a run of letters (`ABCD`) splits in half with the extra variable on the columns.
 */
function kmapVariables(text: string): { rows: string[]; cols: string[] } | null {
  const letters = (group: string) => (/^[A-Za-z]+$/.test(group) ? [...group] : [group]);
  const names = (group: string) => (group.includes(',') ? group.split(',').map((name) => name.trim()) : letters(group.trim()));
  const halves = text.split('/');
  let rows: string[];
  let cols: string[];
  if (halves.length === 2) {
    [rows, cols] = halves.map(names) as [string[], string[]];
  } else {
    const tokens = text.split(',').map((token) => token.trim());
    if (tokens.length === 2 && tokens.every((token) => /^[A-Za-z]+$/.test(token)) && tokens.some((token) => token.length > 1)) {
      [rows, cols] = tokens.map(letters) as [string[], string[]];
    } else {
      const all = tokens.length === 1 ? letters(tokens[0]!) : tokens;
      rows = all.slice(0, Math.floor(all.length / 2));
      cols = all.slice(Math.floor(all.length / 2));
    }
  }
  const all = [...rows, ...cols];
  if (halves.length > 2 || !rows.length || !cols.length || rows.length > 2 || cols.length > 2) return null;
  if (all.some((name) => !/^[A-Za-z][A-Za-z0-9']*$/.test(name)) || new Set(all.map((name) => name.toLowerCase())).size !== all.length) return null;
  return { rows, cols };
}

function kmapIndices(text: string | undefined, size: number): number[] | null {
  if (text === undefined) return [];
  const values = parseCsv(text).map(Number);
  if (new Set(values).size !== values.length || values.some((value) => !Number.isInteger(value) || value < 0 || value >= size)) return null;
  return values;
}

export function compileKmap(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const variableText = specGet(spec, 'vars');
  const mintermText = specGet(spec, 'minterms');
  if (!variableText || !mintermText) return fail('kmap requires vars and minterms');
  if (hasEmptyItems(spec, 'minterms', 'dontcares')) return fail('kmap has invalid variable or minterm semantics');
  const vars = kmapVariables(variableText);
  if (!vars) return fail('kmap needs 2 to 4 distinct variables (at most two on each side)');
  const size = 2 ** (vars.rows.length + vars.cols.length);
  const minterms = kmapIndices(mintermText, size);
  const dontCares = kmapIndices(specGet(spec, 'dontcares'), size);
  if (!minterms || !dontCares || dontCares.some((value) => minterms.includes(value))) return fail('kmap has invalid variable or minterm semantics');

  // Rows and columns in Gray code, so neighbouring cells (wrapping at the edges) differ in one variable; the header
  // bits of a cell, row then column, spell its minterm number.
  const gray = (count: number) => Array.from({ length: 2 ** count }, (_, i) => i ^ (i >> 1));
  const bits = (value: number, count: number) => value.toString(2).padStart(count, '0');
  const name = (group: string[]) => group.join(group.every((item) => item.length === 1) ? '' : ',');
  const rowCodes = gray(vars.rows.length);
  const colCodes = gray(vars.cols.length);
  const textH = measureText('0', FONT_MIN).h;
  const cellW = Math.max(30, measureText('00', FONT_MIN).w + 14);
  const cellH = textH + 12;
  const rowName = name(vars.rows);
  const colName = name(vars.cols);
  const rowNameW = measureText(rowName, FONT_MIN).w;
  const headerW = measureText('00', FONT_MIN).w + 12;
  const margin = 10;
  const caption = specGet(spec, 'label') ?? spec.caption ?? specGet(spec, 'kind');
  const contentW = margin + rowNameW + 8 + headerW + colCodes.length * cellW + margin;
  const contentH = (caption ? 24 : margin) + 2 * (textH + 6) + rowCodes.length * cellH + margin;
  const nominal = frameSize(ctx.profile);
  const b = new SceneBuilder('kmap', Math.max(nominal.w, contentW), Math.max(nominal.h, contentH));
  b.hl(spec.highlight);
  addSemanticCaption(b, spec, 'kmap-caption');
  const x0 = (b.width - contentW) / 2 + margin + rowNameW + 8 + headerW;
  const y0 = (b.height - contentH) / 2 + (caption ? 24 : margin) + 2 * (textH + 6);
  b.label('kmap-colvars', colName, x0 + (colCodes.length * cellW) / 2, y0 - textH * 1.5 - 9, { protected: true });
  b.label('kmap-rowvars', rowName, x0 - headerW - 4 - rowNameW / 2, y0 + (rowCodes.length * cellH) / 2, { protected: true });
  colCodes.forEach((code, col) => b.label(`kmap-col-${col}`, bits(code, vars.cols.length), x0 + (col + 0.5) * cellW, y0 - 3 - textH / 2, { protected: true }));
  rowCodes.forEach((rowCode, row) => {
    const y = y0 + row * cellH;
    b.label(`kmap-row-${row}`, bits(rowCode, vars.rows.length), x0 - headerW / 2, y + cellH / 2, { protected: true });
    colCodes.forEach((colCode, col) => {
      const minterm = (rowCode << vars.cols.length) | colCode;
      const id = `kmap-cell-${minterm}`;
      const x = x0 + col * cellW;
      b.rect(id, x, y, cellW, cellH, { fill: 'none', role: 'boundary' });
      const value = minterms.includes(minterm) ? '1' : dontCares.includes(minterm) ? 'X' : '0';
      b.label(`kmap-value-${minterm}`, value, x + cellW / 2, y + cellH / 2, { protected: true, anchorId: id });
    });
  });
  return layoutAndCompile(b.scene());
}

export function compilePipeline(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (hasEmptyItems(spec, 'stages', 'items')) return fail('pipeline requires bounded ordered stages');
  let stages = itemNames(spec, 'stages', 'items');
  if (!stages.length || stages.length > 8) return fail('pipeline requires bounded ordered stages');
  if (hasDuplicateNames(stages)) return fail('pipeline stages must be unique');
  if (normalizedOrder(spec) === 'reverse') stages = [...stages].reverse();
  const parsed = relations(spec);
  if (parsed.invalid) return fail('pipeline relation is missing an explicit endpoint');
  const unsupported = unsupportedRelation('pipeline', parsed.items);
  if (unsupported) return fail(unsupported);
  const b = frame('pipeline', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'pipeline-caption');
  const positions = stages.map((_, index) => gridPosition(index, stages.length, w, 28));
  stages.forEach((stage, index) => {
    const id = `stage-${index}`;
    b.rect(id, positions[index]! - 24, h / 2 - 14, 48, 28, { fill: 'none', role: 'boundary' });
    b.label(`stage-label-${index}`, stage, positions[index]!, h / 2, { protected: true, anchorId: id });
  });
  const edges = parsed.items.length ? parsed.items : stages.slice(0, -1).map((from, index) => ({ from, to: stages[index + 1]!, role: 'feeds' }));
  const byName = new Map(stages.map((stage, index) => [stage, index]));
  if (edges.some((edge) => !byName.has(edge.from) || !byName.has(edge.to))) return fail('pipeline relation endpoint is not a declared stage');
  edges.forEach((edge, index) => {
    const from = positions[byName.get(edge.from)!]!;
    const to = positions[byName.get(edge.to)!]!;
    link(b, `stage-link-${index}`, from + (to >= from ? 24 : -24), h / 2, to - (to >= from ? 24 : -24), h / 2, edge.role);
  });
  return layoutAndCompile(b.scene());
}

export function compileDatapath(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (hasEmptyItems(spec, 'nodes', 'boxes', 'items')) return fail('datapath requires named nodes; kind alone is not enough');
  const names = itemNames(spec, 'nodes', 'boxes', 'items');
  const parsed = relations(spec);
  if (parsed.invalid) return fail('datapath relation is missing an explicit endpoint');
  const unsupported = unsupportedRelation('datapath', parsed.items);
  if (!names.length) return fail('datapath requires named nodes; kind alone is not enough');
  if (hasDuplicateNames(names)) return fail('datapath node names must be unique');
  if (unsupported) return fail(unsupported);
  const b = frame('datapath', ctx, spec);
  addSemanticCaption(b, spec, 'datapath-caption');
  const graphResult = drawRelationGraph(b, names, parsed.items.length ? parsed.items : names.slice(0, -1).map((from, index) => ({ from, to: names[index + 1]!, role: 'feeds' })), b.height / 2);
  return graphResult ?? layoutAndCompile(b.scene());
}

export function compileRing(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (hasEmptyItems(spec, 'nodes', 'vnodes')) return fail('ring requires bounded named nodes');
  const names = itemNames(spec, 'nodes', 'vnodes');
  if (!names.length || names.length > 12) return fail('ring requires bounded named nodes');
  if (hasDuplicateNames(names)) return fail('ring node names must be unique');
  const parsed = relations(spec);
  if (parsed.invalid) return fail('ring relation is missing an explicit endpoint');
  const unsupported = unsupportedRelation('ring', parsed.items);
  if (unsupported) return fail(unsupported);
  const b = frame('ring', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'ring-caption');
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.33;
  b.circle('ring-boundary', cx, cy, radius, { role: 'boundary' });
  const positions = names.map((_, index) => {
    const angle = (index / names.length) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
  names.forEach((name, index) => {
    const id = `ring-node-${index}`;
    const pos = positions[index]!;
    b.circle(id, pos.x, pos.y, 5, { fill: 'ink', color: 'accent', role: 'geometry' });
    b.label(`ring-label-${index}`, name, pos.x, pos.y - 10, { protected: true, anchorId: id });
  });
  const byName = new Map(names.map((name, index) => [name, index]));
  const edges = parsed.items.length ? parsed.items : names.map((name, index) => ({ from: name, to: names[(index + 1) % names.length]!, role: 'next' }));
  if (edges.some((edge) => !byName.has(edge.from) || !byName.has(edge.to))) return fail('ring relation endpoint is not a declared node');
  edges.forEach((edge, index) => {
    const from = positions[byName.get(edge.from)!]!;
    const to = positions[byName.get(edge.to)!]!;
    link(b, `ring-relation-${index}`, from.x, from.y, to.x, to.y, edge.role);
  });
  return layoutAndCompile(b.scene());
}

export function compileSphere(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const radius = specNumber(spec, 'radius', 42);
  if (!radius || radius <= 0 || radius > 75) return fail('sphere requires a positive bounded radius');
  const center = specGet(spec, 'center') ?? 'center';
  const names = itemNames(spec, 'nodes');
  const panelNames = itemNames(spec, 'panel');
  const parsed = relations(spec);
  if (parsed.invalid) return fail('sphere relation is missing an explicit endpoint');
  const unsupported = unsupportedRelation('sphere', parsed.items);
  if (unsupported) return fail(unsupported);
  if (panelNames.length > 1) return fail('sphere comparison panels cannot be separated by this engine', 'refused');
  const b = frame('sphere', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'sphere-caption');
  const cx = w / 2;
  const cy = h / 2;
  b.circle('sphere-surface', cx, cy, radius, { role: 'boundary' });
  b.ellipse('sphere-equator', cx, cy, radius, Math.max(8, radius * 0.22), { color: 'muted', role: 'geometry' });
  b.line('sphere-axis', cx, cy - radius - 10, cx, cy + radius + 10, { dash: true, color: 'guide', role: 'axis' });
  b.label('sphere-center', center, cx, cy + radius + 14, { protected: true, slot: 'S', anchorId: 'sphere-surface' });
  panelNames.forEach((panel, index) => {
    b.label(`sphere-panel-${index}`, panel, index === 0 ? 16 : w - 16, 14, { priority: 'preferred', slot: index === 0 ? 'W' : 'E' });
  });
  names.forEach((name, index) => {
    const angle = (index / Math.max(1, names.length)) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius * 0.78;
    const y = cy + Math.sin(angle) * radius * 0.78;
    const id = `sphere-node-${index}`;
    b.circle(id, x, y, 3, { fill: 'ink', color: 'accent', role: 'geometry' });
    b.label(`sphere-node-label-${index}`, name, x, y - 9, { priority: 'preferred', anchorId: id });
    const declaredRole = parsed.items[index % Math.max(1, parsed.items.length)]?.role ?? 'radiates';
    const radialRole = /inward/i.test(specGet(spec, 'direction') ?? '') ? 'reverse' : declaredRole;
    link(b, `sphere-radius-${index}`, cx, cy, x, y, radialRole);
  });
  const endpoints = new Set([center, ...names, ...panelNames]);
  if (parsed.items.some((edge) => !endpoints.has(edge.from) || !endpoints.has(edge.to))) return fail('sphere relation endpoint is not a declared centre, panel, or node');
  return layoutAndCompile(b.scene());
}

export function compileKnot(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const crossings = specNumber(spec, 'crossings');
  if (!crossings || crossings < 1 || crossings > 7) return fail('knot requires 1 to 7 crossings');
  return fail('crossing count does not determine over-under knot geometry', 'refused');
}

const MULTIPLET: Record<string, number> = {
  s: 1, d: 2, t: 3, q: 4, p: 5, singlet: 1, doublet: 2, triplet: 3, quartet: 4, quintet: 5, pentet: 5, sextet: 6,
  septet: 7, heptet: 7, octet: 8, nonet: 9,
};
const MULTIPLET_NAME = ['', 'singlet', 'doublet', 'triplet', 'quartet', 'quintet', 'sextet', 'septet', 'octet', 'nonet', 'decet'];

/** Line counts of each coupling: `t`, `quartet`, `5`, or a run of letters such as `dd`, `dt`, `ddd`. */
function couplings(value: string): number[] | null {
  const text = value.trim().toLowerCase();
  if (/^\d+$/.test(text)) return Number(text) >= 1 && Number(text) <= 10 ? [Number(text)] : null;
  if (MULTIPLET[text]) return [MULTIPLET[text]];
  if (/^[sdtqp]{2,3}$/.test(text)) return [...text].map((letter) => MULTIPLET[letter]!);
  return null;
}

function binomial(n: number, k: number): number {
  let value = 1;
  for (let i = 1; i <= k; i++) value = (value * (n - i + 1)) / i;
  return value;
}

export function compileSplitting(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const counts = couplings(specGet(spec, 'mult') ?? specGet(spec, 'peak') ?? '')?.filter((count) => count > 1);
  if (!counts) return fail('splitting requires a supported multiplicity');
  const jText = specGet(spec, 'j');
  const js = jText === undefined ? [] : parseCsv(jText).map((value) => Number(/^\s*(\d+(?:\.\d+)?)/.exec(value)?.[1] ?? NaN));
  if (js.length !== counts.length || js.some((value) => !Number.isFinite(value) || value <= 0)) return fail('splitting needs one positive J value per coupling');

  // First-order multiplet: convolve one binomial pattern (n lines, J apart) per coupling; coincident lines add.
  let lines = [{ at: 0, weight: 1 }];
  counts.forEach((count, index) => {
    const merged = new Map<number, number>();
    for (const line of lines) {
      for (let k = 0; k < count; k++) {
        const at = Math.round((line.at + (k - (count - 1) / 2) * js[index]!) * 1e6) / 1e6;
        merged.set(at, (merged.get(at) ?? 0) + line.weight * binomial(count - 1, k));
      }
    }
    lines = [...merged].map(([at, weight]) => ({ at, weight })).sort((a, b) => a.at - b.at);
  });
  const spread = lines.at(-1)!.at - lines[0]!.at;
  const closest = Math.min(...lines.slice(1).map((line, i) => line.at - lines[i]!.at));
  const { w } = frameSize(ctx.profile);
  const scale = lines.length > 1 ? Math.min((w - 80) / spread, 44 / closest) : 0;
  if (lines.length > 1 && closest * scale < 8) return fail('multiplet lines are too close to draw apart', 'refused');

  const textH = measureText('0', FONT_MIN).h;
  const caption = specGet(spec, 'label') ?? spec.caption;
  const top = caption ? 26 : 8;
  const jy = top + 2 * textH + 12;
  const baseline = jy + 8 + 72;
  const b = new SceneBuilder('splitting', w, Math.max(frameSize(ctx.profile).h, baseline + textH + 12));
  b.hl(spec.highlight);
  if (caption) b.label('splitting-caption', caption, w / 2, 12, { protected: true });
  const name = counts.length ? counts.map((count, i) => `${MULTIPLET_NAME[count]}${i ? 's' : ''}`).join(' of ') : 'singlet';
  b.label('splitting-multiplicity', name, w / 2, top + textH / 2, { protected: true });
  const heaviest = Math.max(...lines.map((line) => line.weight));
  const xOf = (at: number) => w / 2 + (at - (lines[0]!.at + spread / 2)) * scale;
  b.line('splitting-baseline', 30, baseline, w - 30, baseline, { color: 'muted', role: 'axis', width: 1 });
  lines.forEach((line, index) => {
    const x = xOf(line.at);
    b.line(`split-peak-${index}`, x, baseline, x, baseline - (line.weight / heaviest) * 72, { color: 'accent', width: 1.6, role: 'geometry' });
  });
  if (jText !== undefined) {
    const unit = /[A-Za-z]+/.exec(jText)?.[0];
    const text = `J = ${js.join(', ')}${unit ? ` ${unit}` : ''}`;
    if (counts.length === 1) {
      const [x1, x2] = [xOf(lines[0]!.at), xOf(lines[1]!.at)];
      b.line('splitting-j-bracket', x1, jy, x2, jy, { color: 'muted', role: 'guide', width: 1 });
      b.line('splitting-j-tick-0', x1, jy, x1, jy + 5, { color: 'muted', role: 'guide', width: 1 });
      b.line('splitting-j-tick-1', x2, jy, x2, jy + 5, { color: 'muted', role: 'guide', width: 1 });
      b.label('splitting-j', text, Math.min(w - 30 - measureText(text, FONT_MIN).w / 2, Math.max(30 + measureText(text, FONT_MIN).w / 2, (x1 + x2) / 2)), jy - 3 - textH / 2, { protected: true, anchorId: 'splitting-j-bracket' });
    } else {
      b.label('splitting-j', text, w / 2, jy - 3 - textH / 2, { protected: true });
    }
  }
  b.label('splitting-ratio', lines.map((line) => line.weight).join(':'), w / 2, baseline + 4 + textH / 2, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileEchem(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const anode = specGet(spec, 'anode');
  const cathode = specGet(spec, 'cathode');
  if (!anode || !cathode) return fail('echem requires explicit anode and cathode');
  if (/ranking|plot/i.test(specGet(spec, 'kind') ?? '') && /not supplied|unknown|missing/i.test(specGet(spec, 'values') ?? '')) return fail('numeric electrochemical values are not supplied', 'refused');
  const b = frame('echem', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'echem-caption');
  const left = 30;
  const right = w - 120;
  b.rect('echem-anode-compartment', left, 42, 90, 88, { fill: 'none', role: 'boundary' });
  b.rect('echem-cathode-compartment', right, 42, 90, 88, { fill: 'none', role: 'boundary' });
  b.line('echem-anode', left + 45, 52, left + 45, 112, { width: 2, role: 'geometry' });
  b.line('echem-cathode', right + 45, 52, right + 45, 112, { width: 2, role: 'geometry' });
  b.label('echem-anode-label', anode, left + 45, 28, { protected: true, anchorId: 'echem-anode-compartment' });
  b.label('echem-cathode-label', cathode, right + 45, 28, { protected: true, anchorId: 'echem-cathode-compartment' });
  const reverse = /reverse|cathode.*anode/i.test(specGet(spec, 'direction') ?? '');
  link(b, 'echem-electron-flow', reverse ? right + 45 : left + 45, 24, reverse ? left + 45 : right + 45, 24, 'feeds', 'accent');
  b.label('echem-electron-label', 'e−', w / 2, 18, { priority: 'preferred', anchorId: 'echem-electron-flow' });
  return layoutAndCompile(b.scene());
}
