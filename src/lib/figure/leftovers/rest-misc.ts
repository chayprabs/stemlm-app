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
