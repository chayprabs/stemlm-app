import type { CompileCtx, CompileResult } from '../types';
import { parseCsv, specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

function frame(family: string, ctx: CompileCtx, spec: SpecDoc): SceneBuilder {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder(family, w, h);
  b.hl(spec.highlight);
  return b;
}

function malformed(family: string, reason: string): CompileResult {
  return { ok: false, code: 'malformed', reason: `${family} ${reason}` };
}

function required(spec: SpecDoc, family: string, keys: string[]): CompileResult | null {
  const missing = keys.filter((key) => !specGet(spec, key)?.trim());
  return missing.length ? malformed(family, `missing ${missing.join(', ')}`) : null;
}

function label(b: SceneBuilder, id: string, text: string, x: number, y: number, anchorId?: string): void {
  b.label(id, text, x, y, { priority: 'preferred', anchorId });
}

function valueOr(spec: SpecDoc, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = specGet(spec, key);
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

function firstWords(value: string): { a: string; b: string; directed: boolean } | null {
  const directed = /->|=>/.test(value);
  const words = value.replace(/->|=>/g, ' ').trim().split(/\s+/).filter(Boolean);
  return words.length >= 2 ? { a: words[0]!, b: words[1]!, directed } : null;
}

export function compileTline(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const z0 = valueOr(spec, ['z0', 'impedance']);
  const load = valueOr(spec, ['zl', 'load', 'zload', 'termination']);
  const source = valueOr(spec, ['source', 'vs']) ?? 'Vs';
  if (!z0 || !load) return malformed('tline', 'requires source/load impedance and load values');
  const b = frame('tline', ctx, spec);
  const { width: w, height: h } = b;
  const y1 = h * 0.36;
  const y2 = h * 0.64;
  const x0 = 48;
  const xLoad = w - 72;
  const midY = (y1 + y2) / 2;
  b.line('cond-top', x0, y1, xLoad, y1, { width: 2.2, role: 'geometry' });
  b.line('cond-bot', x0, y2, xLoad, y2, { width: 2.2, role: 'geometry' });
  b.circle('source', 22, midY, 10, { fill: 'none', role: 'geometry' });
  b.line('source-top', 22, midY - 8, x0, y1, { width: 1.2, role: 'connector' });
  b.line('source-bottom', 22, midY + 8, x0, y2, { width: 1.2, role: 'connector' });
  label(b, 'source-label', source, 22, 18, 'source');
  b.rect('load', xLoad, y1, 22, y2 - y1, { fill: 'none', color: 'accent', width: 1.6, role: 'geometry' });
  label(b, 'load-label', `ZL=${load}`, w - 16, midY, 'load');
  label(b, 'z0-label', `Z0=${z0}`, (x0 + xLoad) / 2, midY, 'cond-top');
  const delay = valueOr(spec, ['delay', 'td', 'length']);
  if (delay) label(b, 'delay-label', `td=${delay}`, (x0 + xLoad) / 2, y1 - 14, 'cond-top');
  return layoutAndCompile(b.scene());
}

export function compileOneline(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (spec.type === 'seqnet') return compileSeqnet(spec, ctx);
  const buses = parseCsv(valueOr(spec, ['buses', 'bus']) ?? '');
  const nodeSpecs = specGetAll(spec, 'node')
    .map((v) => ({ id: v.trim().split(/\s+/)[0], text: v.trim() }))
    .filter((v): v is { id: string; text: string } => Boolean(v.id));
  const nodes = nodeSpecs.map((node) => node.id);
  if (!nodes.length && !buses.length) return malformed('oneline', 'requires nodes or buses');
  const b = frame('oneline', ctx, spec);
  const { width: w, height: h } = b;
  const names = nodes.length ? nodes : buses;
  const positions = new Map<string, { x: number; y: number }>();
  const y = h * 0.5;
  names.forEach((name, i) => {
    const x = names.length === 1 ? w / 2 : 32 + i * ((w - 64) / (names.length - 1));
    positions.set(name.toLowerCase(), { x, y });
    b.circle(`node-${i}`, x, y, 6, { fill: 'none', role: 'geometry' });
    label(b, `node-label-${i}`, nodeSpecs[i]?.text ?? name, x, y - 14, `node-${i}`);
  });
  if (!nodes.length) {
    names.forEach((name, i) => {
      const x = positions.get(name.toLowerCase())!.x;
      b.line(`bus-${i}`, x, 28, x, h - 28, { width: 2.2, role: 'boundary' });
    });
  } else {
    buses.forEach((bus, i) => label(b, `bus-label-${i}`, bus, 28 + i * 30, 16, `node-${i % names.length}`));
  }
  const connections = [...specGetAll(spec, 'connection'), ...specGetAll(spec, 'branch')];
  for (const [i, raw] of connections.entries()) {
    const pair = firstWords(raw);
    if (!pair) return malformed('oneline', `invalid connection ${raw}`);
    const a = positions.get(pair.a.toLowerCase());
    const z = positions.get(pair.b.toLowerCase());
    if (!a || !z) return malformed('oneline', `connection references unknown node ${raw}`);
    b.line(`connection-${i}`, a.x, a.y, z.x, z.y, { width: 1.6, role: 'connector', markerEnd: pair.directed });
    const detail = raw.replace(/^(\S+)\s*(?:->|=>)?\s*(\S+)\s*/, '').trim();
    if (detail) label(b, `connection-label-${i}`, detail, (a.x + z.x) / 2, y - 24, `connection-${i}`);
  }
  specGetAll(spec, 'label').forEach((value, i) => label(b, `annotation-${i}`, value, w / 2, 18 + i * 14));
  if (specGet(spec, 'std')) label(b, 'standard', specGet(spec, 'std')!, 18, h - 10);
  return layoutAndCompile(b.scene());
}

function specHasPort(spec: SpecDoc): boolean {
  return Boolean(specGet(spec, 'input')?.trim() && specGet(spec, 'output')?.trim()) || specGetAll(spec, 'port').length >= 2;
}

export function compileTwoport(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const params = valueOr(spec, ['params', 'zij']);
  const missing = !params ? malformed('twoport', 'missing params or zij') : (specHasPort(spec) ? null : malformed('twoport', 'requires input/output or port declarations'));
  if (missing) return missing;
  const b = frame('twoport', ctx, spec);
  const { width: w, height: h } = b;
  const cx = w / 2;
  const cy = h / 2;
  b.rect('network', cx - 42, cy - 30, 84, 60, { fill: 'none', color: 'accent', width: 1.8, role: 'boundary' });
  b.line('input-top', 20, cy - 16, cx - 42, cy - 16, { width: 1.6, role: 'connector' });
  b.line('input-bottom', 20, cy + 16, cx - 42, cy + 16, { width: 1.6, role: 'connector' });
  b.line('output-top', cx + 42, cy - 16, w - 20, cy - 16, { width: 1.6, role: 'connector' });
  b.line('output-bottom', cx + 42, cy + 16, w - 20, cy + 16, { width: 1.6, role: 'connector' });
  const innerTop = cy - 16;
  const innerBottom = cy + 16;
  b.line('internal-top', cx - 42, innerTop, cx + 42, innerTop, { width: 1.2, role: 'connector' });
  b.line('internal-bottom', cx - 42, innerBottom, cx + 42, innerBottom, { width: 1.2, role: 'connector' });
  const ports = specGetAll(spec, 'port');
  label(b, 'input-label', specGet(spec, 'input') ?? ports[0] ?? 'input', 24, cy - 26, 'input-top');
  label(b, 'output-label', specGet(spec, 'output') ?? ports[1] ?? 'output', w - 24, cy - 26, 'output-top');
  label(b, 'parameter-label', `params=${params}`, cx, cy - 4, 'network');
  specGetAll(spec, 'reference').forEach((value, i) => label(b, `reference-${i}`, value, cx, cy + 16 + i * 12, 'network'));
  const elements = specGetAll(spec, 'element');
  elements.forEach((element, i) => {
    const lower = element.toLowerCase();
    const x = cx - 42 + ((i + 1) * 84) / (elements.length + 1);
    if (lower.startsWith('shunt')) {
      b.line(`element-${i}-top`, x, innerTop, x, cy - 5, { width: 1.2, role: 'connector' });
      b.line(`element-${i}-plate-top`, x - 8, cy - 5, x + 8, cy - 5, { width: 1.8, role: 'geometry' });
      b.line(`element-${i}-plate-bottom`, x - 8, cy + 5, x + 8, cy + 5, { width: 1.8, role: 'geometry' });
      b.line(`element-${i}-bottom`, x, cy + 5, x, innerBottom, { width: 1.2, role: 'connector' });
    } else {
      b.line(`element-${i}-left`, x - 20, innerTop, x - 8, innerTop, { width: 1.2, role: 'connector' });
      b.rect(`element-${i}`, x - 8, innerTop - 6, 16, 12, { fill: 'solid', role: 'geometry' });
      b.line(`element-${i}-right`, x + 8, innerTop, x + 20, innerTop, { width: 1.2, role: 'connector' });
    }
    label(b, `element-label-${i}`, element, x, cy + 34, `element-${i}`);
  });
  return layoutAndCompile(b.scene());
}

export function compilePwm(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const dutyRaw = valueOr(spec, ['duty', 'd']);
  if (!dutyRaw) return malformed('pwm', 'requires duty');
  const duty = Number(dutyRaw.replace(/[^0-9.eE+-].*$/, ''));
  if (!Number.isFinite(duty) || duty < 0 || duty > 1) return malformed('pwm', `invalid duty ${dutyRaw}`);
  const b = frame('pwm', ctx, spec);
  const { width: w, height: h } = b;
  const y = h / 2;
  const left = 18;
  const right = w - 18;
  const period = (right - left) / 4;
  b.line('time-axis', left, y + 26, right, y + 26, { color: 'guide', role: 'axis' });
  for (let i = 0; i < 4; i++) {
    const x = left + i * period;
    b.polyline(`carrier-${i}`, [x, y + 18, x + period / 2, y - 18, x + period, y + 18], { color: 'muted', width: 1.2, role: 'geometry' });
    const pw = period * duty;
    b.polyline(`pulse-${i}`, [x, y + 18, x, y - 10, x + pw, y - 10, x + pw, y + 18], { color: 'accent', width: 1.6, role: 'geometry' });
  }
  label(b, 'duty-label', `D=${dutyRaw}`, w / 2, 14, 'time-axis');
  const carrier = specGet(spec, 'carrier');
  if (carrier) label(b, 'carrier-label', carrier, 28, h - 8, 'carrier-0');
  const frequency = specGet(spec, 'frequency');
  if (frequency) label(b, 'frequency-label', frequency, w / 2, h - 8, 'time-axis');
  const phase = specGet(spec, 'phase');
  if (phase) label(b, 'phase-label', `phase=${phase}`, w - 36, 24, 'time-axis');
  const signal = specGet(spec, 'signal');
  if (signal) label(b, 'signal-label', signal, 28, y - 22, 'pulse-0');
  const kind = specGet(spec, 'kind');
  if (kind) label(b, 'kind-label', kind, w - 34, 14, 'time-axis');
  return layoutAndCompile(b.scene());
}

export function compileXfmr(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('xfmr', ctx, spec);
  const { width: w, height: h } = b;
  const cx = w / 2;
  const top = 34;
  const bottom = h - 34;
  b.path('p', `M ${cx - 28} ${top} q 12 12 0 24 q -12 12 0 24 q 12 12 0 24 q -12 12 0 24`, { width: 1.8, role: 'geometry' });
  b.path('s', `M ${cx + 28} ${top} q -12 12 0 24 q 12 12 0 24 q -12 12 0 24 q 12 12 0 24`, { width: 1.8, role: 'geometry' });
  b.line('core-left', cx - 7, top - 8, cx - 7, bottom + 8, { width: 2.2, role: 'boundary' });
  b.line('core-right', cx + 7, top - 8, cx + 7, bottom + 8, { width: 2.2, role: 'boundary' });
  b.line('primary-top', cx - 28, top, 28, top, { width: 1.2, role: 'connector' });
  b.line('primary-bottom', cx - 28, bottom, 28, bottom, { width: 1.2, role: 'connector' });
  b.line('secondary-top', cx + 28, top, w - 28, top, { width: 1.2, role: 'connector' });
  b.line('secondary-bottom', cx + 28, bottom, w - 28, bottom, { width: 1.2, role: 'connector' });
  label(b, 'primary-label', specGet(spec, 'primary') ?? 'primary', 32, top - 10, 'p');
  label(b, 'secondary-label', specGet(spec, 'secondary') ?? 'secondary', w - 32, top - 10, 's');
  const turns = specGet(spec, 'turns');
  if (turns) label(b, 'turns-label', `turns=${turns}`, cx, h - 10, 'core-left');
  const kind = specGet(spec, 'kind');
  if (kind) label(b, 'kind-label', kind, cx, h - 10, 'core-right');
  const polarity = specGet(spec, 'polarity');
  if (polarity) {
    b.circle('polarity-primary', cx - 34, top + 12, 3, { fill: 'solid', color: 'accent', role: 'annotation' });
    b.circle('polarity-secondary', cx + 34, top + 12, 3, { fill: 'solid', color: 'accent', role: 'annotation' });
    label(b, 'polarity-label', polarity, cx, 16, 'polarity-primary');
  }
  const phase = specGet(spec, 'phase');
  if (phase) label(b, 'phase-label', `phase=${phase}`, cx, 28, 'core-right');
  return layoutAndCompile(b.scene());
}

export function compileConstel(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const rawSymbols = valueOr(spec, ['symbols', 'points']);
  if (!rawSymbols) return malformed('constel', 'requires symbols or points');
  const symbols = parseCsv(rawSymbols);
  if (!symbols.length) return malformed('constel', 'requires at least one symbol');
  const b = frame('constel', ctx, spec);
  const { width: w, height: h } = b;
  const cx = w / 2;
  const cy = h / 2;
  b.line('i-axis', 22, cy, w - 22, cy, { markerEnd: true, color: 'muted', role: 'axis' });
  b.line('q-axis', cx, h - 20, cx, 20, { markerEnd: true, color: 'muted', role: 'axis' });
  const cols = Math.max(1, Math.ceil(Math.sqrt(symbols.length)));
  const spacing = Math.min(34, (w - 74) / Math.max(1, cols));
  symbols.forEach((symbol, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = cx + (col - (cols - 1) / 2) * spacing;
    const y = cy + (row - (Math.ceil(symbols.length / cols) - 1) / 2) * spacing;
    b.circle(`symbol-${i}`, x, y, 3.5, { fill: 'solid', color: 'accent', role: 'geometry' });
    label(b, `symbol-label-${i}`, symbol, x, y - 9, `symbol-${i}`);
  });
  const mapping = specGet(spec, 'mapping');
  if (mapping) label(b, 'mapping-label', mapping, 26, 16, 'i-axis');
  const modulation = specGet(spec, 'modulation');
  if (modulation) label(b, 'modulation-label', modulation, w - 28, 16, 'q-axis');
  const axis = specGet(spec, 'axis');
  if (axis) label(b, 'axis-label', axis, w / 2, h - 8, 'i-axis');
  const m = specGet(spec, 'm');
  if (m) label(b, 'order-label', `M=${m}`, w - 28, h - 8, 'q-axis');
  return layoutAndCompile(b.scene());
}

export function compileEye(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const signal = specGet(spec, 'signal');
  if (!signal) return malformed('eye', 'requires signal');
  const b = frame('eye', ctx, spec);
  const { width: w, height: h } = b;
  const mid = h / 2;
  b.line('time-axis', 26, mid, w - 26, mid, { color: 'guide', role: 'axis' });
  b.line('threshold', 26, mid - 2, w - 26, mid - 2, { color: 'muted', dash: true, role: 'dimension' });
  b.path('eye-upper', `M 30 ${mid} Q ${w / 2} ${mid - 46} ${w - 30} ${mid}`, { color: 'accent', width: 1.5, role: 'geometry' });
  b.path('eye-lower', `M 30 ${mid} Q ${w / 2} ${mid + 46} ${w - 30} ${mid}`, { color: 'accent', width: 1.5, role: 'geometry' });
  label(b, 'signal-label', signal, 30, 16, 'eye-upper');
  const unit = specGet(spec, 'unit');
  if (unit) label(b, 'unit-label', unit, w - 28, h - 8, 'time-axis');
  const mask = specGet(spec, 'mask');
  if (mask) {
    b.path('mask-upper', `M 92 ${mid} Q ${w / 2} ${mid - 24} ${w - 92} ${mid}`, { color: 'danger', dash: true, role: 'boundary' });
    b.path('mask-lower', `M 92 ${mid} Q ${w / 2} ${mid + 24} ${w - 92} ${mid}`, { color: 'danger', dash: true, role: 'boundary' });
    label(b, 'mask-label', `mask=${mask}`, w / 2, 18, 'mask-upper');
  }
  const threshold = specGet(spec, 'threshold');
  if (threshold) label(b, 'threshold-label', `threshold=${threshold}`, 28, mid - 18, 'threshold');
  const caption = specGet(spec, 'label');
  if (caption) label(b, 'annotation-label', caption, w / 2, h - 8, 'time-axis');
  const kind = specGet(spec, 'kind');
  if (kind) label(b, 'kind-label', kind, 28, h - 8, 'time-axis');
  return layoutAndCompile(b.scene());
}

export function compileCmos(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const missing = required(spec, 'cmos', ['pmos', 'nmos', 'input', 'output', 'supply', 'gnd']);
  if (missing) return missing;
  const b = frame('cmos', ctx, spec);
  const { width: w, height: h } = b;
  const cx = w / 2;
  b.line('supply-rail', 42, 20, w - 42, 20, { width: 1.5, role: 'boundary' });
  b.line('ground-rail', 42, h - 20, w - 42, h - 20, { width: 1.5, role: 'boundary' });
  b.rect('pmos', cx - 18, 30, 36, 34, { fill: 'none', color: 'accent', role: 'geometry' });
  b.rect('nmos', cx - 18, h - 64, 36, 34, { fill: 'none', color: 'accent', role: 'geometry' });
  b.line('input', 48, h / 2, cx - 18, h / 2, { width: 1.6, role: 'connector' });
  b.line('gate', cx - 18, h / 2 - 30, cx - 18, h / 2 + 30, { width: 1.6, role: 'geometry' });
  b.line('output-junction', cx + 18, 64, cx + 18, h - 64, { width: 1.6, role: 'connector' });
  b.line('output', cx + 18, h / 2, w - 28, h / 2, { width: 1.6, role: 'connector', markerEnd: true });
  b.line('p-connection', cx, 20, cx, 30, { width: 1.4, role: 'connector' });
  b.line('n-connection', cx, h - 64, cx, h - 20, { width: 1.4, role: 'connector' });
  label(b, 'pmos-label', specGet(spec, 'pmos')!, cx + 28, 46, 'pmos');
  label(b, 'nmos-label', specGet(spec, 'nmos')!, cx + 28, h - 48, 'nmos');
  label(b, 'input-label', specGet(spec, 'input')!, 48, h / 2 - 12, 'input');
  label(b, 'output-label', specGet(spec, 'output')!, w - 28, h / 2 - 12, 'output');
  label(b, 'supply-label', specGet(spec, 'supply')!, w - 34, 14, 'supply-rail');
  label(b, 'ground-label', specGet(spec, 'gnd')!, w - 34, h - 8, 'ground-rail');
  const kind = specGet(spec, 'kind');
  if (kind) label(b, 'kind-label', kind, cx, h - 8, 'output');
  return layoutAndCompile(b.scene());
}

export function compileMotor(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const render = specGet(spec, 'render')?.toLowerCase() ?? '';
  const hidden = specGet(spec, 'hidden-lines')?.toLowerCase() ?? '';
  if (/photo|3d|perspective|arbitrary/.test(`${render} ${hidden}`)) {
    return { ok: false, code: 'refused', reason: 'motor photographic or arbitrary 3D geometry is out of scope' };
  }
  const missing = required(spec, 'motor', ['stator', 'rotor']);
  if (missing) return missing;
  const b = frame('motor', ctx, spec);
  const { width: w, height: h } = b;
  const cx = w * 0.42;
  const cy = h / 2;
  b.circle('stator', cx, cy, 46, { fill: 'none', color: 'accent', width: 1.8, role: 'boundary' });
  b.circle('rotor', cx, cy, 22, { fill: 'none', role: 'geometry' });
  b.line('shaft', cx + 22, cy, w - 28, cy, { width: 2, role: 'connector' });
  label(b, 'stator-label', specGet(spec, 'stator')!, cx - 44, cy - 52, 'stator');
  label(b, 'rotor-label', specGet(spec, 'rotor')!, cx, cy + 12, 'rotor');
  const phases = parseCsv(specGet(spec, 'phases') ?? '');
  phases.forEach((phase, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, phases.length);
    const x = cx + Math.cos(angle) * 34;
    const y = cy + Math.sin(angle) * 34;
    b.line(`phase-${i}`, cx + Math.cos(angle) * 22, cy + Math.sin(angle) * 22, x, y, { width: 1.4, color: 'muted', role: 'connector' });
    label(b, `phase-label-${i}`, phase, x, y, `phase-${i}`);
  });
  const torque = specGet(spec, 'torque');
  if (torque) label(b, 'torque-label', `torque=${torque}`, w - 28, cy - 22, 'shaft');
  const feedback = specGet(spec, 'feedback');
  if (feedback) {
    b.line('feedback', w - 28, cy + 20, cx + 22, cy + 20, { width: 1.4, color: 'accent', role: 'connector', markerEnd: true });
    label(b, 'feedback-label', `feedback=${feedback}`, w - 42, cy + 34, 'feedback');
  }
  const supply = specGet(spec, 'supply');
  if (supply) label(b, 'supply-label', supply, 30, 16, 'stator');
  return layoutAndCompile(b.scene());
}

export function compileDq(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const missing = required(spec, 'dq', ['reference', 'axes', 'vector', 'transform', 'angle']);
  if (missing) return missing;
  const b = frame('dq', ctx, spec);
  const { width: w, height: h } = b;
  const cx = w / 2;
  const cy = h / 2 + 12;
  b.line('d-axis', cx, cy, w - 36, cy, { markerEnd: true, color: 'accent', role: 'axis' });
  b.line('q-axis', cx, cy, cx, 28, { markerEnd: true, color: 'danger', role: 'axis' });
  b.line('reference-axis', cx, cy, cx + 58, cy - 42, { markerEnd: true, color: 'muted', dash: true, role: 'axis' });
  b.arc('angle', cx, cy, 30, 30, -36, 0, { color: 'muted', role: 'dimension' });
  label(b, 'axes-label', specGet(spec, 'axes')!, w - 32, cy - 10, 'd-axis');
  label(b, 'reference-label', specGet(spec, 'reference')!, cx + 64, cy - 48, 'reference-axis');
  label(b, 'vector-label', specGet(spec, 'vector')!, cx + 40, cy - 24, 'reference-axis');
  label(b, 'transform-label', specGet(spec, 'transform')!, 30, 18, 'q-axis');
  label(b, 'angle-label', specGet(spec, 'angle')!, 30, h - 8, 'angle');
  const kind = specGet(spec, 'kind');
  if (kind) label(b, 'kind-label', kind, w - 32, h - 8, 'd-axis');
  return layoutAndCompile(b.scene());
}

function compileSeqnet(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const states = specGetAll(spec, 'state').map((s) => s.trim()).filter(Boolean);
  const transitions = specGetAll(spec, 'transition');
  if (!states.length || !transitions.length) return malformed('seqnet', 'requires state and transition entries');
  const initial = specGet(spec, 'initial')?.trim();
  const terminal = specGet(spec, 'terminal')?.trim();
  for (const marker of [initial, terminal]) {
    if (marker && !states.some((state) => state.toLowerCase() === marker.toLowerCase())) states.push(marker);
  }
  for (const raw of transitions) {
    const pair = firstWords(raw);
    if (!pair || !states.some((state) => state.toLowerCase() === pair.a.toLowerCase()) || !states.some((state) => state.toLowerCase() === pair.b.toLowerCase())) {
      return malformed('seqnet', `invalid transition ${raw}`);
    }
  }
  const b = frame('seqnet', ctx, spec);
  const { width: w, height: h } = b;
  const positions = new Map<string, { x: number; y: number }>();
  states.forEach((state, i) => {
    const x = 30 + i * ((w - 60) / Math.max(1, states.length - 1));
    const y = h / 2;
    positions.set(state.toLowerCase(), { x, y });
    b.rect(`state-${i}`, x - 22, y - 14, 44, 28, { fill: 'none', color: 'accent', role: 'boundary' });
    label(b, `state-label-${i}`, state, x, y + 4, `state-${i}`);
  });
  transitions.forEach((raw, i) => {
    const pair = firstWords(raw);
    if (!pair) return;
    const a = positions.get(pair.a.toLowerCase());
    const z = positions.get(pair.b.toLowerCase());
    if (!a || !z) return;
    b.line(`transition-${i}`, a.x + 22, a.y - 18 - i * 2, z.x - 22, z.y - 18 - i * 2, { width: 1.4, color: 'accent', role: 'connector', markerEnd: true });
    const detail = raw.replace(/^(\S+)\s*(?:->|=>)?\s*(\S+)\s*/, '').trim();
    if (detail) label(b, `transition-label-${i}`, detail, (a.x + z.x) / 2, a.y - 34 - i * 2, `transition-${i}`);
  });
  if (initial) label(b, 'initial-label', `initial=${initial}`, 28, 16, 'state-0');
  if (terminal) label(b, 'terminal-label', `terminal=${terminal}`, w - 34, h - 8, `state-${states.length - 1}`);
  const order = specGet(spec, 'order');
  if (order) label(b, 'order-label', order, w / 2, h - 8, 'transition-0');
  const kind = specGet(spec, 'kind');
  if (kind) label(b, 'kind-label', kind, w / 2, 16, 'transition-0');
  return layoutAndCompile(b.scene());
}

export { compileSeqnet };
