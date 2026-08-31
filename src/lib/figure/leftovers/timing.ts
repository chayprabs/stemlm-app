import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

type TimingSignal = { name: string; wave: string };

function parseWaveJson(raw: string): TimingSignal[] | null {
  try {
    const value = JSON.parse(raw) as { signal?: unknown };
    if (!Array.isArray(value.signal)) return null;
    const signals: TimingSignal[] = [];
    for (const item of value.signal) {
      if (!item || typeof item !== 'object') return null;
      const row = item as { name?: unknown; wave?: unknown };
      if (typeof row.name !== 'string' || !row.name.trim() || typeof row.wave !== 'string') return null;
      signals.push({ name: row.name.trim(), wave: row.wave.trim() });
    }
    return signals.length ? signals : null;
  } catch {
    return null;
  }
}

function parseSignalLine(line: string): TimingSignal | null {
  const m = /^([A-Za-z][A-Za-z0-9_.-]*)\s+(.+)$/.exec(line.trim());
  if (!m) return null;
  return { name: m[1]!, wave: m[2]!.trim() };
}

function validWave(wave: string): boolean {
  return wave.length > 0 && /^[01hlpxnz.]+$/i.test(wave) && /[01hlpxnz]/i.test(wave);
}

/** A deliberately small WaveJSON subset. Invalid asserted waveforms fail closed. */
export async function compileTiming(spec: SpecDoc, ctx: CompileCtx): Promise<CompileResult> {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('timing', w, h);
  b.hl(spec.highlight);

  let signals: TimingSignal[] = [];
  const waveRaw = specGet(spec, 'wave');
  if (waveRaw?.trim().startsWith('{')) {
    const parsed = parseWaveJson(waveRaw.trim());
    if (!parsed || parsed.some((s) => !validWave(s.wave))) {
      return { ok: false, code: 'malformed', reason: 'timing invalid WaveJSON signal list' };
    }
    signals = parsed;
  }
  if (!signals.length) {
    const rawSignals = [...specGetAll(spec, 'signal'), ...specGetAll(spec, 'wave')];
    if (!rawSignals.length) return { ok: false, code: 'malformed', reason: 'timing requires signal or wave data' };
    for (const line of rawSignals) {
      const signal = parseSignalLine(line);
      if (!signal || !validWave(signal.wave)) {
        return { ok: false, code: 'malformed', reason: `timing invalid waveform ${line}` };
      }
      signals.push(signal);
    }
  }

  const rowH = Math.min(28, (h - 16) / Math.max(1, signals.length));
  signals.forEach((s, si) => {
    const y = 18 + si * rowH;
    b.label(`label-${si}`, s.name, 28, y, { protected: true, anchorId: `row-${si}` });
    const n = Math.max(s.wave.length, 4);
    const x0 = 56;
    const dw = (w - 70) / n;
    let prev = '0';
    let px = x0;
    for (let i = 0; i < n; i++) {
      const symbol = s.wave[i] ?? '.';
      const bit = symbol === '.' ? prev : symbol.toLowerCase();
      const high = bit === '1' || bit === 'h' || bit === 'p';
      const mid = bit === 'x' || bit === 'z';
      const yBit = mid ? y : high ? y - 8 : y + 8;
      if (i > 0 && symbol !== '.' && bit !== prev) {
        b.line(`${s.name}-${i}-edge`, px, prev === '1' || prev === 'h' || prev === 'p' ? y - 8 : y + 8, px, yBit, {
          width: 1.4, color: 'accent', role: 'annotation',
        });
      }
      if (bit === 'p' || bit === 'n') {
        b.line(`${s.name}${i}r`, px, bit === 'p' ? y + 8 : y - 8, px, bit === 'p' ? y - 8 : y + 8, {
          width: 1.4, color: 'accent', role: 'annotation',
        });
      }
      b.line(`${s.name}-${i}`, px, yBit, px + dw, yBit, { width: 1.6, role: 'geometry' });
      px += dw;
      prev = bit;
    }
  });
  const clock = specGet(spec, 'clock');
  const firstWaveStroke = `${signals[0]!.name}-0`;
  if (clock) b.label('clock-label', clock, w - 34, h - 8, { anchorId: firstWaveStroke });
  const edge = specGet(spec, 'edge');
  if (edge) b.label('edge-label', edge, w / 2, h - 8, { anchorId: firstWaveStroke });
  const caption = specGet(spec, 'caption');
  if (caption) b.label('caption-label', caption, w / 2, 8, { anchorId: firstWaveStroke });
  return layoutAndCompile(b.scene());
}
