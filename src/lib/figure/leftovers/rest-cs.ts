import type { CompileCtx, CompileResult, SemanticColor } from '../types';
import { parseCsv, specGet, specGetAll, specList, specNumber, type SpecDoc } from '../spec';
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

function rows(spec: SpecDoc, ...keys: string[]): string[][] {
  const source = values(spec, ...keys);
  if (!source.length) return [];
  return source.flatMap((value) => value.split(';').map((row) => parseCsv(row)).filter((row) => row.length));
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
  const raw = [...specGetAll(spec, 'relations'), ...specGetAll(spec, 'relation')];
  if (!raw.length) raw.push(...specList(spec, 'relations'));
  const items: Relation[] = [];
  for (const value of raw.flatMap((entry) => entry.split(';'))) {
    if (!value.trim()) continue;
    const parsed = relationParts(value);
    if (!parsed) return { items, invalid: true };
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
  const data = rows(spec, 'cells', 'arr', 'items');
  if (!data.length || data.some((row) => row.length === 0) || data.length > 8 || Math.max(...data.map((r) => r.length)) > 12) {
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
  const source = itemNames(spec, 'nodes', 'head', 'items');
  if (!source.length || source.length > 10) return fail('list requires bounded nodes in order');
  const parsed = relations(spec);
  if (parsed.invalid) return fail('list relation is missing an explicit endpoint');
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

function bucketEntries(spec: SpecDoc): BucketEntry[] {
  return values(spec, 'buckets', 'items').flatMap((value) => value.split(';')).flatMap((part) => {
    const m = /^\s*(\d+)\s*[:=]\s*(.+)$/.exec(part);
    if (!m) return [];
    return parseCsv(m[2]!).map((entry) => ({ bucket: Number(m[1]), value: entry }));
  });
}

export function compileHash(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const m = specNumber(spec, 'm') ?? parseCsv(specGet(spec, 'buckets') ?? '').length;
  if (!Number.isInteger(m) || m < 1 || m > 10) return fail('hash requires a bucket count from 1 to 10');
  const entries = bucketEntries(spec);
  if (entries.some((entry) => entry.bucket < 0 || entry.bucket >= m)) return fail('hash entry references an undeclared bucket');
  const b = frame('hash', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'hash-caption');
  const bucketH = Math.min(22, (h - 20) / m);
  for (let i = 0; i < m; i++) {
    const y = 10 + i * bucketH;
    const id = `bucket-${i}`;
    b.rect(id, 48, y, 52, bucketH - 3, { fill: 'none', role: 'boundary' });
    b.label(`bucket-label-${i}`, String(i), 74, y + (bucketH - 3) / 2, { protected: true, anchorId: id });
    const valuesInBucket = entries.filter((entry) => entry.bucket === i).map((entry) => entry.value);
    valuesInBucket.forEach((value, ei) => {
      const x = 120 + ei * 48;
      const entryId = `entry-${i}-${ei}`;
      b.rect(entryId, x, y + 2, 42, bucketH - 7, { fill: 'none', role: 'boundary' });
      b.label(`entry-label-${i}-${ei}`, value, x + 21, y + (bucketH - 5) / 2, { priority: 'required', anchorId: entryId });
      link(b, `bucket-link-${i}-${ei}`, 100, y + (bucketH - 3) / 2, x, y + (bucketH - 3) / 2, 'next');
    });
  }
  return layoutAndCompile(b.scene());
}

interface TimedJob { name: string; start: number; duration: number }

function timedJobs(spec: SpecDoc): TimedJob[] {
  return values(spec, 'jobs').flatMap((value) => value.split(';')).map((part) => {
    const bits = part.trim().split(/[|,\s]+/).filter(Boolean);
    if (bits.length < 3) return null;
    const start = Number(bits[1]);
    const duration = Number(bits[2]);
    return bits[0] && Number.isFinite(start) && Number.isFinite(duration) && duration > 0 ? { name: bits[0], start, duration } : null;
  }).filter((job): job is TimedJob => job !== null);
}

export function compileGantt(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const jobs = timedJobs(spec);
  if (!jobs.length) return fail('gantt jobs must state name, start, and positive duration');
  const b = frame('gantt', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'gantt-caption');
  const min = Math.min(...jobs.map((job) => job.start));
  const max = Math.max(...jobs.map((job) => job.start + job.duration));
  const span = max - min || 1;
  const left = 58;
  const right = w - 12;
  const rowH = Math.min(24, (h - 24) / jobs.length);
  b.line('gantt-axis', left, 12, right, 12, { role: 'axis', markerEnd: true });
  jobs.forEach((job, index) => {
    const y = 20 + index * rowH;
    const x = left + ((job.start - min) / span) * (right - left);
    const barW = Math.max(8, (job.duration / span) * (right - left));
    const id = `job-bar-${index}`;
    b.rect(id, x, y, Math.min(barW, right - x), rowH - 4, { fill: 'none', color: 'accent', role: 'boundary' });
    b.label(`job-label-${index}`, job.name, 28, y + (rowH - 4) / 2, { protected: true, anchorId: id });
    b.label(`job-time-${index}`, `${job.start}+${job.duration}`, x + Math.min(barW, right - x) / 2, y + (rowH - 4) / 2, { priority: 'optional', anchorId: id });
  });
  const now = specNumber(spec, 'tnow');
  if (now !== undefined && Number.isFinite(now)) {
    const x = left + ((now - min) / span) * (right - left);
    b.line('gantt-now', Math.max(left, Math.min(right, x)), 12, Math.max(left, Math.min(right, x)), h - 10, { color: 'danger', dash: true, role: 'guide' });
    b.label('gantt-now-label', `now=${now}`, Math.max(left, Math.min(right, x)), h - 8, { priority: 'preferred', anchorId: 'gantt-now' });
  }
  return layoutAndCompile(b.scene());
}

export function compileStack(spec: SpecDoc, ctx: CompileCtx): CompileResult {
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
  if (!data.length || data.some((row) => !row.length) || data.length > 6 || Math.max(...data.map((r) => r.length)) > 8) return fail('cd requires a bounded non-empty grid');
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
  const names = itemNames(spec, 'nodes');
  const panelNames = itemNames(spec, 'panel');
  const parsed = relations(spec);
  if (parsed.invalid) return fail('schematic relation is missing an explicit endpoint');
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

function kmapSize(variableText: string): { rows: number; cols: number } {
  const groups = variableText.split(/[,/]/).map((group) => group.trim()).filter(Boolean);
  if (groups.length === 2 && groups[0]!.length && groups[1]!.length) return { rows: 2 ** groups[0]!.length, cols: 2 ** groups[1]!.length };
  const count = variableText.replace(/[^A-Za-z]/g, '').length;
  return count > 0 && count <= 4 ? { rows: 2 ** Math.ceil(count / 2), cols: 2 ** Math.floor(count / 2) } : { rows: 0, cols: 0 };
}

export function compileKmap(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const variableText = specGet(spec, 'vars');
  const mintermText = specGet(spec, 'minterms');
  if (!variableText || !mintermText) return fail('kmap requires vars and minterms');
  const size = kmapSize(variableText);
  const minterms = parseCsv(mintermText).map(Number);
  if (!size.rows || !size.cols || minterms.some((value) => !Number.isInteger(value) || value < 0 || value >= size.rows * size.cols)) return fail('kmap has invalid variable or minterm semantics');
  const b = frame('kmap', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'kmap-caption');
  const cellW = Math.min(38, (w - 44) / size.cols);
  const cellH = Math.min(26, (h - 38) / size.rows);
  const left = (w - size.cols * cellW) / 2;
  const top = 22;
  for (let row = 0; row < size.rows; row++) {
    for (let col = 0; col < size.cols; col++) {
      const index = row * size.cols + col;
      const id = `kmap-cell-${index}`;
      const x = left + col * cellW;
      const y = top + row * cellH;
      b.rect(id, x, y, cellW - 2, cellH - 2, { fill: 'none', role: 'boundary' });
      b.label(`kmap-value-${index}`, minterms.includes(index) ? '1' : '0', x + (cellW - 2) / 2, y + (cellH - 2) / 2, { protected: true, anchorId: id });
    }
  }
  b.label('kmap-vars', variableText, w / 2, h - 12, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compilePipeline(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  let stages = itemNames(spec, 'stages', 'items');
  if (!stages.length || stages.length > 8) return fail('pipeline requires bounded ordered stages');
  if (normalizedOrder(spec) === 'reverse') stages = [...stages].reverse();
  const parsed = relations(spec);
  if (parsed.invalid) return fail('pipeline relation is missing an explicit endpoint');
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
  const names = itemNames(spec, 'nodes', 'boxes', 'items');
  const parsed = relations(spec);
  if (parsed.invalid) return fail('datapath relation is missing an explicit endpoint');
  if (!names.length) return fail('datapath requires named nodes; kind alone is not enough');
  const b = frame('datapath', ctx, spec);
  addSemanticCaption(b, spec, 'datapath-caption');
  const graphResult = drawRelationGraph(b, names, parsed.items.length ? parsed.items : names.slice(0, -1).map((from, index) => ({ from, to: names[index + 1]!, role: 'feeds' })), b.height / 2);
  return graphResult ?? layoutAndCompile(b.scene());
}

export function compileRing(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const names = itemNames(spec, 'nodes', 'vnodes');
  if (!names.length || names.length > 12) return fail('ring requires bounded named nodes');
  const parsed = relations(spec);
  if (parsed.invalid) return fail('ring relation is missing an explicit endpoint');
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
    b.circle(id, pos.x, pos.y, 5, { fill: 'solid', color: 'accent', role: 'geometry' });
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

export function compileTopology(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const names = itemNames(spec, 'nodes');
  const identificationText = specGet(spec, 'identifications');
  const pairs = (identificationText ?? '').split(/[;,]/).map((part) => part.trim()).filter(Boolean).map((part) => part.split(/\s*(?:~|=|<->)\s*/)).filter((pair) => pair.length === 2 && pair[0] && pair[1]);
  if (!names.length && !pairs.length) return fail('topology requires named boundary identifications');
  const parsed = relations(spec);
  if (parsed.invalid) return fail('topology relation is missing an explicit endpoint');
  const b = frame('topology', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'topology-caption');
  b.rect('topology-boundary', 42, 24, w - 84, h - 48, { fill: 'none', role: 'boundary' });
  pairs.forEach((pair, index) => {
    const y = 38 + index * Math.min(24, (h - 60) / Math.max(1, pairs.length));
    link(b, `identification-${index}`, 42, y, w - 42, y, 'identification', 'accent');
    b.label(`identification-label-${index}`, `${pair[0]} = ${pair[1]}`, w / 2, y - 7, { priority: 'required', anchorId: `identification-${index}` });
  });
  if (names.length) {
    const graphResult = drawRelationGraph(b, names, parsed.items, h - 20);
    if (graphResult) return graphResult;
  }
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
    b.circle(id, x, y, 3, { fill: 'solid', color: 'accent', role: 'geometry' });
    b.label(`sphere-node-label-${index}`, name, x, y - 9, { priority: 'preferred', anchorId: id });
    const declaredRole = parsed.items[index % Math.max(1, parsed.items.length)]?.role ?? 'radiates';
    const radialRole = /inward/i.test(specGet(spec, 'direction') ?? '') ? 'reverse' : declaredRole;
    link(b, `sphere-radius-${index}`, cx, cy, x, y, radialRole);
  });
  const endpoints = new Set([center, ...names, ...panelNames]);
  if (parsed.items.some((edge) => !endpoints.has(edge.from) || !endpoints.has(edge.to))) return fail('sphere relation endpoint is not a declared centre, panel, or node');
  return layoutAndCompile(b.scene());
}

export function compileIsometric(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const gamma = specGet(spec, 'gamma');
  const origin = specGet(spec, 't0');
  if (!gamma || !origin) return fail('isometric projection requires gamma and t0');
  if (/implicit|unbounded|surface/i.test(specGet(spec, 'geometry') ?? '')) return fail('continuous unbounded isometric surfaces are unsupported', 'refused');
  const b = frame('isometric', ctx, spec);
  const { width: w, height: h } = b;
  const ox = w / 2;
  const oy = h / 2 + 20;
  b.line('axis-time', ox, oy, ox + 44, oy - 26, { markerEnd: true, role: 'axis' });
  b.line('axis-space', ox, oy, ox, oy - 44, { markerEnd: true, color: 'muted', role: 'axis' });
  b.line('axis-basis', ox, oy, ox - 38, oy - 20, { markerEnd: true, color: 'danger', role: 'axis' });
  b.label('isometric-gamma', `gamma=${gamma}`, ox + 50, oy - 30, { protected: true, anchorId: 'axis-time' });
  b.label('isometric-origin', `t0=${origin}`, ox, oy + 12, { protected: true, anchorId: 'axis-time' });
  return layoutAndCompile(b.scene());
}

export function compileKnot(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const crossings = specNumber(spec, 'crossings');
  if (!crossings || crossings < 1 || crossings > 7) return fail('knot requires 1 to 7 crossings');
  return fail('crossing count does not determine over-under knot geometry', 'refused');
}

function endpointLabel(value: string): string {
  return value.replace(/@[-+]?\d+(?:\.\d+)?$/, '').trim() || value;
}

export function compileMechanism(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const from = specGet(spec, 'from');
  const to = specGet(spec, 'to');
  if (!from || !to) return fail('mechanism requires explicit from and to endpoints');
  const b = frame('mechanism', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'mechanism-caption');
  const left = 58;
  const right = w - 58;
  b.circle('mechanism-from', left, h / 2, 16, { role: 'boundary' });
  b.circle('mechanism-to', right, h / 2, 16, { role: 'boundary' });
  b.path('mechanism-arrow', `M ${left + 18} ${h / 2} Q ${w / 2} ${h / 2 - 34} ${right - 18} ${h / 2}`, { markerEnd: true, color: 'accent', role: 'connector' });
  b.label('mechanism-from-label', endpointLabel(from), left, h / 2 + 28, { protected: true, anchorId: 'mechanism-from' });
  b.label('mechanism-to-label', endpointLabel(to), right, h / 2 + 28, { protected: true, anchorId: 'mechanism-to' });
  return layoutAndCompile(b.scene());
}

function splittingCount(value: string): number | null {
  const aliases: Record<string, number> = { s: 1, d: 2, t: 3, q: 4, quintet: 5, sextet: 6, septet: 7, octet: 8, nonet: 9, decet: 10 };
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric > 0 && numeric <= 10) return numeric;
  return aliases[value.toLowerCase()] ?? null;
}

export function compileSplitting(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const multiplicity = splittingCount(specGet(spec, 'mult') ?? specGet(spec, 'peak') ?? '');
  const j = specGet(spec, 'j');
  if (!multiplicity || !j) return fail('splitting requires a supported multiplicity and J value');
  const b = frame('splitting', ctx, spec);
  const { width: w, height: h } = b;
  addSemanticCaption(b, spec, 'splitting-caption');
  const spacing = Math.min(18, (w - 32) / Math.max(1, multiplicity - 1));
  const start = w / 2 - (multiplicity - 1) * spacing / 2;
  for (let index = 0; index < multiplicity; index++) {
    const x = start + index * spacing;
    b.line(`split-peak-${index}`, x, h - 28, x, 38, { color: 'accent', width: 1.4, role: 'geometry' });
  }
  b.label('splitting-j', `J=${j}`, w / 2, 20, { protected: true });
  b.label('splitting-multiplicity', specGet(spec, 'peak') ?? specGet(spec, 'mult')!, w / 2, h - 12, { protected: true });
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
