import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

export function compileScene(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const kind = (specGet(spec, 'kind') ?? 'fbd').toLowerCase();
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('scene', w, h);
  b.hl(spec.highlight);

  if (kind === 'fbd') {
    const deg = specNumber(spec, 'incline_deg', 0) ?? 0;
    const rad = (deg * Math.PI) / 180;
    const cx = w * 0.45;
    const cy = h * 0.55;
    if (deg) {
      const len = 140;
      const x1 = cx - Math.cos(rad) * 70;
      const y1 = cy + Math.sin(rad) * 70;
      b.line('incline', x1, y1, x1 + Math.cos(rad) * len, y1 - Math.sin(rad) * len, { width: 2 });
    }
    b.rect('body', cx - 16, cy - 16, 32, 32, { fill: 'solid', color: 'neutral' });
    b.label('bodyname', specGet(spec, 'body') ?? 'body', cx, cy + 28, { slot: 'S', protected: true });

    const forceDir: Record<string, { dx: number; dy: number }> = {
      down: { dx: 0, dy: 40 },
      up: { dx: 0, dy: -40 },
      left: { dx: -40, dy: 0 },
      right: { dx: 40, dy: 0 },
      'up_incline': { dx: Math.cos(rad) * 40, dy: -Math.sin(rad) * 40 },
      'down_incline': { dx: -Math.cos(rad) * 40, dy: Math.sin(rad) * 40 },
      'normal+': { dx: -Math.sin(rad) * 40, dy: -Math.cos(rad) * 40 },
      weight: { dx: 0, dy: 40 },
    };

    specGetAll(spec, 'force').forEach((raw, i) => {
      const parts = raw.trim().split(/\s+/);
      const name = parts[0] ?? `F${i}`;
      const dir = (parts[1] ?? 'down').toLowerCase();
      const vec = forceDir[dir] ?? forceDir.down!;
      const x2 = cx + vec.dx;
      const y2 = cy + vec.dy;
      b.line(`force-${name}`, cx, cy, x2, y2, { markerEnd: true, color: 'accent', width: 1.8 });
      b.label(name, name, (cx + x2) / 2, (cy + y2) / 2, { slot: 'NE', anchorId: `force-${name}` });
    });

    const axes = specGet(spec, 'axes');
    if (axes) {
      b.line('ax', cx + 50, cy + 10, cx + 90, cy + 10 - Math.sin(rad) * 20, { markerEnd: true, color: 'muted' });
      b.line('ay', cx + 50, cy + 10, cx + 50 - Math.sin(rad) * 20, cy + 10 - 40, { markerEnd: true, color: 'muted' });
      b.label('axl', 'x', cx + 96, cy + 10, { slot: 'E', protected: true });
      b.label('ayl', 'y', cx + 50, cy - 36, { slot: 'N', protected: true });
    }
  } else if (kind === 'ray' || kind === 'optics') {
    const f = specNumber(spec, 'f', 40) ?? 40;
    const do_ = specNumber(spec, 'do', 80) ?? 80;
    const di = do_ === f ? 200 : (f * do_) / (do_ - f);
    const axisY = h / 2;
    const lensX = w * 0.5;
    b.line('axis', 16, axisY, w - 16, axisY, { color: 'guide', dash: true });
    b.line('lens', lensX, 24, lensX, h - 24, { color: 'neutral', width: 2 });
    b.label('F', 'F', lensX + f, axisY + 14, { protected: true });
    b.label('2F', '2F', lensX + 2 * f, axisY + 14, { protected: true });
    b.label('Fm', 'F', lensX - f, axisY + 14, { protected: true });
    const ho = specNumber(spec, 'ho', 24) ?? 24;
    const objX = lensX - do_;
    b.line('object', objX, axisY, objX, axisY - ho, { markerEnd: true, color: 'accent' });
    b.label('objectl', 'object', objX, axisY - ho - 8, { slot: 'N' });
    const hi = -ho * (di / do_);
    const imgX = lensX + di;
    b.line('image', imgX, axisY, imgX, axisY - hi, { markerEnd: true, color: 'muted', dash: di < 0 });
    b.line('ray1', objX, axisY - ho, lensX, axisY - ho, { markerEnd: true, color: 'accent' });
    b.line('ray1b', lensX, axisY - ho, lensX + f * 2, axisY, { color: 'accent' });
    b.line('ray2', objX, axisY - ho, lensX, axisY, { markerEnd: true, color: 'muted' });
  } else if (kind === 'field') {
    const drawn = drawFieldCatalog(b, spec, w, h);
    if (!drawn.ok) return drawn;
  } else if (kind === 'geom' || kind === 'geometry') {
    b.polygon('tri', [w * 0.2, h * 0.75, w * 0.8, h * 0.75, w * 0.5, h * 0.2], { color: 'neutral' });
    b.label('A', 'A', w * 0.2, h * 0.75, { slot: 'SW' });
    b.label('B', 'B', w * 0.8, h * 0.75, { slot: 'SE' });
    b.label('C', 'C', w * 0.5, h * 0.2, { slot: 'N' });
  } else {
    b.rect('part', 40, 40, w - 80, h - 80, { color: 'neutral' });
    specGetAll(spec, 'part').forEach((p, i) => {
      b.label(`part${i}`, p, 50 + i * 40, 50, { slot: 'E' });
    });
  }

  return layoutAndCompile(b.scene());
}

type FieldCatalog = 'dipole' | 'parallel-plate' | 'wire' | 'solenoid' | 'te10';

export function normalizeFieldCatalog(raw: string | undefined): FieldCatalog | null {
  if (!raw) return null;
  const t = raw
    .trim()
    .split(/[\s,;]/)[0]!
    .toLowerCase()
    .replace(/_/g, '-');
  if (t === 'dipole' || t === 'electric-dipole') return 'dipole';
  if (t === 'parallel-plate' || t === 'parallelplate' || t === 'plates') return 'parallel-plate';
  if (t === 'wire' || t === 'long-wire' || t === 'infinite-wire') return 'wire';
  if (t === 'solenoid' || t === 'coil') return 'solenoid';
  if (t === 'te10' || t === 'te-10' || t === 'waveguide') return 'te10';
  return null;
}

function drawFieldCatalog(
  b: SceneBuilder,
  spec: SpecDoc,
  w: number,
  h: number,
): CompileResult | { ok: true } {
  const raw = specGet(spec, 'catalog') ?? (specGet(spec, 'core') ? 'solenoid' : undefined);
  const cat = normalizeFieldCatalog(raw);
  if (!cat) {
    return {
      ok: false,
      code: 'malformed',
      reason: 'field needs catalog: dipole|parallel-plate|wire|solenoid|TE10',
    };
  }

  if (cat === 'dipole') {
    b.circle('plus', w * 0.32, h / 2, 8, { color: 'danger', fill: 'none' });
    b.circle('minus', w * 0.68, h / 2, 8, { color: 'accent', fill: 'none' });
    b.label('plusl', '+', w * 0.32, h / 2, { protected: true });
    b.label('minusl', '−', w * 0.68, h / 2, { protected: true });
    for (let i = 0; i < 5; i++) {
      const y = 28 + i * ((h - 48) / 4);
      b.path(`fl${i}`, `M ${w * 0.36} ${h / 2} Q ${w * 0.5} ${y} ${w * 0.64} ${h / 2}`, {
        color: 'muted',
        markerEnd: true,
      });
    }
    return { ok: true };
  }

  if (cat === 'parallel-plate') {
    b.rect('plate1', 70, 28, 10, h - 52, { fill: 'muted', width: 1.4 });
    b.rect('plate2', w - 80, 28, 10, h - 52, { fill: 'muted', width: 1.4 });
    for (let i = 0; i < 5; i++) {
      const y = 40 + i * ((h - 70) / 4);
      b.line(`E${i}`, 88, y, w - 88, y, { markerEnd: true, color: 'accent', width: 1.4 });
    }
    b.label('plusl', '+', 75, 18, { protected: true });
    b.label('minusl', '−', w - 75, 18, { protected: true });
    return { ok: true };
  }

  if (cat === 'wire') {
    const cx = w / 2;
    const cy = h / 2;
    b.circle('wire', cx, cy, 8, { fill: 'muted', width: 1.6 });
    b.line('cur1', cx - 4, cy - 4, cx + 4, cy + 4, { width: 1.4 });
    b.line('cur2', cx - 4, cy + 4, cx + 4, cy - 4, { width: 1.4 });
    for (let i = 0; i < 4; i++) {
      const r = 18 + i * 12;
      b.circle(`B${i}`, cx, cy, r, { color: 'guide', width: 1 });
    }
    b.path('Btan', `M ${cx + 30} ${cy - 6} A 30 30 0 0 1 ${cx + 6} ${cy + 30}`, {
      color: 'accent',
      markerEnd: true,
      width: 1.4,
    });
    b.label('I', 'I', cx, cy - 16, { protected: true });
    return { ok: true };
  }

  if (cat === 'te10') {
    const x0 = 36;
    const y0 = 28;
    const bw = w - 72;
    const bh = h - 52;
    b.rect('guide', x0, y0, bw, bh, { width: 1.6 });
    for (let i = 1; i <= 7; i++) {
      const x = x0 + (i * bw) / 8;
      const amp = Math.sin((Math.PI * i) / 8);
      const half = Math.max(8, amp * (bh * 0.38));
      b.line(`E${i}`, x, y0 + bh / 2 + half, x, y0 + bh / 2 - half, {
        markerEnd: true,
        color: 'accent',
        width: 1.4,
      });
    }
    b.label('TE10', 'TE10', w / 2, 16, { protected: true });
    return { ok: true };
  }

  // solenoid — shaded cylindrical core, coil wraps, interior B, H same direction.
  const coreX = 48;
  const coreY = 46;
  const coreW = w - 88;
  const coreH = h - 78;
  b.rect('core', coreX, coreY, coreW, coreH, { fill: 'muted', color: 'neutral', width: 1.4 });
  const hatchN = 8;
  for (let i = 0; i < hatchN; i++) {
    const x0 = coreX + 6 + (i * (coreW - 20)) / (hatchN - 1);
    b.line(`core-hatch${i}`, x0, coreY + 4, x0 + 16, coreY + coreH - 4, { color: 'neutral', width: 0.7 });
  }
  const wraps = 6;
  for (let i = 0; i < wraps; i++) {
    const cx = coreX + 18 + (i * (coreW - 36)) / (wraps - 1);
    b.ellipse(`wrap${i}`, cx, coreY + coreH / 2, 8, coreH / 2 + 12, { color: 'neutral' });
  }
  const bYs = [coreY + coreH * 0.28, coreY + coreH * 0.45, coreY + coreH * 0.62];
  bYs.forEach((y, i) => {
    const id = i === 1 ? 'B' : `B${i}`;
    b.line(id, coreX + 14, y, coreX + coreW - 14, y, { markerEnd: true, color: 'accent', width: 1.6 });
  });
  const hy = coreY + coreH * 0.82;
  b.line('H', coreX + 14, hy, coreX + coreW - 28, hy, { markerEnd: true, color: 'danger', width: 1.8 });

  const coreRaw = specGet(spec, 'core') ?? specGet(spec, 'mu_r') ?? 'mu_r=400';
  const mur = /mu_r\s*=\s*(\S+)/i.exec(coreRaw)?.[1] ?? coreRaw.replace(/^mu_r\s*=\s*/i, '');
  const bRaw = specGet(spec, 'b') ?? '1.0 T';
  const hRaw = specGet(spec, 'h') ?? '?';
  b.label('mu_r', `μ_r=${mur}`, coreX + coreW / 2, coreY - 10, { protected: true });
  b.label('B-val', `B=${bRaw}`, coreX + coreW - 8, bYs[1]! - 10, { slot: 'E', protected: true });
  b.label('H-val', `H=${hRaw}`, coreX + coreW - 8, hy + 12, { slot: 'E', protected: true });
  return { ok: true };
}
