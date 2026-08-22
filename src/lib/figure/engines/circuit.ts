import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

interface Device {
  id: string;
  kind: string;
  n1: string;
  n2: string;
  n3?: string;
  value?: string;
}

const DEVICE_RE = /^([A-Za-z]{1,4}\d*|[A-Za-z]+)$/;

function parseNetlist(spec: SpecDoc): Device[] {
  const skip = new Set(['std', 'probe', 'highlight', 'caption', 'kind']);
  const devices: Device[] = [];
  for (const [key, vals] of spec.values) {
    if (skip.has(key)) continue;
    if (!DEVICE_RE.test(key) && !/^[vrilcqdguem]\w*/i.test(key)) continue;
    const raw = vals[0] ?? '';
    const parts = raw.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const letter = key[0]!.toLowerCase();
    devices.push({
      id: spec.originals.get(key) ?? key,
      kind: letter,
      n1: parts[0]!,
      n2: parts[1]!,
      n3: parts[2] && !/^(dc|ac|pulse)/i.test(parts[2]) ? parts[2] : undefined,
      value: parts.slice(parts[2] && /^(dc|ac)/i.test(parts[2]) ? 3 : 2).join(' ') || parts[2],
    });
  }
  return devices;
}

function resistorGlyph(x: number, y: number, horiz: boolean): number[] {
  if (horiz) {
    return [x - 18, y, x - 12, y - 6, x - 6, y + 6, x, y - 6, x + 6, y + 6, x + 12, y];
  }
  return [x, y - 18, x - 6, y - 12, x + 6, y - 6, x - 6, y, x + 6, y + 6, x, y + 12];
}

export function compileCircuit(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const devices = parseNetlist(spec);
  if (!devices.length) return { ok: false, code: 'malformed', reason: 'circuit needs devices' };
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('circuit', w, h);
  b.hl(spec.highlight);

  const nodes = new Set<string>();
  for (const d of devices) {
    nodes.add(d.n1);
    nodes.add(d.n2);
    if (d.n3) nodes.add(d.n3);
  }
  const gnd = [...nodes].find((n) => /^(0|gnd|ground)$/i.test(n)) ?? '0';
  const vcc = [...nodes].find((n) => /vcc|vdd|supply/i.test(n));
  const rest = [...nodes].filter((n) => n !== gnd && n !== vcc);
  const colCount = Math.max(2, Math.min(devices.length, 5));
  const nodeY = new Map<string, number>();
  nodeY.set(gnd, h - 22);
  if (vcc) nodeY.set(vcc, 22);
  rest.forEach((n, i) => nodeY.set(n, 40 + ((i + 1) * (h - 70)) / (rest.length + 1)));

  const nodeX = new Map<string, number>();
  [...nodes].forEach((n, i) => {
    nodeX.set(n, 36 + (i * (w - 72)) / Math.max(1, nodes.size - 1));
  });
  // Signal left→right: first device n1 left-ish.
  if (devices[0]) nodeX.set(devices[0].n1, 40);

  devices.forEach((d, i) => {
    const x = 50 + (i % colCount) * ((w - 70) / colCount);
    const y1 = nodeY.get(d.n1) ?? h / 2;
    const y2 = nodeY.get(d.n2) ?? h / 2;
    const y = (y1 + y2) / 2;
    const horiz = Math.abs(y1 - y2) < 8;
    if (d.kind === 'r') {
      const zig = resistorGlyph(x, y, horiz);
      b.polyline(d.id, zig, { color: 'neutral', width: 1.8 });
    } else if (d.kind === 'c') {
      b.line(`${d.id}a`, x - 6, y - 12, x - 6, y + 12, { width: 2 });
      b.line(`${d.id}b`, x + 6, y - 12, x + 6, y + 12, { width: 2 });
    } else if (d.kind === 'l') {
      b.path(d.id, `M ${x} ${y - 16} q 8 8 0 16 q -8 8 0 16`, { color: 'neutral', width: 1.8 });
    } else if (d.kind === 'v' || d.kind === 'i') {
      b.circle(d.id, x, y, 12, { color: 'neutral' });
      b.label(`${d.id}pm`, d.kind === 'v' ? '±' : '↑', x, y, { protected: true });
    } else if (d.kind === 'd') {
      b.polygon(d.id, [x - 8, y - 10, x - 8, y + 10, x + 8, y], { fill: 'none' });
      b.line(`${d.id}bar`, x + 8, y - 10, x + 8, y + 10, { width: 2 });
    } else {
      b.rect(d.id, x - 16, y - 10, 32, 20, { fill: 'solid' });
    }
    const xTop = x;
    const xBot = x;
    b.line(`${d.id}-w1`, xTop, Math.min(y1, y) - (horiz ? 0 : 16), nodeX.get(d.n1) ?? x, y1, { width: 1.2 });
    b.line(`${d.id}-w2`, xBot, Math.max(y2, y) + (horiz ? 0 : 16), nodeX.get(d.n2) ?? x, y2, { width: 1.2 });
    b.circle(`${d.id}-j1`, nodeX.get(d.n1) ?? x, y1, 2, { fill: 'solid' });
    b.circle(`${d.id}-j2`, nodeX.get(d.n2) ?? x, y2, 2, { fill: 'solid' });
    b.label(d.id, d.id.toUpperCase(), x, y - 22, { slot: 'N', protected: true });
    if (d.value) b.label(`${d.id}-val`, d.value, x, y + 22, { slot: 'S', protected: true });
  });

  b.line('gndrail', 24, h - 22, w - 24, h - 22, { color: 'muted', width: 1.2 });
  b.label('gndl', 'GND', 28, h - 10, { protected: true });
  if (vcc) {
    b.line('vccrail', 24, 22, w - 24, 22, { color: 'muted', width: 1.2 });
    b.label('vccl', vcc.toUpperCase(), 28, 12, { protected: true });
  }

  const probe = specGet(spec, 'probe');
  if (probe) {
    const m = /([A-Za-z0-9]+)\s*=\s*([A-Za-z0-9_]+)/.exec(probe);
    if (m) b.label(m[1]!, m[1]!, (nodeX.get(m[2]!) ?? w / 2) + 8, (nodeY.get(m[2]!) ?? h / 2) - 10, { slot: 'NE' });
  }

  return layoutAndCompile(b.scene());
}

export { parseNetlist };
