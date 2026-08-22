import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

interface Level {
  id: string;
  e: number;
  occ: number;
  label: string;
}

function parseLevels(raw: string): Level[] {
  // "s2s -36 2; s2s* -28 2"
  return raw
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => {
      const parts = p.split(/\s+/);
      const id = parts[0] ?? `L${i}`;
      const e = Number(parts[1]);
      const occ = Number(parts[2] ?? 0);
      return { id, e: Number.isFinite(e) ? e : -i, occ: Number.isFinite(occ) ? occ : 0, label: id };
    });
}

export function compileLadder(spec: SpecDoc, ctx: CompileCtx, family = 'mo'): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder(family, w, h);
  b.hl(spec.highlight);
  const left = parseLevels(specGet(spec, 'left') ?? '');
  const right = parseLevels(specGet(spec, 'right') ?? '');
  const center = parseLevels(specGet(spec, 'center') ?? specGet(spec, 'levels') ?? '');
  const allE = [...left, ...right, ...center].map((l) => l.e);
  const eMin = Math.min(...allE, -40);
  const eMax = Math.max(...allE, 0);
  const mapY = (e: number) => {
    const t = (e - eMin) / (eMax - eMin || 1);
    return h - 24 - t * (h - 40);
  };
  const col = (levels: Level[], x: number, prefix: string) => {
    levels.forEach((lv) => {
      const y = mapY(lv.e);
      b.line(`${prefix}-${lv.id}`, x - 22, y, x + 22, y, { width: 2, color: spec.highlight.includes(lv.id) ? 'accent' : 'neutral' });
      b.label(`${prefix}-${lv.id}-l`, lv.label, x + 36, y, { slot: 'E', protected: true });
      const occ = Math.min(4, lv.occ);
      for (let i = 0; i < occ; i++) {
        const dx = (i - (occ - 1) / 2) * 8;
        b.label(`${prefix}-${lv.id}-e${i}`, i % 2 === 0 ? '↑' : '↓', x + dx, y - 8, { protected: true });
      }
    });
  };
  if (left.length || right.length) {
    col(left, w * 0.18, 'L');
    col(center, w * 0.5, 'C');
    col(right, w * 0.82, 'R');
    b.line('bary', w * 0.32, 20, w * 0.32, h - 16, { dash: true, color: 'guide' });
    b.line('bary2', w * 0.68, 20, w * 0.68, h - 16, { dash: true, color: 'guide' });
  } else {
    col(center.length ? center : parseLevels('S0 0 2; S1 12 0; T1 8 0'), w * 0.5, 'C');
  }
  const mol = specGet(spec, 'molecule') ?? specGet(spec, 'geom');
  if (mol) b.label('mol', mol, w / 2, 12, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileCft(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const d = specNumber(spec, 'd', 6) ?? 6;
  const clone: SpecDoc = {
    ...spec,
    values: new Map(spec.values),
    originals: spec.originals,
    lists: spec.lists,
    highlight: spec.highlight,
  };
  if (!clone.values.has('levels')) {
    clone.values.set('levels', [`t2g -1 ${Math.min(6, d)}; eg 1 ${Math.max(0, d - 6)}`]);
  }
  return compileLadder(clone, ctx, 'cft');
}

export function compileJablonski(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const clone: SpecDoc = {
    ...spec,
    values: new Map(spec.values),
    originals: spec.originals,
    lists: spec.lists,
    highlight: spec.highlight,
  };
  if (!clone.values.has('levels') && !clone.values.has('center')) {
    clone.values.set('levels', ['S0 0 2; S1 20 0; T1 12 0']);
  }
  return compileLadder(clone, ctx, 'jablonski');
}
