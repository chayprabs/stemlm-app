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
    const catalog = specGet(spec, 'catalog') ?? specGet(spec, 'kind') ?? 'dipole';
    b.label('fieldkind', catalog, w / 2, 14, { protected: true });
    if (/dipole/i.test(catalog)) {
      b.circle('plus', w * 0.35, h / 2, 8, { color: 'danger', fill: 'none' });
      b.circle('minus', w * 0.65, h / 2, 8, { color: 'accent', fill: 'none' });
      b.label('plusl', '+', w * 0.35, h / 2, { protected: true });
      b.label('minusl', '−', w * 0.65, h / 2, { protected: true });
      for (let i = 0; i < 5; i++) {
        const y = 40 + i * 20;
        b.path(`fl${i}`, `M ${w * 0.38} ${h / 2} Q ${w * 0.5} ${y} ${w * 0.62} ${h / 2}`, {
          color: 'muted',
          markerEnd: true,
        });
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const y = 30 + i * 20;
        b.line(`fl${i}`, 40, y, w - 40, y, { markerEnd: true, color: 'muted' });
      }
    }
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
