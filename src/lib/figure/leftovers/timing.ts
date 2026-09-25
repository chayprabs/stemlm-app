import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

type TimingSignal = { name: string; wave: string };

function parseWaveJson(raw: string): TimingSignal[] | null {
  try {
    const value = JSON.parse(raw) as { signal?: unknown };
    if (!value || !Array.isArray(value.signal) || Object.keys(value).some((key) => key !== 'signal')) return null;
    const signals: TimingSignal[] = [];
    for (const item of value.signal) {
      if (!item || typeof item !== 'object') return null;
      const row = item as { name?: unknown; wave?: unknown };
      if (Object.keys(row).some((key) => key !== 'name' && key !== 'wave')) return null;
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
  return wave.length > 0 && wave[0] !== '.' && /^[01hlpxnz.]+$/i.test(wave);
}

/** A deliberately small WaveJSON subset. Invalid asserted waveforms fail closed. */
export async function compileTiming(spec: SpecDoc, ctx: CompileCtx): Promise<CompileResult> {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('timing', w, h);
  b.hl(spec.highlight);

  if (spec.invalidDeclarations.length || spec.lists.size || spec.emptyDeclarations.size) {
    return { ok: false, code: 'malformed', reason: 'timing requires non-empty inline declarations' };
  }

  let signals: TimingSignal[] = [];
  const waveRaw = specGet(spec, 'wave');
  if (waveRaw?.trim().startsWith('{')) {
    if (specGetAll(spec, 'wave').length !== 1 || specGetAll(spec, 'signal').length) {
      return { ok: false, code: 'malformed', reason: 'timing cannot mix WaveJSON with additional wave or signal declarations' };
    }
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

  const rowH = Math.min(28, (h - 32) / Math.max(1, signals.length));
  const periods = Math.max(...signals.map((signal) => signal.wave.length));
  const x0 = 56;
  const dw = (w - 70) / periods;
  if (rowH < 22 || dw < 6 || new Set(signals.map((signal) => signal.name)).size !== signals.length) {
    return { ok: false, code: 'malformed', reason: 'timing requires unique names and enough space for every declared row and cycle' };
  }
  signals.forEach((s, si) => {
    const y = 18 + si * rowH;
    b.label(`label-${si}`, s.name, 28, y, { protected: true, anchorId: `row-${si}` });
    let prev = '';
    let endY: number | undefined;
    let px = x0;
    for (let i = 0; i < s.wave.length; i++) {
      const symbol = s.wave[i]!;
      const state = symbol === '.' ? prev : symbol;
      const bit = state.toLowerCase();
      if (bit === 'p' || bit === 'n') {
        const firstY = bit === 'p' ? y - 8 : y + 8;
        const secondY = bit === 'p' ? y + 8 : y - 8;
        b.line(`${s.name}${i}r`, px, endY ?? secondY, px, firstY, {
          width: 1.4, color: 'accent', role: 'annotation', markerEnd: state === 'P' || state === 'N',
        });
        b.line(`${s.name}-${i}`, px, firstY, px + dw / 2, firstY, { width: 1.6, role: 'geometry' });
        b.line(`${s.name}-${i}-half-edge`, px + dw / 2, firstY, px + dw / 2, secondY, { width: 1.4, color: 'accent', role: 'annotation' });
        b.line(`${s.name}-${i}-half`, px + dw / 2, secondY, px + dw, secondY, { width: 1.6, role: 'geometry' });
        endY = secondY;
      } else if (bit === 'x') {
        b.rect(`${s.name}-${i}`, px, y - 8, dw, 16, { role: 'geometry', pattern: 'hatch', fill: 'muted', width: 1 });
        endY = undefined;
      } else {
        const yBit = bit === 'z' ? y : bit === '1' || bit === 'h' ? y - 8 : y + 8;
        if (endY !== undefined && endY !== yBit) {
          b.line(`${s.name}-${i}-edge`, px, endY, px, yBit, { width: 1.4, color: 'accent', role: 'annotation' });
        }
        b.line(`${s.name}-${i}`, px, yBit, px + dw, yBit, { width: 1.6, role: 'geometry' });
        endY = yBit;
      }
      px += dw;
      prev = state;
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
