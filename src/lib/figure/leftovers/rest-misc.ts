import type { CompileCtx, CompileResult } from '../types';
import { specGet, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

function frame(family: string, ctx: CompileCtx, spec: SpecDoc): SceneBuilder {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder(family, w, h);
  b.hl(spec.highlight);
  return b;
}

export function compileGeneric(family: string, spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame(family, ctx, spec);
  const { width: w, height: h } = b;
  const boxW = Math.min(150, w * 0.46);
  const boxH = Math.min(58, h * 0.38);
  const bx = (w - boxW) / 2;
  const by = Math.max(36, (h - boxH) / 2 - 6);
  b.rect('apparatus', bx, by, boxW, boxH, { fill: 'none', width: 1.6 });
  b.line('stand', bx + boxW / 2, by + boxH, bx + boxW / 2, by + boxH + 14, { width: 1.4 });
  b.line('base', bx + 16, by + boxH + 14, bx + boxW - 16, by + boxH + 14, { width: 1.6 });
  b.label('fam', family, w / 2, 16, { protected: true });

  const skip = new Set(['caption', 'kind', 'std', 'highlight']);
  const params: { k: string; v: string }[] = [];
  for (const [k, vals] of spec.values) {
    if (skip.has(k)) continue;
    const orig = spec.originals.get(k) ?? k;
    params.push({ k: orig, v: vals[0] ?? '' });
    if (params.length >= 8) break;
  }
  const anchors: { x: number; y: number; slot: 'W' | 'E' | 'S' | 'N' }[] = [
    { x: 18, y: by + 10, slot: 'W' },
    { x: w - 18, y: by + 10, slot: 'E' },
    { x: 18, y: by + boxH - 6, slot: 'W' },
    { x: w - 18, y: by + boxH - 6, slot: 'E' },
    { x: w / 2 - 48, y: h - 14, slot: 'S' },
    { x: w / 2 + 48, y: h - 14, slot: 'S' },
    { x: w / 2 - 48, y: 30, slot: 'N' },
    { x: w / 2 + 48, y: 30, slot: 'N' },
  ];
  params.forEach((p, i) => {
    const pos = anchors[i] ?? { x: 20 + i * 10, y: h - 14, slot: 'S' as const };
    b.label(p.k, `${p.k}=${p.v}`, pos.x, pos.y, { slot: pos.slot });
  });
  return layoutAndCompile(b.scene());
}

export function compileFrost(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const rawN = specGet(spec, 'n')?.trim();
  const rawE = specGet(spec, 'e')?.trim();
  if (!rawN || !/^[+-]?\d+$/.test(rawN)) return { ok: false, code: 'malformed', reason: 'frost n must be an integer' };
  if (!rawE || !/^[+-]?\d+$/.test(rawE)) return { ok: false, code: 'malformed', reason: 'frost e must be an integer' };
  const n = Number(rawN);
  const e = Number(rawE);
  if (!Number.isSafeInteger(n) || n < 3 || n > 12) return { ok: false, code: 'malformed', reason: 'frost n must be an integer from 3 through 12' };
  if (!Number.isSafeInteger(e) || e < 0 || e > 2 * n) return { ok: false, code: 'malformed', reason: `frost e must be an integer from 0 through ${2 * n}` };
  const b = frame('frost', ctx, spec);
  const { width: w, height: h } = b;
  const cx = w / 2;
  const cy = h * 0.58;
  const r = Math.min(42, Math.max(28, (h - 62) * 0.34));
  const vertices: Array<{ x: number; y: number; index: number }> = [];
  for (let i = 0; i < n; i++) {
    const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
    vertices.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), index: i });
  }
  b.polygon('frost-orbitals', vertices.flatMap((point) => [point.x, point.y]), { fill: 'none', role: 'geometry' });
  b.circle('frost-circle', cx, cy, r, { color: 'guide', role: 'guide' });
  b.line('frost-zero-energy', cx - r - 10, cy, cx + r + 10, cy, { color: 'muted', role: 'axis', dash: true });
  b.label('frost-ring-size', `n=${n}`, cx, 14, { protected: true, priority: 'required' });
  b.label('frost-electron-count', `e=${e}`, cx, 28, { protected: true, priority: 'required' });

  vertices.forEach((point, index) => {
    const dx = point.x - cx;
    const dy = point.y - cy;
    const length = Math.hypot(dx, dy) || 1;
    const orbitalX = point.x + (dx / length) * 9;
    const orbitalY = point.y + (dy / length) * 9;
    b.label(`frost-orbital-${index + 1}`, `π${index + 1}`, orbitalX, orbitalY, {
      anchorId: 'frost-orbitals',
      priority: 'preferred',
    });
  });

  let remaining = e;
  const fillingOrder = [...vertices].sort((a, b) => b.y - a.y || a.x - b.x);
  let electronIndex = 0;
  for (const orbital of fillingOrder) {
    const occupancy = Math.min(2, remaining);
    remaining -= occupancy;
    for (let slot = 0; slot < occupancy; slot++) {
      const direction = slot === 0 ? -1 : 1;
      b.label(`frost-electron-${electronIndex + 1}`, direction < 0 ? '↑' : '↓', orbital.x + direction * 6, orbital.y - 4, {
        anchorId: 'frost-orbitals',
        protected: true,
        priority: 'required',
      });
      electronIndex += 1;
    }
    if (remaining === 0) break;
  }
  return layoutAndCompile(b.scene());
}
