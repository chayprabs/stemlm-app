import type { CompileCtx, CompileResult } from '../types';
import { specGet, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

function fallbackSkeleton(smiles: string, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('chem.smiles', w, h);
  const atoms = smiles.replace(/[^A-Z]/gi, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 12);
  const n = Math.max(atoms.length, 3);
  for (let i = 0; i < n; i++) {
    const x = 30 + (i * (w - 60)) / Math.max(1, n - 1);
    const y = h / 2 + ((i % 2) * 16 - 8);
    b.circle(`a${i}`, x, y, 10, { fill: 'none' });
    b.label(`al${i}`, atoms[i] ?? 'C', x, y, { protected: true });
    if (i) b.line(`b${i}`, x - (w - 60) / Math.max(1, n - 1) + 10, y, x - 10, y, { width: 1.8 });
  }
  b.label('smiles', smiles.slice(0, 40), w / 2, 12, { protected: true });
  return layoutAndCompile(b.scene());
}

export async function compileChemSmiles(spec: SpecDoc, ctx: CompileCtx): Promise<CompileResult> {
  const smiles = specGet(spec, 'smiles');
  if (!smiles) return { ok: false, code: 'malformed', reason: 'chem.smiles needs smiles:' };
  try {
    const mod = (await import('smiles-drawer')) as unknown as {
      default?: { parse?: Function; SvgDrawer?: new (o: object) => { draw: Function } };
      parse?: Function;
      SvgDrawer?: new (o: object) => { draw: Function };
    };
    const SD = mod.default ?? mod;
    const parse = SD.parse;
    const SvgDrawer = SD.SvgDrawer;
    if (!parse || !SvgDrawer) return fallbackSkeleton(smiles, ctx);
    const { w, h } = frameSize(ctx.profile);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    await new Promise<void>((resolve, reject) => {
      parse(
        smiles,
        (tree: unknown) => {
          try {
            const drawer = new SvgDrawer({ width: w, height: h, compactDrawing: true, padding: 8 });
            drawer.draw(tree, svg, 'light');
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        (err: unknown) => reject(err),
      );
    });
    const inner = svg.innerHTML;
    if (!inner.trim()) return fallbackSkeleton(smiles, ctx);
    const b = new SceneBuilder('chem.smiles', w, h);
    b.hl(spec.highlight);
    b.node('mol', 0, 0, w, h, 'mol', inner);
    const annotate = specGet(spec, 'annotate');
    if (annotate) b.label('ann', annotate, w - 40, 16, { slot: 'W' });
    return layoutAndCompile(b.scene());
  } catch {
    return fallbackSkeleton(smiles, ctx);
  }
}
