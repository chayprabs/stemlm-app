import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

/** WaveJSON subset → Scene IR (SLK labels). Optional WaveDrom lazy import for richer SVG. */
export async function compileTiming(spec: SpecDoc, ctx: CompileCtx): Promise<CompileResult> {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('timing', w, h);
  b.hl(spec.highlight);

  let signals: { name: string; wave: string }[] = [];
  const waveRaw = specGet(spec, 'wave') ?? specGetAll(spec, 'signal')[0];
  if (waveRaw?.trim().startsWith('{')) {
    try {
      const json = JSON.parse(waveRaw) as { signal?: { name: string; wave: string }[] };
      signals = json.signal ?? [];
    } catch {
      /* fall through */
    }
  }
  if (!signals.length) {
    for (const line of [...specGetAll(spec, 'signal'), ...specGetAll(spec, 'wave')]) {
      const m = /([A-Za-z0-9_]+)\s+([01hlpx.]+)/i.exec(line);
      if (m) signals.push({ name: m[1]!, wave: m[2]! });
      else if (line.includes(':')) {
        const [name, wave] = line.split(':');
        if (name && wave) signals.push({ name: name.trim(), wave: wave.trim() });
      }
    }
  }
  if (!signals.length) signals = [{ name: 'clk', wave: 'p.....' }, { name: 'data', wave: '0.1.0.' }];

  try {
    const wd = await import('wavedrom');
    const render = (wd as { renderWaveForm?: Function }).renderWaveForm
      ?? (wd as { default?: { renderWaveForm?: Function } }).default?.renderWaveForm;
    if (render && typeof document !== 'undefined') {
      const host = document.createElement('div');
      host.id = 'wave0';
      document.body.appendChild(host);
      try {
        render(0, { signal: signals }, host.id);
        const svg = host.querySelector('svg');
        if (svg?.innerHTML) {
          b.node('wave', 0, 0, w, h, 'timing', svg.innerHTML);
          host.remove();
          return layoutAndCompile(b.scene());
        }
      } finally {
        host.remove();
      }
    }
  } catch {
    /* in-house bricks */
  }

  const rowH = Math.min(28, (h - 16) / Math.max(1, signals.length));
  signals.forEach((s, si) => {
    const y = 18 + si * rowH;
    b.label(s.name, s.name, 28, y, { protected: true });
    const bits = s.wave.replace(/\./g, '');
    const n = Math.max(bits.length, 4);
    const x0 = 56;
    const dw = (w - 70) / n;
    let prev = bits[0] ?? '0';
    let px = x0;
    for (let i = 0; i < n; i++) {
      const bit = bits[i] ?? prev;
      const high = bit === '1' || bit === 'h' || bit === 'p';
      const yBit = high ? y - 8 : y + 8;
      if (bit === 'p' || bit === 'n') {
        b.line(`${s.name}${i}r`, px, y + 8, px, y - 8, { width: 1.4, color: 'accent' });
      }
      b.line(`${s.name}${i}`, px, yBit, px + dw, yBit, { width: 1.6 });
      px += dw;
      prev = bit;
    }
  });
  return layoutAndCompile(b.scene());
}
